import assert from 'node:assert';
import { describe, it } from 'node:test';

import { evalFormula } from '../../../src/engine/pathFormula.js';

describe('evalFormula', () => {
  describe('non-formula segments pass through', () => {
    it('returns pass for literal segment', () => {
      assert.strictEqual(evalFormula('foo', {}), 'pass');
    });

    it('returns pass for interpolation segment', () => {
      assert.strictEqual(evalFormula('${name}', { name: 'x' }), 'pass');
    });

    it('returns pass for empty segment', () => {
      assert.strictEqual(evalFormula('', {}), 'pass');
    });
  });

  describe('$if — truthy passes, falsy skips', () => {
    it('passes when value is truthy (string)', () => {
      assert.strictEqual(evalFormula('$if{flag}', { flag: 'yes' }), 'pass');
    });

    it('passes when value is truthy (true)', () => {
      assert.strictEqual(evalFormula('$if{flag}', { flag: true }), 'pass');
    });

    it('passes when value is truthy (number)', () => {
      assert.strictEqual(evalFormula('$if{flag}', { flag: 1 }), 'pass');
    });

    it('passes when value is truthy (object)', () => {
      assert.strictEqual(evalFormula('$if{flag}', { flag: {} }), 'pass');
    });

    it('passes when value is truthy (array)', () => {
      assert.strictEqual(evalFormula('$if{flag}', { flag: [] }), 'pass');
    });

    it('skips when value is false', () => {
      assert.strictEqual(evalFormula('$if{flag}', { flag: false }), 'skip');
    });

    it('skips when value is 0', () => {
      assert.strictEqual(evalFormula('$if{flag}', { flag: 0 }), 'skip');
    });

    it('skips when value is empty string', () => {
      assert.strictEqual(evalFormula('$if{flag}', { flag: '' }), 'skip');
    });

    it('skips when value is null', () => {
      assert.strictEqual(evalFormula('$if{flag}', { flag: null }), 'skip');
    });

    it('skips when value is explicit undefined', () => {
      assert.strictEqual(evalFormula('$if{flag}', { flag: undefined }), 'skip');
    });
  });

  describe('$ifn — inverts $if', () => {
    it('skips when value is truthy', () => {
      assert.strictEqual(evalFormula('$ifn{flag}', { flag: true }), 'skip');
    });

    it('passes when value is false', () => {
      assert.strictEqual(evalFormula('$ifn{flag}', { flag: false }), 'pass');
    });

    it('passes when value is null', () => {
      assert.strictEqual(evalFormula('$ifn{flag}', { flag: null }), 'pass');
    });

    it('passes when value is 0', () => {
      assert.strictEqual(evalFormula('$ifn{flag}', { flag: 0 }), 'pass');
    });
  });

  describe('nested variable access', () => {
    it('resolves a.b.c', () => {
      const view = { features: { monitoring: { enabled: true } } };
      assert.strictEqual(
        evalFormula('$if{features.monitoring.enabled}', view),
        'pass',
      );
    });

    it('skips when deep value is falsy', () => {
      const view = { features: { monitoring: { enabled: false } } };
      assert.strictEqual(
        evalFormula('$if{features.monitoring.enabled}', view),
        'skip',
      );
    });
  });

  describe('G-4 — missing var throws', () => {
    it('throws when top-level var is missing', () => {
      assert.throws(
        () => evalFormula('$if{missing}', {}),
        /undefined view variable 'missing'/,
      );
    });

    it('throws when nested var is missing', () => {
      assert.throws(
        () => evalFormula('$if{a.b.c}', { a: {} }),
        /undefined view variable 'a.b.c'/,
      );
    });

    it('throws when intermediate path is not an object', () => {
      assert.throws(
        () => evalFormula('$if{a.b}', { a: 'string' }),
        /undefined view variable 'a.b'/,
      );
    });

    it('includes relPath in error when provided', () => {
      assert.throws(
        () =>
          evalFormula('$if{missing}', {}, 'templates/$if{missing}/file.hbs'),
        /in 'templates\/\$if\{missing\}\/file\.hbs'/,
      );
    });

    it('does NOT throw for present-but-null (treats as falsy per G-3)', () => {
      assert.strictEqual(evalFormula('$if{flag}', { flag: null }), 'skip');
    });

    it('does NOT throw for present-but-undefined (treats as falsy per G-3)', () => {
      assert.strictEqual(evalFormula('$if{flag}', { flag: undefined }), 'skip');
    });
  });

  describe('G-5 — malformed segment throws', () => {
    it('throws for mixed segment $if{a}folder', () => {
      assert.throws(() => evalFormula('$if{a}folder', {}), /whole segments/);
    });

    it('throws for $if{} empty var', () => {
      assert.throws(() => evalFormula('$if{}', {}), /whole segments/);
    });

    it('includes relPath in error when provided', () => {
      assert.throws(
        () => evalFormula('$if{a}folder', {}, 'templates/$if{a}folder/x.hbs'),
        /\(in 'templates\/\$if\{a\}folder\/x\.hbs'\)/,
      );
    });
  });

  describe('var whitespace tolerance', () => {
    it('trims whitespace inside braces', () => {
      assert.strictEqual(evalFormula('$if{ flag }', { flag: true }), 'pass');
    });
  });
});
