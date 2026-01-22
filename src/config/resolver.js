import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { DEFAULTS } from "./defaults.js";
import { loadProjectConfig,loadYamlOrJson } from "./loader.js";
import { buildView } from "./view.js";

/**
 * Lookup default values file in valuesDir.
 * Searches for: default.yaml, default.yml
 *
 * @param {string} valuesDir - Absolute path to values directory
 * @returns {string|null} - Path to default values file or null if not found
 */
function lookupDefaultValuesFile(valuesDir) {
  const candidates = ["default.yaml", "default.yml"];

  for (const filename of candidates) {
    const filepath = path.join(valuesDir, filename);
    if (fs.existsSync(filepath)) {
      return filepath;
    }
  }

  return null;
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

  // If valuesFile not specified, try to find default.yaml in valuesDir
  let valuesFile = mergedConfig.valuesFile;
  if (!valuesFile) {
    const valuesDir = abs(mergedConfig.valuesDir);
    valuesFile = lookupDefaultValuesFile(valuesDir);

    if (!valuesFile) {
      throw new Error(
        `Missing valuesFile. Use --values or create ${mergedConfig.valuesDir}/default.yaml`
      );
    }
  }

  const values = loadYamlOrJson(abs(valuesFile));

  return {
    templateDir: abs(mergedConfig.templateDir),
    partialsDir: abs(mergedConfig.partialsDir),
    outDir: abs(mergedConfig.outDir),
    extname: mergedConfig.extname,
    view: buildView(values),
  };
}
