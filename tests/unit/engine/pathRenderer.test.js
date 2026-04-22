import assert from 'node:assert';
import { describe, it } from 'node:test';

import { renderPath } from '../../../src/engine/pathRenderer.js';

describe('renderPath', () => {
  it('renders simple placeholder', () => {
    const view = { name: 'test' };
    const result = renderPath('${name}.txt', view);
    assert.strictEqual(result, 'test.txt');
  });

  it('renders nested property', () => {
    const view = { app: { name: 'myapp' } };
    const result = renderPath('${app.name}.txt', view);
    assert.strictEqual(result, 'myapp.txt');
  });

  it('renders multiple placeholders in one segment', () => {
    const view = { name: 'test', version: '1.0' };
    const result = renderPath('${name}-${version}.txt', view);
    assert.strictEqual(result, 'test-1.0.txt');
  });

  it('renders placeholders in multiple segments', () => {
    const view = { dir: 'output', file: 'test' };
    const result = renderPath('${dir}/${file}.txt', view);
    assert.strictEqual(result, 'output/test.txt');
  });

  it('leaves text without placeholders unchanged', () => {
    const view = { name: 'test' };
    const result = renderPath('static/file.txt', view);
    assert.strictEqual(result, 'static/file.txt');
  });

  it('returns empty string for undefined placeholder', () => {
    const view = {};
    const result = renderPath('${missing}.txt', view);
    assert.strictEqual(result, '.txt');
  });

  it('returns empty string for null placeholder', () => {
    const view = { value: null };
    const result = renderPath('${value}.txt', view);
    assert.strictEqual(result, '.txt');
  });

  it('converts number to string', () => {
    const view = { count: 42 };
    const result = renderPath('file-${count}.txt', view);
    assert.strictEqual(result, 'file-42.txt');
  });

  it('converts boolean to string', () => {
    const view = { enabled: true };
    const result = renderPath('${enabled}.txt', view);
    assert.strictEqual(result, 'true.txt');
  });

  it('handles deeply nested properties', () => {
    const view = { app: { config: { database: { name: 'mydb' } } } };
    const result = renderPath('${app.config.database.name}.txt', view);
    assert.strictEqual(result, 'mydb.txt');
  });

  it('handles placeholders with whitespace', () => {
    const view = { name: 'test' };
    const result = renderPath('${ name }.txt', view);
    assert.strictEqual(result, 'test.txt');
  });

  it('handles mixed static and dynamic segments', () => {
    const view = { env: 'prod', version: '2.0' };
    const result = renderPath('configs/${env}/app-${version}.conf', view);
    assert.strictEqual(result, 'configs/prod/app-2.0.conf');
  });

  it('handles empty string value', () => {
    const view = { name: '' };
    const result = renderPath('${name}.txt', view);
    assert.strictEqual(result, '.txt');
  });

  it('handles zero value', () => {
    const view = { index: 0 };
    const result = renderPath('file-${index}.txt', view);
    assert.strictEqual(result, 'file-0.txt');
  });

  it('handles path with no placeholders and multiple segments', () => {
    const view = {};
    const result = renderPath('static/nested/file.txt', view);
    assert.strictEqual(result, 'static/nested/file.txt');
  });

  // ── Path formulas ($if / $ifn) ────────────────────────────────────

  describe('path formulas', () => {
    it('collapses passing $if in a directory segment (G-2)', () => {
      const view = { prod: true };
      const result = renderPath('$if{prod}/config.yaml', view);
      assert.strictEqual(result, 'config.yaml');
    });

    it('collapses multiple passing formulas', () => {
      const view = { a: true, b: true };
      const result = renderPath('$if{a}/$if{b}/file.yaml', view);
      assert.strictEqual(result, 'file.yaml');
    });

    it('passes through literal segments around a formula', () => {
      const view = { prod: true };
      const result = renderPath('configs/$if{prod}/app.yaml', view);
      assert.strictEqual(result, 'configs/app.yaml');
    });

    it('expansion still works alongside formula', () => {
      const view = { prod: true, name: 'api' };
      const result = renderPath('$if{prod}/${name}.yaml', view);
      assert.strictEqual(result, 'api.yaml');
    });

    it('throws for pure formula as filename (G-5)', () => {
      // `$if{a}` as the entire last segment (no suffix) classifies as a
      // formula — filename position is rejected.
      assert.throws(
        () => renderPath('folder/$if{a}', { a: true }),
        /not allowed in a filename/,
      );
    });

    it('throws for formula mixed into filename — malformed (G-5)', () => {
      // `$if{a}.yaml` has extra content after the formula → malformed,
      // thrown at render time.
      assert.throws(
        () => renderPath('folder/$if{a}.yaml', { a: true }),
        /whole segments/,
      );
    });

    it('throws for a malformed mixed segment', () => {
      assert.throws(
        () => renderPath('$if{a}folder/x.yaml', { a: true }),
        /whole segments/,
      );
    });

    it('error message includes relPath', () => {
      assert.throws(
        () => renderPath('folder/$if{x}name.yaml', {}),
        /in 'folder\/\$if\{x\}name\.yaml'/,
      );
    });
  });
});
