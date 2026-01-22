#!/usr/bin/env node

/**
 * Example: Using js-tmpl as an API
 *
 * This demonstrates programmatic usage of js-tmpl for embedding
 * into larger tools, scripts, or automation workflows.
 */

import { resolveConfig, renderDirectory } from "../../src/index.js";

// Configuration options (equivalent to CLI arguments)
const options = {
  valuesFile: "./values.yaml",
  templateDir: "./templates",
  partialsDir: "./templates.partials",
  outDir: "./dist",
};

async function main() {
  console.log("js-tmpl API Example");
  console.log("===================\n");

  // Step 1: Resolve configuration
  // This merges: defaults < project config < provided options
  const cfg = resolveConfig(options);

  console.log("Resolved configuration:");
  console.log(`  Template dir: ${cfg.templateDir}`);
  console.log(`  Partials dir: ${cfg.partialsDir}`);
  console.log(`  Output dir:   ${cfg.outDir}`);
  console.log(`  Extension:    ${cfg.extname}`);
  console.log(`  View keys:    ${Object.keys(cfg.view).join(", ")}\n`);

  // Step 2: Render templates
  await renderDirectory(cfg);

  console.log("Rendering complete.");
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});
