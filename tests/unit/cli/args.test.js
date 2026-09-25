import assert from 'node:assert';
import { describe, it } from 'node:test';

import { parseArgs, UsageError } from '../../../src/cli/args.js';

describe('parseArgs', () => {
  it('defaults command to render', () => {
    const result = parseArgs([]);
    assert.strictEqual(result.command, 'render');
  });

  it('parses --help flag', () => {
    const result = parseArgs(['--help']);
    assert.strictEqual(result.command, 'help');
  });

  it('parses -h flag', () => {
    const result = parseArgs(['-h']);
    assert.strictEqual(result.command, 'help');
  });

  it('parses render command', () => {
    const result = parseArgs(['render']);
    assert.strictEqual(result.command, 'render');
  });

  it('parses --template-dir', () => {
    const result = parseArgs(['--template-dir', 'my-templates']);
    assert.strictEqual(result.templateDir, 'my-templates');
  });

  it('parses -t shorthand', () => {
    const result = parseArgs(['-t', 'my-templates']);
    assert.strictEqual(result.templateDir, 'my-templates');
  });

  it('parses --values', () => {
    const result = parseArgs(['--values', 'vals.yaml']);
    assert.strictEqual(result.valuesFile, 'vals.yaml');
  });

  it('parses -c shorthand', () => {
    const result = parseArgs(['-c', 'vals.yaml']);
    assert.strictEqual(result.valuesFile, 'vals.yaml');
  });

  it('parses --values-dir', () => {
    const result = parseArgs(['--values-dir', 'values']);
    assert.strictEqual(result.valuesDir, 'values');
  });

  it('parses --values and --values-dir together', () => {
    const result = parseArgs([
      '--values',
      'app.yaml',
      '--values-dir',
      'values',
    ]);
    assert.strictEqual(result.valuesFile, 'app.yaml');
    assert.strictEqual(result.valuesDir, 'values');
  });

  it('parses --out', () => {
    const result = parseArgs(['--out', 'build']);
    assert.strictEqual(result.outDir, 'build');
  });

  it('parses -o shorthand', () => {
    const result = parseArgs(['-o', 'build']);
    assert.strictEqual(result.outDir, 'build');
  });

  it('parses --partials-dir', () => {
    const result = parseArgs(['--partials-dir', 'partials']);
    assert.strictEqual(result.partialsDir, 'partials');
  });

  it('parses -p shorthand', () => {
    const result = parseArgs(['-p', 'partials']);
    assert.strictEqual(result.partialsDir, 'partials');
  });

  it('parses --config-file', () => {
    const result = parseArgs(['--config-file', 'custom.yaml']);
    assert.strictEqual(result.configFile, 'custom.yaml');
  });

  it('parses --ext', () => {
    const result = parseArgs(['--ext', '.tmpl']);
    assert.strictEqual(result.extname, '.tmpl');
  });

  it('parses -x shorthand', () => {
    const result = parseArgs(['-x', '.tmpl']);
    assert.strictEqual(result.extname, '.tmpl');
  });

  it('parses multiple flags together', () => {
    const result = parseArgs([
      '-t',
      'tpl',
      '-c',
      'vals.yaml',
      '-o',
      'out',
      '-p',
      'parts',
      '-x',
      '.tmpl',
      '--config-file',
      'cfg.yaml',
    ]);
    assert.strictEqual(result.command, 'render');
    assert.strictEqual(result.templateDir, 'tpl');
    assert.strictEqual(result.valuesFile, 'vals.yaml');
    assert.strictEqual(result.outDir, 'out');
    assert.strictEqual(result.partialsDir, 'parts');
    assert.strictEqual(result.extname, '.tmpl');
    assert.strictEqual(result.configFile, 'cfg.yaml');
  });

  it('parses --env-keys as comma-separated array', () => {
    const result = parseArgs(['--env-keys', 'NODE_ENV,APP_NAME']);
    assert.deepStrictEqual(result.envKeys, ['NODE_ENV', 'APP_NAME']);
  });

  it('parses --env-keys with single key', () => {
    const result = parseArgs(['--env-keys', 'NODE_ENV']);
    assert.deepStrictEqual(result.envKeys, ['NODE_ENV']);
  });

  it('trims whitespace in --env-keys', () => {
    const result = parseArgs(['--env-keys', 'NODE_ENV , APP_NAME']);
    assert.deepStrictEqual(result.envKeys, ['NODE_ENV', 'APP_NAME']);
  });

  it('filters empty entries in --env-keys', () => {
    const result = parseArgs(['--env-keys', 'NODE_ENV,,APP_NAME,']);
    assert.deepStrictEqual(result.envKeys, ['NODE_ENV', 'APP_NAME']);
  });

  it('parses --env-prefix', () => {
    const result = parseArgs(['--env-prefix', 'JS_TMPL_']);
    assert.strictEqual(result.envPrefix, 'JS_TMPL_');
  });

  it('help flag takes effect even with other flags', () => {
    const result = parseArgs(['render', '--help', '-c', 'vals.yaml']);
    assert.strictEqual(result.command, 'help');
  });
});

// Round 06 — strict parsing: every malformed command line is a UsageError.
describe('parseArgs — strict', () => {
  /**
   * @param {string[]} args
   * @param {RegExp} message
   */
  function rejects(args, message) {
    assert.throws(
      () => parseArgs(args),
      (err) => {
        assert.ok(err instanceof UsageError, `${err.name}: ${err.message}`);
        assert.match(err.message, message);
        return true;
      },
    );
  }

  it('rejects unknown options', () => {
    rejects(['--bogus'], /Unknown option '--bogus'/);
    rejects(['-z'], /Unknown option '-z'/);
  });

  it('rejects an option at the end without its value', () => {
    rejects(['--env-keys'], /--env-keys <value>' argument missing/);
    rejects(['-o'], /--out <value>' argument missing/);
  });

  it('rejects an option followed by another option instead of a value', () => {
    rejects(['-o', '--values', 'x.yaml'], /Option '-o' is missing its value/);
  });

  it('accepts a dash-leading value with = syntax', () => {
    assert.strictEqual(parseArgs(['--out=-dir']).outDir, '-dir');
  });

  it('rejects unknown commands and extra positionals', () => {
    rejects(['foo'], /Unknown command 'foo'/);
    rejects(['render', 'extra'], /Unexpected argument 'extra'/);
  });

  it('rejects a repeated option, including via its alias', () => {
    rejects(['-o', 'a', '--out', 'b'], /'--out' given more than once/);
  });

  it('rejects --env-keys with no names', () => {
    rejects(['--env-keys', ' , '], /needs at least one variable name/);
  });

  it('omits unset options so they never override config or defaults', () => {
    assert.deepStrictEqual(parseArgs(['-c', 'v.yaml']), {
      command: 'render',
      valuesFile: 'v.yaml',
    });
  });

  it('parses --verbose', () => {
    assert.strictEqual(parseArgs(['--verbose']).verbose, true);
  });
});
