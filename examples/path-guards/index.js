#!/usr/bin/env node

/**
 * Example: Path Guards (`$if{var}` / `$ifn{var}`)
 *
 * Demonstrates how whole-segment guard formulas conditionally include or
 * skip files based on view data — with early-exit on skipped subtrees.
 *
 * Flip `prod` or `features.monitoring.enabled` in values.yaml and re-run
 * to see the output tree change.
 */

import { resolveConfig, renderDirectory } from '../../src/index.js';

const options = {
  valuesFile: './values.yaml',
  templateDir: './templates',
  partialsDir: './templates.partials',
  outDir: './dist',
};

async function main() {
  console.log('js-tmpl Path Guards Example');
  console.log('===========================\n');

  const cfg = resolveConfig(options);

  console.log('View:', JSON.stringify(cfg.view, null, 2), '\n');

  await renderDirectory(cfg);

  console.log('Rendering complete. See ./dist/ for the output tree —');
  console.log(
    'only files whose guard-chain passes against the view are written.',
  );
}

main().catch((error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
