/**
 * @typedef {'literal' | 'interpolation' | 'if-formula' | 'ifn-formula' | 'malformed'} SegmentKind
 */

/**
 * @typedef {object} SegmentClassification
 * @property {SegmentKind} kind
 * @property {string} [var] - Trimmed variable expression (if-formula / ifn-formula only).
 * @property {string} [reason] - Human-readable reason (malformed only).
 */

const FORMULA_WHOLE = /^\$(if|ifn)\{([^}]+)\}$/;
const FORMULA_SUBSTR = /\$ifn?\{/;
const INTERPOLATION = /\$\{[^}]+\}/;

/**
 * Classify a single path segment.
 *
 * Pure and total — never throws. Callers dispatch on the returned `kind`.
 *
 * Kinds:
 * - `if-formula`   — whole segment matches `$if{var}`;  `.var` holds the trimmed expression.
 * - `ifn-formula`  — whole segment matches `$ifn{var}`; `.var` holds the trimmed expression.
 * - `malformed`    — contains `$if{` or `$ifn{` but is not a whole-segment formula; `.reason` describes the violation.
 * - `interpolation` — contains one or more `${var}` placeholders.
 * - `literal`      — none of the above.
 *
 * @param {string} segment
 * @returns {SegmentClassification}
 */
export function classifySegment(segment) {
  const m = FORMULA_WHOLE.exec(segment);
  if (m) {
    return {
      kind: m[1] === 'if' ? 'if-formula' : 'ifn-formula',
      var: m[2].trim(),
    };
  }
  if (FORMULA_SUBSTR.test(segment)) {
    return {
      kind: 'malformed',
      reason: `formulas must be whole segments in directory positions, one per segment: got '${segment}'`,
    };
  }
  if (INTERPOLATION.test(segment)) {
    return { kind: 'interpolation' };
  }
  return { kind: 'literal' };
}
