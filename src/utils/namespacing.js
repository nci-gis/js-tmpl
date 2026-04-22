import path from 'node:path';

/**
 * Valid namespace segment: letters, digits, underscore (matches Handlebars
 * bare-identifier convention and the partials system's historical rule).
 */
export const SEGMENT_RE = /^\w+$/;

/**
 * Match a "@name" flatten marker at any position in the relative path.
 * Root-independent: scan-root choice does not change the outcome, because
 * the marker is detected wherever it appears in the chain.
 */
const FLATTEN_SEGMENT_RE = /^@\w+$/;

/**
 * Throw a clear error when a namespace segment contains invalid characters.
 *
 * @param {string[]} segments - Chain as produced by `deriveNamespace`.
 * @param {string} filePath - Absolute or repo-relative path, for the error message.
 * @param {string} [label='namespace'] - Noun used in the error message (e.g. "partial name").
 */
export function assertValidSegments(segments, filePath, label = 'namespace') {
  if (!SEGMENT_RE.test(segments.join(''))) {
    throw new Error(
      `Invalid ${label} segment '${segments.join('>')}' in ${filePath} — only alphanumeric and underscore allowed`,
    );
  }
}

/**
 * Throw a clear error when two files resolve to the same namespace key.
 *
 * @param {Map<string, string>} seen - Key → absolute path of the first file that claimed it.
 * @param {string} key - The colliding namespace (dot-joined chain or single name).
 * @param {string} filePath - Absolute path of the second file.
 * @param {string} rootDir - The scan root, used to produce relative paths in the error.
 * @param {string} [label='namespace'] - Noun used in the error message (e.g. "partial name").
 */
export function assertNoDuplicate(
  seen,
  key,
  filePath,
  rootDir,
  label = 'namespace',
) {
  const existing = seen.get(key);
  if (existing) {
    const rel1 = path.relative(rootDir, existing);
    const rel2 = path.relative(rootDir, filePath);
    throw new Error(
      `Duplicate ${label} '${key}' — registered by both:\n` +
        `  - ${rel1}\n` +
        `  - ${rel2}\n` +
        `Use namespaced directories to avoid collisions.`,
    );
  }
  seen.set(key, filePath);
}

/**
 * Derive a namespace chain from a relative file path.
 *
 * Rules:
 * - Extension is stripped from the final segment.
 * - If any segment in the chain matches `^@\w+$` (a flatten marker), the chain
 *   collapses to `[basename]` — the file contributes at top level of view /
 *   partial registry, regardless of where the `@name` appears. This is the
 *   **root-independent** flatten rule: scanning `values/` vs `values/env/`
 *   yields the same namespace for `values/env/@overrides/app.yaml`.
 * - Otherwise, the chain is the directory path split by `path.sep`, with the
 *   final file's extension trimmed.
 *
 * The function does not validate segments — that's `assertValidSegments`'
 * job, called by the scan helpers that consume this chain.
 *
 * @param {object} args
 * @param {string} args.relPath - Relative path from the scan root.
 * @param {string} args.ext - Extension to strip from the basename (include the dot, e.g. `.yaml`).
 * @returns {string[]} The derived namespace chain.
 */
export function deriveNamespace({ relPath, ext }) {
  const trimmed = relPath.endsWith(ext)
    ? relPath.slice(0, -ext.length)
    : relPath;
  const segments = trimmed.split(path.sep);

  if (segments.some((s) => FLATTEN_SEGMENT_RE.test(s))) {
    return [/** @type {string} */ (segments.at(-1))];
  }
  return segments;
}
