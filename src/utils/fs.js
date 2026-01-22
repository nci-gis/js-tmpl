import fs from "node:fs/promises";
import path from "node:path";

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
  await fs.writeFile(file, content, "utf8");
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
  const isAbsolute = segments ? segments[0] && path.isAbsolute(segments[0]) : false;
  if (isAbsolute) {
    return path.resolve(...segments);
  }
  return path.resolve(process.cwd(), ...segments);
}
