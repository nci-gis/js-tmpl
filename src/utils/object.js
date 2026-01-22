/**
 * Retrieve nested value: getNested(obj, "a.b.c")
 */
export function getNested(obj, key) {
  console.log("getNested", obj, key);
  
  return key
    .split(".")
    .reduce((acc, k) => (acc?.[k] ?? undefined), obj);
}
