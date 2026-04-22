import assert from 'node:assert';
import { describe, it } from 'node:test';

import { classifySegment } from '../../../src/engine/pathSegment.js';

describe('classifySegment', () => {
  describe('literal', () => {
    it('classifies plain directory names', () => {
      assert.deepStrictEqual(classifySegment('foo'), { kind: 'literal' });
    });

    it('classifies empty segment', () => {
      assert.deepStrictEqual(classifySegment(''), { kind: 'literal' });
    });

    it('classifies dotted/hyphenated names', () => {
      assert.deepStrictEqual(classifySegment('my-file.yaml.hbs'), {
        kind: 'literal',
      });
    });

    it('does not misclassify typos like $iff{a}', () => {
      // Not a formula: `$if` is not followed by `{`. Not a substring match either
      // (no `$if{` present). Passes through as literal, per plan parse rule #3.
      assert.deepStrictEqual(classifySegment('$iff{a}'), { kind: 'literal' });
    });
  });

  describe('interpolation', () => {
    it('classifies a whole-segment placeholder', () => {
      assert.deepStrictEqual(classifySegment('${name}'), {
        kind: 'interpolation',
      });
    });

    it('classifies a segment with embedded placeholder', () => {
      assert.deepStrictEqual(classifySegment('pre${var}post'), {
        kind: 'interpolation',
      });
    });

    it('classifies multiple placeholders in one segment', () => {
      assert.deepStrictEqual(classifySegment('${a}-${b}'), {
        kind: 'interpolation',
      });
    });
  });

  describe('if-formula', () => {
    it('classifies simple $if{var}', () => {
      assert.deepStrictEqual(classifySegment('$if{debug}'), {
        kind: 'if-formula',
        var: 'debug',
      });
    });

    it('classifies $if with nested access', () => {
      assert.deepStrictEqual(
        classifySegment('$if{features.monitoring.enabled}'),
        {
          kind: 'if-formula',
          var: 'features.monitoring.enabled',
        },
      );
    });

    it('trims whitespace inside the braces', () => {
      assert.deepStrictEqual(classifySegment('$if{ debug }'), {
        kind: 'if-formula',
        var: 'debug',
      });
    });
  });

  describe('ifn-formula', () => {
    it('classifies simple $ifn{var}', () => {
      assert.deepStrictEqual(classifySegment('$ifn{debug}'), {
        kind: 'ifn-formula',
        var: 'debug',
      });
    });

    it('classifies $ifn with nested access', () => {
      assert.deepStrictEqual(classifySegment('$ifn{flags.legacy}'), {
        kind: 'ifn-formula',
        var: 'flags.legacy',
      });
    });
  });

  describe('malformed', () => {
    it('flags mixed segment: formula followed by literal', () => {
      const result = classifySegment('$if{a}folder');
      assert.strictEqual(result.kind, 'malformed');
      assert.match(result.reason || '', /whole segments/);
      assert.match(result.reason || '', /\$if\{a\}folder/);
    });

    it('flags mixed segment: literal followed by formula', () => {
      const result = classifySegment('folder$if{a}');
      assert.strictEqual(result.kind, 'malformed');
    });

    it('flags two formulas in one segment', () => {
      const result = classifySegment('$if{a}$if{b}');
      assert.strictEqual(result.kind, 'malformed');
    });

    it('flags $if{} with empty var', () => {
      const result = classifySegment('$if{}');
      assert.strictEqual(result.kind, 'malformed');
    });

    it('flags unterminated $if{a', () => {
      const result = classifySegment('$if{a');
      assert.strictEqual(result.kind, 'malformed');
    });

    it('flags $ifn mixed with literal', () => {
      const result = classifySegment('$ifn{a}suffix');
      assert.strictEqual(result.kind, 'malformed');
    });

    it('flags $if{a}${b} — formula plus interpolation', () => {
      const result = classifySegment('$if{a}${b}');
      assert.strictEqual(result.kind, 'malformed');
    });
  });

  describe('totality — classifier never throws', () => {
    const inputs = [
      '',
      ' ',
      '\t',
      '$',
      '${',
      '${}',
      '$if',
      '$if{',
      '$if{}',
      '$if{a}$if{b}$if{c}',
      '..',
      'a/b',
    ];

    for (const input of inputs) {
      it(`returns a classification for ${JSON.stringify(input)}`, () => {
        const result = classifySegment(input);
        assert.ok(
          [
            'literal',
            'interpolation',
            'if-formula',
            'ifn-formula',
            'malformed',
          ].includes(result.kind),
          `unexpected kind: ${result.kind}`,
        );
      });
    }
  });
});
