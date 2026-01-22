import assert from "node:assert";
import { describe, it } from "node:test";

import { buildView } from "../../../src/config/view.js";

describe("buildView", () => {
  it("builds view with values and env", () => {
    const values = { name: "test", version: "1.0.0" };
    const env = { NODE_ENV: "test" };

    const view = buildView(values, env);

    assert.deepStrictEqual(view, {
      name: "test",
      version: "1.0.0",
      env: { NODE_ENV: "test" },
    });
  });

  it("uses process.env when env not provided", () => {
    const values = { name: "test" };

    const view = buildView(values);

    assert.strictEqual(view.name, "test");
    assert.strictEqual(view.env, process.env);
  });

  it("handles empty values object", () => {
    const values = {};
    const env = { NODE_ENV: "production" };

    const view = buildView(values, env);

    assert.deepStrictEqual(view, {
      env: { NODE_ENV: "production" },
    });
  });

  it("spreads all values properties", () => {
    const values = {
      name: "app",
      config: { port: 3000 },
      list: [1, 2, 3],
    };
    const env = {};

    const view = buildView(values, env);

    assert.strictEqual(view.name, "app");
    assert.deepStrictEqual(view.config, { port: 3000 });
    assert.deepStrictEqual(view.list, [1, 2, 3]);
    assert.deepStrictEqual(view.env, {});
  });

  it("env property takes precedence over values.env", () => {
    const values = { name: "test", env: "should-be-overridden" };
    const env = { NODE_ENV: "test" };

    const view = buildView(values, env);

    assert.strictEqual(view.name, "test");
    assert.deepStrictEqual(view.env, { NODE_ENV: "test" });
  });

  it("handles nested object structures in values", () => {
    const values = {
      app: {
        name: "myapp",
        settings: {
          debug: true,
        },
      },
    };
    const env = {};

    const view = buildView(values, env);

    assert.deepStrictEqual(view.app, {
      name: "myapp",
      settings: { debug: true },
    });
  });
});
