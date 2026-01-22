import fs from "node:fs";
import path from "node:path";

import YAML from "js-yaml";

/**
 * Load YAML or JSON values.
 *
 * @param {string} filePath Path to YAML or JSON file.
 * @returns {object} Parsed values.
 */
export function loadYamlOrJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");

  if (/\.ya?ml$/i.test(filePath)) {
    return YAML.load(raw) || {};
  }
  if (/\.json$/i.test(filePath)) {
    return JSON.parse(raw);
  }

  throw new Error(`Unsupported values file: ${filePath}`);
}

/**
 * Load js-tmpl project config from known locations.
 *
 * @param {string} cwd Current working directory.
 * @param {string} [explicitFile] Explicit config file path.
 * @returns {object|null} Parsed config object or null if not found.
 */
export function loadProjectConfig(cwd, explicitFile) {
  const candidates = explicitFile
    ? [explicitFile]
    : [
        "js-tmpl.config.yaml",
        "js-tmpl.config.yml",
        "js-tmpl.config.json",
        path.join("config", "js-tmpl.yaml"),
        path.join("config", "js-tmpl.json"),
      ];

  for (const rel of candidates) {
    const abs = path.isAbsolute(rel) ? rel : path.join(cwd, rel);
    if (!fs.existsSync(abs)) {continue;}

    const raw = fs.readFileSync(abs, "utf8");

    if (/\.ya?ml$/.test(abs)) {
      return YAML.load(raw) || {};
    }
    if (/\.json$/.test(abs)) {
      return JSON.parse(raw);
    }
  }

  return null;
}
