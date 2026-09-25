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

/**
 * Check whether a dotted key path is *present* in `view` as an own property.
 *
 * Distinct from `getNested`, which can't tell "missing" from "present but null/undefined".
 * Required by G-4 (missing var throws) vs G-3 (present-but-falsy fails).
 *
 * @param {unknown} view
 * @param {string} key
 * @returns {boolean}
 */
export function hasNested(view, key) {
  const parts = key.split('.');
  let cur = view;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur === null || cur === undefined || typeof cur !== 'object') {
      return false;
    }
    cur = /** @type {Record<string, unknown>} */ (cur)[parts[i]];
  }
  if (cur === null || cur === undefined || typeof cur !== 'object') {
    return false;
  }
  return Object.hasOwn(cur, parts[parts.length - 1]); // NOSONAR
}
