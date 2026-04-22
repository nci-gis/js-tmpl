import fs from 'node:fs';
import path from 'node:path';

import {
  assertNoDuplicate,
  assertValidSegments,
  deriveNamespace,
} from '../utils/namespacing.js';
import { loadYamlOrJson } from './loader.js';

const DEFAULT_EXTS = ['.yaml', '.yml', '.json'];

/**
 * Place a value into the namespaced tree. Assumes prefix-shadow collisions
 * have already been ruled out by the caller, so intermediate segments can
 * be created freely.
 *
 * @param {Record<string, unknown>} tree
 * @param {string[]} chain
 * @param {unknown} value
 */
function placeInTree(tree, chain, value) {
  /** @type {Record<string, unknown>} */
  let cur = tree;
  for (let i = 0; i < chain.length - 1; i++) {
    const seg = chain[i];
    if (!(seg in cur)) {cur[seg] = {};}
    cur = /** @type {Record<string, unknown>} */ (cur[seg]);
  }
  cur[/** @type {string} */ (chain.at(-1))] = value;
}

/**
 * Cross-check for prefix-shadow collisions: two files whose dotted keys are
 * such that one is a strict prefix of the other (e.g. `env` vs `env.prod`).
 * A file's contents can't simultaneously be a leaf *and* a sub-tree.
 *
 * @param {Array<{ key: string, abs: string }>} entries
 * @param {string} rootDir
 */
function assertNoPrefixShadow(entries, rootDir) {
  const byKey = new Map(entries.map((e) => [e.key, e.abs]));
  for (const { key, abs } of entries) {
    for (const other of byKey.keys()) {
      if (other === key) {continue;}
      if (key.startsWith(`${other}.`)) {
        throw new Error(
          `Value partial shadow collision between '${other}' and '${key}':\n` +
            `  - ${path.relative(rootDir, /** @type {string} */ (byKey.get(other)))}\n` +
            `  - ${path.relative(rootDir, abs)}\n` +
            `A file's contents cannot be both a leaf and a sub-tree.`,
        );
      }
    }
  }
}

/**
 * Scan `valuesDir` recursively and assemble a namespaced tree of values.
 *
 * - Files are classified by path via `deriveNamespace` — `@<name>/` anywhere
 *   in the chain triggers flatten (root-independent).
 * - Supported formats per VP-10: `.yaml`, `.yml`, `.json` (first-match wins
 *   if a file ends with multiple listed extensions — not a realistic case).
 * - VP-4 is enforced via duplicate-throws and shadow-collision detection.
 * - Empty or absent `valuesDir` returns an empty tree.
 *
 * Synchronous to match `loadYamlOrJson` and `resolveConfig`'s sync-all-the-way
 * model. File counts in a values tree are small, so blocking I/O is fine.
 *
 * @param {string} valuesDir - Absolute path to the value-partials root.
 * @param {string[]} [exts] - Accepted extensions (defaults to VP-10 set).
 * @returns {Record<string, unknown>}
 */
export function scanValuePartials(valuesDir, exts = DEFAULT_EXTS) {
  if (!valuesDir || !fs.existsSync(valuesDir)) {return {};}

  const all = /** @type {string[]} */ (
    fs.readdirSync(valuesDir, { recursive: true })
  );
  const files = all.filter((f) => exts.some((e) => f.endsWith(e)));

  /** @type {Map<string, string>} */
  const seen = new Map();
  /** @type {Array<{ key: string, chain: string[], abs: string }>} */
  const entries = [];

  for (const rel of files) {
    const ext = /** @type {string} */ (exts.find((e) => rel.endsWith(e)));
    const abs = path.join(valuesDir, rel);
    const chain = deriveNamespace({ relPath: rel, ext });

    assertValidSegments(chain, abs, 'value partial');

    const key = chain.join('.');
    assertNoDuplicate(seen, key, abs, valuesDir, 'value partial');
    entries.push({ key, chain, abs });
  }

  assertNoPrefixShadow(entries, valuesDir);

  /** @type {Record<string, unknown>} */
  const tree = {};
  for (const e of entries) {
    placeInTree(tree, e.chain, loadYamlOrJson(e.abs));
  }
  return tree;
}
