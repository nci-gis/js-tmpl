import assert from 'node:assert';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  assertNoDuplicate,
  assertValidSegments,
  deriveNamespace,
  SEGMENT_RE,
} from '../../../src/utils/namespacing.js';

describe('SEGMENT_RE', () => {
  it('accepts alphanumeric and underscore', () => {
    assert.ok(SEGMENT_RE.test('foo_bar1'));
  });

  it('rejects hyphen', () => {
    assert.ok(!SEGMENT_RE.test('foo-bar'));
  });

  it('rejects dot', () => {
    assert.ok(!SEGMENT_RE.test('foo.bar'));
  });

  it('rejects empty', () => {
    assert.ok(!SEGMENT_RE.test(''));
  });
});

describe('assertValidSegments', () => {
  it('passes valid segments', () => {
    assert.doesNotThrow(() => assertValidSegments(['foo', 'bar'], 'x.yaml'));
  });

  it('throws on invalid segment', () => {
    assert.throws(
      () => assertValidSegments(['foo', 'has-hyphen'], 'x.yaml'),
      /Invalid namespace segment 'foo>has-hyphen' in x\.yaml/,
    );
  });
});

describe('assertNoDuplicate', () => {
  it('allows unique keys', () => {
    const seen = new Map();
    assert.doesNotThrow(() =>
      assertNoDuplicate(seen, 'foo', '/root/foo.yaml', '/root'),
    );
    assert.doesNotThrow(() =>
      assertNoDuplicate(seen, 'bar', '/root/bar.yaml', '/root'),
    );
  });

  it('throws on duplicate, naming both paths', () => {
    const seen = new Map();
    assertNoDuplicate(seen, 'foo', '/root/a/foo.yaml', '/root');
    assert.throws(
      () => assertNoDuplicate(seen, 'foo', '/root/b/foo.yaml', '/root'),
      /Duplicate namespace 'foo'/,
    );
    try {
      assertNoDuplicate(seen, 'foo', '/root/b/foo.yaml', '/root');
    } catch (err) {
      assert.match(err.message, /a\/foo\.yaml/);
      assert.match(err.message, /b\/foo\.yaml/);
    }
  });
});

describe('deriveNamespace', () => {
  it('chains nested paths', () => {
    assert.deepStrictEqual(
      deriveNamespace({ relPath: path.join('env', 'prod.yaml'), ext: '.yaml' }),
      ['env', 'prod'],
    );
  });

  it('single file resolves to [basename]', () => {
    assert.deepStrictEqual(
      deriveNamespace({ relPath: 'app.yaml', ext: '.yaml' }),
      ['app'],
    );
  });

  it('deep nesting preserves the chain', () => {
    assert.deepStrictEqual(
      deriveNamespace({
        relPath: path.join('a', 'b', 'c.yaml'),
        ext: '.yaml',
      }),
      ['a', 'b', 'c'],
    );
  });

  describe('@ flatten — root-independent', () => {
    it('@ at top level flattens to [basename]', () => {
      assert.deepStrictEqual(
        deriveNamespace({
          relPath: path.join('@shared', 'app.yaml'),
          ext: '.yaml',
        }),
        ['app'],
      );
    });

    it('@ at nested level also flattens (root-independence)', () => {
      assert.deepStrictEqual(
        deriveNamespace({
          relPath: path.join('env', '@overrides', 'app.yaml'),
          ext: '.yaml',
        }),
        ['app'],
      );
    });

    it('deeply nested @ flattens the entire chain', () => {
      assert.deepStrictEqual(
        deriveNamespace({
          relPath: path.join('a', 'b', '@lib', 'c', 'deep.yaml'),
          ext: '.yaml',
        }),
        ['deep'],
      );
    });

    it('multiple @ segments still produce [basename]', () => {
      assert.deepStrictEqual(
        deriveNamespace({
          relPath: path.join('@a', '@b', 'x.yaml'),
          ext: '.yaml',
        }),
        ['x'],
      );
    });

    it('segment that is just "@" is not a flatten marker (treated as literal)', () => {
      // FLATTEN_SEGMENT_RE requires @ followed by one or more word chars.
      assert.deepStrictEqual(
        deriveNamespace({ relPath: path.join('@', 'x.yaml'), ext: '.yaml' }),
        ['@', 'x'],
      );
    });
  });

  describe('ext handling', () => {
    it('strips the provided extension', () => {
      assert.deepStrictEqual(
        deriveNamespace({ relPath: 'config.json', ext: '.json' }),
        ['config'],
      );
    });

    it('leaves path unchanged if extension does not match', () => {
      // Defensive: caller is responsible for passing the right ext.
      assert.deepStrictEqual(
        deriveNamespace({ relPath: 'config.yaml', ext: '.json' }),
        ['config.yaml'],
      );
    });
  });
});
