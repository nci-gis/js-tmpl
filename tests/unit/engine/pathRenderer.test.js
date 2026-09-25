import assert from 'node:assert';
import { describe, it } from 'node:test';

import { renderPath } from '../../../src/engine/pathRenderer.js';
import { toNative, toPosix } from '../../helpers/paths.js';

/**
 * renderPath with POSIX-style test paths on every OS.
 * @param {string} rel
 * @param {Record<string, unknown>} view
 */
function render(rel, view) {
  try {
    return toPosix(renderPath(toNative(rel), view));
  } catch (e) {
    e.message = toPosix(e.message);
    throw e;
  }
}

describe('renderPath', () => {
  it('renders simple placeholder', () => {
    const view = { name: 'test' };
    const result = render('${name}.txt', view);
    assert.strictEqual(result, 'test.txt');
  });

  it('renders nested property', () => {
    const view = { app: { name: 'myapp' } };
    const result = render('${app.name}.txt', view);
    assert.strictEqual(result, 'myapp.txt');
  });

  it('renders multiple placeholders in one segment', () => {
    const view = { name: 'test', version: '1.0' };
    const result = render('${name}-${version}.txt', view);
    assert.strictEqual(result, 'test-1.0.txt');
  });

  it('renders placeholders in multiple segments', () => {
    const view = { dir: 'output', file: 'test' };
    const result = render('${dir}/${file}.txt', view);
    assert.strictEqual(result, 'output/test.txt');
  });

  it('leaves text without placeholders unchanged', () => {
    const view = { name: 'test' };
    const result = render('static/file.txt', view);
    assert.strictEqual(result, 'static/file.txt');
  });

  it('throws for a missing placeholder variable (0.2.0)', () => {
    assert.throws(
      () => render('${missing}.txt', {}),
      /Path variable 'missing' is not defined in the view \(in '\$\{missing\}\.txt'\)/,
    );
  });

  it('returns empty string for null placeholder', () => {
    const view = { value: null };
    const result = render('${value}.txt', view);
    assert.strictEqual(result, '.txt');
  });

  it('converts number to string', () => {
    const view = { count: 42 };
    const result = render('file-${count}.txt', view);
    assert.strictEqual(result, 'file-42.txt');
  });

  it('converts boolean to string', () => {
    const view = { enabled: true };
    const result = render('${enabled}.txt', view);
    assert.strictEqual(result, 'true.txt');
  });

  it('handles deeply nested properties', () => {
    const view = { app: { config: { database: { name: 'mydb' } } } };
    const result = render('${app.config.database.name}.txt', view);
    assert.strictEqual(result, 'mydb.txt');
  });

  it('handles placeholders with whitespace', () => {
    const view = { name: 'test' };
    const result = render('${ name }.txt', view);
    assert.strictEqual(result, 'test.txt');
  });

  it('handles mixed static and dynamic segments', () => {
    const view = { env: 'prod', version: '2.0' };
    const result = render('configs/${env}/app-${version}.conf', view);
    assert.strictEqual(result, 'configs/prod/app-2.0.conf');
  });

  it('handles empty string value', () => {
    const view = { name: '' };
    const result = render('${name}.txt', view);
    assert.strictEqual(result, '.txt');
  });

  it('handles zero value', () => {
    const view = { index: 0 };
    const result = render('file-${index}.txt', view);
    assert.strictEqual(result, 'file-0.txt');
  });

  it('handles path with no placeholders and multiple segments', () => {
    const view = {};
    const result = render('static/nested/file.txt', view);
    assert.strictEqual(result, 'static/nested/file.txt');
  });

  // ── Path formulas ($if / $ifn) ────────────────────────────────────

  describe('path formulas', () => {
    it('collapses passing $if in a directory segment (G-2)', () => {
      const view = { prod: true };
      const result = render('$if{prod}/config.yaml', view);
      assert.strictEqual(result, 'config.yaml');
    });

    it('collapses multiple passing formulas', () => {
      const view = { a: true, b: true };
      const result = render('$if{a}/$if{b}/file.yaml', view);
      assert.strictEqual(result, 'file.yaml');
    });

    it('passes through literal segments around a formula', () => {
      const view = { prod: true };
      const result = render('configs/$if{prod}/app.yaml', view);
      assert.strictEqual(result, 'configs/app.yaml');
    });

    it('expansion still works alongside formula', () => {
      const view = { prod: true, name: 'api' };
      const result = render('$if{prod}/${name}.yaml', view);
      assert.strictEqual(result, 'api.yaml');
    });

    it('throws for pure formula as filename (G-5)', () => {
      // `$if{a}` as the entire last segment (no suffix) classifies as a
      // formula — filename position is rejected.
      assert.throws(
        () => render('folder/$if{a}', { a: true }),
        /not allowed in a filename/,
      );
    });

    it('throws for formula mixed into filename — malformed (G-5)', () => {
      // `$if{a}.yaml` has extra content after the formula → malformed,
      // thrown at render time.
      assert.throws(
        () => render('folder/$if{a}.yaml', { a: true }),
        /whole segments/,
      );
    });

    it('throws for a malformed mixed segment', () => {
      assert.throws(
        () => render('$if{a}folder/x.yaml', { a: true }),
        /whole segments/,
      );
    });

    it('error message includes relPath', () => {
      assert.throws(
        () => render('folder/$if{x}name.yaml', {}),
        /in 'folder\/\$if\{x\}name\.yaml'/,
      );
    });
  });

  // Round 07 (0.2.0): a placeholder must produce exactly one segment.
  describe('single-segment values', () => {
    it('throws for a missing nested variable', () => {
      assert.throws(
        () => render('${a.b}/x', { a: {} }),
        /'a\.b' is not defined/,
      );
    });

    for (const [label, value] of [
      ['a slash', 'a/b'],
      ['a backslash', 'a\\b'],
      ['a leading slash', '/abs'],
    ]) {
      it(`throws for a value with ${label}`, () => {
        assert.throws(
          () => render('${v}/x', { v: value }),
          /contains a path separator/,
        );
      });
    }

    for (const [label, value] of [
      ['empty', ''],
      ['null', null],
      ['.', '.'],
      ['..', '..'],
    ]) {
      it(`throws when a whole segment renders ${label}`, () => {
        assert.throws(
          () => render('${v}/x', { v: value }),
          /does not name a file or directory/,
        );
      });
    }

    it('throws for object and array values', () => {
      assert.throws(() => render('${v}.txt', { v: {} }), /is an object/);
      assert.throws(() => render('${v}.txt', { v: [1] }), /is an array/);
    });

    it('allows dots inside a value and empty values within a segment', () => {
      assert.strictEqual(render('${v}.txt', { v: '..hidden' }), '..hidden.txt');
      assert.strictEqual(render('app-${v}.txt', { v: '' }), 'app-.txt');
      assert.strictEqual(render('${v}.txt', { v: null }), '.txt');
    });

    it('supports array index paths', () => {
      assert.strictEqual(
        render('${items.0.name}.txt', { items: [{ name: 'a' }] }),
        'a.txt',
      );
    });
  });
});
