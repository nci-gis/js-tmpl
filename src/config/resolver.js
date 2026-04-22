import path from 'node:path';
import process from 'node:process';

import { DEFAULTS } from './defaults.js';
import { loadProjectConfig, loadYamlOrJson } from './loader.js';
import { scanValuePartials } from './valuePartials.js';
import { buildView, pickEnv } from './view.js';

/**
 * C-1 — throw if the resolved `valuesFile` sits inside the resolved
 * `valuesDir`. A file loaded both as root and as a value partial would
 * produce ambiguous collisions.
 *
 * @param {string} valuesFileAbs
 * @param {string} valuesDirAbs
 */
function assertValuesFileNotInside(valuesFileAbs, valuesDirAbs) {
  const rel = path.relative(valuesDirAbs, valuesFileAbs);
  const inside = rel && !rel.startsWith('..') && !path.isAbsolute(rel);
  if (inside) {
    throw new Error(
      `valuesFile '${valuesFileAbs}' is inside valuesDir '${valuesDirAbs}'.\n` +
        `Move the file out, or drop valuesDir.`,
    );
  }
}

/**
 * Resolve final config using: defaults < projectConfig < cliArgs.
 *
 * Value sources (all optional per VP-5, VP-6, VP-8):
 * - `valuesFile` loaded into top-level view keys.
 * - `valuesDir` scanned via `scanValuePartials` into a namespaced tree.
 * - Allowlisted env vars under `view.env.*`.
 *
 * Collision rules C-1, C-2, C-3 apply and surface as hard errors.
 *
 * @param {import('../types.js').CliArgs} cli
 * @param {string} [cwd]
 * @returns {import('../types.js').TemplateConfig}
 */
export function resolveConfig(cli, cwd = process.cwd()) {
  const projectConfig = loadProjectConfig(cwd, cli.configFile);
  const mergedConfig = { ...DEFAULTS, ...projectConfig, ...cli };

  /** @param {string} p */
  const abs = (p) => (path.isAbsolute(p) ? p : path.join(cwd, p));

  const valuesFileAbs = mergedConfig.valuesFile
    ? abs(mergedConfig.valuesFile)
    : '';
  const valuesDirAbs = mergedConfig.valuesDir
    ? abs(mergedConfig.valuesDir)
    : '';

  if (valuesFileAbs && valuesDirAbs) {
    assertValuesFileNotInside(valuesFileAbs, valuesDirAbs);
  }

  const rootValues = valuesFileAbs ? loadYamlOrJson(valuesFileAbs) : {};
  const partials = valuesDirAbs ? scanValuePartials(valuesDirAbs) : {};

  const hasEnvConfig = mergedConfig.envKeys?.length || mergedConfig.envPrefix;
  const env = hasEnvConfig
    ? pickEnv({
        keys: mergedConfig.envKeys || [],
        prefix: mergedConfig.envPrefix || '',
      })
    : {};

  return {
    templateDir: abs(mergedConfig.templateDir),
    partialsDir: mergedConfig.partialsDir ? abs(mergedConfig.partialsDir) : '',
    outDir: abs(mergedConfig.outDir),
    extname: mergedConfig.extname,
    view: buildView({
      rootValues,
      partials,
      env,
      valuesFile: valuesFileAbs || '<unset>',
      valuesDir: valuesDirAbs || '<unset>',
    }),
  };
}
