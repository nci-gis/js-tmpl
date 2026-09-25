import fs from 'node:fs/promises';
import path from 'node:path';

import Handlebars from 'handlebars';

import { compileStrict } from './strictCompile.js';

/**
 * Render a template file with Handlebars against the view.
 *
 * Strict mode (VP-9): a path that does not exist in the view throws rather
 * than rendering empty — in `{{var}}` and, via compileStrict, in helper and
 * block-helper arguments (`{{#if var}}`, `{{upper var}}`). The error includes
 * the template's relative path.
 *
 * @param {string} filePath - Absolute path to the template file.
 * @param {Record<string, unknown>} view
 * @param {typeof Handlebars} [hbs] - Scoped Handlebars instance; falls back to global.
 * @param {string} [relPath] - Relative path (from templateDir), used in error messages.
 * @returns {Promise<string>}
 */
export async function renderContent(filePath, view, hbs, relPath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const template = compileStrict(hbs || Handlebars, raw);
  try {
    return template(view);
  } catch (err) {
    const label = relPath || path.basename(filePath);
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Template '${label}': ${msg}`);
  }
}
