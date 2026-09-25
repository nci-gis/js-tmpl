import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  comparePlan,
  planRender,
  renderDirectory,
} from '../../../src/engine/renderDirectory.js';
import { withTempDir } from '../../helpers/tempDir.js';

/**
 * @param {string} dir
 * @param {Record<string, string>} files - POSIX relPath → content
 */
async function seed(dir, files) {
  for (const [rel, content] of Object.entries(files)) {
    const abs = path.join(dir, ...rel.split('/'));
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, content, 'utf8');
  }
}

/** @param {string} tmpDir @param {Record<string, unknown>} view */
function cfg(tmpDir, view) {
  return {
    templateDir: path.join(tmpDir, 't'),
    outDir: path.join(tmpDir, 'out'),
    extname: '.hbs',
    view,
  };
}

/** @param {string} p */
const exists = (p) =>
  fs
    .stat(p)
    .then(() => true)
    .catch(() => false);

// Round 08 — the engine's decisions as data.
describe('planRender', () => {
  it('returns every output, sorted by target, with / paths, without writing', async () => {
    await withTempDir(async (tmpDir) => {
      await seed(path.join(tmpDir, 't'), {
        'z.txt.hbs': 'Z {{n}}',
        '${dir}/b.txt.hbs': 'B',
        '$if{on}/a.txt.hbs': 'A',
        '$ifn{on}/skipped.txt.hbs': 'never',
      });

      const plan = await planRender(
        cfg(tmpDir, { n: 1, dir: 'x/y', on: true }),
      );

      assert.deepStrictEqual(plan, [
        { relPath: '$if{on}/a.txt.hbs', target: 'a.txt', content: 'A' },
        { relPath: '${dir}/b.txt.hbs', target: 'x/y/b.txt', content: 'B' },
        { relPath: 'z.txt.hbs', target: 'z.txt', content: 'Z 1' },
      ]);
      assert.strictEqual(await exists(path.join(tmpDir, 'out')), false);
    });
  });

  it('throws a single error unchanged', async () => {
    await withTempDir(async (tmpDir) => {
      await seed(path.join(tmpDir, 't'), { 'a.hbs': '{{missing}}' });
      await assert.rejects(planRender(cfg(tmpDir, {})), {
        code: 'JSTMPL_TEMPLATE_MISSING_VALUE',
      });
    });
  });

  it('collects every problem in one run (collect-all)', async () => {
    await withTempDir(async (tmpDir) => {
      await seed(path.join(tmpDir, 't'), {
        'a.hbs': '{{one}} {{two}}', // first miss only, per template
        'b.hbs': '{{#if three}}x{{/if}}',
        '${four}.hbs': 'x', // path variable
        '$if{five}/c.hbs': 'x', // guard
        'ok.hbs': 'fine',
      });

      await assert.rejects(planRender(cfg(tmpDir, {})), (err) => {
        assert.strictEqual(err.code, 'JSTMPL_MULTIPLE_ERRORS');
        assert.deepStrictEqual(
          err.details.errors.map((e) => e.code),
          [
            'JSTMPL_GUARD_MISSING_VAR',
            'JSTMPL_PATH_MISSING_VAR',
            'JSTMPL_TEMPLATE_MISSING_VALUE',
            'JSTMPL_TEMPLATE_MISSING_VALUE',
          ],
        );
        assert.match(err.message, /^4 errors:\n {2}- /);
        assert.match(err.message, /Declare optional keys in values/);
        assert.doesNotMatch(err.message, /"two"/);
        return true;
      });
    });
  });

  it('orders collected errors the same way on every run', async () => {
    await withTempDir(async (tmpDir) => {
      await seed(path.join(tmpDir, 't'), {
        'b.hbs': '{{b}}',
        'a.hbs': '{{a}}',
        'c/d.hbs': '{{d}}',
      });
      const messages = async () =>
        planRender(cfg(tmpDir, {})).catch((e) => e.message);
      assert.strictEqual(await messages(), await messages());
      assert.match(
        await messages(),
        /'a\.hbs'[\s\S]*'b\.hbs'[\s\S]*'c\/d\.hbs'/,
      );
    });
  });

  it('collects collisions alongside other errors', async () => {
    await withTempDir(async (tmpDir) => {
      await seed(path.join(tmpDir, 't'), {
        '${a}.hbs': 'A',
        '${b}.hbs': 'B',
        'm.hbs': '{{m}}',
      });
      await assert.rejects(
        planRender(cfg(tmpDir, { a: 'same', b: 'same' })),
        (err) => {
          assert.deepStrictEqual(err.details.errors.map((e) => e.code).sort(), [
            'JSTMPL_OUTPUT_COLLISION',
            'JSTMPL_TEMPLATE_MISSING_VALUE',
          ]);
          return true;
        },
      );
    });
  });

  it('checks the body of a template whose path fails', async () => {
    await withTempDir(async (tmpDir) => {
      await seed(path.join(tmpDir, 't'), { '${name}.hbs': '{{missing}}' });
      await assert.rejects(planRender(cfg(tmpDir, {})), (err) => {
        assert.deepStrictEqual(
          err.details.errors.map((e) => e.code),
          ['JSTMPL_PATH_MISSING_VAR', 'JSTMPL_TEMPLATE_MISSING_VALUE'],
        );
        return true;
      });
    });
  });

  it('checks the body of a template that loses a collision', async () => {
    await withTempDir(async (tmpDir) => {
      await seed(path.join(tmpDir, 't'), {
        '${a}.hbs': 'A',
        '${b}.hbs': '{{missing}}',
      });
      await assert.rejects(
        planRender(cfg(tmpDir, { a: 'same', b: 'same' })),
        (err) => {
          assert.deepStrictEqual(err.details.errors.map((e) => e.code).sort(), [
            'JSTMPL_OUTPUT_COLLISION',
            'JSTMPL_TEMPLATE_MISSING_VALUE',
          ]);
          return true;
        },
      );
    });
  });

  for (const [label, file, name] of [
    ['empty value at the root', '${name}.hbs', ''],
    ["'.' value at the root", '${name}.hbs', '.'],
    ["'..' value at the root", '${name}.hbs', '..'],
    ['empty value in a directory', 'x/${name}.hbs', ''],
  ]) {
    it(`rejects a target with no name once the extension is removed (${label})`, async () => {
      await withTempDir(async (tmpDir) => {
        await seed(path.join(tmpDir, 't'), { [file]: 'x' });
        await assert.rejects(planRender(cfg(tmpDir, { name })), {
          code: 'JSTMPL_PATH_EMPTY_SEGMENT',
          message: /once '\.hbs' is removed/,
        });
        await assert.rejects(renderDirectory(cfg(tmpDir, { name })), {
          code: 'JSTMPL_PATH_EMPTY_SEGMENT',
        });
        assert.strictEqual(await exists(path.join(tmpDir, 'out')), false);
      });
    });
  }

  it('strips an extname that contains RegExp characters', async () => {
    await withTempDir(async (tmpDir) => {
      await seed(path.join(tmpDir, 't'), { 'a.txt.c++': 'A' });
      const plan = await planRender({
        ...cfg(tmpDir, {}),
        extname: '.c++',
      });
      assert.deepStrictEqual(
        plan.map((e) => e.target),
        ['a.txt'],
      );
    });
  });

  // Only js-tmpl's own errors are collected; I/O failures stop the run.
  it(
    'rethrows I/O errors instead of collecting them',
    { skip: process.platform === 'win32' || process.getuid?.() === 0 },
    async () => {
      await withTempDir(async (tmpDir) => {
        await seed(path.join(tmpDir, 't'), { 'a.hbs': 'x' });
        await fs.chmod(path.join(tmpDir, 't', 'a.hbs'), 0o000);
        await assert.rejects(planRender(cfg(tmpDir, {})), { code: 'EACCES' });
      });
    },
  );

  it('three templates on one target: two collisions, no missing-key hint', async () => {
    await withTempDir(async (tmpDir) => {
      await seed(path.join(tmpDir, 't'), {
        '${a}.hbs': 'A',
        '${b}.hbs': 'B',
        '${c}.hbs': 'C',
      });
      await assert.rejects(
        planRender(cfg(tmpDir, { a: 'x', b: 'x', c: 'x' })),
        (err) => {
          assert.strictEqual(err.code, 'JSTMPL_MULTIPLE_ERRORS');
          assert.strictEqual(err.details.errors.length, 2);
          assert.doesNotMatch(err.message, /Declare optional keys/);
          return true;
        },
      );
    });
  });

  it('renderDirectory writes nothing when a template fails to render', async () => {
    await withTempDir(async (tmpDir) => {
      await seed(path.join(tmpDir, 't'), {
        'a-good.hbs': 'fine',
        'z-bad.hbs': '{{missing}}',
      });
      await assert.rejects(renderDirectory(cfg(tmpDir, {})));
      assert.strictEqual(await exists(path.join(tmpDir, 'out')), false);
    });
  });
});

describe('comparePlan', () => {
  const plan = [
    { relPath: 'a.hbs', target: 'a.txt', content: 'A\n' },
    { relPath: 'b.hbs', target: 'sub/b.txt', content: 'B' },
    { relPath: 'c.hbs', target: 'c.txt', content: 'C' },
  ];

  it('reports added and changed targets, byte-exact, ignoring extra files', async () => {
    await withTempDir(async (outDir) => {
      await seed(outDir, {
        'a.txt': 'A\r\n', // CRLF vs LF: changed
        'c.txt': 'C', // identical
        'extra.txt': 'not ours', // ignored
      });

      assert.deepStrictEqual(comparePlan(plan, outDir), {
        added: ['sub/b.txt'],
        changed: ['a.txt'],
      });
    });
  });

  it('a missing trailing newline is a change', async () => {
    await withTempDir(async (outDir) => {
      await seed(outDir, { 'a.txt': 'A', 'sub/b.txt': 'B', 'c.txt': 'C' });
      assert.deepStrictEqual(comparePlan(plan, outDir).changed, ['a.txt']);
    });
  });

  it('treats a missing outDir as everything added, and never writes', async () => {
    await withTempDir(async (tmpDir) => {
      const outDir = path.join(tmpDir, 'nope');
      assert.deepStrictEqual(comparePlan(plan, outDir), {
        added: ['a.txt', 'c.txt', 'sub/b.txt'],
        changed: [],
      });
      assert.strictEqual(await exists(outDir), false);
    });
  });

  it('is clean right after renderDirectory', async () => {
    await withTempDir(async (tmpDir) => {
      await seed(path.join(tmpDir, 't'), { 'x.txt.hbs': '{{v}}\n' });
      const c = cfg(tmpDir, { v: 1 });
      await renderDirectory(c);
      assert.deepStrictEqual(comparePlan(await planRender(c), c.outDir), {
        added: [],
        changed: [],
      });
    });
  });
});
