/**
 * Regenerate golden snapshots for examples: tests/golden/<example>/<mode>/.
 * Explicit on purpose — review the resulting diff before committing.
 *
 * Run: pnpm examples:update
 */

import fs from 'node:fs/promises';
import path from 'node:path';

import {
  CASES,
  GOLDEN_DIR,
  renderCase,
} from '../tests/integration/examples.golden.js';

for (const c of CASES) {
  const dir = path.join(GOLDEN_DIR, c.example, c.mode);
  await fs.rm(dir, { recursive: true, force: true });
  await renderCase(c, dir);
  console.log(`  ✓ ${path.relative(process.cwd(), dir)}`);
}
