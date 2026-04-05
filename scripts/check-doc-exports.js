/**
 * Checks that docs/API.md stays in sync with actual source exports
 * and config file candidates.
 *
 * Run: node scripts/check-doc-exports.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let exitCode = 0;

function fail(msg) {
  console.error(`  ✗ ${msg}`);
  exitCode = 1;
}

function pass(msg) {
  console.log(`  ✓ ${msg}`);
}

// --- 1. Check exported function names appear in API.md ---

const indexSrc = fs.readFileSync(path.join(root, 'src/index.js'), 'utf8');
const reExports = [...indexSrc.matchAll(/export \* from '(.+?)'/g)].map(
  (m) => m[1],
);

const exportedNames = [];
for (const rel of reExports) {
  const filePath = path.join(root, 'src', rel);
  const src = fs.readFileSync(filePath, 'utf8');
  const names = [
    ...src.matchAll(/export (?:async )?function (\w+)/g),
  ].map((m) => m[1]);
  exportedNames.push(...names);
}

const apiDoc = fs.readFileSync(path.join(root, 'docs/API.md'), 'utf8');

console.log('Checking exported functions in docs/API.md:');
for (const name of exportedNames) {
  if (apiDoc.includes(name)) {
    pass(name);
  } else {
    fail(`"${name}" is exported from src/ but not mentioned in docs/API.md`);
  }
}

// --- 2. Check config file candidates match docs/API.md ---

const loaderSrc = fs.readFileSync(
  path.join(root, 'src/config/loader.js'),
  'utf8',
);
// Extract candidates from the array literal in loadProjectConfig.
// Handles both plain strings like 'js-tmpl.config.yaml'
// and path.join('config', 'js-tmpl.yaml') calls.
const candidates = [];
const plainPattern = /'(js-tmpl\.config\.\w+)'/g;
const joinPattern = /path\.join\('([^']+)',\s*'([^']+)'\)/g;

for (const m of loaderSrc.matchAll(plainPattern)) {
  candidates.push(m[1]);
}
for (const m of loaderSrc.matchAll(joinPattern)) {
  candidates.push(`${m[1]}/${m[2]}`);
}

console.log('\nChecking config candidates in docs/API.md:');
for (const candidate of candidates) {
  if (apiDoc.includes(candidate)) {
    pass(candidate);
  } else {
    fail(
      `Config candidate "${candidate}" is in src/config/loader.js but not in docs/API.md`,
    );
  }
}

process.exit(exitCode);
