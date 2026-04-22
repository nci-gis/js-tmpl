import path from 'node:path';

import { getNested } from '../utils/object.js';
import { classifySegment } from './pathSegment.js';

/**
 * Replace every `${var}` placeholder in a segment with the nested view value.
 * Missing values render as empty strings (existing behavior, unchanged).
 *
 * @param {string} seg
 * @param {Record<string, unknown>} view
 * @returns {string}
 */
function expandInterpolations(seg, view) {
  return seg.replaceAll(/\$\{([^}]+)\}/g, (_, expr) => {
    const v = getNested(view, expr.trim());
    return String(v ?? ''); // NOSONAR -- String conversion is intentional here
  });
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

  if (c.kind === 'literal') {return seg;}
  if (c.kind === 'interpolation') {return expandInterpolations(seg, view);}
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
