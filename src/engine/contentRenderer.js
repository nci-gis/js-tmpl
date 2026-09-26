import fs from 'node:fs/promises';
import path from 'node:path';

import Handlebars from 'handlebars';

import { ErrorCodes, JsTmplError } from '../errors.js';
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
    const { code, details } = classify(msg);
    const text =
      code === ErrorCodes.TEMPLATE_MISSING_VALUE && details
        ? `"${details.variable}" is not defined in the view (line ${details.line}, column ${details.column})`
        : msg;
    throw new JsTmplError(code, `Template '${label}': ${text}`, {
      details: { relPath: label, ...details },
      cause: err,
    });
  }
}

/**
 * Map a Handlebars 4.x error message to an error code. Handlebars has no
 * codes of its own; the patterns are pinned by tests.
 *
 * @param {string} message
 * @returns {{ code: string, details?: Record<string, unknown> }}
 */
function classify(message) {
  const missing = message.match(/^"([^"]+)" not defined in .* - (\d+):(\d+)/);
  if (missing) {
    return {
      code: ErrorCodes.TEMPLATE_MISSING_VALUE,
      details: {
        variable: missing[1],
        line: Number(missing[2]),
        column: Number(missing[3]),
      },
    };
  }
  if (/^Parse error|^Expecting/.test(message)) {
    return { code: ErrorCodes.TEMPLATE_SYNTAX };
  }
  return { code: ErrorCodes.TEMPLATE_RENDER_FAILED };
}
