import path from "node:path";
import process from "node:process";
import { DEFAULTS } from "./defaults.js";
import { loadYamlOrJson, loadProjectConfig } from "./loader.js";
import { buildView } from "./view.js";

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

  if (!mergedConfig.valuesFile) {
    throw new Error("Missing valuesFile (use --values)");
  }

  const abs = (p) => (path.isAbsolute(p) ? p : path.join(cwd, p));

  const values = loadYamlOrJson(abs(mergedConfig.valuesFile));

  return {
    templateDir: abs(mergedConfig.templateDir),
    partialsDir: abs(mergedConfig.partialsDir),
    outDir: abs(mergedConfig.outDir),
    extname: mergedConfig.extname,
    view: buildView(values),
  };
}
