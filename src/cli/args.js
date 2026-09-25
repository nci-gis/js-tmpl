import { parseArgs as parseNodeArgs } from 'node:util';

import { ErrorCodes, JsTmplError } from '../errors.js';

/**
 * The command line was malformed: unknown option, missing value, stray
 * argument. The CLI exits with code 2 for these, distinct from render or
 * config failures (code 1).
 */
export class UsageError extends JsTmplError {
  /** @param {string} message */
  constructor(message) {
    super(ErrorCodes.CLI_USAGE, message);
    this.name = 'UsageError';
  }
}

/** Option name → CliArgs field. Short aliases live in OPTIONS. */
const FIELDS = {
  'template-dir': 'templateDir',
  values: 'valuesFile',
  'values-dir': 'valuesDir',
  out: 'outDir',
  'partials-dir': 'partialsDir',
  'config-file': 'configFile',
  ext: 'extname',
  'env-prefix': 'envPrefix',
};

/** @type {import('node:util').ParseArgsConfig['options']} */
const OPTIONS = {
  help: { type: 'boolean', short: 'h' },
  verbose: { type: 'boolean' },
  check: { type: 'boolean' },
  'template-dir': { type: 'string', short: 't' },
  values: { type: 'string', short: 'c' },
  'values-dir': { type: 'string' },
  out: { type: 'string', short: 'o' },
  'partials-dir': { type: 'string', short: 'p' },
  'config-file': { type: 'string' },
  ext: { type: 'string', short: 'x' },
  'env-keys': { type: 'string' },
  'env-prefix': { type: 'string' },
};

const COMMANDS = new Set(['render']);

/**
 * Run node:util parseArgs, turning its errors into UsageError with the
 * first sentence of Node's message (the rest is generic advice). An option
 * followed by another option (`-o --values x`) is reported as missing its
 * value rather than taking `--values` as the output dir.
 *
 * @param {string[]} args
 */
function tokenize(args) {
  try {
    return parseNodeArgs({
      args,
      options: OPTIONS,
      strict: true,
      allowPositionals: true,
      tokens: true,
    });
  } catch (error) {
    const err = /** @type {Error & { code?: string }} */ (error);
    if (err.code?.startsWith('ERR_PARSE_ARGS_')) {
      const first = err.message.split(/\.(?:\s|$)/)[0];
      const ambiguous = first.match(/^Option '([^']+)' argument is ambiguous/);
      throw new UsageError(
        ambiguous ? `Option '${ambiguous[1]}' is missing its value` : first,
      );
    }
    throw err;
  }
}

/**
 * Throw if any option appears more than once (no silent last-wins).
 *
 * @param {Array<{ kind: string, name?: string, rawName?: string }>} tokens
 */
function assertNoRepeats(tokens) {
  /** @type {Map<string, string>} */
  const seen = new Map();
  for (const t of tokens) {
    if (t.kind !== 'option' || !t.name) {
      continue;
    }
    if (seen.has(t.name)) {
      throw new UsageError(
        `Option '--${t.name}' given more than once (${seen.get(t.name)}, ${t.rawName})`,
      );
    }
    seen.set(t.name, t.rawName ?? `--${t.name}`);
  }
}

/**
 * Parse CLI arguments (without the node binary and script path).
 *
 * Strict: unknown options, options missing their value, repeated options,
 * and positional arguments other than one `render` command throw
 * `UsageError`. Only options actually given appear in the result, so unset
 * options never override config-file or default values.
 *
 * @param {string[]} args - e.g. `process.argv.slice(2)`
 * @returns {import('../types.js').CliArgs}
 * @throws {UsageError}
 */
export function parseArgs(args) {
  const { values, positionals, tokens } = tokenize(args);
  assertNoRepeats(/** @type {any[]} */ (tokens));

  const [command = 'render', ...extra] = positionals;
  if (!COMMANDS.has(command)) {
    throw new UsageError(`Unknown command '${command}'`);
  }
  if (extra.length > 0) {
    throw new UsageError(`Unexpected argument '${extra[0]}'`);
  }

  /** @type {import('../types.js').CliArgs} */
  const opts = { command: values.help ? 'help' : command };
  if (values.verbose) {
    opts.verbose = true;
  }
  if (values.check) {
    opts.check = true;
  }

  for (const [option, field] of Object.entries(FIELDS)) {
    const value = values[option];
    if (typeof value === 'string') {
      /** @type {Record<string, unknown>} */ (opts)[field] = value;
    }
  }

  if (typeof values['env-keys'] === 'string') {
    const keys = values['env-keys']
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (keys.length === 0) {
      throw new UsageError(
        "Option '--env-keys' needs at least one variable name",
      );
    }
    opts.envKeys = keys;
  }

  return opts;
}
