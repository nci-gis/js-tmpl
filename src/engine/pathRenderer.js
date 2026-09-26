import path from 'node:path';

import { ErrorCodes, JsTmplError } from '../errors.js';
import { getNested, hasNested } from '../utils/object.js';
import { classifySegment } from './pathSegment.js';

/**
 * Resolve one `${expr}` for a path. The variable must exist (like `$if{}`
 * guards and `{{var}}`) and must be a primitive. A value may nest with `/`
 * (e.g. `skills/group/name`, for depths the template tree cannot express);
 * `\` is rejected on every OS so a tree renders the same everywhere. `null`
 * renders as an empty string (present-but-empty, as in templates).
 *
 * @param {string} expr
 * @param {Record<string, unknown>} view
 * @param {string} relPath
 * @returns {string}
 */
function interpolatedValue(expr, view, relPath) {
  if (!hasNested(view, expr)) {
    throw new JsTmplError(
      ErrorCodes.PATH_MISSING_VAR,
      `Path variable '${expr}' is not defined in the view (in '${relPath}').\n` +
        'Add it to values, or remove the placeholder from the template path.',
      { details: { relPath, variable: expr } },
    );
  }
  const value = getNested(view, expr);
  if (value !== null && typeof value === 'object') {
    const type = Array.isArray(value) ? 'an array' : 'an object';
    throw new JsTmplError(
      ErrorCodes.PATH_INVALID_VALUE,
      `Path variable '${expr}' is ${type}; path values must be strings, numbers or booleans (in '${relPath}').`,
      { details: { relPath, variable: expr } },
    );
  }
  const text = String(value ?? ''); // NOSONAR -- String conversion is intentional here
  if (text.includes('\\')) {
    throw new JsTmplError(
      ErrorCodes.PATH_INVALID_VALUE,
      `Path variable '${expr}' is '${text}', which contains '\\' (in '${relPath}').\n` +
        "Use '/' to nest directories; it works on every OS.",
      { details: { relPath, variable: expr } },
    );
  }
  return text;
}

/**
 * Replace every `${var}` placeholder in a segment. A value may add `/`, so
 * the result can be several segments; each one must still name something:
 * empty, `.` and `..` are rejected, since `path.join` would silently drop or
 * climb them and move the file (this also rules out `/abs`, `a//b`, `../x`).
 *
 * @param {string} seg
 * @param {Record<string, unknown>} view
 * @param {string} relPath
 * @returns {string}
 */
function expandInterpolations(seg, view, relPath) {
  const rendered = seg.replaceAll(/\$\{([^}]+)\}/g, (_, expr) =>
    interpolatedValue(expr.trim(), view, relPath),
  );
  const invalid = rendered
    .split('/')
    .some((part) => part === '' || part === '.' || part === '..');
  if (invalid) {
    throw new JsTmplError(
      ErrorCodes.PATH_EMPTY_SEGMENT,
      `Path segment '${seg}' renders to '${rendered}'; every part must name a file or directory (no empty, '.' or '..' parts) (in '${relPath}').`,
      { details: { relPath, segment: seg } },
    );
  }
  return rendered;
}

/**
 * Render a single segment. Formulas are rejected in filename position (G-5);
 * formulas in directory position are assumed pre-approved by the walker and
 * collapse to an empty string (G-2). Malformed segments throw.
 *
 * @param {string} seg
 * @param {boolean} isFilename
 * @param {Record<string, unknown>} view
 * @param {string} relPath
 * @returns {string}
 */
function renderSegment(seg, isFilename, view, relPath) {
  const c = classifySegment(seg);

  if (c.kind === 'literal') {
    return seg;
  }
  if (c.kind === 'interpolation') {
    return expandInterpolations(seg, view, relPath);
  }
  if (c.kind === 'malformed') {
    throw new JsTmplError(
      ErrorCodes.GUARD_MALFORMED,
      `${c.reason} (in '${relPath}')`,
      { details: { relPath, segment: seg } },
    );
  }

  // if-formula or ifn-formula
  if (isFilename) {
    throw new JsTmplError(
      ErrorCodes.GUARD_IN_FILENAME,
      `Path formula '${seg}' is not allowed in a filename (directories only) — in '${relPath}'`,
      { details: { relPath, segment: seg } },
    );
  }
  return '';
}

/**
 * Render all segments of `relPath` (a `/`-separated template path, as the
 * walker produces on every OS). `${var}` is expanded; `$if{var}` /
 * `$ifn{var}` directory segments collapse to empty (the walker already
 * decided inclusion). Filename-position formulas and malformed segments
 * throw.
 *
 * @param {string} relPath
 * @param {Record<string, unknown>} view
 * @returns {string}
 */
export function renderPath(relPath, view) {
  const segments = relPath.split('/');
  const lastIdx = segments.length - 1;
  const rendered = segments.map((seg, idx) =>
    renderSegment(seg, idx === lastIdx, view, relPath),
  );
  return path.posix.join(...rendered);
}
