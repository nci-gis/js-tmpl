import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import { walkTemplateTree } from '../../../src/engine/treeWalker.js';
import { withTempDir } from '../../helpers/tempDir.js';

describe('walkTemplateTree', () => {
  it('walks single file in root', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, 'test.hbs'), 'content', 'utf8');

      const results = await walkTemplateTree(tmpDir);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].relPath, 'test.hbs');
      assert.strictEqual(results[0].absPath, path.join(tmpDir, 'test.hbs'));
    });
  });

  it('walks multiple files in root', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, 'a.hbs'), 'a', 'utf8');
      await fs.writeFile(path.join(tmpDir, 'b.hbs'), 'b', 'utf8');

      const results = await walkTemplateTree(tmpDir);

      assert.strictEqual(results.length, 2);
      const relPaths = results.map((r) => r.relPath).sort();
      assert.deepStrictEqual(relPaths, ['a.hbs', 'b.hbs']);
    });
  });

  it('walks nested directories', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, 'subdir'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'root.hbs'), 'root', 'utf8');
      await fs.writeFile(
        path.join(tmpDir, 'subdir', 'nested.hbs'),
        'nested',
        'utf8',
      );

      const results = await walkTemplateTree(tmpDir);

      assert.strictEqual(results.length, 2);
      const relPaths = results.map((r) => r.relPath).sort();
      assert.deepStrictEqual(relPaths, ['root.hbs', 'subdir/nested.hbs']);
    });
  });

  it('walks deeply nested directories', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, 'a', 'b', 'c'), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'a', 'b', 'c', 'deep.hbs'),
        'deep',
        'utf8',
      );

      const results = await walkTemplateTree(tmpDir);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].relPath, 'a/b/c/deep.hbs');
    });
  });

  it('filters files by extension', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, 'template.hbs'), 'hbs', 'utf8');
      await fs.writeFile(path.join(tmpDir, 'readme.md'), 'md', 'utf8');
      await fs.writeFile(path.join(tmpDir, 'data.json'), 'json', 'utf8');

      const results = await walkTemplateTree(tmpDir);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].relPath, 'template.hbs');
    });
  });

  it('uses custom extension', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, 'template.tmpl'), 'tmpl', 'utf8');
      await fs.writeFile(path.join(tmpDir, 'other.hbs'), 'hbs', 'utf8');

      const results = await walkTemplateTree(tmpDir, '.tmpl');

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].relPath, 'template.tmpl');
    });
  });

  it('handles empty directory', async () => {
    await withTempDir(async (tmpDir) => {
      const results = await walkTemplateTree(tmpDir);

      assert.strictEqual(results.length, 0);
      assert.deepStrictEqual(results, []);
    });
  });

  it('handles directory with only non-matching files', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, 'file.txt'), 'txt', 'utf8');
      await fs.writeFile(path.join(tmpDir, 'file.md'), 'md', 'utf8');

      const results = await walkTemplateTree(tmpDir);

      assert.strictEqual(results.length, 0);
    });
  });

  it('walks breadth-first order', async () => {
    await withTempDir(async (tmpDir) => {
      // Create structure: root files first, then subdir files
      await fs.mkdir(path.join(tmpDir, 'subdir'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'a.hbs'), 'a', 'utf8');
      await fs.writeFile(path.join(tmpDir, 'b.hbs'), 'b', 'utf8');
      await fs.writeFile(path.join(tmpDir, 'subdir', 'c.hbs'), 'c', 'utf8');

      const results = await walkTemplateTree(tmpDir);

      // BFS should find root files before subdir files
      assert.strictEqual(results.length, 3);
      const rootFiles = results.filter((r) => !r.relPath.includes('/'));
      assert.strictEqual(rootFiles.length, 2);
    });
  });

  it('returns files in sorted codepoint order within a directory', async () => {
    await withTempDir(async (tmpDir) => {
      // Create files in non-alphabetical order
      await fs.writeFile(path.join(tmpDir, 'c.hbs'), 'c', 'utf8');
      await fs.writeFile(path.join(tmpDir, 'a.hbs'), 'a', 'utf8');
      await fs.writeFile(path.join(tmpDir, 'b.hbs'), 'b', 'utf8');

      const results = await walkTemplateTree(tmpDir);

      // Must be sorted — not dependent on filesystem enumeration order
      assert.deepStrictEqual(
        results.map((r) => r.relPath),
        ['a.hbs', 'b.hbs', 'c.hbs'],
      );
    });
  });

  it('returns subdirectories in sorted order during BFS', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, 'z'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, 'a'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, 'm'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'root.hbs'), 'root', 'utf8');
      await fs.writeFile(path.join(tmpDir, 'z', 'z.hbs'), 'z', 'utf8');
      await fs.writeFile(path.join(tmpDir, 'a', 'a.hbs'), 'a', 'utf8');
      await fs.writeFile(path.join(tmpDir, 'm', 'm.hbs'), 'm', 'utf8');

      const results = await walkTemplateTree(tmpDir);

      // BFS: root first, then subdirs in sorted order
      assert.deepStrictEqual(
        results.map((r) => r.relPath),
        ['root.hbs', 'a/a.hbs', 'm/m.hbs', 'z/z.hbs'],
      );
    });
  });

  it('handles mixed file extensions in nested structure', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, 'templates'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, 'docs'), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'templates', 'page.hbs'),
        'hbs',
        'utf8',
      );
      await fs.writeFile(path.join(tmpDir, 'docs', 'readme.md'), 'md', 'utf8');

      const results = await walkTemplateTree(tmpDir);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].relPath, 'templates/page.hbs');
    });
  });

  // ── Path formulas ($if / $ifn) ────────────────────────────────────

  describe('view-aware path formulas', () => {
    it('accepts options-object form (ext only) as parity with string form', async () => {
      await withTempDir(async (tmpDir) => {
        await fs.writeFile(path.join(tmpDir, 'a.hbs'), 'a', 'utf8');

        const results = await walkTemplateTree(tmpDir, { ext: '.hbs' });
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].relPath, 'a.hbs');
      });
    });

    it('prunes subtree when $if formula fails', async () => {
      await withTempDir(async (tmpDir) => {
        await fs.mkdir(path.join(tmpDir, '$if{prod}'), { recursive: true });
        await fs.writeFile(
          path.join(tmpDir, '$if{prod}', 'prod.hbs'),
          'prod',
          'utf8',
        );
        await fs.writeFile(path.join(tmpDir, 'always.hbs'), 'always', 'utf8');

        const results = await walkTemplateTree(tmpDir, {
          ext: '.hbs',
          view: { prod: false },
        });

        assert.deepStrictEqual(
          results.map((r) => r.relPath).sort((a, b) => a.localeCompare(b)),
          ['always.hbs'],
        );
      });
    });

    it('includes subtree when $if formula passes', async () => {
      await withTempDir(async (tmpDir) => {
        await fs.mkdir(path.join(tmpDir, '$if{prod}'), { recursive: true });
        await fs.writeFile(
          path.join(tmpDir, '$if{prod}', 'prod.hbs'),
          'prod',
          'utf8',
        );

        const results = await walkTemplateTree(tmpDir, {
          ext: '.hbs',
          view: { prod: true },
        });

        assert.deepStrictEqual(
          results.map((r) => r.relPath).sort((a, b) => a.localeCompare(b)),
          ['$if{prod}/prod.hbs'],
        );
      });
    });

    it('inverts via $ifn', async () => {
      await withTempDir(async (tmpDir) => {
        await fs.mkdir(path.join(tmpDir, '$ifn{debug}'), { recursive: true });
        await fs.writeFile(
          path.join(tmpDir, '$ifn{debug}', 'release.hbs'),
          'r',
          'utf8',
        );

        const results = await walkTemplateTree(tmpDir, {
          ext: '.hbs',
          view: { debug: false },
        });
        assert.strictEqual(results.length, 1);
      });
    });

    it('nested guards — both must pass', async () => {
      await withTempDir(async (tmpDir) => {
        const nested = path.join(tmpDir, '$if{a}', '$if{b}');
        await fs.mkdir(nested, { recursive: true });
        await fs.writeFile(path.join(nested, 'x.hbs'), 'x', 'utf8');

        const bothTrue = await walkTemplateTree(tmpDir, {
          ext: '.hbs',
          view: { a: true, b: true },
        });
        assert.strictEqual(bothTrue.length, 1);

        const oneFalse = await walkTemplateTree(tmpDir, {
          ext: '.hbs',
          view: { a: true, b: false },
        });
        assert.strictEqual(oneFalse.length, 0);
      });
    });

    it('throws with relPath context on missing guard var', async () => {
      await withTempDir(async (tmpDir) => {
        await fs.mkdir(path.join(tmpDir, '$if{missing}'), { recursive: true });
        await fs.writeFile(
          path.join(tmpDir, '$if{missing}', 'x.hbs'),
          'x',
          'utf8',
        );

        await assert.rejects(
          walkTemplateTree(tmpDir, { ext: '.hbs', view: {} }),
          /undefined view variable 'missing'/,
        );
      });
    });

    it('throws on malformed guard segment', async () => {
      await withTempDir(async (tmpDir) => {
        await fs.mkdir(path.join(tmpDir, '$if{a}folder'), { recursive: true });
        await fs.writeFile(
          path.join(tmpDir, '$if{a}folder', 'x.hbs'),
          'x',
          'utf8',
        );

        await assert.rejects(
          walkTemplateTree(tmpDir, { ext: '.hbs', view: { a: true } }),
          /whole segments/,
        );
      });
    });

    it('no view supplied — walker treats $if dirs as literal (parity)', async () => {
      await withTempDir(async (tmpDir) => {
        await fs.mkdir(path.join(tmpDir, '$if{any}'), { recursive: true });
        await fs.writeFile(path.join(tmpDir, '$if{any}', 'x.hbs'), 'x', 'utf8');

        const results = await walkTemplateTree(tmpDir);
        assert.strictEqual(results.length, 1);
        assert.strictEqual(results[0].relPath, '$if{any}/x.hbs');
      });
    });

    it('early-exit: failing formula does not readdir skipped subtree', async () => {
      await withTempDir(async (tmpDir) => {
        const skipped = path.join(tmpDir, '$if{prod}');
        await fs.mkdir(skipped, { recursive: true });
        await fs.writeFile(path.join(skipped, 'p.hbs'), 'p', 'utf8');
        await fs.writeFile(path.join(tmpDir, 'root.hbs'), 'r', 'utf8');

        // Spy on readdir
        const origReaddir = fs.readdir;
        const readdirCalls = [];
        fs.readdir = (p, ...rest) => {
          readdirCalls.push(String(p));
          return origReaddir(p, ...rest);
        };

        try {
          await walkTemplateTree(tmpDir, {
            ext: '.hbs',
            view: { prod: false },
          });
        } finally {
          fs.readdir = origReaddir;
        }

        // readdir must be called on root, never on the skipped subtree
        assert.ok(readdirCalls.includes(tmpDir));
        assert.ok(!readdirCalls.some((p) => p.includes('$if{prod}')));
      });
    });
  });
});
