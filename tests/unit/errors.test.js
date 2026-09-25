import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { after, describe, it } from 'node:test';

import Handlebars from 'handlebars';

import { parseArgs } from '../../src/cli/args.js';
import { loadProjectConfig, loadYamlOrJson } from '../../src/config/loader.js';
import { resolveConfig } from '../../src/config/resolver.js';
import { scanValuePartials } from '../../src/config/valuePartials.js';
import { buildView } from '../../src/config/view.js';
import { renderContent } from '../../src/engine/contentRenderer.js';
import { registerHelpers } from '../../src/engine/helpers.js';
import { evalFormula } from '../../src/engine/pathFormula.js';
import { renderPath } from '../../src/engine/pathRenderer.js';
import { renderDirectory } from '../../src/engine/renderDirectory.js';
import { ErrorCodes, JsTmplError } from '../../src/errors.js';
import {
  assertNoDuplicate,
  assertValidSegments,
} from '../../src/utils/namespacing.js';
import { withTempDir } from '../helpers/tempDir.js';

/** Codes a test below has produced. */
const seen = new Set();

/**
 * Assert `fn` throws a JsTmplError with `code` (and optional details).
 * @param {string} code
 * @param {() => unknown} fn
 * @param {Record<string, unknown>} [details]
 */
async function expectCode(code, fn, details) {
  await assert.rejects(
    async () => fn(),
    (err) => {
      assert.ok(err instanceof JsTmplError, `${err?.name}: ${err?.message}`);
      assert.strictEqual(err.code, code);
      for (const [k, v] of Object.entries(details ?? {})) {
        assert.deepStrictEqual(err.details?.[k], v, `details.${k}`);
      }
      return true;
    },
  );
  seen.add(code);
}

/** @param {string} dir @param {Record<string, string>} files */
async function seed(dir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, ...rel.split('/'));
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf8');
  }
}

describe('ErrorCodes — every code is produced by the case it names', () => {
  it('CONFIG_NOT_FOUND', () =>
    withTempDir((d) =>
      expectCode(ErrorCodes.CONFIG_NOT_FOUND, () =>
        loadProjectConfig(d, 'missing.yaml'),
      ),
    ));

  it('CONFIG_INVALID_VALUE', () =>
    withTempDir((d) =>
      expectCode(
        ErrorCodes.CONFIG_INVALID_VALUE,
        () => resolveConfig({ targetFs: 'linux' }, d),
        { key: 'targetFs', value: 'linux' },
      ),
    ));

  it('CONFIG_UNKNOWN_KEY', () =>
    withTempDir((d) =>
      expectCode(
        ErrorCodes.CONFIG_UNKNOWN_KEY,
        () => resolveConfig({ outdir: 'x' }, d),
        { key: 'outdir', suggestion: 'outDir' },
      ),
    ));

  it('VALUES_NOT_FOUND', () =>
    expectCode(ErrorCodes.VALUES_NOT_FOUND, () =>
      loadYamlOrJson('/nonexistent/values.yaml'),
    ));

  it('VALUES_UNSUPPORTED_FORMAT', () =>
    withTempDir(async (d) => {
      await seed(d, { 'values.ini': 'a=1' });
      await expectCode(ErrorCodes.VALUES_UNSUPPORTED_FORMAT, () =>
        loadYamlOrJson(path.join(d, 'values.ini')),
      );
    }));

  it('VALUES_FILE_IN_DIR', () =>
    withTempDir(async (d) => {
      await seed(d, { 'v/app.yaml': 'a: 1' });
      await expectCode(ErrorCodes.VALUES_FILE_IN_DIR, () =>
        resolveConfig({ valuesFile: 'v/app.yaml', valuesDir: 'v' }, d),
      );
    }));

  it('NS_INVALID_SEGMENT', () =>
    expectCode(ErrorCodes.NS_INVALID_SEGMENT, () =>
      assertValidSegments(['a-b'], 'x.yaml'),
    ));

  it('NS_DUPLICATE', () =>
    expectCode(ErrorCodes.NS_DUPLICATE, () => {
      const map = new Map();
      assertNoDuplicate(map, 'k', '/r/a.yaml', '/r');
      assertNoDuplicate(map, 'k', '/r/b.yaml', '/r');
    }));

  it('NS_SHADOW', () =>
    withTempDir(async (d) => {
      await seed(d, { 'a.yaml': 'x: 1', 'a/b.yaml': 'y: 2' });
      await expectCode(ErrorCodes.NS_SHADOW, () => scanValuePartials(d));
    }));

  it('NS_ROOT_COLLISION', () =>
    expectCode(ErrorCodes.NS_ROOT_COLLISION, () =>
      buildView({ rootValues: { app: 1 }, partials: { app: {} } }),
    ));

  it('NS_RESERVED_ENV', () =>
    expectCode(ErrorCodes.NS_RESERVED_ENV, () =>
      buildView({ partials: { env: {} } }),
    ));

  it('PATH_MISSING_VAR', () =>
    expectCode(ErrorCodes.PATH_MISSING_VAR, () => renderPath('${x}', {}), {
      relPath: '${x}',
      variable: 'x',
    }));

  it('PATH_INVALID_VALUE', () =>
    expectCode(
      ErrorCodes.PATH_INVALID_VALUE,
      () => renderPath('${x}', { x: 'a\\b' }),
      { variable: 'x' },
    ));

  it('PATH_EMPTY_SEGMENT', () =>
    expectCode(
      ErrorCodes.PATH_EMPTY_SEGMENT,
      () => renderPath('${x}/y', { x: '' }),
      { segment: '${x}' },
    ));

  it('GUARD_MISSING_VAR', () =>
    expectCode(
      ErrorCodes.GUARD_MISSING_VAR,
      () => evalFormula('$if{x}', {}, 'r'),
      { relPath: 'r', variable: 'x' },
    ));

  it('GUARD_MALFORMED', () =>
    expectCode(ErrorCodes.GUARD_MALFORMED, () =>
      renderPath('$if{a}b/x', { a: 1 }),
    ));

  it('GUARD_IN_FILENAME', () =>
    expectCode(ErrorCodes.GUARD_IN_FILENAME, () =>
      renderPath('d/$if{a}', { a: 1 }),
    ));

  for (const [code, src, details] of [
    [
      ErrorCodes.TEMPLATE_MISSING_VALUE,
      'x\n  {{a}}',
      { variable: 'a', line: 2, column: 4 },
    ],
    [ErrorCodes.TEMPLATE_SYNTAX, '{{#if}}', {}],
    [ErrorCodes.TEMPLATE_RENDER_FAILED, '{{> nope}}', {}],
  ]) {
    it(code.replace('JSTMPL_', ''), () =>
      withTempDir(async (d) => {
        await seed(d, { 't.hbs': src });
        await expectCode(
          code,
          () => renderContent(path.join(d, 't.hbs'), {}, undefined, 't.hbs'),
          { relPath: 't.hbs', ...details },
        );
      }),
    );
  }

  it('TEMPLATE_* keeps the Handlebars error as cause', () =>
    withTempDir(async (d) => {
      await seed(d, { 't.hbs': '{{a}}' });
      await assert.rejects(renderContent(path.join(d, 't.hbs'), {}), (err) => {
        assert.ok(err.cause instanceof Error);
        assert.match(err.cause.message, /"a" not defined/);
        return true;
      });
    }));

  it('OUTPUT_OUTSIDE_OUTDIR (through a symlink in outDir)', () =>
    withTempDir(async (d) => {
      await seed(d, { 't/${a}/x.hbs': 'X' });
      await fs.mkdir(path.join(d, 'elsewhere'));
      await fs.mkdir(path.join(d, 'out'));
      await fs.symlink(
        path.join(d, 'elsewhere'),
        path.join(d, 'out', 'link'),
        'junction',
      );
      await expectCode(
        ErrorCodes.OUTPUT_OUTSIDE_OUTDIR,
        () =>
          renderDirectory({
            templateDir: path.join(d, 't'),
            outDir: path.join(d, 'out'),
            extname: '.hbs',
            view: { a: 'link' },
          }),
        { relPath: '${a}/x.hbs' },
      );
    }));

  it('OUTPUT_COLLISION', () =>
    withTempDir(async (d) => {
      await seed(d, { 't/${a}.hbs': 'A', 't/${b}.hbs': 'B' });
      await expectCode(
        ErrorCodes.OUTPUT_COLLISION,
        () =>
          renderDirectory({
            templateDir: path.join(d, 't'),
            outDir: path.join(d, 'out'),
            extname: '.hbs',
            view: { a: 'same', b: 'same' },
          }),
        { target: 'same', templates: ['${a}.hbs', '${b}.hbs'] },
      );
    }));

  it('OUTPUT_BLOCKED (a directory where the plan puts a file)', () =>
    withTempDir(async (d) => {
      await seed(d, { 't/a.hbs': 'A' });
      await fs.mkdir(path.join(d, 'out', 'a'), { recursive: true });
      await expectCode(
        ErrorCodes.OUTPUT_BLOCKED,
        () =>
          renderDirectory({
            templateDir: path.join(d, 't'),
            outDir: path.join(d, 'out'),
            extname: '.hbs',
            view: {},
          }),
        { relPath: 'a.hbs', target: 'a', path: 'a' },
      );
    }));

  it('OUTPUT_LINKED (a target with another hard link)', () =>
    withTempDir(async (d) => {
      await seed(d, { 't/a.hbs': 'A', 'elsewhere.txt': 'keep' });
      await fs.mkdir(path.join(d, 'out'));
      await fs.link(path.join(d, 'elsewhere.txt'), path.join(d, 'out', 'a'));
      await expectCode(
        ErrorCodes.OUTPUT_LINKED,
        () =>
          renderDirectory({
            templateDir: path.join(d, 't'),
            outDir: path.join(d, 'out'),
            extname: '.hbs',
            view: {},
          }),
        { relPath: 'a.hbs', target: 'a' },
      );
    }));

  it('MULTIPLE_ERRORS', () =>
    withTempDir(async (d) => {
      await seed(d, { 't/a.hbs': '{{a}}', 't/b.hbs': '{{b}}' });
      await expectCode(ErrorCodes.MULTIPLE_ERRORS, () =>
        renderDirectory({
          templateDir: path.join(d, 't'),
          outDir: path.join(d, 'out'),
          extname: '.hbs',
          view: {},
        }),
      );
    }));

  it('HELPER_NO_INSTANCE', () =>
    expectCode(ErrorCodes.HELPER_NO_INSTANCE, () => registerHelpers(null, {})));

  it('HELPER_INVALID_MAP', () =>
    expectCode(ErrorCodes.HELPER_INVALID_MAP, () =>
      registerHelpers(Handlebars.create(), []),
    ));

  it('HELPER_INVALID_NAME', () =>
    expectCode(ErrorCodes.HELPER_INVALID_NAME, () =>
      registerHelpers(Handlebars.create(), { 'a.b': () => '' }),
    ));

  it('HELPER_NOT_FUNCTION', () =>
    expectCode(ErrorCodes.HELPER_NOT_FUNCTION, () =>
      registerHelpers(Handlebars.create(), { a: 1 }),
    ));

  it('HELPER_ALREADY_REGISTERED', () =>
    expectCode(ErrorCodes.HELPER_ALREADY_REGISTERED, () =>
      registerHelpers(Handlebars.create(), { if: () => '' }),
    ));

  it('CLI_USAGE', () =>
    expectCode(ErrorCodes.CLI_USAGE, () => parseArgs(['--bogus'])));
});

describe('JsTmplError', () => {
  it('rejects codes that are not in ErrorCodes', () => {
    assert.throws(() => new JsTmplError('JSTMPL_NOPE', 'x'), TypeError);
  });

  it('omits details when none are given', () => {
    const err = new JsTmplError(ErrorCodes.CLI_USAGE, 'x');
    assert.strictEqual(err.name, 'JsTmplError');
    assert.strictEqual('details' in err, false);
    assert.strictEqual(err.cause, undefined);
  });
});

// Codes that no input can reach today, by design (none at the moment).
// Listed so the meta-test stays honest: a new code needs a test or an entry.
const UNREACHABLE = new Map();

after(() => {
  const missing = Object.values(ErrorCodes).filter(
    (c) => !seen.has(c) && !UNREACHABLE.has(c),
  );
  assert.deepStrictEqual(missing, [], 'every ErrorCodes value needs a test');
});
