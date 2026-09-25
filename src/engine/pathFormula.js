import { ErrorCodes, JsTmplError } from '../errors.js';
import { getNested, hasNested } from '../utils/object.js';
import { classifySegment } from './pathSegment.js';

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
    throw new JsTmplError(
      ErrorCodes.GUARD_MALFORMED,
      relPath
        ? `${c.reason} (in '${relPath}')`
        : /** @type {string} */ (c.reason),
      { details: { relPath, segment } },
    );
  }

  const varPath = /** @type {string} */ (c.var);

  if (!hasNested(view, varPath)) {
    const where = relPath ? ` in '${relPath}'` : '';
    throw new JsTmplError(
      ErrorCodes.GUARD_MISSING_VAR,
      `Path formula '${segment}'${where} references undefined view variable '${varPath}'`,
      { details: { relPath, segment, variable: varPath } },
    );
  }

  const value = getNested(view, varPath);
  const truthy = Boolean(value);
  const condition = c.kind === 'if-formula' ? truthy : !truthy;
  return condition ? 'pass' : 'skip';
}
