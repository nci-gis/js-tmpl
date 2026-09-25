import assert from 'node:assert';
import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { withTempDir } from '../helpers/tempDir.js';

const BIN = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'bin',
  'js-tmpl.js',
);

const MAIN = path.join(path.dirname(BIN), '..', 'src', 'cli', 'main.js');

/**
 * Run the real CLI entry in `cwd`; never rejects.
 * @param {string[]} args
 * @param {string} cwd
 * @param {string} [entry] - Script to run (default: the installed bin)
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>}
 */
async function cli(args, cwd, entry = BIN) {
  try {
    const { stdout, stderr } = await promisify(execFile)(
      process.execPath,
      [entry, ...args],
      { cwd },
    );
    return { code: 0, stdout, stderr };
  } catch (err) {
    return { code: err.code, stdout: err.stdout, stderr: err.stderr };
  }
}

// Round 06 — the installed entry point, end to end: argv handling, exit
// codes, and error output (the gap unit tests of parseArgs could not see).
describe('CLI (bin/js-tmpl.js)', () => {
  it('--help exits 0 and prints usage', async () => {
    await withTempDir(async (tmpDir) => {
      const r = await cli(['--help'], tmpDir);
      assert.strictEqual(r.code, 0);
      assert.match(r.stdout, /^Usage: js-tmpl/);
    });
  });

  it('usage errors exit 2 with a hint and no stack', async () => {
    await withTempDir(async (tmpDir) => {
      const r = await cli(['--bogus', 'foo'], tmpDir);
      assert.strictEqual(r.code, 2);
      assert.match(r.stderr, /^js-tmpl: Unknown option '--bogus'\n/);
      assert.match(r.stderr, /Run 'js-tmpl --help' for usage\./);
      assert.doesNotMatch(r.stderr, /\n\s+at /);
    });
  });

  it('render errors exit 1 with one line; --verbose adds the stack', async () => {
    await withTempDir(async (tmpDir) => {
      const plain = await cli([], tmpDir);
      assert.strictEqual(plain.code, 1);
      assert.match(plain.stderr, /^js-tmpl: ENOENT/);
      assert.doesNotMatch(plain.stderr, /\n\s+at /);

      const verbose = await cli(['--verbose'], tmpDir);
      assert.strictEqual(verbose.code, 1);
      assert.match(verbose.stderr, /\n\s+at /);

      await fs.mkdir(path.join(tmpDir, 'templates'));
      await fs.writeFile(
        path.join(tmpDir, 'templates', '${nope}.hbs'),
        'x',
        'utf8',
      );
      const coded = await cli(['--verbose'], tmpDir);
      assert.strictEqual(coded.code, 1);
      assert.match(coded.stderr, /\ncode: JSTMPL_PATH_MISSING_VAR\n/);
    });
  });

  it('also runs as `node src/cli/main.js` (package scripts)', async () => {
    await withTempDir(async (tmpDir) => {
      const ok = await cli(['--help'], tmpDir, MAIN);
      assert.strictEqual(ok.code, 0);
      assert.match(ok.stdout, /^Usage: js-tmpl/);

      const bad = await cli(['--bogus'], tmpDir, MAIN);
      assert.strictEqual(bad.code, 2);
    });
  });

  it('uses js-tmpl.config.yaml from the working directory', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, 'tpl'));
      await fs.writeFile(path.join(tmpDir, 'tpl', 'a.txt.hbs'), 'A', 'utf8');
      await fs.writeFile(
        path.join(tmpDir, 'js-tmpl.config.yaml'),
        'templateDir: tpl\noutDir: built\n',
        'utf8',
      );

      const r = await cli([], tmpDir);
      assert.strictEqual(r.code, 0, r.stderr);
      const out = await fs.readFile(
        path.join(tmpDir, 'built', 'a.txt'),
        'utf8',
      );
      assert.strictEqual(out, 'A');
    });
  });

  it('renders a project and exits 0', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, 'templates'));
      await fs.writeFile(
        path.join(tmpDir, 'templates', 'hello.txt.hbs'),
        'Hello {{name}}',
        'utf8',
      );
      await fs.writeFile(path.join(tmpDir, 'values.yaml'), 'name: CLI\n');

      const r = await cli(['render', '-c', 'values.yaml'], tmpDir);
      assert.strictEqual(r.code, 0, r.stderr);
      const out = await fs.readFile(
        path.join(tmpDir, 'dist', 'hello.txt'),
        'utf8',
      );
      assert.strictEqual(out, 'Hello CLI');
    });
  });

  it('--check: exit 3 on drift, 0 when up to date, and never writes', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, 'templates'));
      await fs.writeFile(
        path.join(tmpDir, 'templates', 'a.txt.hbs'),
        'v{{n}}',
        'utf8',
      );
      await fs.writeFile(path.join(tmpDir, 'v.yaml'), 'n: 1\n');

      const before = await cli(['-c', 'v.yaml', '--check'], tmpDir);
      assert.strictEqual(before.code, 3, before.stderr);
      assert.strictEqual(before.stdout, 'added   a.txt\n');
      assert.match(
        before.stderr,
        /1 of 1 files out of date \(1 added, 0 changed\)/,
      );
      await assert.rejects(fs.stat(path.join(tmpDir, 'dist')));

      assert.strictEqual((await cli(['-c', 'v.yaml'], tmpDir)).code, 0);
      const clean = await cli(['-c', 'v.yaml', '--check'], tmpDir);
      assert.strictEqual(clean.code, 0, clean.stderr);

      await fs.writeFile(path.join(tmpDir, 'v.yaml'), 'n: 2\n');
      const drift = await cli(['-c', 'v.yaml', '--check'], tmpDir);
      assert.strictEqual(drift.code, 3);
      assert.strictEqual(drift.stdout, 'changed a.txt\n');
      const out = await fs.readFile(path.join(tmpDir, 'dist', 'a.txt'), 'utf8');
      assert.strictEqual(out, 'v1');
    });
  });

  it('--check: fails like a render would when the disk blocks a target', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, 'templates'));
      await fs.writeFile(path.join(tmpDir, 'templates', 'a.hbs'), 'A');
      await fs.mkdir(path.join(tmpDir, 'dist', 'a'), { recursive: true });
      const r = await cli(['--check', '--verbose'], tmpDir);
      assert.strictEqual(r.code, 1);
      assert.match(r.stderr, /exists in outDir as a directory/);
      assert.match(r.stderr, /code: JSTMPL_OUTPUT_BLOCKED/);
    });
  });

  it('--check: render errors still exit 1', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, 'templates'));
      await fs.writeFile(path.join(tmpDir, 'templates', 'a.hbs'), '{{x}}');
      const r = await cli(['--check'], tmpDir);
      assert.strictEqual(r.code, 1);
      assert.match(r.stderr, /"x" is not defined in the view/);
    });
  });
});
