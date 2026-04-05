/**
 * Build the view object by merging values with environment variables.
 * @param {Record<string, unknown>} values
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {Record<string, unknown>}
 */
export function buildView(values, env = process.env) {
  return {
    ...values,
    env,
  };
}
