/**
 * Checks that the npm tarball contains only what `package.json#files`
 * intends to ship — no tests, agent notes, internal docs, or examples.
 *
 * Run: node scripts/check-pack.js
 */

import { execFileSync } from 'node:child_process';

const FORBIDDEN = [
  'tests/',
  '.agents/',
  '.claude/',
  '.github/',
  'docs/',
  'examples/',
  'scripts/',
];
const REQUIRED = ['package.json', 'README.md', 'LICENSE', 'src/index.js'];

const out = execFileSync(
  'npm',
  ['pack', '--dry-run', '--json', '--ignore-scripts'],
  {
    encoding: 'utf8',
    shell: process.platform === 'win32',
  },
);
const [pack] = JSON.parse(out);
const files = pack.files.map((f) => f.path.replaceAll('\\', '/'));

let exitCode = 0;
for (const f of files) {
  if (FORBIDDEN.some((prefix) => f.startsWith(prefix))) {
    console.error(`  ✗ unexpected file in tarball: ${f}`);
    exitCode = 1;
  }
}
for (const f of REQUIRED) {
  if (!files.includes(f)) {
    console.error(`  ✗ missing from tarball: ${f}`);
    exitCode = 1;
  }
}

console.log(
  `${pack.name}@${pack.version}: ${files.length} files` +
    (exitCode ? '' : ' — contents OK'),
);
process.exit(exitCode);
