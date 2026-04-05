import fs from 'node:fs/promises';
import path from 'node:path';

const VALID_SEGMENT = /^\w+$/;

/**
 * Validate a partial name segment (directory or file basename).
 * @param {string[]} segments
 * @param {string} filePath
 */
function validateSegments(segments, filePath) {
  if (!VALID_SEGMENT.test(segments.join(''))) {
    throw new Error(
      `Invalid partial name segment '${segments.join('>')}' in ${filePath} — only alphanumeric and underscore allowed`,
    );
  }
}

/**
 * Derive a partial entry from a file path.
 *
 * @param {string} partialsDir - Root partials directory
 * @param {string} ext - Template extension (e.g. ".hbs")
 * @param {string} filePath - Relative path from partialsDir
 * @param {boolean} isFlat - If true, register by filename only; otherwise namespace by path
 * @returns {{ name: string, source: string }}
 */
function processPartialFile(partialsDir, ext, filePath, isFlat) {
  const abs = path.join(partialsDir, filePath);

  // Flat by filename: "name.hbs" → "name"
  if (isFlat) {
    const name = path.basename(filePath, ext);
    validateSegments([name], abs);
    return { name, source: abs };
  }

  // Namespace by path, e.g.:
  // - "dir/name.hbs" → "dir.name"
  // - "dir/sub/name.hbs" → "dir.sub.name"
  // - "name.hbs" → "name" (no nesting).
  const segments = filePath.slice(0, -ext.length).split(path.sep);
  validateSegments(segments, abs);
  return { name: segments.join('.'), source: abs };
}

/**
 * Scan partialsDir recursively and collect all partial entries.
 * @param {string} partialsDir
 * @param {string} ext
 * @returns {Promise<Array<{ name: string, source: string }>>}
 */
async function scanPartialFiles(partialsDir, ext) {
  const allFiles = await fs.readdir(partialsDir, { recursive: true });

  return allFiles
    .filter((f) => f.endsWith(ext))
    .map((f) => {
      const isFlat = f.startsWith('@');
      return processPartialFile(partialsDir, ext, f, isFlat);
    });
}

/**
 * Check for duplicate partial names and throw if found.
 * @param {Array<{ name: string, source: string }>} entries
 * @param {string} partialsDir
 */
function checkDuplicates(entries, partialsDir) {
  /** @type {Map<string, string>} */
  const seen = new Map();

  for (const entry of entries) {
    const existing = seen.get(entry.name);
    if (existing) {
      const rel1 = path.relative(partialsDir, existing);
      const rel2 = path.relative(partialsDir, entry.source);
      throw new Error(
        `Duplicate partial name '${entry.name}' — registered by both:\n` +
          `  - ${rel1}\n` +
          `  - ${rel2}\n` +
          `Use namespaced directories to avoid collisions.`,
      );
    }
    seen.set(entry.name, entry.source);
  }
}

/**
 * Register partials from a directory onto a Handlebars instance.
 *
 * Naming conventions:
 *   - `name.hbs` in root → "name"
 *   - `dir/name.hbs` → "dir.name" (namespaced by directory path)
 *   - `@dir/` at root → flatten entire subtree (filename only)
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
