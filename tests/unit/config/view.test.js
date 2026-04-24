import assert from 'node:assert';
import { describe, it, mock } from 'node:test';

import { buildView, pickEnv } from '../../../src/config/view.js';

describe('buildView', () => {
  it('builds view with root values and env', () => {
    const view = buildView({
      rootValues: { name: 'test', version: '1.0.0' },
      env: { NODE_ENV: 'test' },
    });

    assert.deepStrictEqual(view, {
      name: 'test',
      version: '1.0.0',
      env: { NODE_ENV: 'test' },
    });
  });

  it('defaults env to empty object when not provided', () => {
    const view = buildView({ rootValues: { name: 'test' } });
    assert.strictEqual(view.name, 'test');
    assert.deepStrictEqual(view.env, {});
  });

  it('handles empty root values', () => {
    const view = buildView({ env: { NODE_ENV: 'production' } });
    assert.deepStrictEqual(view, { env: { NODE_ENV: 'production' } });
  });

  it('handles no arguments at all (VP-8)', () => {
    const view = buildView();
    assert.deepStrictEqual(view, { env: {} });
  });

  it('spreads all root-value properties', () => {
    const view = buildView({
      rootValues: { name: 'app', config: { port: 3000 }, list: [1, 2, 3] },
    });
    assert.strictEqual(view.name, 'app');
    assert.deepStrictEqual(view.config, { port: 3000 });
    assert.deepStrictEqual(view.list, [1, 2, 3]);
    assert.deepStrictEqual(view.env, {});
  });

  it('env is a reserved key — always contains the environment object', () => {
    const view = buildView({
      rootValues: { name: 'test', env: 'should-be-overridden' },
      env: { NODE_ENV: 'test' },
    });
    assert.strictEqual(view.name, 'test');
    assert.deepStrictEqual(view.env, { NODE_ENV: 'test' });
  });

  it('warns when root values contain "env" key', () => {
    const warnMock = mock.fn();
    const originalWarn = console.warn;
    console.warn = warnMock;

    try {
      buildView({ rootValues: { env: 'user-value' } });
      assert.strictEqual(warnMock.mock.calls.length, 1);
      assert.match(warnMock.mock.calls[0].arguments[0], /reserved key/);
    } finally {
      console.warn = originalWarn;
    }
  });

  it('does not warn when root values have no "env" key', () => {
    const warnMock = mock.fn();
    const originalWarn = console.warn;
    console.warn = warnMock;

    try {
      buildView({ rootValues: { name: 'test' } });
      assert.strictEqual(warnMock.mock.calls.length, 0);
    } finally {
      console.warn = originalWarn;
    }
  });

  it('handles nested object structures in root values', () => {
    const view = buildView({
      rootValues: {
        app: { name: 'myapp', settings: { debug: true } },
      },
    });
    assert.deepStrictEqual(view.app, {
      name: 'myapp',
      settings: { debug: true },
    });
  });

  // ── Value partials (Round 03) ─────────────────────────────────────

  describe('value partials', () => {
    it('merges partials namespaces into view', () => {
      const view = buildView({
        rootValues: { name: 'app' },
        partials: { services: { api: { port: 8080 } } },
      });
      assert.strictEqual(view.name, 'app');
      assert.deepStrictEqual(view.services, { api: { port: 8080 } });
    });

    it('C-2 — throws on root-vs-namespace collision', () => {
      assert.throws(
        () =>
          buildView({
            rootValues: { services: { db: {} } },
            partials: { services: { api: { port: 8080 } } },
            valuesFile: '/root/app.yaml',
            valuesDir: '/root/values',
          }),
        /Duplicate view key 'services'/,
      );
    });

    it('C-3 — throws on reserved env namespace in partials', () => {
      assert.throws(
        () =>
          buildView({
            partials: { env: { PROD: '1' } },
            valuesDir: '/root/values',
          }),
        /reserved 'env' namespace/,
      );
    });

    it('rootValues has no conflict with partials for non-overlapping keys', () => {
      const view = buildView({
        rootValues: { project: 'x' },
        partials: { services: { api: {} } },
      });
      assert.strictEqual(view.project, 'x');
      assert.deepStrictEqual(view.services, { api: {} });
    });
  });
});

describe('pickEnv', () => {
  it('picks specified keys from source', () => {
    const source = { NODE_ENV: 'test', SECRET: 'hidden', APP_NAME: 'myapp' };
    const result = pickEnv({ keys: ['NODE_ENV', 'APP_NAME'] }, source);
    assert.deepStrictEqual(result, { NODE_ENV: 'test', APP_NAME: 'myapp' });
  });

  it('returns empty object for empty keys and no prefix', () => {
    const source = { NODE_ENV: 'test' };
    const result = pickEnv({ keys: [], prefix: '' }, source);
    assert.deepStrictEqual(result, {});
  });

  it('silently omits keys not present in source', () => {
    const source = { NODE_ENV: 'test' };
    const result = pickEnv({ keys: ['NODE_ENV', 'MISSING'] }, source);
    assert.deepStrictEqual(result, { NODE_ENV: 'test' });
  });

  it('returns empty object when all keys are missing', () => {
    const source = { NODE_ENV: 'test' };
    const result = pickEnv({ keys: ['MISSING_A', 'MISSING_B'] }, source);
    assert.deepStrictEqual(result, {});
  });

  it('picks keys matching prefix', () => {
    const source = {
      JS_TMPL_FOO: 'foo',
      JS_TMPL_BAR: 'bar',
      OTHER: 'skip',
    };
    const result = pickEnv({ prefix: 'JS_TMPL_' }, source);
    assert.deepStrictEqual(result, {
      JS_TMPL_FOO: 'foo',
      JS_TMPL_BAR: 'bar',
    });
  });

  it('combines explicit keys and prefix matches', () => {
    const source = {
      NODE_ENV: 'prod',
      JS_TMPL_PORT: '3000',
      SECRET: 'hidden',
    };
    const result = pickEnv({ keys: ['NODE_ENV'], prefix: 'JS_TMPL_' }, source);
    assert.deepStrictEqual(result, {
      NODE_ENV: 'prod',
      JS_TMPL_PORT: '3000',
    });
  });

  it('prefix with no matches returns empty object', () => {
    const source = { NODE_ENV: 'test' };
    const result = pickEnv({ prefix: 'JS_TMPL_' }, source);
    assert.deepStrictEqual(result, {});
  });

  it('handles empty source object', () => {
    const result = pickEnv({ keys: ['NODE_ENV'], prefix: 'JS_TMPL_' }, {});
    assert.deepStrictEqual(result, {});
  });
});
