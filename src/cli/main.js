#!/usr/bin/env node

import { findProjectConfig, resolveConfig } from '../config/resolver.js';
import {
  comparePlan,
  planRender,
  renderDirectory,
} from '../engine/renderDirectory.js';
import { parseArgs, UsageError } from './args.js';
import { USAGE } from './usage.js';

/** Exit code for `--check` when committed output is out of date. */
const EXIT_DRIFT = 3;

/**
 * Parse arguments and run the command. Throws on any failure; `run` turns
 * that into output and an exit code.
 *
 * @param {string[]} argv - Arguments without the node binary and script path
 * @returns {Promise<number>} Exit code for a run that did not throw
 */
export async function main(argv) {
  const cli = parseArgs(argv);

  if (cli.command === 'help') {
    console.log(USAGE);
    return 0;
  }

  // Config-file discovery is CLI behaviour; the engine only reads a file it
  // is given.
  const configFile = cli.configFile ?? findProjectConfig();
  const cfg = resolveConfig(configFile ? { ...cli, configFile } : cli);

  if (cli.check) {
    return check(cfg);
  }

  await renderDirectory(cfg);
  console.log('✔ js-tmpl completed.');
  return 0;
}

/**
 * `--check`: render in memory, compare with outDir, write nothing.
 * Drift is listed on stdout (`added <path>` / `changed <path>`) for scripts;
 * the summary goes to stderr.
 *
 * @param {import('../types.js').TemplateConfig} cfg
 * @returns {Promise<number>}
 */
async function check(cfg) {
  const plan = await planRender(cfg);
  const { added, changed } = comparePlan(plan, cfg.outDir);

  if (added.length === 0 && changed.length === 0) {
    console.log(`✔ js-tmpl: ${plan.length} files up to date.`);
    return 0;
  }
  for (const target of added) {
    console.log(`added   ${target}`);
  }
  for (const target of changed) {
    console.log(`changed ${target}`);
  }
  console.error(
    `js-tmpl: ${added.length + changed.length} of ${plan.length} files out of date ` +
      `(${added.length} added, ${changed.length} changed). Run without --check to update.`,
  );
  return EXIT_DRIFT;
}

/**
 * CLI error boundary. Prints `js-tmpl: <message>` (plus the stack with
 * `--verbose`) and returns the exit code: 0 ok, 1 render/config error,
 * 2 usage error, 3 `--check` found out-of-date output.
 *
 * @param {string[]} argv - Arguments without the node binary and script path
 * @returns {Promise<number>}
 */
export async function run(argv) {
  try {
    return await main(argv);
  } catch (error) {
    const err = /** @type {Error} */ (error);
    console.error(`js-tmpl: ${err.message}`);
    if (err instanceof UsageError) {
      console.error("Run 'js-tmpl --help' for usage.");
      return 2;
    }
    if (argv.includes('--verbose')) {
      const code = /** @type {{ code?: string }} */ (err).code;
      if (code) {
        console.error(`code: ${code}`);
      }
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
