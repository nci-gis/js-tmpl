#!/usr/bin/env node

import { resolveConfig } from '../config/resolver.js';
import { renderDirectory } from '../engine/renderDirectory.js';
import { parseArgs } from './args.js';
import { USAGE } from './usage.js';

/** @returns {Promise<void>} */
export async function main() {
  const cli = parseArgs(process.argv);

  if (cli.command === 'help') {
    console.log(USAGE);
    return;
  }

  if (cli.command !== 'render') {
    console.error('Unknown command:', cli.command);
    process.exit(1);
  }

  const cfg = resolveConfig(cli);

  await renderDirectory(cfg);

  console.log('✔ js-tmpl completed.');
}

// Execute main function if this file is run directly
const isDirectRun =
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'));

if (isDirectRun) {
  try {
    await main();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}
