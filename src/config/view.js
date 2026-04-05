/**
 * Build the view object by merging values with environment data.
 *
 * **Reserved key:** `env` is always set to the provided environment object.
 * If `values` contains a top-level `env` key, a warning is logged and
 * the key is overwritten.
 *
 * @param {Record<string, unknown>} values
 * @param {Record<string, string>} [env]
 * @returns {Record<string, unknown>}
 */
export function buildView(values, env = {}) {
  if ('env' in values) {
    console.warn(
      'Warning: "env" is a reserved key in js-tmpl and will be overwritten.\n' +
        'Rename the "env" key in your values file to avoid this.',
    );
  }
  return {
    ...values,
    env,
  };
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
