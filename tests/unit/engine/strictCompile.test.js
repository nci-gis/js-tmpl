import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import Handlebars from 'handlebars';

import { registerPartials } from '../../../src/engine/partials.js';
import { compileStrict } from '../../../src/engine/strictCompile.js';
import { withTempDir } from '../../helpers/tempDir.js';

function setup() {
  const hbs = Handlebars.create();
  hbs.registerHelper('upper', (s) => String(s).toUpperCase());
  hbs.registerHelper('has', (o) => ('opt' in o ? 'y' : 'n'));
  hbs.registerPartial('p', '[{{x}}]');
  return hbs;
}

/**
 * @param {string} src
 * @param {Record<string, unknown>} view
 */
function render(src, view) {
  return compileStrict(setup(), src)(view);
}

// Round 07 spike cases, kept as the contract of compileStrict.
describe('compileStrict — missing values throw in every argument position', () => {
  const missing = [
    ['{{#if}}', '{{#if missing}}x{{/if}}', {}],
    ['{{#unless}}', '{{#unless missing}}x{{/unless}}', {}],
    ['{{#each}}', '{{#each missing}}x{{/each}}', {}],
    ['{{#with}}', '{{#with missing}}x{{/with}}', {}],
    ['helper argument', '{{upper missing}}', {}],
    ['nested helper argument', '{{upper a.b}}', { a: {} }],
    ['helper argument, parent missing', '{{upper a.b}}', {}],
    ['hash value', '{{upper x k=missing}}', { x: 'a' }],
    ['sub-expression argument', '{{upper (upper missing)}}', {}],
    ['parent scope ../', '{{#each xs}}{{upper ../nope}}{{/each}}', { xs: [1] }],
    ['@root', '{{#each xs}}{{upper @root.nope}}{{/each}}', { xs: [1] }],
    ['partial context', '{{> p nope}}', {}],
    ['partial block context', '{{#> p nope}}fallback{{/p}}', {}],
    ['simple mustache', '{{nope}}', {}],
  ];
  for (const [label, src, view] of missing) {
    it(label, () => {
      assert.throws(() => render(src, view), / not defined in .* - \d+:\d+/);
    });
  }
});

describe('compileStrict — present values render as before', () => {
  const present = [
    ['falsy value in {{#if}}', '{{#if f}}x{{else}}y{{/if}}', { f: false }, 'y'],
    ['null value in {{#if}}', '{{#if n}}x{{else}}y{{/if}}', { n: null }, 'y'],
    [
      'this in {{#each}}',
      '{{#each xs}}{{upper this}},{{/each}}',
      { xs: ['a', 'b'] },
      'A,B,',
    ],
    ['@index', '{{#each xs}}{{@index}}{{/each}}', { xs: ['a', 'b'] }, '01'],
    ['@key', '{{#each o}}{{@key}}={{this}};{{/each}}', { o: { a: 1 } }, 'a=1;'],
    [
      'block params',
      '{{#each xs as |it|}}{{upper it.n}}{{/each}}',
      { xs: [{ n: 'a' }] },
      'A',
    ],
    [
      '../ and @root',
      '{{#each xs}}{{upper ../t}}{{upper @root.t}}{{/each}}',
      { t: 't', xs: [1] },
      'TT',
    ],
    ['partial context', '{{> p ctx}}', { ctx: { x: 1 } }, '[1]'],
    [
      'partial block context',
      '{{#> p ctx}}fallback{{/p}}',
      { ctx: { x: 1 } },
      '[1]',
    ],
    ['literal arguments', '{{upper "lit"}}', {}, 'LIT'],
    ['helper internals are not checked', '{{has o}}', { o: {} }, 'n'],
  ];
  for (const [label, src, view, expected] of present) {
    it(label, () => {
      assert.strictEqual(render(src, view), expected);
    });
  }

  // Handlebars never strict-checks block-param paths, even in {{x.m}}.
  it('known limit: missing field on a block param is not caught', () => {
    const src = '{{#each xs as |it|}}[{{it.m}}]{{/each}}';
    assert.strictEqual(render(src, { xs: [{ n: 1 }] }), '[]');
  });

  it('reports parse errors when first rendered', () => {
    const template = compileStrict(setup(), '{{#if}}');
    assert.throws(() => template({}), /Parse error|Expecting/);
  });
});

describe('registerPartials — partial content is strict too', () => {
  it('throws for {{#if missing}} inside a partial', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, 'part.hbs'),
        '{{#if missing}}x{{/if}}',
        'utf8',
      );
      const hbs = Handlebars.create();
      await registerPartials(tmpDir, '.hbs', hbs);

      assert.throws(
        () => compileStrict(hbs, '{{> part}}')({}),
        /"missing" not defined/,
      );
    });
  });
});
