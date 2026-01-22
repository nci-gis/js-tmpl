import path from "node:path";

import { ensureDir, writeFileSafe } from "../utils/fs.js";
import { renderContent } from "./contentRenderer.js";
import { registerPartials } from "./partials.js";
import { renderPath } from "./pathRenderer.js";
import { walkTemplateTree } from "./treeWalker.js";

/**
 * Main rendering orchestrator.
 */
export async function renderDirectory(cfg) {
  const { templateDir, partialsDir, outDir, view, extname } = cfg;

  await registerPartials(partialsDir, extname);

  const files = await walkTemplateTree(templateDir, extname);

  for (const file of files) {
    const relRendered = renderPath(file.relPath, view);
    const target = path.join(
      outDir,
      relRendered.replace(new RegExp(`${extname}$`), "")
    );

    const content = await renderContent(file.absPath, view);

    await ensureDir(path.dirname(target));
    await writeFileSafe(target, content);
  }
}
