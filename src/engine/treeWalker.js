import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * BFS async folder walker.
 * @param {string} rootDir
 * @param {string} [ext]
 * @param {Array<string | RegExp>} [ignore]
 * @returns {Promise<import('../types.js').TemplateFile[]>}
 */
export async function walkTemplateTree(rootDir, ext = '.hbs', ignore = []) {
  const results = [];
  const queue = [''];

  while (queue.length) {
    const rel = /** @type {string} */ (queue.shift());
    const abs = path.join(rootDir, rel);
    const stat = await fs.stat(abs);

    if (stat.isDirectory()) {
      const items = (await fs.readdir(abs)).sort();
      for (const name of items) {
        if (ignore.some((i) => matchIgnore(name, i))) {
          continue;
        }
        queue.push(rel ? path.join(rel, name) : name);
      }
    } else if (path.extname(abs) === ext) {
      results.push({ absPath: abs, relPath: rel });
    }
  }

  return results;
}

/**
 * @param {string} name
 * @param {string | RegExp} rule
 * @returns {boolean}
 */
function matchIgnore(name, rule) {
  return rule instanceof RegExp ? rule.test(name) : rule === name;
}
