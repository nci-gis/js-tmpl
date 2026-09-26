import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import { CASES, GOLDEN_DIR, listFiles, planCase } from './examples.golden.js';

// Golden tests: every example renders byte-for-byte to its committed
// snapshot in tests/golden/<example>/<mode>/. Regenerate deliberately with
// `pnpm examples:update` and review the diff.
describe('examples (golden)', () => {
  for (const c of CASES) {
    it(`${c.example} [${c.mode}] matches tests/golden`, async () => {
      // Planned in memory (Round 08): no temp dir, nothing written.
      const expectedDir = path.join(GOLDEN_DIR, c.example, c.mode);
      const plan = await planCase(c);

      assert.deepStrictEqual(
        plan.map((e) => e.target),
        await listFiles(expectedDir),
        'file list differs',
      );
      for (const entry of plan) {
        const want = await fs.readFile(path.join(expectedDir, entry.target));
        assert.ok(
          Buffer.from(entry.content).equals(want),
          `content differs: ${entry.target}`,
        );
      }
    });
  }
});
