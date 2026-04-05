/**
 * Retrieve nested value: getNested(obj, "a.b.c")
 * @param {Record<string, unknown>} obj
 * @param {string} key
 * @returns {unknown}
 */
export function getNested(obj, key) {
  return key
    .split('.')
    .reduce(
      (/** @type {unknown} */ acc, /** @type {string} */ k) =>
        /** @type {Record<string, unknown>} */ (acc)?.[k] ?? undefined,
      obj,
    );
}
