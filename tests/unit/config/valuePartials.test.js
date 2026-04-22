import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import { scanValuePartials } from '../../../src/config/valuePartials.js';
import { withTempDir } from '../../helpers/tempDir.js';

describe('scanValuePartials', () => {
  it('returns empty tree for falsy valuesDir', async () => {
    const result = scanValuePartials('');
    assert.deepStrictEqual(result, {});
  });

  it('returns empty tree for empty dir', async () => {
    await withTempDir(async (tmpDir) => {
      const result = scanValuePartials(tmpDir);
      assert.deepStrictEqual(result, {});
    });
  });

  it('loads a single root file under [basename]', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, 'app.yaml'),
        'name: my-app\nport: 8080\n',
        'utf8',
      );
      const result = scanValuePartials(tmpDir);
      assert.deepStrictEqual(result, { app: { name: 'my-app', port: 8080 } });
    });
  });

  it('namespaces by directory path', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, 'env'), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'env', 'prod.yaml'),
        'replicas: 3\n',
        'utf8',
      );
      await fs.writeFile(
        path.join(tmpDir, 'env', 'dev.yaml'),
        'replicas: 1\n',
        'utf8',
      );
      const result = scanValuePartials(tmpDir);
      assert.deepStrictEqual(result, {
        env: { prod: { replicas: 3 }, dev: { replicas: 1 } },
      });
    });
  });

  it('supports .yaml / .yml / .json', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, 'a.yaml'), 'v: 1\n', 'utf8');
      await fs.writeFile(path.join(tmpDir, 'b.yml'), 'v: 2\n', 'utf8');
      await fs.writeFile(path.join(tmpDir, 'c.json'), '{"v":3}', 'utf8');
      const result = scanValuePartials(tmpDir);
      assert.deepStrictEqual(result, {
        a: { v: 1 },
        b: { v: 2 },
        c: { v: 3 },
      });
    });
  });

  it('ignores files with non-matching extensions', async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, 'a.yaml'), 'v: 1\n', 'utf8');
      await fs.writeFile(path.join(tmpDir, 'README.md'), 'readme', 'utf8');
      const result = scanValuePartials(tmpDir);
      assert.deepStrictEqual(result, { a: { v: 1 } });
    });
  });

  describe('@ flatten (root-independent)', () => {
    it('@ at top level flattens to [basename]', async () => {
      await withTempDir(async (tmpDir) => {
        const inner = path.join(tmpDir, '@shared');
        await fs.mkdir(inner, { recursive: true });
        await fs.writeFile(
          path.join(inner, 'consts.yaml'),
          'max: 10\n',
          'utf8',
        );
        const result = scanValuePartials(tmpDir);
        assert.deepStrictEqual(result, { consts: { max: 10 } });
      });
    });

    it('@ at nested level also flattens (root-independence)', async () => {
      await withTempDir(async (tmpDir) => {
        const inner = path.join(tmpDir, 'env', '@overrides');
        await fs.mkdir(inner, { recursive: true });
        await fs.writeFile(
          path.join(inner, 'app.yaml'),
          'port: 9000\n',
          'utf8',
        );
        const result = scanValuePartials(tmpDir);
        assert.deepStrictEqual(result, { app: { port: 9000 } });
      });
    });
  });

  describe('collisions', () => {
    it('throws on identical namespace chain (root file + @-flattened)', async () => {
      await withTempDir(async (tmpDir) => {
        await fs.writeFile(
          path.join(tmpDir, 'app.yaml'),
          'version: 1\n',
          'utf8',
        );
        const inner = path.join(tmpDir, '@shared');
        await fs.mkdir(inner, { recursive: true });
        await fs.writeFile(
          path.join(inner, 'app.yaml'),
          'version: 2\n',
          'utf8',
        );

        assert.throws(
          () => scanValuePartials(tmpDir),
          /Duplicate value partial 'app'/,
        );
      });
    });

    it('throws on shadow collision: leaf file vs subtree', async () => {
      await withTempDir(async (tmpDir) => {
        // `env.yaml` claims `env` as a leaf; `env/prod.yaml` wants to nest
        // under it — unambiguous conflict.
        await fs.writeFile(
          path.join(tmpDir, 'env.yaml'),
          'default: true\n',
          'utf8',
        );
        await fs.mkdir(path.join(tmpDir, 'env'), { recursive: true });
        await fs.writeFile(
          path.join(tmpDir, 'env', 'prod.yaml'),
          'replicas: 3\n',
          'utf8',
        );

        assert.throws(() => scanValuePartials(tmpDir), /shadow collision/);
      });
    });

    it('throws on invalid segment name', async () => {
      await withTempDir(async (tmpDir) => {
        await fs.writeFile(
          path.join(tmpDir, 'has-hyphen.yaml'),
          'v: 1\n',
          'utf8',
        );
        assert.throws(
          () => scanValuePartials(tmpDir),
          /Invalid value partial segment/,
        );
      });
    });
  });
});
