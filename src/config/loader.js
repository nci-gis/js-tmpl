import fs from 'node:fs';
import path from 'node:path';

import YAML from 'js-yaml';

import { ErrorCodes, JsTmplError } from '../errors.js';

/**
 * Load YAML or JSON values.
 *
 * @param {string} filePath Path to YAML or JSON file.
 * @returns {Record<string, unknown>} Parsed values.
 */
export function loadYamlOrJson(filePath) {
  // Check if file exists before attempting to read
  if (!fs.existsSync(filePath)) {
    throw new JsTmplError(
      ErrorCodes.VALUES_NOT_FOUND,
      `Values file not found: ${filePath}\n` +
        'Check that the file exists and the path is correct.',
    );
  }

  const raw = fs.readFileSync(filePath, 'utf8');

  if (/\.ya?ml$/i.test(filePath)) {
    return /** @type {Record<string, unknown>} */ (YAML.load(raw) || {});
  }
  if (/\.json$/i.test(filePath)) {
    return /** @type {Record<string, unknown>} */ (JSON.parse(raw));
  }

  throw new JsTmplError(
    ErrorCodes.VALUES_UNSUPPORTED_FORMAT,
    `Unsupported values file: ${filePath}`,
  );
}

/**
 * Project config file names the CLI looks for, in priority order, relative
 * to the working directory. The engine never searches on its own; see
 * `findProjectConfig` in resolver.js.
 */
export const CONFIG_CANDIDATES = Object.freeze([
  'js-tmpl.config.yaml',
  'js-tmpl.config.yml',
  'js-tmpl.config.json',
  path.join('config', 'js-tmpl.yaml'),
  path.join('config', 'js-tmpl.json'),
]);

/**
 * Load an explicitly named project config file (YAML or JSON).
 *
 * @param {string} cwd Base for a relative `configFile`.
 * @param {string} [configFile] Config file path. Absent → `null` (no search).
 * @returns {Record<string, unknown> | null} Parsed config, or null when no file is given.
 */
export function loadProjectConfig(cwd, configFile) {
  if (!configFile) {
    return null;
  }
  const abs = path.isAbsolute(configFile)
    ? configFile
    : path.join(cwd, configFile);
  if (!fs.existsSync(abs)) {
    throw new JsTmplError(
      ErrorCodes.CONFIG_NOT_FOUND,
      `Config file not found: ${abs}\n` +
        'The config file path was explicitly provided but does not exist.',
    );
  }

  const raw = fs.readFileSync(abs, 'utf8');
  if (/\.json$/i.test(abs)) {
    return /** @type {Record<string, unknown>} */ (JSON.parse(raw));
  }
  return /** @type {Record<string, unknown>} */ (YAML.load(raw) || {});
}
