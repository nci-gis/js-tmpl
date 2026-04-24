/**
 * @typedef {object} BuildViewArgs
 * @property {Record<string, unknown>} [rootValues]   - Top-level values from `valuesFile`.
 * @property {Record<string, unknown>} [partials]     - Namespaced tree from `valuesDir`.
 * @property {Record<string, string>}  [env]          - Allowlisted environment variables.
 * @property {string}                  [valuesFile]   - Source path, for error messages.
 * @property {string}                  [valuesDir]    - Source path, for error messages.
 */

const RESERVED_ENV = 'env';

/**
 * Build the view object from root values + namespaced partials + env.
 *
 * Collision rules (from plan):
 * - **C-2** — a top-level key in `rootValues` that also appears as a top-level
 *   namespace in `partials` is a hard error naming both sources.
 * - **C-3** — a top-level namespace named `env` in `partials` is a hard error
 *   (reserved for environment variables).
 *
 * The `env` reserved key is always set from the provided `env` object. If
 * `rootValues` contains a top-level `env`, a warning is logged and the key
 * is overwritten (existing behavior preserved for back-compat).
 *
 * @param {BuildViewArgs} [args]
 * @returns {Record<string, unknown>}
 */
export function buildView(args = {}) {
  const rootValues = args.rootValues ?? {};
  const partials = args.partials ?? {};
  const env = args.env ?? {};
  const valuesFile = args.valuesFile ?? '<valuesFile>';
  const valuesDir = args.valuesDir ?? '<valuesDir>';

  assertReservedEnvNotInPartials(partials, valuesDir);
  assertNoRootNamespaceCollision(rootValues, partials, valuesFile, valuesDir);
  warnOnReservedEnvInValuesFile(rootValues);

  return {
    ...rootValues,
    ...partials,
    [RESERVED_ENV]: env,
  };
}

/**
 * @param {Record<string, unknown>} partials
 * @param {string} valuesDir
 */
function assertReservedEnvNotInPartials(partials, valuesDir) {
  if (RESERVED_ENV in partials) {
    throw new Error(
      `Value partial conflicts with reserved 'env' namespace.\n` +
        `  Source: ${valuesDir} produced a top-level 'env' namespace.\n` +
        `  Rename the directory/file so it does not resolve to 'env'.`,
    );
  }
}

/**
 * @param {Record<string, unknown>} rootValues
 * @param {Record<string, unknown>} partials
 * @param {string} valuesFile
 * @param {string} valuesDir
 */
function assertNoRootNamespaceCollision(
  rootValues,
  partials,
  valuesFile,
  valuesDir,
) {
  for (const key of Object.keys(rootValues)) {
    if (key === RESERVED_ENV) {
      continue;
    }
    if (key in partials) {
      throw new Error(
        `Duplicate view key '${key}' — registered by both:\n` +
          `  - ${valuesFile} top-level key\n` +
          `  - ${valuesDir}/${key}.(yaml|yml|json)`,
      );
    }
  }
}

/**
 * @param {Record<string, unknown>} values
 */
function warnOnReservedEnvInValuesFile(values) {
  if (RESERVED_ENV in values) {
    console.warn(
      'Warning: "env" is a reserved key in js-tmpl and will be overwritten.\n' +
        'Rename the "env" key in your values file to avoid this.',
    );
  }
}

/**
 * Pick environment variables by explicit keys and/or prefix.
 *
 * @param {object} options
 * @param {string[]} options.keys - Explicit key names to include.
 * @param {string} options.prefix - Include all vars starting with this prefix.
 * @param {Record<string, string | undefined>} [source] - Env source (default: process.env).
 * @returns {Record<string, string>}
 */
export function pickEnv({ keys = [], prefix = '' }, source = process.env) {
  /** @type {Record<string, string>} */
  const result = {};

  for (const k of keys) {
    if (k in source) {
      result[k] = /** @type {string} */ (source[k]);
    }
  }

  if (prefix) {
    for (const k of Object.keys(source)) {
      if (k.startsWith(prefix)) {
        result[k] = /** @type {string} */ (source[k]);
      }
    }
  }

  return result;
}
