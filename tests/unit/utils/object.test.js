import { describe, it } from "node:test";
import assert from "node:assert";
import { getNested } from "../../../src/utils/object.js";

describe("getNested", () => {
  it("retrieves simple property", () => {
    const obj = { a: 1 };
    assert.strictEqual(getNested(obj, "a"), 1);
  });

  it("retrieves nested property", () => {
    const obj = { a: { b: 2 } };
    assert.strictEqual(getNested(obj, "a.b"), 2);
  });

  it("retrieves deeply nested property", () => {
    const obj = { a: { b: { c: 3 } } };
    assert.strictEqual(getNested(obj, "a.b.c"), 3);
  });

  it("returns undefined for missing property", () => {
    const obj = {};
    assert.strictEqual(getNested(obj, "a"), undefined);
  });

  it("returns undefined for null object", () => {
    assert.strictEqual(getNested(null, "a"), undefined);
  });

  it("returns undefined for undefined object", () => {
    assert.strictEqual(getNested(undefined, "a"), undefined);
  });

  it("handles empty key", () => {
    const obj = { a: 1 };
    // Empty key should return undefined after split/reduce
    const result = getNested(obj, "");
    assert.strictEqual(result, undefined);
  });

  it("returns undefined for invalid nested path", () => {
    const obj = { a: 1 };
    assert.strictEqual(getNested(obj, "a.b.c"), undefined);
  });

  it("handles properties with value 0", () => {
    const obj = { a: 0 };
    assert.strictEqual(getNested(obj, "a"), 0);
  });

  it("handles properties with value false", () => {
    const obj = { a: false };
    assert.strictEqual(getNested(obj, "a"), false);
  });

  it("handles properties with empty string", () => {
    const obj = { a: "" };
    assert.strictEqual(getNested(obj, "a"), "");
  });

  it("returns undefined for properties with null value (current behavior)", () => {
    const obj = { a: null };
    // Current implementation treats null same as undefined
    assert.strictEqual(getNested(obj, "a"), undefined);
  });
});
