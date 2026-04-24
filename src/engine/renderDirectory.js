import path from 'node:path';

import Handlebars from 'handlebars';

import { ensureDir, writeFileSafe } from '../utils/fs.js';
import { renderContent } from './contentRenderer.js';
import { registerPartials } from './partials.js';
import { renderPath } from './pathRenderer.js';
import { walkTemplateTree } from './treeWalker.js';

/**
 * Main rendering orchestrator.
 * @param {import('../types.js').TemplateConfig} cfg
 * @param {typeof import('handlebars')} [hbs] - Optional Handlebars instance (creates an isolated one if omitted)
 * @returns {Promise<void>}
 */
export async function renderDirectory(cfg, hbs) {
  const { templateDir, partialsDir, outDir, view, extname } = cfg;

  hbs = hbs || Handlebars.create();
  await registerPartials(partialsDir, extname, hbs);

  const files = await walkTemplateTree(templateDir, { ext: extname, view });

  for (const file of files) {
    const relRendered = renderPath(file.relPath, view);
    const target = path.join(
      outDir,
      relRendered.replace(new RegExp(`${extname}$`), ''),
    );

    const content = await renderContent(file.absPath, view, hbs, file.relPath);

    await ensureDir(path.dirname(target));
    await writeFileSafe(target, content);
  }
}
