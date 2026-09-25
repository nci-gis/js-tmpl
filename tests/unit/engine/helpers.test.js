import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import Handlebars from 'handlebars';

import { registerHelpers } from '../../../src/engine/helpers.js';
import { renderDirectory } from '../../../src/engine/renderDirectory.js';
import { compileStrict } from '../../../src/engine/strictCompile.js';
import { withTempDir } from '../../helpers/tempDir.js';

/**
 * Compile the way contentRenderer does (strict mode incl. arguments).
 * @param {typeof Handlebars} hbs
 * @param {string} src
 * @param {Record<string, unknown>} [view]
 */
function render(hbs, src, view = {}) {
  return compileStrict(hbs, src)(view);
}

describe('registerHelpers', () => {
  // ── Registration ───────────────────────────────────────────────────

  it('registers a single helper usable in templates', () => {
    const hbs = Handlebars.create();
    registerHelpers(hbs, { upper: (s) => s.toUpperCase() });

    assert.strictEqual(render(hbs, '{{upper name}}', { name: 'ada' }), 'ADA');
  });

  it('registers multiple helpers in one call', () => {
    const hbs = Handlebars.create();
    registerHelpers(hbs, {
      upper: (s) => s.toUpperCase(),
      lower: (s) => s.toLowerCase(),
    });

    assert.strictEqual(
      render(hbs, '{{upper a}}-{{lower b}}', { a: 'x', b: 'Y' }),
      'X-y',
    );
  });

  it('passes positional and hash arguments', () => {
    const hbs = Handlebars.create();
    registerHelpers(hbs, {
      join: (a, b, options) => [a, b].join(options.hash.sep),
    });

    assert.strictEqual(
      render(hbs, '{{join a b sep="/"}}', { a: 'x', b: 'y' }),
      'x/y',
    );
  });

  it('supports block helpers with fn and inverse', () => {
    const hbs = Handlebars.create();
    registerHelpers(hbs, {
      eq: function (a, b, options) {
        return a === b ? options.fn(this) : options.inverse(this);
      },
    });

    const src = '{{#eq env "prod"}}P{{else}}D{{/eq}}';
    assert.strictEqual(render(hbs, src, { env: 'prod' }), 'P');
    assert.strictEqual(render(hbs, src, { env: 'dev' }), 'D');
  });

  it('accepts idiomatic names', () => {
    const hbs = Handlebars.create();
    const fn = () => '';
    registerHelpers(hbs, {
      'date-format': fn,
      'is-active': fn,
      $format: fn,
      _private: fn,
      v2: fn,
    });

    for (const name of ['date-format', 'is-active', '$format', '_private']) {
      assert.strictEqual(hbs.helpers[name], fn);
    }
  });

  // ── Optional helpersMap ────────────────────────────────────────────

  it('is a no-op for null, undefined, or empty helpersMap', () => {
    const hbs = Handlebars.create();
    const before = Object.keys(hbs.helpers);

    registerHelpers(hbs, null);
    registerHelpers(hbs, undefined);
    registerHelpers(hbs);
    registerHelpers(hbs, {});

    assert.deepStrictEqual(Object.keys(hbs.helpers), before);
  });

  it('ignores inherited keys', () => {
    const hbs = Handlebars.create();
    const map = Object.create({ inherited: () => 'no' });
    map.own = () => 'yes';

    registerHelpers(hbs, map);

    assert.strictEqual(typeof hbs.helpers.own, 'function');
    assert.strictEqual(Object.hasOwn(hbs.helpers, 'inherited'), false);
  });

  // ── Validation ─────────────────────────────────────────────────────

  it('throws when hbs is missing or not a Handlebars instance', () => {
    for (const bad of [undefined, null, {}, 'hbs']) {
      assert.throws(
        () => registerHelpers(bad, { a: () => '' }),
        /requires a Handlebars instance/,
      );
    }
  });

  it('throws when helpersMap is not an object', () => {
    const hbs = Handlebars.create();
    assert.throws(
      () => registerHelpers(hbs, [() => '']),
      /helpersMap must be an object .* got array/,
    );
    assert.throws(
      () => registerHelpers(hbs, 'upper'),
      /helpersMap must be an object .* got string/,
    );
  });

  it('throws for non-function values, naming helper and type', () => {
    const cases = [
      ['str', 'text', 'string'],
      ['num', 42, 'number'],
      ['nil', null, 'null'],
      ['obj', {}, 'object'],
      ['arr', [], 'array'],
    ];
    for (const [name, value, type] of cases) {
      const hbs = Handlebars.create();
      assert.throws(
        () => registerHelpers(hbs, { [name]: value }),
        new RegExp(`Helper '${name}' must be a function, got ${type}`),
      );
    }
  });

  it('throws for invalid names', () => {
    for (const name of ['', '1abc', 'a.b', 'a b', 'a/b', '-a', '[x]']) {
      const hbs = Handlebars.create();
      assert.throws(
        () => registerHelpers(hbs, { [name]: () => '' }),
        /Invalid helper name/,
        `expected '${name}' to be rejected`,
      );
    }
  });

  it('throws on collision with a built-in helper', () => {
    for (const name of ['if', 'each', 'with', 'lookup', 'helperMissing']) {
      const hbs = Handlebars.create();
      assert.throws(
        () => registerHelpers(hbs, { [name]: () => '' }),
        new RegExp(`Helper '${name}' is already registered`),
      );
    }
  });

  it('throws on collision with a previously registered helper', () => {
    const hbs = Handlebars.create();
    registerHelpers(hbs, { upper: (s) => s.toUpperCase() });

    assert.throws(
      () => registerHelpers(hbs, { upper: (s) => s }),
      /Helper 'upper' is already registered/,
    );
  });

  it('does not treat Object.prototype names as collisions', () => {
    const hbs = Handlebars.create();
    registerHelpers(hbs, { toString: () => 'ts' });

    assert.strictEqual(render(hbs, '{{toString}}'), 'ts');
  });

  it('registers nothing when any entry is invalid (atomic)', () => {
    const hbs = Handlebars.create();
    const before = Object.keys(hbs.helpers);

    assert.throws(() =>
      registerHelpers(hbs, { good: () => 'ok', bad: 'not a function' }),
    );

    assert.deepStrictEqual(Object.keys(hbs.helpers), before);
  });

  // ── Isolation ──────────────────────────────────────────────────────

  it('does not register on the global Handlebars instance', () => {
    const hbs = Handlebars.create();
    registerHelpers(hbs, { scopedOnly: () => '' });

    assert.strictEqual(Object.hasOwn(Handlebars.helpers, 'scopedOnly'), false);
  });

  it('keeps helpers on one instance invisible to another', () => {
    const a = Handlebars.create();
    const b = Handlebars.create();
    registerHelpers(a, { shout: (s) => `${s}!` });

    assert.strictEqual(render(a, '{{shout x}}', { x: 'hi' }), 'hi!');
    assert.throws(() => render(b, '{{shout x}}', { x: 'hi' }), /shout/);
  });

  // ── Strict mode (VP-9) interaction ─────────────────────────────────

  it('throws in strict mode when a helper name is not registered', () => {
    const hbs = Handlebars.create();
    assert.throws(() => render(hbs, '{{upper x}}', { x: 'a' }), /upper/);
  });

  it('still throws for a missing {{var}} next to a helper call', () => {
    const hbs = Handlebars.create();
    registerHelpers(hbs, { upper: (s) => String(s).toUpperCase() });

    assert.throws(
      () => render(hbs, '{{upper name}} {{missing}}', { name: 'a' }),
      /"missing" not defined/,
    );
  });

  // Round 07 (0.2.0): arguments are strict — built-ins and custom helpers.
  it('throws for a missing var in a helper argument', () => {
    const hbs = Handlebars.create();
    registerHelpers(hbs, { upper: (s) => String(s).toUpperCase() });

    assert.throws(
      () => render(hbs, '{{upper missing}}'),
      /"missing" not defined/,
    );
    assert.throws(
      () => render(hbs, '{{#if missing}}x{{/if}}'),
      /"missing" not defined/,
    );
  });

  // ── Integration ────────────────────────────────────────────────────

  it('works end-to-end with renderDirectory', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const outDir = path.join(tmpDir, 'out');
      await fs.mkdir(templateDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, 'greeting.txt.hbs'),
        'Hello {{upper name}}',
        'utf8',
      );

      const hbs = Handlebars.create();
      registerHelpers(hbs, { upper: (s) => s.toUpperCase() });
      await renderDirectory(
        { templateDir, outDir, extname: '.hbs', view: { name: 'ada' } },
        hbs,
      );

      const out = await fs.readFile(path.join(outDir, 'greeting.txt'), 'utf8');
      assert.strictEqual(out, 'Hello ADA');
    });
  });

  it('reports the template path when a helper throws', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      await fs.mkdir(templateDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, 'boom.txt.hbs'),
        '{{boom}}',
        'utf8',
      );

      const hbs = Handlebars.create();
      registerHelpers(hbs, {
        boom: () => {
          throw new Error('helper failed');
        },
      });

      await assert.rejects(
        renderDirectory(
          {
            templateDir,
            outDir: path.join(tmpDir, 'out'),
            extname: '.hbs',
            view: {},
          },
          hbs,
        ),
        /Template 'boom\.txt\.hbs': helper failed/,
      );
    });
  });
});
