import assert from 'node:assert';
import { describe, it, mock } from 'node:test';

import { buildView, pickEnv } from '../../../src/config/view.js';

describe('buildView', () => {
  it('builds view with values and env', () => {
    const values = { name: 'test', version: '1.0.0' };
    const env = { NODE_ENV: 'test' };

    const view = buildView(values, env);

    assert.deepStrictEqual(view, {
      name: 'test',
      version: '1.0.0',
      env: { NODE_ENV: 'test' },
    });
  });

  it('defaults env to empty object when not provided', () => {
    const values = { name: 'test' };

    const view = buildView(values);

    assert.strictEqual(view.name, 'test');
    assert.deepStrictEqual(view.env, {});
  });

  it('handles empty values object', () => {
    const values = {};
    const env = { NODE_ENV: 'production' };

    const view = buildView(values, env);

    assert.deepStrictEqual(view, {
      env: { NODE_ENV: 'production' },
    });
  });

  it('spreads all values properties', () => {
    const values = {
      name: 'app',
      config: { port: 3000 },
      list: [1, 2, 3],
    };
    const env = {};

    const view = buildView(values, env);

    assert.strictEqual(view.name, 'app');
    assert.deepStrictEqual(view.config, { port: 3000 });
    assert.deepStrictEqual(view.list, [1, 2, 3]);
    assert.deepStrictEqual(view.env, {});
  });

  it('env is a reserved key — always contains the environment object', () => {
    const values = { name: 'test', env: 'should-be-overridden' };
    const env = { NODE_ENV: 'test' };

    const view = buildView(values, env);

    assert.strictEqual(view.name, 'test');
    assert.deepStrictEqual(view.env, { NODE_ENV: 'test' });
  });

  it('warns when values contain "env" key', () => {
    const warnMock = mock.fn();
    const originalWarn = console.warn;
    console.warn = warnMock;

    try {
      buildView({ env: 'user-value' }, {});
      assert.strictEqual(warnMock.mock.calls.length, 1);
      assert.match(warnMock.mock.calls[0].arguments[0], /reserved key/);
    } finally {
      console.warn = originalWarn;
    }
  });

  it('does not warn when values have no "env" key', () => {
    const warnMock = mock.fn();
    const originalWarn = console.warn;
    console.warn = warnMock;

    try {
      buildView({ name: 'test' }, {});
      assert.strictEqual(warnMock.mock.calls.length, 0);
    } finally {
      console.warn = originalWarn;
    }
  });

  it('handles nested object structures in values', () => {
    const values = {
      app: {
        name: 'myapp',
        settings: {
          debug: true,
        },
      },
    };
    const env = {};

    const view = buildView(values, env);

    assert.deepStrictEqual(view.app, {
      name: 'myapp',
      settings: { debug: true },
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
