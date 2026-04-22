import fs from 'node:fs/promises';
import path from 'node:path';

import Handlebars from 'handlebars';

/**
 * Render a template file with Handlebars against the view.
 *
 * Strict mode (VP-9): `{{var}}` on an undefined path throws rather than
 * rendering empty. The error includes the template's relative path — this
 * makes forgotten values a loud failure, not a silent blank.
 *
 * @param {string} filePath - Absolute path to the template file.
 * @param {Record<string, unknown>} view
 * @param {typeof Handlebars} [hbs] - Scoped Handlebars instance; falls back to global.
 * @param {string} [relPath] - Relative path (from templateDir), used in error messages.
 * @returns {Promise<string>}
 */
export async function renderContent(filePath, view, hbs, relPath) {
  const raw = await fs.readFile(filePath, 'utf8');
  const compile = (hbs || Handlebars).compile(raw, { strict: true });
  try {
    return compile(view);
  } catch (err) {
    const label = relPath || path.basename(filePath);
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Template '${label}': ${msg}`);
  }
}
