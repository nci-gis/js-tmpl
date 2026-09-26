import fs from 'node:fs/promises';
import path from 'node:path';

import { evalFormula } from './pathFormula.js';

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
  if (!rel || view === undefined) {
    return false;
  }
  return evalFormula(path.basename(rel), view, rel) === 'skip';
}

/**
 * BFS async folder walker.
 *
 * When `view` is provided, directory segments that match path-formula syntax
 * (`$if{var}` / `$ifn{var}`) are evaluated against the view; failing formulas
 * prune the subtree before any filesystem descent (early-exit — no
 * `stat`/`readdir` on skipped paths).
 *
 * Symbolic links are followed. A directory that resolves to one of its own
 * ancestors throws instead of looping; the same directory linked from two
 * places (no cycle) is walked twice.
 *
 * @param {string} rootDir
 * @param {(string | { ext?: string, view?: Record<string, unknown> })} [optsOrExt]
 *   Options object, or a bare `ext` string for back-compat.
 * @returns {Promise<import('../types.js').TemplateFile[]>}
 */
export async function walkTemplateTree(rootDir, optsOrExt) {
  const opts =
    typeof optsOrExt === 'string' ? { ext: optsOrExt } : optsOrExt || {};
  const ext = opts.ext ?? '.hbs';
  const view = opts.view;

  /** @type {import('../types.js').TemplateFile[]} */
  const results = [];
  /** @type {Array<{ rel: string, ancestors: Array<{ rel: string, real: string }> }>} */
  const queue = [{ rel: '', ancestors: [] }];

  while (queue.length) {
    const { rel, ancestors } = /** @type {(typeof queue)[number]} */ (
      queue.shift()
    );
    const abs = path.join(rootDir, rel);
    const stat = await fs.stat(abs);

    if (stat.isDirectory()) {
      if (shouldSkipSubtree(rel, view)) {
        continue;
      }
      const real = await fs.realpath(abs);
      const loop = ancestors.find((a) => a.real === real);
      if (loop) {
        throw new Error(
          `Template directory '${rel}' links back to '${loop.rel || '.'}' (a symbolic link cycle in '${rootDir}').\n` +
            'Remove the link, or point it outside its own parent directories.',
        );
      }
      const chain = [...ancestors, { rel, real }];
      const items = (await fs.readdir(abs)).sort();
      for (const name of items) {
        queue.push({
          rel: rel ? path.join(rel, name) : name,
          ancestors: chain,
        });
      }
    } else if (path.extname(abs) === ext) {
      results.push({ absPath: abs, relPath: rel });
    }
  }

  return results;
}
