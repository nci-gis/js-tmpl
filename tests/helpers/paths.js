import path from 'node:path';

/**
 * Write test paths with `/`; convert at the call boundary so the same
 * assertions hold on Windows, where the engine uses `\`.
 *
 * @param {string} p - POSIX-style relative path
 * @returns {string} Path with the platform separator
 */
export function toNative(p) {
  return p.split('/').join(path.sep);
}

/**
 * @param {string} p - Path with the platform separator
 * @returns {string} POSIX-style path
 */
export function toPosix(p) {
  return p.split(path.sep).join('/');
}
