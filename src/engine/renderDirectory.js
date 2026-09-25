import fs from 'node:fs';
import path from 'node:path';

import Handlebars from 'handlebars';

import { ErrorCodes, JsTmplError } from '../errors.js';
import {
  ensureDir,
  isInsideDir,
  realPathOfNearest,
  writeFileSafe,
} from '../utils/fs.js';
import { renderContent } from './contentRenderer.js';
import { registerPartials } from './partials.js';
import { renderPath } from './pathRenderer.js';
import { walkTemplateTree } from './treeWalker.js';

/**
 * Map every template to its output path before anything is rendered or
 * written, so two templates sharing a target fail before the first file is
 * touched. Path rendering already rejects `..` and empty parts; containment
 * against the real disk is checked in writeTargets.
 *
 * @param {Array<{ relPath: string, absPath: string }>} files
 * @param {import('../types.js').TemplateConfig} cfg
 * @returns {Array<{ file: { relPath: string, absPath: string }, target: string }>}
 */
function planTargets(files, cfg) {
  const { outDir, view, extname } = cfg;
  const portable = (cfg.targetFs ?? 'portable') === 'portable';
  /** @type {Map<string, { relPath: string, rendered: string }>} */
  const owners = new Map();

  return files.map((file) => {
    const rendered = renderPath(file.relPath, view).replace(
      new RegExp(`${extname}$`),
      '',
    );
    const target = path.join(outDir, rendered);

    // Portable (default): keyed case-insensitively, because README.md and
    // readme.md are one file on default macOS and Windows file systems.
    // targetFs 'case-sensitive' declares they are two; writeTargets then
    // checks the real disk agrees.
    const key = portable ? target.toLowerCase() : target;
    const owner = owners.get(key);
    if (owner) {
      const where =
        owner.rendered === rendered
          ? `both render to '${rendered}'`
          : `render to '${owner.rendered}' and '${rendered}', the same file on case-insensitive file systems (macOS, Windows)`;
      const advice =
        owner.rendered === rendered
          ? 'Each output file must come from exactly one template; check the path values.'
          : "If the output is only used on a case-sensitive file system, set targetFs: 'case-sensitive'.";
      throw new JsTmplError(
        ErrorCodes.OUTPUT_COLLISION,
        `Templates '${owner.relPath}' and '${file.relPath}' ${where}.\n` +
          advice,
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
  const planned = planTargets(files, cfg);

  await writeTargets(planned, cfg, async ({ file }) =>
    renderContent(file.absPath, view, hbs, file.relPath),
  );
}

/**
 * Write planned targets, checking each against the real disk first:
 * - the write must land inside the real `outDir`, even through symlinks
 *   already present there (a symlink to `/etc` must not become a way out);
 * - with `targetFs: 'case-sensitive'`, a target that the disk resolves to a
 *   file already written in this run (case-only difference on a
 *   case-insensitive disk) throws instead of overwriting it.
 *
 * @param {ReturnType<typeof planTargets>} planned
 * @param {import('../types.js').TemplateConfig} cfg
 * @param {(entry: ReturnType<typeof planTargets>[number]) => Promise<string>} render
 */
async function writeTargets(planned, cfg, render) {
  const { outDir } = cfg;
  await ensureDir(outDir);
  const realOut = fs.realpathSync.native(outDir);
  /** @type {Map<string, { target: string, relPath: string }>} */
  const written = new Map();

  for (const entry of planned) {
    const { file, target } = entry;
    const content = await render(entry);

    const real = realPathOfNearest(target);
    if (real !== realOut && !isInsideDir(realOut, real)) {
      throw new JsTmplError(
        ErrorCodes.OUTPUT_OUTSIDE_OUTDIR,
        `Template '${file.relPath}' would write to '${real}' through a symbolic link, outside outDir '${outDir}'.`,
        { details: { relPath: file.relPath, target: real } },
      );
    }

    const lower = target.toLowerCase();
    const earlier = written.get(lower);
    if (
      earlier &&
      earlier.target !== target &&
      sameFile(earlier.target, target)
    ) {
      throw new JsTmplError(
        ErrorCodes.OUTPUT_COLLISION,
        `Templates '${earlier.relPath}' and '${file.relPath}' render to '${path.relative(outDir, earlier.target)}' and '${path.relative(outDir, target)}', which this file system treats as one file.\n` +
          "Render on a case-sensitive file system, or use targetFs: 'portable'.",
        {
          details: {
            templates: [earlier.relPath, file.relPath],
            target: path.relative(outDir, target),
          },
        },
      );
    }

    await ensureDir(path.dirname(target));
    await writeFileSafe(target, content);
    written.set(lower, { target, relPath: file.relPath });
  }
}

/**
 * Whether two paths are the same file on disk (same device and inode).
 * @param {string} a
 * @param {string} b
 */
function sameFile(a, b) {
  const sa = fs.statSync(a, { bigint: true, throwIfNoEntry: false });
  const sb = fs.statSync(b, { bigint: true, throwIfNoEntry: false });
  return Boolean(sa && sb && sa.dev === sb.dev && sa.ino === sb.ino);
}
