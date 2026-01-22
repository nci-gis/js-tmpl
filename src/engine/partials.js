import fs from "node:fs/promises";
import path from "node:path";

import Handlebars from "handlebars";

/**
 * Register partials from a directory.
 * - root partials use prefix "_"
 * - group partials under "@group"
 */
export async function registerPartials(partialsDir, ext = ".hbs") {
  const entries = await fs.readdir(partialsDir, { withFileTypes: true });

  for (const entry of entries) {
    const abs = path.join(partialsDir, entry.name);

    if (entry.isDirectory()) {
      // handle namespacing
      if (entry.name.startsWith("@")) {
        const group = entry.name.slice(1);
        const groupFiles = await fs.readdir(abs);

        for (const f of groupFiles) {
          if (!f.endsWith(ext)) {continue;}
          const key = path.basename(f, ext);
          const name = `${group}.${key}`;
          const content = await fs.readFile(path.join(abs, f), "utf8");
          Handlebars.registerPartial(name, content);
        }
      }
      continue;
    }

    // root partial
    if (entry.name.startsWith("_") && entry.name.endsWith(ext)) {
      const content = await fs.readFile(abs, "utf8");
      const key = entry.name.slice(1, -ext.length);
      Handlebars.registerPartial(key, content);
    }
  }
}
