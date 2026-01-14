import { describe, it } from "node:test";
import assert from "node:assert";
import { DEFAULTS } from "../../../src/config/defaults.js";

describe("DEFAULTS", () => {
  it("exports default configuration object", () => {
    assert.ok(DEFAULTS);
    assert.strictEqual(typeof DEFAULTS, "object");
  });

  it("has templateDir property", () => {
    assert.strictEqual(DEFAULTS.templateDir, "templates");
  });

  it("has partialsDir property", () => {
    assert.strictEqual(DEFAULTS.partialsDir, "templates.partials");
  });

  it("has valuesDir property", () => {
    assert.strictEqual(DEFAULTS.valuesDir, "templates.values");
  });

  it("has valuesFile property as empty string", () => {
    assert.strictEqual(DEFAULTS.valuesFile, "");
  });

  it("has outDir property", () => {
    assert.strictEqual(DEFAULTS.outDir, "dist");
  });

  it("has extname property", () => {
    assert.strictEqual(DEFAULTS.extname, ".hbs");
  });

  it("contains all expected keys", () => {
    const expectedKeys = [
      "templateDir",
      "partialsDir",
      "valuesDir",
      "valuesFile",
      "outDir",
      "extname",
    ];
    const actualKeys = Object.keys(DEFAULTS);
    assert.deepStrictEqual(actualKeys.sort(), expectedKeys.sort());
  });
});
