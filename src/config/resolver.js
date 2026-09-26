import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { ErrorCodes, JsTmplError } from '../errors.js';
import { DEFAULTS } from './defaults.js';
import {
  CONFIG_CANDIDATES,
  loadProjectConfig,
  loadYamlOrJson,
} from './loader.js';
import { scanValuePartials } from './valuePartials.js';
import { buildView, pickEnv } from './view.js';

const TARGET_FS = ['portable', 'case-sensitive'];

/** Keys a config file may set. */
const FILE_KEYS = Object.keys(DEFAULTS);
/** Keys `resolveConfig` options may set: the file keys plus `configFile`. */
const OPTION_KEYS = [...FILE_KEYS, 'configFile'];

/**
 * Throw on an unknown key (with a suggestion for a near miss such as
 * `outdir` or `out-dir`) or a value of the wrong type. A typo must not
 * silently fall back to a default and write somewhere else.
 *
 * @param {Record<string, unknown>} options
 * @param {string[]} allowed
 * @param {string} source - Where the options came from, for messages
 */
function assertKnownOptions(options, allowed, source) {
  /** @param {string} k */
  const loose = (k) => k.replaceAll(/[-_]/g, '').toLowerCase();
  for (const [key, value] of Object.entries(options)) {
    if (!allowed.includes(key)) {
      const near = allowed.find((k) => loose(k) === loose(key));
      throw new JsTmplError(
        ErrorCodes.CONFIG_UNKNOWN_KEY,
        `Unknown config key '${key}' in ${source}.` +
          (near ? ` Did you mean '${near}'?` : '') +
          `\nKnown keys: ${allowed.join(', ')}.`,
        { details: { key, source, ...(near ? { suggestion: near } : {}) } },
      );
    }
    const list = Array.isArray(DEFAULTS[/** @type {keyof DEFAULTS} */ (key)]);
    const ok = list
      ? Array.isArray(value) && value.every((v) => typeof v === 'string')
      : typeof value === 'string';
    if (!ok) {
      throw new JsTmplError(
        ErrorCodes.CONFIG_INVALID_VALUE,
        `Config key '${key}' in ${source} must be ${list ? 'a list of strings' : 'a string'}, got ${JSON.stringify(value) ?? String(value)}.`,
        { details: { key, value } },
      );
    }
  }
}

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
    throw new JsTmplError(
      ErrorCodes.VALUES_FILE_IN_DIR,
      `valuesFile '${valuesFileAbs}' is inside valuesDir '${valuesDirAbs}'.\n` +
        `Move the file out, or drop valuesDir.`,
    );
  }
}

/**
 * Find the project config file the CLI would use: the first of
 * `js-tmpl.config.yaml`, `.yml`, `.json`, `config/js-tmpl.yaml`,
 * `config/js-tmpl.json` that exists in `cwd`. `resolveConfig` never searches
 * on its own; call this and pass the result as `configFile` to get the same
 * behaviour as the CLI.
 *
 * @param {string} [cwd]
 * @returns {string | null} Absolute path of the file, or null if none exists.
 */
export function findProjectConfig(cwd = process.cwd()) {
  for (const rel of CONFIG_CANDIDATES) {
    const abs = path.join(cwd, rel);
    if (fs.existsSync(abs)) {
      return abs;
    }
  }
  return null;
}

/**
 * Resolve final config using: defaults < projectConfig < cliArgs.
 *
 * `projectConfig` is read only from an explicit `configFile`; nothing is
 * discovered from `cwd` (see `findProjectConfig`).
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
  // Options left `undefined` mean "not given", as if the key were absent.
  const options = Object.fromEntries(
    Object.entries(cli).filter(([, v]) => v !== undefined),
  );
  assertKnownOptions(options, OPTION_KEYS, 'resolveConfig options');
  const projectConfig = loadProjectConfig(cwd, options.configFile);
  if (projectConfig) {
    assertKnownOptions(
      projectConfig,
      FILE_KEYS,
      path.resolve(cwd, /** @type {string} */ (options.configFile)),
    );
  }
  const mergedConfig = { ...DEFAULTS, ...projectConfig, ...options };

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

  if (!TARGET_FS.includes(mergedConfig.targetFs)) {
    throw new JsTmplError(
      ErrorCodes.CONFIG_INVALID_VALUE,
      `targetFs must be one of ${TARGET_FS.map((v) => `'${v}'`).join(', ')}, got '${mergedConfig.targetFs}'.`,
      { details: { key: 'targetFs', value: mergedConfig.targetFs } },
    );
  }

  return {
    templateDir: abs(mergedConfig.templateDir),
    partialsDir: mergedConfig.partialsDir ? abs(mergedConfig.partialsDir) : '',
    outDir: abs(mergedConfig.outDir),
    extname: mergedConfig.extname,
    targetFs: mergedConfig.targetFs,
    view: buildView({
      rootValues,
      partials,
      env,
      valuesFile: valuesFileAbs || '<unset>',
      valuesDir: valuesDirAbs || '<unset>',
    }),
  };
}
