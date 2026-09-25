import path from 'node:path';

import { getNested, hasNested } from '../utils/object.js';
import { classifySegment } from './pathSegment.js';

/**
 * Resolve one `${expr}` for a path. The variable must exist (like `$if{}`
 * guards and `{{var}}`), must be a primitive, and must not contain a path
 * separator: output directories come from template directories, not values.
 * `null` renders as an empty string (present-but-empty, as in templates).
 *
 * @param {string} expr
 * @param {Record<string, unknown>} view
 * @param {string} relPath
 * @returns {string}
 */
function interpolatedValue(expr, view, relPath) {
  if (!hasNested(view, expr)) {
    throw new Error(
      `Path variable '${expr}' is not defined in the view (in '${relPath}').\n` +
        'Add it to values, or remove the placeholder from the template path.',
    );
  }
  const value = getNested(view, expr);
  if (value !== null && typeof value === 'object') {
    const type = Array.isArray(value) ? 'an array' : 'an object';
    throw new Error(
      `Path variable '${expr}' is ${type}; path values must be strings, numbers or booleans (in '${relPath}').`,
    );
  }
  const text = String(value ?? ''); // NOSONAR -- String conversion is intentional here
  if (/[\\/]/.test(text)) {
    throw new Error(
      `Path variable '${expr}' is '${text}', which contains a path separator (in '${relPath}').\n` +
        'Nested output directories come from template directories, not from values.',
    );
  }
  return text;
}

/**
 * Replace every `${var}` placeholder in a segment. The rendered segment must
 * still name something: empty, `.` and `..` are rejected, since `path.join`
 * would silently drop or climb them and move the file.
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
  if (rendered === '' || rendered === '.' || rendered === '..') {
    throw new Error(
      `Path segment '${seg}' renders to '${rendered}', which does not name a file or directory (in '${relPath}').`,
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
    throw new Error(`${c.reason} (in '${relPath}')`);
  }

  // if-formula or ifn-formula
  if (isFilename) {
    throw new Error(
      `Path formula '${seg}' is not allowed in a filename (directories only) — in '${relPath}'`,
    );
  }
  return '';
}

/**
 * Render all segments of `relPath`. `${var}` is expanded; `$if{var}` /
 * `$ifn{var}` directory segments collapse to empty (the walker already
 * decided inclusion). Filename-position formulas and malformed segments
 * throw.
 *
 * @param {string} relPath
 * @param {Record<string, unknown>} view
 * @returns {string}
 */
export function renderPath(relPath, view) {
  const segments = relPath.split(path.sep);
  const lastIdx = segments.length - 1;
  const rendered = segments.map((seg, idx) =>
    renderSegment(seg, idx === lastIdx, view, relPath),
  );
  return path.join(...rendered);
}
