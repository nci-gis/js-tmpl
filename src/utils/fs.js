import fsSync from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

/** Safe mkdir -p
 * @param {string} dir Directory path to create
 */
export async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true });
}

/** Safe file write
 * @param {string} file File path to write
 * @param {string} content Content to write
 */
export async function writeFileSafe(file, content) {
  await fs.writeFile(file, content, 'utf8');
}

/** Resolve path relative to cwd
 * @param {string} p Path to resolve
 * @param {string} cwd Current working directory
 * @returns {string} Resolved path
 */
export function resolvePath(p, cwd = process.cwd()) {
  return path.isAbsolute(p) ? p : path.join(cwd, p);
}

/**
 * Safely resolve a path.
 * If the first segment is absolute, resolves from that segment.
 * Otherwise resolves relative to process.cwd().
 * Does not perform sanitization; caller must ensure inputs are trusted.
 *
 * @param {...string} segments Path segments to join.
 * @returns {string} Absolute path.
 */
export function safeResolvePath(...segments) {
  const isAbsolute =
    segments.length > 0 && segments[0] && path.isAbsolute(segments[0]);
  if (isAbsolute) {
    return path.resolve(...segments);
  }
  return path.resolve(process.cwd(), ...segments);
}

/**
 * Whether `child` is strictly inside `parent` (not equal to it, not above
 * it, not on another drive). Both are resolved first; symlinks are not
 * followed.
 *
 * @param {string} parent
 * @param {string} child
 * @returns {boolean}
 */
export function isInsideDir(parent, child) {
  const rel = path.relative(path.resolve(parent), path.resolve(child));
  return rel !== '' && rel.split(path.sep)[0] !== '..' && !path.isAbsolute(rel);
}

/**
 * Real path (symlinks resolved) of `p`, or of its nearest existing
 * ancestor when `p` does not exist yet — i.e. where a write to `p` would
 * really land. A dangling symlink counts as existing: writing through it
 * would create its target, so its target is followed (up to 40 links, like
 * the OS; a loop throws). Uses the OS's own resolution (`realpath.native`),
 * so Windows 8.3 short names and junctions come back in canonical form.
 *
 * @param {string} p
 * @param {number} [depth] - Links followed so far (internal)
 * @returns {string}
 */
export function realPathOfNearest(p, depth = 0) {
  let cur = path.resolve(p);
  for (;;) {
    const st = fsSync.lstatSync(cur, { throwIfNoEntry: false });
    if (st?.isSymbolicLink() && !fsSync.existsSync(cur)) {
      if (depth >= 40) {
        throw new Error(`Too many symbolic links resolving '${p}'`);
      }
      const linked = path.resolve(path.dirname(cur), fsSync.readlinkSync(cur));
      return realPathOfNearest(linked, depth + 1);
    }
    if (st) {
      return fsSync.realpathSync.native(cur);
    }
    const parent = path.dirname(cur);
    if (parent === cur) {
      // Root reached without finding anything: only a path on a drive that
      // does not exist (Windows). Stop instead of looping.
      return cur;
    }
    cur = parent;
  }
}
