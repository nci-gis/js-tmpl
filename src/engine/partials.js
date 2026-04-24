import fs from 'node:fs/promises';

import {
  assertNoDuplicate,
  assertValidSegments,
  deriveNamespace,
} from '../utils/namespacing.js';

/**
 * Derive a partial entry from a relative file path.
 *
 * @param {string} partialsDir - Root partials directory
 * @param {string} ext - Template extension (e.g. ".hbs")
 * @param {string} filePath - Relative path from partialsDir
 * @returns {{ name: string, source: string }}
 */
function processPartialFile(partialsDir, ext, filePath) {
  const abs = `${partialsDir}/${filePath}`;
  const segments = deriveNamespace({ relPath: filePath, ext });
  assertValidSegments(segments, abs, 'partial name');
  return { name: segments.join('.'), source: abs };
}

/**
 * Scan partialsDir recursively and collect all partial entries.
 *
 * @param {string} partialsDir
 * @param {string} ext
 * @returns {Promise<Array<{ name: string, source: string }>>}
 */
async function scanPartialFiles(partialsDir, ext) {
  const allFiles = await fs.readdir(partialsDir, { recursive: true });

  return allFiles
    .filter((f) => f.endsWith(ext))
    .map((f) => processPartialFile(partialsDir, ext, f));
}

/**
 * Throw on duplicate partial names.
 *
 * @param {Array<{ name: string, source: string }>} entries
 * @param {string} partialsDir
 */
function checkDuplicates(entries, partialsDir) {
  /** @type {Map<string, string>} */
  const seen = new Map();
  for (const entry of entries) {
    assertNoDuplicate(
      seen,
      entry.name,
      entry.source,
      partialsDir,
      'partial name',
    );
  }
}

/**
 * Register partials from a directory onto a Handlebars instance.
 *
 * Naming conventions:
 * - `name.hbs` in root → "name"
 * - `dir/name.hbs` → "dir.name" (namespaced by directory path)
 * - `@<name>/` anywhere in the path flattens the chain: the key is the
 *   file's basename. Root-independent — scanning `partials/` vs
 *   `partials/foo/` yields the same key for `partials/foo/@shared/x.hbs`.
 *
 * Throws on duplicate partial names or invalid name segments.
 * Skips silently if partialsDir is falsy. Throws if the directory does not exist.
 *
 * @param {string} partialsDir - Path to partials directory
 * @param {string} ext - Template file extension (e.g. ".hbs")
 * @param {import('handlebars')} hbs - Handlebars instance to register partials on
 */
export async function registerPartials(partialsDir, ext, hbs) {
  if (!partialsDir) {
    return;
  }

  const allPartials = await scanPartialFiles(partialsDir, ext);

  checkDuplicates(allPartials, partialsDir);

  for (const p of allPartials) {
    const content = await fs.readFile(p.source, 'utf8');
    hbs.registerPartial(p.name, content);
  }
}
