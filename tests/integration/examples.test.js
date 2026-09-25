import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import { withTempDir } from '../helpers/tempDir.js';
import { CASES, GOLDEN_DIR, listFiles, renderCase } from './examples.golden.js';

// Golden tests: every example renders byte-for-byte to its committed
// snapshot in tests/golden/<example>/<mode>/. Regenerate deliberately with
// `pnpm examples:update` and review the diff.
describe('examples (golden)', () => {
  for (const c of CASES) {
    it(`${c.example} [${c.mode}] matches tests/golden`, async () => {
      await withTempDir(async (tmpDir) => {
        const expectedDir = path.join(GOLDEN_DIR, c.example, c.mode);
        await renderCase(c, tmpDir);

        const actual = await listFiles(tmpDir);
        const expected = await listFiles(expectedDir);
        assert.deepStrictEqual(actual, expected, 'file list differs');

        for (const rel of expected) {
          const got = await fs.readFile(path.join(tmpDir, rel));
          const want = await fs.readFile(path.join(expectedDir, rel));
          assert.ok(got.equals(want), `content differs: ${rel}`);
        }
      });
    });
  }
});
