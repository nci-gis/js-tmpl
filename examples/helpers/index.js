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
import { helpers } from './helpers.js';

const hbs = Handlebars.create();
registerHelpers(hbs, helpers);

const cfg = resolveConfig({
  valuesFile: './values.yaml',
  templateDir: './templates',
  outDir: './dist',
});

await renderDirectory(cfg, hbs);
console.log('Rendering complete. See ./dist/service.yaml.');
