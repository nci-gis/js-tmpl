import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import Handlebars from 'handlebars';

import { helpers } from '../../examples/helpers/helpers.js';
import { resolveConfig } from '../../src/config/resolver.js';
import { registerHelpers } from '../../src/engine/helpers.js';
import { renderDirectory } from '../../src/engine/renderDirectory.js';

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
);

export const EXAMPLES_DIR = path.join(root, 'examples');
export const GOLDEN_DIR = path.join(root, 'tests', 'golden');

/**
 * Every example, every mode. Inputs are spelled out (no ambient env) so the
 * render is fully determined here. Explicit options also override anything
 * the example's auto-discovered `js-tmpl.config.yaml` sets (CLI > project).
 *
 * @type {Array<{
 *   example: string,
 *   mode: string,
 *   options: Record<string, unknown>,
 *   env?: Record<string, string>,
 *   view?: Record<string, unknown>,
 *   helpers?: Record<string, (...args: any[]) => any>,
 * }>}
 */
export const CASES = [
  {
    example: 'yaml-templates',
    mode: 'production',
    options: {
      valuesFile: 'values.yaml',
      templateDir: 'templates',
      partialsDir: 'templates.partials',
      envKeys: ['NODE_ENV'],
    },
    env: { NODE_ENV: 'production' },
  },
  {
    example: 'yaml-templates',
    mode: 'development',
    options: {
      valuesFile: 'values.yaml',
      templateDir: 'templates',
      partialsDir: 'templates.partials',
      envKeys: ['NODE_ENV'],
    },
    env: { NODE_ENV: 'development' },
  },
  {
    example: 'path-guards',
    mode: 'prod',
    options: {
      valuesFile: 'values.yaml',
      templateDir: 'templates',
      partialsDir: 'templates.partials',
    },
  },
  {
    example: 'path-guards',
    mode: 'dev',
    options: {
      valuesFile: 'values.yaml',
      templateDir: 'templates',
      partialsDir: 'templates.partials',
    },
    view: { prod: false },
  },
  {
    example: 'value-partials',
    mode: 'default',
    options: {
      valuesFile: 'app.yaml',
      valuesDir: 'values',
      templateDir: 'templates',
    },
  },
  {
    example: 'helpers',
    mode: 'default',
    options: { valuesFile: 'values.yaml', templateDir: 'templates' },
    helpers,
  },
];

/**
 * Render one case into `outDir`.
 *
 * @param {(typeof CASES)[number]} c
 * @param {string} outDir
 * @returns {Promise<void>}
 */
export async function renderCase(c, outDir) {
  const exampleDir = path.join(EXAMPLES_DIR, c.example);
  const saved = { ...process.env };
  try {
    for (const k of c.options.envKeys ?? []) {
      delete process.env[k];
    }
    Object.assign(process.env, c.env);

    const cfg = resolveConfig(
      { ...c.options, outDir, extname: '.hbs' },
      exampleDir,
    );
    Object.assign(cfg.view, c.view);

    const hbs = Handlebars.create();
    registerHelpers(hbs, c.helpers);
    await renderDirectory(cfg, hbs);
  } finally {
    process.env = saved;
  }
}

/**
 * All files under `dir`, as sorted POSIX-style relative paths.
 *
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
export async function listFiles(dir) {
  const entries = await fs.readdir(dir, {
    recursive: true,
    withFileTypes: true,
  });
  return entries
    .filter((e) => e.isFile())
    .map((e) =>
      path
        .relative(dir, path.join(e.parentPath, e.name))
        .split(path.sep)
        .join('/'),
    )
    .sort();
}
