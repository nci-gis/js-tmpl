#!/usr/bin/env node

import { resolveConfig } from "../config/resolver.js";
import { renderDirectory } from "../engine/renderDirectory.js";
import { parseArgs } from "./args.js";

export async function main() {
  const cli = parseArgs(process.argv);

  if (cli.command !== "render") {
    console.error("Unknown command:", cli.command);
    process.exit(1);
  }

  const cfg = resolveConfig(cli);

  await renderDirectory(cfg);

  console.log("✔ js-tmpl completed.");
}

// Execute main function if this file is run directly
try {
  await main();
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}
