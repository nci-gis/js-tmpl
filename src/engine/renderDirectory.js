import path from 'node:path';

import Handlebars from 'handlebars';

import { ErrorCodes, JsTmplError } from '../errors.js';
import { ensureDir, isInsideDir, writeFileSafe } from '../utils/fs.js';
import { renderContent } from './contentRenderer.js';
import { registerPartials } from './partials.js';
import { renderPath } from './pathRenderer.js';
import { walkTemplateTree } from './treeWalker.js';

/**
 * Throw if `target` is not strictly inside `outDir`. Path rendering already
 * rejects `..` and separators in values (Round 07); this stays as a second
 * line of defence for anything that reaches the filesystem.
 *
 * @param {string} target
 * @param {string} outDir
 * @param {string} relPath - Template path, for the error message
 * @param {string} rendered - Rendered path, for the error message
 */
function assertInsideOutDir(target, outDir, relPath, rendered) {
  if (!isInsideDir(outDir, target)) {
    throw new JsTmplError(
      ErrorCodes.OUTPUT_OUTSIDE_OUTDIR,
      `Template '${relPath}' renders to '${rendered}', which is outside outDir '${outDir}'.`,
      { details: { relPath, target: rendered } },
    );
  }
}

/**
 * Map every template to its output path before anything is rendered or
 * written, so an escaping path or two templates sharing a target fail
 * before the first file is touched.
 *
 * @param {Array<{ relPath: string, absPath: string }>} files
 * @param {import('../types.js').TemplateConfig} cfg
 * @returns {Array<{ file: { relPath: string, absPath: string }, target: string }>}
 */
function planTargets(files, cfg) {
  const { outDir, view, extname } = cfg;
  /** @type {Map<string, { relPath: string, rendered: string }>} */
  const owners = new Map();

  return files.map((file) => {
    const rendered = renderPath(file.relPath, view).replace(
      new RegExp(`${extname}$`),
      '',
    );
    const target = path.join(outDir, rendered);
    assertInsideOutDir(target, outDir, file.relPath, rendered);

    // Keyed case-insensitively: README.md and readme.md are one file on the
    // default macOS and Windows file systems, so the output would depend on
    // the OS.
    const key = target.toLowerCase();
    const owner = owners.get(key);
    if (owner) {
      const where =
        owner.rendered === rendered
          ? `both render to '${rendered}'`
          : `render to '${owner.rendered}' and '${rendered}', the same file on case-insensitive file systems (macOS, Windows)`;
      throw new JsTmplError(
        ErrorCodes.OUTPUT_COLLISION,
        `Templates '${owner.relPath}' and '${file.relPath}' ${where}.\n` +
          'Each output file must come from exactly one template; check the path values.',
        {
          details: {
            templates: [owner.relPath, file.relPath],
            target: rendered,
          },
        },
      );
    }
    owners.set(key, { relPath: file.relPath, rendered });
    return { file, target };
  });
}

/**
 * Main rendering orchestrator.
 * @param {import('../types.js').TemplateConfig} cfg
 * @param {typeof import('handlebars')} [hbs] - Optional Handlebars instance (creates an isolated one if omitted)
 * @returns {Promise<void>}
 */
export async function renderDirectory(cfg, hbs) {
  const { templateDir, partialsDir, view, extname } = cfg;

  hbs = hbs || Handlebars.create();
  await registerPartials(partialsDir, extname, hbs);

  const files = await walkTemplateTree(templateDir, { ext: extname, view });

  for (const { file, target } of planTargets(files, cfg)) {
    const content = await renderContent(file.absPath, view, hbs, file.relPath);

    await ensureDir(path.dirname(target));
    await writeFileSafe(target, content);
  }
}
