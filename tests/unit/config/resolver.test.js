import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import { resolveConfig } from '../../../src/config/resolver.js';
import { withTempDir } from '../../helpers/tempDir.js';

describe('resolveConfig', () => {
  it('resolves without valuesFile when both valuesFile and valuesDir are absent (VP-8)', async () => {
    await withTempDir(async (tmpDir) => {
      const cli = {};
      const config = resolveConfig(cli, tmpDir);

      assert.ok(config.view);
      assert.deepStrictEqual(config.view.env, {});
      // No file-based values; view is { env: {} } only.
      assert.deepStrictEqual(
        Object.keys(config.view).filter((k) => k !== 'env'),
        [],
      );
    });
  });

  it('resolves config with CLI valuesFile and defaults', async () => {
    await withTempDir(async (tmpDir) => {
      const valuesFile = path.join(tmpDir, 'values.yaml');
      await fs.writeFile(valuesFile, 'name: test', 'utf8');

      const cli = { valuesFile: 'values.yaml' };
      const config = resolveConfig(cli, tmpDir);

      assert.strictEqual(config.templateDir, path.join(tmpDir, 'templates'));
      assert.strictEqual(config.partialsDir, '');
      assert.strictEqual(config.outDir, path.join(tmpDir, 'dist'));
      assert.strictEqual(config.extname, '.hbs');
      assert.ok(config.view);
      assert.strictEqual(config.view.name, 'test');
    });
  });

  it('merges project config with defaults', async () => {
    await withTempDir(async (tmpDir) => {
      const valuesFile = path.join(tmpDir, 'values.yaml');
      await fs.writeFile(valuesFile, 'app: myapp', 'utf8');

      const projectConfigFile = path.join(tmpDir, 'js-tmpl.config.yaml');
      await fs.writeFile(
        projectConfigFile,
        'templateDir: custom\noutDir: custom-out',
        'utf8',
      );

      const cli = { valuesFile: 'values.yaml' };
      const config = resolveConfig(cli, tmpDir);

      assert.strictEqual(config.templateDir, path.join(tmpDir, 'custom'));
      assert.strictEqual(config.outDir, path.join(tmpDir, 'custom-out'));
      assert.strictEqual(config.extname, '.hbs'); // from defaults
      assert.strictEqual(config.view.app, 'myapp');
    });
  });

  it('CLI args override project config and defaults', async () => {
    await withTempDir(async (tmpDir) => {
      const valuesFile = path.join(tmpDir, 'values.yaml');
      await fs.writeFile(valuesFile, 'data: value', 'utf8');

      const projectConfigFile = path.join(tmpDir, 'js-tmpl.config.yaml');
      await fs.writeFile(
        projectConfigFile,
        'templateDir: project-templates\noutDir: project-out',
        'utf8',
      );

      const cli = {
        valuesFile: 'values.yaml',
        templateDir: 'cli-templates',
        outDir: 'cli-out',
      };
      const config = resolveConfig(cli, tmpDir);

      assert.strictEqual(
        config.templateDir,
        path.join(tmpDir, 'cli-templates'),
      );
      assert.strictEqual(config.outDir, path.join(tmpDir, 'cli-out'));
    });
  });

  it('resolves absolute paths correctly', async () => {
    await withTempDir(async (tmpDir) => {
      const valuesFile = path.join(tmpDir, 'values.yaml');
      await fs.writeFile(valuesFile, 'test: data', 'utf8');

      const absoluteTemplate = path.join(tmpDir, 'absolute-templates');
      const cli = {
        valuesFile: 'values.yaml',
        templateDir: absoluteTemplate,
      };
      const config = resolveConfig(cli, tmpDir);

      assert.strictEqual(config.templateDir, absoluteTemplate);
    });
  });

  it('resolves relative paths against cwd', async () => {
    await withTempDir(async (tmpDir) => {
      const valuesFile = path.join(tmpDir, 'values.yaml');
      await fs.writeFile(valuesFile, 'key: val', 'utf8');

      const cli = {
        valuesFile: 'values.yaml',
        templateDir: '../templates',
      };
      const config = resolveConfig(cli, tmpDir);

      assert.strictEqual(
        config.templateDir,
        path.join(tmpDir, '..', 'templates'),
      );
    });
  });

  it('loads values from valuesFile', async () => {
    await withTempDir(async (tmpDir) => {
      const valuesFile = path.join(tmpDir, 'values.yaml');
      await fs.writeFile(
        valuesFile,
        'app:\n  name: myapp\n  version: 1.0.0',
        'utf8',
      );

      const cli = { valuesFile: 'values.yaml' };
      const config = resolveConfig(cli, tmpDir);

      assert.deepStrictEqual(config.view.app, {
        name: 'myapp',
        version: '1.0.0',
      });
    });
  });

  it('env defaults to empty object when no envKeys or envPrefix', async () => {
    await withTempDir(async (tmpDir) => {
      const valuesFile = path.join(tmpDir, 'values.yaml');
      await fs.writeFile(valuesFile, 'data: test', 'utf8');

      const cli = { valuesFile: 'values.yaml' };
      const config = resolveConfig(cli, tmpDir);

      assert.deepStrictEqual(config.view.env, {});
    });
  });

  it('injects only envKeys from process.env when configured', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test-envkeys';

    try {
      await withTempDir(async (tmpDir) => {
        const valuesFile = path.join(tmpDir, 'values.yaml');
        await fs.writeFile(valuesFile, 'data: test', 'utf8');

        const configFile = path.join(tmpDir, 'js-tmpl.config.yaml');
        await fs.writeFile(configFile, 'envKeys:\n  - NODE_ENV', 'utf8');

        const cli = { valuesFile: 'values.yaml' };
        const config = resolveConfig(cli, tmpDir);

        assert.strictEqual(config.view.env.NODE_ENV, 'test-envkeys');
        assert.strictEqual(Object.keys(config.view.env).length, 1);
      });
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });

  it('envPrefix picks matching vars from process.env', async () => {
    process.env.JS_TMPL_TEST_VAR = 'hello';

    try {
      await withTempDir(async (tmpDir) => {
        const valuesFile = path.join(tmpDir, 'values.yaml');
        await fs.writeFile(valuesFile, 'data: test', 'utf8');

        const configFile = path.join(tmpDir, 'js-tmpl.config.yaml');
        await fs.writeFile(configFile, 'envPrefix: JS_TMPL_', 'utf8');

        const cli = { valuesFile: 'values.yaml' };
        const config = resolveConfig(cli, tmpDir);

        assert.strictEqual(config.view.env.JS_TMPL_TEST_VAR, 'hello');
      });
    } finally {
      delete process.env.JS_TMPL_TEST_VAR;
    }
  });

  it('envKeys + envPrefix combine results', async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'combined-test';
    process.env.JS_TMPL_COMBO = 'combo';

    try {
      await withTempDir(async (tmpDir) => {
        const valuesFile = path.join(tmpDir, 'values.yaml');
        await fs.writeFile(valuesFile, 'data: test', 'utf8');

        const configFile = path.join(tmpDir, 'js-tmpl.config.yaml');
        await fs.writeFile(
          configFile,
          'envKeys:\n  - NODE_ENV\nenvPrefix: JS_TMPL_',
          'utf8',
        );

        const cli = { valuesFile: 'values.yaml' };
        const config = resolveConfig(cli, tmpDir);

        assert.strictEqual(config.view.env.NODE_ENV, 'combined-test');
        assert.strictEqual(config.view.env.JS_TMPL_COMBO, 'combo');
      });
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
      delete process.env.JS_TMPL_COMBO;
    }
  });

  it('envPrefix works when envKeys property is absent', async () => {
    process.env.JS_TMPL_ONLY_PREFIX = 'yes';

    try {
      await withTempDir(async (tmpDir) => {
        const valuesFile = path.join(tmpDir, 'values.yaml');
        await fs.writeFile(valuesFile, 'data: test', 'utf8');

        // CLI provides envPrefix but no envKeys property at all
        const cli = {
          valuesFile: 'values.yaml',
          envPrefix: 'JS_TMPL_ONLY_',
        };
        const config = resolveConfig(cli, tmpDir);

        assert.strictEqual(config.view.env.JS_TMPL_ONLY_PREFIX, 'yes');
      });
    } finally {
      delete process.env.JS_TMPL_ONLY_PREFIX;
    }
  });

  it('missing envKeys entries are silently omitted', async () => {
    await withTempDir(async (tmpDir) => {
      const valuesFile = path.join(tmpDir, 'values.yaml');
      await fs.writeFile(valuesFile, 'data: test', 'utf8');

      const cli = {
        valuesFile: 'values.yaml',
        envKeys: ['NONEXISTENT_KEY_12345'],
      };
      const config = resolveConfig(cli, tmpDir);

      assert.deepStrictEqual(config.view.env, {});
    });
  });

  it('handles JSON values file', async () => {
    await withTempDir(async (tmpDir) => {
      const valuesFile = path.join(tmpDir, 'values.json');
      await fs.writeFile(
        valuesFile,
        JSON.stringify({ name: 'json-test', count: 42 }),
        'utf8',
      );

      const cli = { valuesFile: 'values.json' };
      const config = resolveConfig(cli, tmpDir);

      assert.strictEqual(config.view.name, 'json-test');
      assert.strictEqual(config.view.count, 42);
    });
  });

  it('uses explicit config file when provided', async () => {
    await withTempDir(async (tmpDir) => {
      const valuesFile = path.join(tmpDir, 'values.yaml');
      await fs.writeFile(valuesFile, 'test: data', 'utf8');

      const customConfig = path.join(tmpDir, 'custom.config.yaml');
      await fs.writeFile(
        customConfig,
        'templateDir: custom-from-explicit',
        'utf8',
      );

      const cli = {
        valuesFile: 'values.yaml',
        configFile: customConfig,
      };
      const config = resolveConfig(cli, tmpDir);

      assert.strictEqual(
        config.templateDir,
        path.join(tmpDir, 'custom-from-explicit'),
      );
    });
  });

  it('handles extname override', async () => {
    await withTempDir(async (tmpDir) => {
      const valuesFile = path.join(tmpDir, 'values.yaml');
      await fs.writeFile(valuesFile, 'data: test', 'utf8');

      const cli = {
        valuesFile: 'values.yaml',
        extname: '.tmpl',
      };
      const config = resolveConfig(cli, tmpDir);

      assert.strictEqual(config.extname, '.tmpl');
    });
  });

  it('throws error if valuesFile does not exist', async () => {
    await withTempDir(async (tmpDir) => {
      const cli = { valuesFile: 'nonexistent.yaml' };

      assert.throws(() => resolveConfig(cli, tmpDir), /Values file not found/);
    });
  });

  it('precedence order: CLI > Project > Defaults', async () => {
    await withTempDir(async (tmpDir) => {
      const valuesFile = path.join(tmpDir, 'values.yaml');
      await fs.writeFile(valuesFile, 'test: data', 'utf8');

      const projectConfigFile = path.join(tmpDir, 'js-tmpl.config.yaml');
      await fs.writeFile(
        projectConfigFile,
        'templateDir: project\npartialsDir: project-partials\nextname: .project',
        'utf8',
      );

      const cli = {
        valuesFile: 'values.yaml',
        templateDir: 'cli-override', // overrides project and defaults
        // partialsDir not provided - should use project
        // outDir not provided - should use defaults
        // extname not provided - should use project
      };
      const config = resolveConfig(cli, tmpDir);

      assert.strictEqual(config.templateDir, path.join(tmpDir, 'cli-override'));
      assert.strictEqual(
        config.partialsDir,
        path.join(tmpDir, 'project-partials'),
      );
      assert.strictEqual(config.outDir, path.join(tmpDir, 'dist')); // default
      assert.strictEqual(config.extname, '.project');
    });
  });

  // Path resolution tests
  it('resolves valuesFile from cwd when valuesDir is empty', async () => {
    await withTempDir(async (tmpDir) => {
      const valuesFile = path.join(tmpDir, 'config', 'values.yaml');
      await fs.mkdir(path.join(tmpDir, 'config'), { recursive: true });
      await fs.writeFile(valuesFile, 'name: from-cwd', 'utf8');

      const cli = { valuesFile: 'config/values.yaml' };
      const config = resolveConfig(cli, tmpDir);

      assert.strictEqual(config.view.name, 'from-cwd');
    });
  });

  it('valuesDir scans as value-partials root (not a base path for valuesFile)', async () => {
    // Post-Round-03: valuesDir is the value-partials root, not a base path.
    // Files under it are namespaced-by-directory into view.
    await withTempDir(async (tmpDir) => {
      const valuesDir = path.join(tmpDir, 'values');
      await fs.mkdir(valuesDir, { recursive: true });
      await fs.writeFile(
        path.join(valuesDir, 'prod.yaml'),
        'environment: production',
        'utf8',
      );

      const projectConfigFile = path.join(tmpDir, 'js-tmpl.config.yaml');
      await fs.writeFile(projectConfigFile, 'valuesDir: values', 'utf8');

      const config = resolveConfig({}, tmpDir);

      // `values/prod.yaml` → `view.prod.*`
      assert.strictEqual(
        /** @type {Record<string, unknown>} */ (config.view.prod).environment,
        'production',
      );
    });
  });

  it('absolute valuesFile paths are used as-is, ignoring valuesDir', async () => {
    await withTempDir(async (tmpDir) => {
      const absoluteValuesFile = path.join(tmpDir, 'absolute-values.yaml');
      await fs.writeFile(absoluteValuesFile, 'type: absolute', 'utf8');

      const projectConfigFile = path.join(tmpDir, 'js-tmpl.config.yaml');
      await fs.writeFile(
        projectConfigFile,
        'valuesDir: templates.values',
        'utf8',
      );

      const cli = { valuesFile: absoluteValuesFile };
      const config = resolveConfig(cli, tmpDir);

      assert.strictEqual(config.view.type, 'absolute');
    });
  });

  it('absolute valuesDir scans as value-partials root', async () => {
    await withTempDir(async (tmpDir) => {
      const absoluteValuesDir = path.join(tmpDir, 'absolute-values');
      await fs.mkdir(absoluteValuesDir, { recursive: true });
      await fs.writeFile(
        path.join(absoluteValuesDir, 'data.yaml'),
        'location: absolute-dir',
        'utf8',
      );

      const projectConfigFile = path.join(tmpDir, 'js-tmpl.config.yaml');
      await fs.writeFile(
        projectConfigFile,
        `valuesDir: ${absoluteValuesDir}`,
        'utf8',
      );

      const config = resolveConfig({}, tmpDir);

      // `absolute-values/data.yaml` → `view.data.*`
      assert.strictEqual(
        /** @type {Record<string, unknown>} */ (config.view.data).location,
        'absolute-dir',
      );
    });
  });

  it('throws C-1 when valuesFile sits inside valuesDir', async () => {
    await withTempDir(async (tmpDir) => {
      const valuesDir = path.join(tmpDir, 'values');
      await fs.mkdir(valuesDir, { recursive: true });
      const valuesFileInside = path.join(valuesDir, 'root.yaml');
      await fs.writeFile(valuesFileInside, 'x: 1', 'utf8');

      assert.throws(
        () =>
          resolveConfig({ valuesFile: valuesFileInside, valuesDir }, tmpDir),
        /is inside valuesDir/,
      );
    });
  });

  it('CLI valuesFile overrides config valuesFile', async () => {
    await withTempDir(async (tmpDir) => {
      // Create two values files
      await fs.writeFile(
        path.join(tmpDir, 'config.yaml'),
        'source: config',
        'utf8',
      );
      await fs.writeFile(path.join(tmpDir, 'cli.yaml'), 'source: cli', 'utf8');

      const projectConfigFile = path.join(tmpDir, 'js-tmpl.config.yaml');
      await fs.writeFile(projectConfigFile, 'valuesFile: config.yaml', 'utf8');

      const cli = { valuesFile: 'cli.yaml' };
      const config = resolveConfig(cli, tmpDir);

      assert.strictEqual(config.view.source, 'cli');
    });
  });
});
