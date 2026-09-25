#!/usr/bin/env node

import { resolveConfig } from '../config/resolver.js';
import { renderDirectory } from '../engine/renderDirectory.js';
import { parseArgs, UsageError } from './args.js';
import { USAGE } from './usage.js';

/**
 * Parse arguments and run the command. Throws on any failure; `run` turns
 * that into output and an exit code.
 *
 * @param {string[]} argv - Arguments without the node binary and script path
 * @returns {Promise<void>}
 */
export async function main(argv) {
  const cli = parseArgs(argv);

  if (cli.command === 'help') {
    console.log(USAGE);
    return;
  }

  const cfg = resolveConfig(cli);
  await renderDirectory(cfg);
  console.log('✔ js-tmpl completed.');
}

/**
 * CLI error boundary. Prints `js-tmpl: <message>` (plus the stack with
 * `--verbose`) and returns the exit code: 0 ok, 1 render/config error,
 * 2 usage error.
 *
 * @param {string[]} argv - Arguments without the node binary and script path
 * @returns {Promise<number>}
 */
export async function run(argv) {
  try {
    await main(argv);
    return 0;
  } catch (error) {
    const err = /** @type {Error} */ (error);
    console.error(`js-tmpl: ${err.message}`);
    if (err instanceof UsageError) {
      console.error("Run 'js-tmpl --help' for usage.");
      return 2;
    }
    if (argv.includes('--verbose')) {
      console.error(err.stack);
    }
    return 1;
  }
}

// Direct execution (`node src/cli/main.js …`). The installed CLI enters
// through bin/js-tmpl.js instead, which calls `run` itself.
const isDirectRun =
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replaceAll('\\', '/'));

if (isDirectRun) {
  process.exitCode = await run(process.argv.slice(2));
}
