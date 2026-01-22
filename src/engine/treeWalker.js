import fs from "node:fs/promises";
import path from "node:path";

/**
 * BFS async folder walker.
 */
export async function walkTemplateTree(rootDir, ext = ".hbs", ignore = []) {
  const results = [];
  const queue = [""];

  while (queue.length) {
    const rel = queue.shift();
    const abs = path.join(rootDir, rel);
    const stat = await fs.stat(abs);

    if (stat.isDirectory()) {
      const items = await fs.readdir(abs);
      for (const name of items) {
        if (ignore.some((i) => matchIgnore(name, i))) {continue;}
        queue.push(rel ? path.join(rel, name) : name);
      }
    } else if (path.extname(abs) === ext) {
      results.push({ absPath: abs, relPath: rel });
    }
  }

  return results;
}

function matchIgnore(name, rule) {
  return rule instanceof RegExp ? rule.test(name) : rule === name;
}
