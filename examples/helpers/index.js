#!/usr/bin/env node

/**
 * Example: Custom Helpers (`registerHelpers`)
 *
 * Registers pure helpers on a scoped Handlebars instance and passes the same
 * instance to `renderDirectory`. The global Handlebars instance is untouched.
 */

import Handlebars from 'handlebars';

import {
  registerHelpers,
  renderDirectory,
  resolveConfig,
} from '../../src/index.js';

const hbs = Handlebars.create();

// Pure helpers only: same arguments → same result. No clock, randomness,
// env, or disk access — those would make output non-deterministic.
registerHelpers(hbs, {
  upper: (s) => String(s).toUpperCase(),
  kebab: (s) => String(s).trim().toLowerCase().replaceAll(/\s+/g, '-'),
  join: (list, sep) => list.join(sep),
  eq: function (a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
  },
});

const cfg = resolveConfig({
  valuesFile: './values.yaml',
  templateDir: './templates',
  outDir: './dist',
});

await renderDirectory(cfg, hbs);
console.log('Rendering complete. See ./dist/service.yaml.');
