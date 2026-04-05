import fs from 'node:fs/promises';

import Handlebars from 'handlebars';

/**
 * Render template file with Handlebars & view object.
 * @param {string} filePath
 * @param {object} view
 * @param {typeof Handlebars} [hbs] - Scoped Handlebars instance; falls back to global
 */
export async function renderContent(filePath, view, hbs) {
  const raw = await fs.readFile(filePath, 'utf8');
  const compile = (hbs || Handlebars).compile(raw);
  return compile(view);
}
