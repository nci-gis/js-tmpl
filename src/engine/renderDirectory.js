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
 * @typedef {object} PlanEntry
 * @property {string} relPath - Template path, relative to `templateDir`, `/`-separated
 * @property {string} target - Output path, relative to `outDir`, `/`-separated
 * @property {string} content - Rendered content
 */

/**
 * Render every template in memory and return what a render would write,
 * without touching `outDir`: the engine's decisions as data. Sorted by
 * `target`; paths use `/` on every OS.
 *
 * Every problem is collected rather than stopping at the first: each
 * failing guard, each path error, each collision, and the first missing
 * value in each template (Handlebars stops at one per template). One error
 * is thrown as-is; several are thrown together as `JSTMPL_MULTIPLE_ERRORS`
 * with `details.errors`.
 *
 * @param {import('../types.js').TemplateConfig} cfg
 * @param {typeof import('handlebars')} [hbs] - Handlebars instance (an isolated one is created if omitted)
 * @returns {Promise<PlanEntry[]>}
 */
export async function planRender(cfg, hbs) {
  const { templateDir, partialsDir, view, extname } = cfg;

  hbs = hbs || Handlebars.create();
  await registerPartials(partialsDir, extname, hbs);

  /** @type {JsTmplError[]} */
  const errors = [];
  const files = await walkTemplateTree(templateDir, {
    ext: extname,
    view,
    errors,
  });

  const targets = await planTargets(files, cfg, errors);
  /** @type {PlanEntry[]} */
  const plan = [];
  // Every body is rendered, even when its path failed, so one run reports
  // both problems of a template.
  for (const file of files) {
    const content = await collect(errors, () =>
      renderContent(file.absPath, view, hbs, file.relPath),
    );
    const target = targets.get(file);
    if (content !== undefined && target !== undefined) {
      plan.push({ relPath: file.relPath, target, content });
    }
  }

  throwCollected(errors);
  plan.sort((a, b) => compare(a.target, b.target));
  return plan;
}

/**
 * Main rendering orchestrator: `planRender`, then write. Nothing is written
 * unless the whole plan succeeds.
 *
 * @param {import('../types.js').TemplateConfig} cfg
 * @param {typeof import('handlebars')} [hbs] - Optional Handlebars instance (creates an isolated one if omitted)
 * @returns {Promise<void>}
 */
export async function renderDirectory(cfg, hbs) {
  const plan = await planRender(cfg, hbs);
  await writePlan(plan, cfg);
}

/**
 * Compare a plan with what is on disk in `outDir`, without writing. A target
 * that does not exist is `added`; one whose bytes differ is `changed`. Files
 * in `outDir` that the plan does not produce are ignored: js-tmpl does not
 * own `outDir`. Throws what `renderDirectory` would throw before writing
 * (containment, blocked paths, collisions on disk, hard links), so a clean
 * result means a render would succeed and change nothing.
 *
 * @param {PlanEntry[]} plan
 * @param {string} outDir
 * @returns {{ added: string[], changed: string[] }} Sorted targets
 */
export function comparePlan(plan, outDir) {
  preflight(plan, outDir);
  /** @type {string[]} */
  const added = [];
  /** @type {string[]} */
  const changed = [];

  for (const entry of plan) {
    const abs = path.join(outDir, entry.target);
    if (!fs.existsSync(abs)) {
      added.push(entry.target);
    } else if (!fs.readFileSync(abs).equals(Buffer.from(entry.content))) {
      changed.push(entry.target);
    }
  }
  added.sort(compare);
  changed.sort(compare);
  return { added, changed };
}

/**
 * Map every template to its output path, collecting path errors and
 * collisions into `errors` (those templates are left out of the result).
 * Path rendering already rejects `..` and empty parts; the real disk is
 * checked by `preflight`.
 *
 * @param {import('../types.js').TemplateFile[]} files
 * @param {import('../types.js').TemplateConfig} cfg
 * @param {JsTmplError[]} errors
 * @returns {Promise<Map<import('../types.js').TemplateFile, string>>}
 */
async function planTargets(files, cfg, errors) {
  const { view, extname } = cfg;
  const portable = (cfg.targetFs ?? 'portable') === 'portable';
  /** @type {Map<string, { relPath: string, target: string }>} */
  const owners = new Map();
  /** @type {Map<import('../types.js').TemplateFile, string>} */
  const planned = new Map();
  // Portable (default): README.md and readme.md, or café in NFC and NFD,
  // are one file on default macOS and Windows file systems, so targets are
  // keyed case- and normalization-insensitively. targetFs 'case-sensitive'
  // declares they are two; writePlan then checks the real disk agrees.
  /** @param {string} target */
  const keyOf = (target) =>
    portable ? target.normalize('NFC').toLowerCase() : target;

  for (const file of files) {
    const target = await collectSync(errors, () =>
      targetOf(file.relPath, view, extname),
    );
    if (target === undefined) {
      continue;
    }

    const key = keyOf(target);
    const owner = owners.get(key);
    if (owner) {
      errors.push(collision(owner, file.relPath, target));
      continue;
    }
    owners.set(key, { relPath: file.relPath, target });
    planned.set(file, target);
  }

  // A target cannot also be a directory of another target: 'a' and 'a/b'
  // would fail half-way through the writes (ENOTDIR).
  for (const [file, target] of planned) {
    const parts = keyOf(target).split('/');
    for (let i = 1; i < parts.length; i++) {
      const owner = owners.get(parts.slice(0, i).join('/'));
      if (owner) {
        errors.push(fileAsDirectory(owner, file.relPath, target));
        planned.delete(file);
        break;
      }
    }
  }
  return planned;
}

/**
 * @param {{ relPath: string, target: string }} owner - Template whose target is a file
 * @param {string} relPath - Template that needs that file as a directory
 * @param {string} target
 */
function fileAsDirectory(owner, relPath, target) {
  return new JsTmplError(
    ErrorCodes.OUTPUT_COLLISION,
    `Templates '${owner.relPath}' and '${relPath}' conflict: '${owner.target}' is a file, but '${target}' needs it as a directory.\n` +
      'Each output path must be either a file or a directory; check the path values.',
    { details: { templates: [owner.relPath, relPath], target } },
  );
}

/**
 * Output path of one template: its rendered path without `extname`. Every
 * part is checked again after the extension is removed: `${name}.hbs`
 * with `name: ''` renders to `.hbs`, a valid segment, but would target
 * `outDir` itself.
 *
 * @param {string} relPath
 * @param {Record<string, unknown>} view
 * @param {string} extname
 * @returns {string}
 */
function targetOf(relPath, view, extname) {
  const rendered = renderPath(relPath, view);
  const target = rendered.endsWith(extname)
    ? rendered.slice(0, -extname.length)
    : rendered;
  const invalid = target
    .split('/')
    .some((part) => part === '' || part === '.' || part === '..');
  if (invalid) {
    throw new JsTmplError(
      ErrorCodes.PATH_EMPTY_SEGMENT,
      `Template '${relPath}' renders to '${target}' once '${extname}' is removed; every part must name a file or directory (no empty, '.' or '..' parts).`,
      { details: { relPath, target } },
    );
  }
  return target;
}

/**
 * Run `fn`; record a JsTmplError in `errors` (returning undefined) instead
 * of throwing it. Any other error (I/O, bugs) still throws.
 *
 * @template T
 * @param {JsTmplError[]} errors
 * @param {() => Promise<T>} fn
 * @returns {Promise<T | undefined>}
 */
async function collect(errors, fn) {
  try {
    return await fn();
  } catch (error) {
    if (!(error instanceof JsTmplError)) {
      throw error;
    }
    errors.push(error);
    return undefined;
  }
}

/**
 * Synchronous `fn` through the same rule as `collect`.
 *
 * @template T
 * @param {JsTmplError[]} errors
 * @param {() => T} fn
 * @returns {Promise<T | undefined>}
 */
function collectSync(errors, fn) {
  return collect(errors, async () => fn());
}

/**
 * @param {{ relPath: string, target: string }} owner
 * @param {string} relPath
 * @param {string} target
 */
function collision(owner, relPath, target) {
  const same = owner.target === target;
  const where = same
    ? `both render to '${target}'`
    : `render to '${owner.target}' and '${target}', the same file on case-insensitive file systems (macOS, Windows)`;
  const advice = same
    ? 'Each output file must come from exactly one template; check the path values.'
    : "If the output is only used on a case-sensitive file system, set targetFs: 'case-sensitive'.";
  return new JsTmplError(
    ErrorCodes.OUTPUT_COLLISION,
    `Templates '${owner.relPath}' and '${relPath}' ${where}.\n` + advice,
    { details: { templates: [owner.relPath, relPath], target } },
  );
}

/**
 * Throw nothing, the single error, or all of them as one.
 * @param {JsTmplError[]} errors
 */
function throwCollected(errors) {
  if (errors.length === 0) {
    return;
  }
  if (errors.length === 1) {
    throw errors[0];
  }
  const relPathOf = (/** @type {JsTmplError} */ e) =>
    typeof e.details?.relPath === 'string' ? e.details.relPath : '';
  const sorted = [...errors];
  sorted.sort(
    (a, b) =>
      compare(relPathOf(a), relPathOf(b)) || compare(a.message, b.message),
  );
  const missing = sorted.some((e) =>
    [
      ErrorCodes.PATH_MISSING_VAR,
      ErrorCodes.GUARD_MISSING_VAR,
      ErrorCodes.TEMPLATE_MISSING_VALUE,
    ].includes(e.code),
  );
  const lines = sorted.map((e) => `  - ${e.message.split('\n')[0]}`);
  throw new JsTmplError(
    ErrorCodes.MULTIPLE_ERRORS,
    `${sorted.length} errors:\n${lines.join('\n')}` +
      (missing
        ? "\nDeclare optional keys in values (null, false, '', [])."
        : ''),
    { details: { errors: sorted } },
  );
}

/**
 * Check a plan against the real disk before anything is written or
 * compared, so `renderDirectory` and `comparePlan` fail on the same
 * problems, all collected (see SECURITY.md, "Filesystem Threat Model"):
 * - every target lands inside the real `outDir`, even through symlinks
 *   already there (a symlink to `/etc` must not become a way out);
 * - a target that exists is a regular file, and a parent that exists is a
 *   directory;
 * - two targets that are one file on disk (a hard link, or a case-only
 *   difference on a case-insensitive disk) collide;
 * - a target with another hard link is refused: writing it would change a
 *   file elsewhere.
 *
 * @param {PlanEntry[]} plan
 * @param {string} outDir
 */
function preflight(plan, outDir) {
  const realOut = fs.existsSync(outDir)
    ? fs.realpathSync.native(outDir)
    : realPathOfNearest(outDir);
  /** @type {JsTmplError[]} */
  const errors = [];
  /** @type {Map<string, import('node:fs').BigIntStats | undefined>} */
  const stats = new Map();
  /** @param {string} abs */
  const statOf = (abs) => {
    if (!stats.has(abs)) {
      stats.set(abs, fs.statSync(abs, { bigint: true, throwIfNoEntry: false }));
    }
    return stats.get(abs);
  };
  /** @type {Array<{ entry: PlanEntry, st: import('node:fs').BigIntStats }>} */
  const existing = [];

  for (const entry of plan) {
    const abs = path.join(outDir, entry.target);
    // Blocked first: below a file, resolving the real path fails (ENOTDIR).
    const problem =
      blockedError(entry, outDir, statOf) ??
      outsideError(realOut, abs, outDir, entry.relPath);
    if (problem) {
      errors.push(problem);
      continue;
    }
    const st = statOf(abs);
    if (st) {
      existing.push({ entry, st });
    }
  }

  /** @type {Map<string, PlanEntry>} */
  const byInode = new Map();
  /** @type {Set<string>} */
  const shared = new Set();
  for (const { entry, st } of existing) {
    const id = `${st.dev}:${st.ino}`;
    const earlier = byInode.get(id);
    if (earlier) {
      errors.push(oneFileOnDisk(earlier, entry));
      shared.add(id);
    } else {
      byInode.set(id, entry);
    }
  }
  for (const { entry, st } of existing) {
    if (st.nlink > 1n && !shared.has(`${st.dev}:${st.ino}`)) {
      errors.push(
        new JsTmplError(
          ErrorCodes.OUTPUT_LINKED,
          `Template '${entry.relPath}' renders to '${entry.target}', which has another hard link: writing it would also change the other file.\n` +
            'Replace it with a plain copy (or delete it) and render again.',
          { details: { relPath: entry.relPath, target: entry.target } },
        ),
      );
    }
  }

  throwCollected(errors);
}

/**
 * The error for a target that does not really land inside `realOut`
 * (symlinks resolved), if any.
 *
 * @param {string} realOut
 * @param {string} abs
 * @param {string} outDir
 * @param {string} relPath
 * @returns {JsTmplError | undefined}
 */
function outsideError(realOut, abs, outDir, relPath) {
  const real = realPathOfNearest(abs);
  if (real === realOut || isInsideDir(realOut, real)) {
    return undefined;
  }
  return new JsTmplError(
    ErrorCodes.OUTPUT_OUTSIDE_OUTDIR,
    `Template '${relPath}' would write to '${real}' through a symbolic link, outside outDir '${outDir}'.`,
    { details: { relPath, target: real } },
  );
}

/**
 * The error for a target whose path is taken on disk, if any: a parent
 * that exists but is not a directory, or the target itself existing as
 * something other than a regular file (a directory, a FIFO).
 *
 * @param {PlanEntry} entry
 * @param {string} outDir
 * @param {(abs: string) => import('node:fs').BigIntStats | undefined} statOf
 * @returns {JsTmplError | undefined}
 */
function blockedError({ relPath, target }, outDir, statOf) {
  const parts = target.split('/');
  // Parents first: below a file, stat fails with ENOTDIR instead of ENOENT.
  for (let i = 1; i < parts.length; i++) {
    const parent = parts.slice(0, i).join('/');
    const st = statOf(path.join(outDir, parent));
    if (!st) {
      return undefined;
    }
    if (!st.isDirectory()) {
      return new JsTmplError(
        ErrorCodes.OUTPUT_BLOCKED,
        `Template '${relPath}' renders to '${target}', but '${parent}' exists in outDir as a file, not a directory.`,
        { details: { relPath, target, path: parent } },
      );
    }
  }
  const st = statOf(path.join(outDir, target));
  if (!st || st.isFile()) {
    return undefined;
  }
  const kind = st.isDirectory() ? 'a directory' : 'something other than a file';
  return new JsTmplError(
    ErrorCodes.OUTPUT_BLOCKED,
    `Template '${relPath}' renders to '${target}', which exists in outDir as ${kind}.`,
    { details: { relPath, target, path: target } },
  );
}

/**
 * @param {PlanEntry} earlier
 * @param {PlanEntry} entry
 */
function oneFileOnDisk(earlier, entry) {
  return new JsTmplError(
    ErrorCodes.OUTPUT_COLLISION,
    `Templates '${earlier.relPath}' and '${entry.relPath}' render to '${earlier.target}' and '${entry.target}', which this file system treats as one file.\n` +
      "Render on a case-sensitive file system, or use targetFs: 'portable'.",
    {
      details: {
        templates: [earlier.relPath, entry.relPath],
        target: entry.target,
      },
    },
  );
}

/**
 * Write a plan into `outDir` once `preflight` passes. With
 * `targetFs: 'case-sensitive'` on a fresh case-insensitive disk, two
 * case-only different targets only become one file once the first is
 * written, so each write still checks for that and throws instead of
 * overwriting.
 *
 * @param {PlanEntry[]} plan
 * @param {import('../types.js').TemplateConfig} cfg
 */
async function writePlan(plan, cfg) {
  const { outDir } = cfg;
  preflight(plan, outDir);
  await ensureDir(outDir);
  /** @type {Map<string, { abs: string, entry: PlanEntry }>} */
  const written = new Map();

  for (const entry of plan) {
    const abs = path.join(outDir, entry.target);
    const lower = abs.toLowerCase();
    const earlier = written.get(lower);
    if (earlier && earlier.abs !== abs && sameFile(earlier.abs, abs)) {
      throw oneFileOnDisk(earlier.entry, entry);
    }

    await ensureDir(path.dirname(abs));
    await writeFileSafe(abs, entry.content);
    written.set(lower, { abs, entry });
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

/**
 * Locale-independent ordering, identical on every machine.
 * @param {string} a
 * @param {string} b
 */
function compare(a, b) {
  if (a < b) {
    return -1;
  }
  return a > b ? 1 : 0;
}
