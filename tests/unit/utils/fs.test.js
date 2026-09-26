import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import {
  ensureDir,
  isInsideDir,
  realPathOfNearest,
  resolvePath,
  safeResolvePath,
  writeFileSafe,
} from '../../../src/utils/fs.js';
import { withTempDir } from '../../helpers/tempDir.js';

describe('ensureDir', () => {
  it('creates a new directory', async () => {
    await withTempDir(async (tmpDir) => {
      const newDir = path.join(tmpDir, 'test-dir');
      await ensureDir(newDir);

      const stats = await fs.stat(newDir);
      assert.ok(stats.isDirectory());
    });
  });

  it('creates nested directories', async () => {
    await withTempDir(async (tmpDir) => {
      const nestedDir = path.join(tmpDir, 'a', 'b', 'c');
      await ensureDir(nestedDir);

      const stats = await fs.stat(nestedDir);
      assert.ok(stats.isDirectory());
    });
  });

  it('succeeds if directory already exists', async () => {
    await withTempDir(async (tmpDir) => {
      const newDir = path.join(tmpDir, 'test-dir');
      await ensureDir(newDir);

      // Call again - should not throw
      await ensureDir(newDir);

      const stats = await fs.stat(newDir);
      assert.ok(stats.isDirectory());
    });
  });
});

describe('writeFileSafe', () => {
  it('writes content to a file', async () => {
    await withTempDir(async (tmpDir) => {
      const filePath = path.join(tmpDir, 'test.txt');
      const content = 'Hello, World!';

      await writeFileSafe(filePath, content);

      const readContent = await fs.readFile(filePath, 'utf8');
      assert.strictEqual(readContent, content);
    });
  });

  it('writes empty string', async () => {
    await withTempDir(async (tmpDir) => {
      const filePath = path.join(tmpDir, 'empty.txt');

      await writeFileSafe(filePath, '');

      const readContent = await fs.readFile(filePath, 'utf8');
      assert.strictEqual(readContent, '');
    });
  });

  it('overwrites existing file', async () => {
    await withTempDir(async (tmpDir) => {
      const filePath = path.join(tmpDir, 'test.txt');

      await writeFileSafe(filePath, 'first');
      await writeFileSafe(filePath, 'second');

      const readContent = await fs.readFile(filePath, 'utf8');
      assert.strictEqual(readContent, 'second');
    });
  });

  it('writes multi-line content', async () => {
    await withTempDir(async (tmpDir) => {
      const filePath = path.join(tmpDir, 'multiline.txt');
      const content = 'line1\nline2\nline3';

      await writeFileSafe(filePath, content);

      const readContent = await fs.readFile(filePath, 'utf8');
      assert.strictEqual(readContent, content);
    });
  });
});

describe('resolvePath', () => {
  it('returns absolute path unchanged', () => {
    const absolutePath = '/home/user/project';
    const result = resolvePath(absolutePath);
    assert.strictEqual(result, absolutePath);
  });

  it('resolves relative path against cwd', () => {
    const relativePath = 'src/index.js';
    const cwd = '/home/user/project';
    const result = resolvePath(relativePath, cwd);
    assert.strictEqual(result, path.join(cwd, relativePath));
  });

  it('resolves relative path against process.cwd() when cwd not provided', () => {
    const relativePath = 'src/index.js';
    const result = resolvePath(relativePath);
    assert.strictEqual(result, path.join(process.cwd(), relativePath));
  });

  it('handles dot notation in relative path', () => {
    const relativePath = './src/index.js';
    const cwd = '/home/user/project';
    const result = resolvePath(relativePath, cwd);
    assert.strictEqual(result, path.join(cwd, relativePath));
  });

  it('handles parent directory notation', () => {
    const relativePath = '../other-project';
    const cwd = '/home/user/project';
    const result = resolvePath(relativePath, cwd);
    assert.strictEqual(result, path.join(cwd, relativePath));
  });
});

describe('safeResolvePath', () => {
  it('resolves absolute path with multiple segments', () => {
    const result = safeResolvePath('/home/user', 'project', 'src');
    assert.strictEqual(result, path.resolve('/home/user', 'project', 'src'));
  });

  it('resolves relative path against process.cwd()', () => {
    const result = safeResolvePath('src', 'index.js');
    assert.strictEqual(result, path.resolve(process.cwd(), 'src', 'index.js'));
  });

  it('handles single absolute segment', () => {
    const result = safeResolvePath('/home/user/project');
    assert.strictEqual(result, path.resolve('/home/user/project'));
  });

  it('handles single relative segment', () => {
    const result = safeResolvePath('src');
    assert.strictEqual(result, path.resolve(process.cwd(), 'src'));
  });

  it('handles empty segments in relative path', () => {
    const result = safeResolvePath('src', '', 'index.js');
    assert.strictEqual(
      result,
      path.resolve(process.cwd(), 'src', '', 'index.js'),
    );
  });

  it('normalizes path with parent directory references', () => {
    const result = safeResolvePath('/home/user/project', '..', 'other');
    assert.strictEqual(
      result,
      path.resolve('/home/user/project', '..', 'other'),
    );
  });

  it('handles dot notation in segments', () => {
    const result = safeResolvePath('./src', './utils');
    assert.strictEqual(result, path.resolve(process.cwd(), './src', './utils'));
  });
});

describe('isInsideDir', () => {
  const root = path.resolve('/project/dist');

  it('is true for paths strictly inside', () => {
    assert.strictEqual(isInsideDir(root, path.join(root, 'a.txt')), true);
    assert.strictEqual(isInsideDir(root, path.join(root, 'a', 'b')), true);
    assert.strictEqual(isInsideDir(root, path.join(root, '..hidden')), true);
  });

  it('is false for the directory itself, parents, and siblings', () => {
    assert.strictEqual(isInsideDir(root, root), false);
    assert.strictEqual(isInsideDir(root, path.join(root, '..')), false);
    assert.strictEqual(isInsideDir(root, path.join(root, '..', 'x')), false);
    assert.strictEqual(
      isInsideDir(root, path.resolve('/project/dist-other/x')),
      false,
    );
  });

  it('resolves relative inputs before comparing', () => {
    assert.strictEqual(isInsideDir('dist', path.join('dist', 'a')), true);
    assert.strictEqual(
      isInsideDir('dist', path.join('dist', '..', 'a')),
      false,
    );
  });
});

describe('realPathOfNearest', () => {
  it('returns the real path of an existing path', async () => {
    await withTempDir(async (d) => {
      assert.strictEqual(realPathOfNearest(d), await fs.realpath(d));
    });
  });

  it('falls back to the nearest existing ancestor', async () => {
    await withTempDir(async (d) => {
      assert.strictEqual(
        realPathOfNearest(path.join(d, 'a', 'b', 'c.txt')),
        await fs.realpath(d),
      );
    });
  });

  it('follows a directory symlink', async () => {
    await withTempDir(async (d) => {
      await fs.mkdir(path.join(d, 'real'));
      await fs.symlink(path.join(d, 'real'), path.join(d, 'link'), 'junction');
      assert.strictEqual(
        realPathOfNearest(path.join(d, 'link', 'new.txt')),
        await fs.realpath(path.join(d, 'real')),
      );
    });
  });

  it(
    'follows a dangling symlink to where it would create a file',
    { skip: process.platform === 'win32' },
    async () => {
      await withTempDir(async (d) => {
        await fs.mkdir(path.join(d, 'target-dir'));
        await fs.symlink(
          path.join(d, 'target-dir', 'missing.txt'),
          path.join(d, 'dangling'),
        );
        assert.strictEqual(
          realPathOfNearest(path.join(d, 'dangling')),
          await fs.realpath(path.join(d, 'target-dir')),
        );
      });
    },
  );

  it(
    'throws on a symlink loop',
    { skip: process.platform === 'win32' },
    async () => {
      await withTempDir(async (d) => {
        await fs.symlink(path.join(d, 'b'), path.join(d, 'a'));
        await fs.symlink(path.join(d, 'a'), path.join(d, 'b'));
        assert.throws(
          () => realPathOfNearest(path.join(d, 'a')),
          /Too many symbolic links/,
        );
      });
    },
  );
});
