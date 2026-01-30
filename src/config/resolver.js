import path from "node:path";
import process from "node:process";

import { DEFAULTS } from "./defaults.js";
import { loadProjectConfig,loadYamlOrJson } from "./loader.js";
import { buildView } from "./view.js";

/**
 * Resolve valuesFile path based on valuesDir
 * @param {string} valuesFile - The values file name or path
 * @param {string} valuesDir - Values directory (may be empty string)
 * @param {string} cwd - Current working directory
 * @returns {string} Absolute path to values file
 */
function resolveValuesFilePath(valuesFile, valuesDir, cwd) {
  // If absolute, use as-is
  if (path.isAbsolute(valuesFile)) {
    return valuesFile;
  }

  // If valuesDir is set (truthy), use it as base
  if (valuesDir) {
    const absoluteValuesDir = path.isAbsolute(valuesDir)
      ? valuesDir
      : path.join(cwd, valuesDir);
    return path.join(absoluteValuesDir, valuesFile);
  }

  // Otherwise, resolve from cwd
  return path.join(cwd, valuesFile);
}

/**
 * Resolve final config using:
 * defaults < projectConfig < cliArgs
 *
 * @param {object} cli - CLI arguments
 * @param {string} cwd - Current working directory
 * @returns {object} - Resolved configuration
 */
export function resolveConfig(cli, cwd = process.cwd()) {
  const projectConfig = loadProjectConfig(cwd, cli.configFile);

  const mergedConfig = {
    ...DEFAULTS,
    ...projectConfig,
    ...cli,
  };

  const abs = (p) => (path.isAbsolute(p) ? p : path.join(cwd, p));

  // Validate valuesFile is provided
  if (!mergedConfig.valuesFile) {
    throw new Error(
      'Missing required configuration: valuesFile\n' +
      'Provide via:\n' +
      '  - CLI: --values path/to/values.yaml\n' +
      '  - Config: valuesFile: "path/to/values.yaml" in js-tmpl.config.yaml'
    );
  }

  // Resolve path - simple logic based on valuesDir presence
  const valuesFilePath = resolveValuesFilePath(
    mergedConfig.valuesFile,
    mergedConfig.valuesDir,
    cwd
  );

  const values = loadYamlOrJson(valuesFilePath);

  return {
    templateDir: abs(mergedConfig.templateDir),
    partialsDir: abs(mergedConfig.partialsDir),
    outDir: abs(mergedConfig.outDir),
    extname: mergedConfig.extname,
    view: buildView(values),
  };
}
