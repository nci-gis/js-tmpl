#!/usr/bin/env node

/**
 * Example: Value Partials (`--values-dir`)
 *
 * Demonstrates composing `view` from multiple structured files without
 * merge semantics — each value has exactly one source, visible in the file
 * tree, named by the template.
 */

import { renderDirectory, resolveConfig } from '../../src/index.js';

const cfg = resolveConfig({
  valuesFile: './app.yaml',
  valuesDir: './values',
  templateDir: './templates',
  outDir: './dist',
});

console.log('View:');
console.log(JSON.stringify(cfg.view, null, 2));
console.log();

await renderDirectory(cfg);
console.log(
  'Rendering complete. See ./dist/summary.yaml for the composed output.',
);
