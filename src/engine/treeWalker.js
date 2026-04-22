import fs from 'node:fs/promises';
import path from 'node:path';

import { evalFormula } from './pathFormula.js';

/**
 * BFS async folder walker.
 *
 * When `view` is provided, directory segments that match path-formula syntax
 * (`$if{var}` / `$ifn{var}`) are evaluated against the view; failing formulas
 * prune the subtree before any filesystem descent (early-exit — no
 * `stat`/`readdir` on skipped paths).
 *
 * @param {string} rootDir
 * @param {(string | { ext?: string, view?: Record<string, unknown> })} [optsOrExt]
 *   Options object, or a bare `ext` string for back-compat.
 * @returns {Promise<import('../types.js').TemplateFile[]>}
 */
/**
 * True when a directory's basename is a path formula that evaluates to skip
 * against `view`. Subtree pruning happens here — the walker short-circuits
 * before any `readdir`.
 *
 * @param {string} rel - Relative path from the walk root (empty = root itself)
 * @param {Record<string, unknown> | undefined} view
 * @returns {boolean}
 */
function shouldSkipSubtree(rel, view) {
  if (!rel || view === undefined) {return false;}
  return evalFormula(path.basename(rel), view, rel) === 'skip';
}

export async function walkTemplateTree(rootDir, optsOrExt) {
  const opts =
    typeof optsOrExt === 'string' ? { ext: optsOrExt } : optsOrExt || {};
  const ext = opts.ext ?? '.hbs';
  const view = opts.view;

  /** @type {import('../types.js').TemplateFile[]} */
  const results = [];
  const queue = [''];

  while (queue.length) {
    const rel = /** @type {string} */ (queue.shift());
    const abs = path.join(rootDir, rel);
    const stat = await fs.stat(abs);

    if (stat.isDirectory()) {
      if (shouldSkipSubtree(rel, view)) {continue;}
      const items = (await fs.readdir(abs)).sort();
      for (const name of items) {
        queue.push(rel ? path.join(rel, name) : name);
      }
    } else if (path.extname(abs) === ext) {
      results.push({ absPath: abs, relPath: rel });
    }
  }

  return results;
}
