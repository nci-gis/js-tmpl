import { getNested } from '../utils/object.js';
import { classifySegment } from './pathSegment.js';

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
function hasNested(view, key) {
  const parts = key.split('.');
  let cur = view;
  for (let i = 0; i < parts.length - 1; i++) {
    if (cur === null || cur === undefined || typeof cur !== 'object')
      {return false;}
    cur = /** @type {Record<string, unknown>} */ (cur)[parts[i]];
  }
  if (cur === null || cur === undefined || typeof cur !== 'object')
    {return false;}
  return Object.prototype.hasOwnProperty.call(cur, parts[parts.length - 1]);
}

/**
 * Evaluate a single path segment against `view`.
 *
 * Returns `'pass'` for non-formula segments (literal, interpolation) and for
 * formulas whose condition is satisfied. Returns `'skip'` when a formula's
 * condition fails. Throws on malformed segments (G-5) or missing vars (G-4).
 *
 * Semantics (from plan):
 * - G-3 JS-truthy rule: `false`, `0`, `''`, `null`, `undefined` → falsy.
 * - G-4 Missing var throws with var name + containing relPath.
 * - `$ifn` inverts `$if`.
 *
 * @param {string} segment
 * @param {Record<string, unknown>} view
 * @param {string} [relPath] - Used to enrich error messages; optional.
 * @returns {'pass' | 'skip'}
 */
export function evalFormula(segment, view, relPath) {
  const c = classifySegment(segment);

  if (c.kind === 'literal' || c.kind === 'interpolation') {
    return 'pass';
  }

  if (c.kind === 'malformed') {
    throw new Error(
      relPath
        ? `${c.reason} (in '${relPath}')`
        : /** @type {string} */ (c.reason),
    );
  }

  const varPath = /** @type {string} */ (c.var);

  if (!hasNested(view, varPath)) {
    const where = relPath ? ` in '${relPath}'` : '';
    throw new Error(
      `Path formula '${segment}'${where} references undefined view variable '${varPath}'`,
    );
  }

  const value = getNested(view, varPath);
  const truthy = Boolean(value);
  const condition = c.kind === 'if-formula' ? truthy : !truthy;
  return condition ? 'pass' : 'skip';
}
