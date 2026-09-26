import path from 'node:path';

/**
 * Convert a native path to `/` form, so assertions hold on Windows too.
 *
 * @param {string} p - Path with the platform separator
 * @returns {string} POSIX-style path
 */
export function toPosix(p) {
  return p.split(path.sep).join('/');
}
