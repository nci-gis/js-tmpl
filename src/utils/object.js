/**
 * Retrieve nested value: getNested(obj, "a.b.c")
 */
export function getNested(obj, key) {
  return key
    .split(".")
    .reduce((acc, k) => (acc?.[k] != null ? acc[k] : undefined), obj);
}
