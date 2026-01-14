#!/usr/bin/env node

import { parseArgs } from "./args.js";
import { resolveConfig } from "../config/resolver.js";
import { renderDirectory } from "../engine/renderDirectory.js";

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

main();
