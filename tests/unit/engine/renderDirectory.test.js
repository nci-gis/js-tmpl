import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { beforeEach, describe, it } from 'node:test';

import Handlebars from 'handlebars';

import { resolveConfig } from '../../../src/config/resolver.js';
import { renderDirectory } from '../../../src/engine/renderDirectory.js';
import { withTempDir } from '../../helpers/tempDir.js';

async function seedGuardTree(tmpDir) {
  const templateDir = path.join(tmpDir, 'templates');
  const partialsDir = path.join(tmpDir, 'partials');
  const outDir = path.join(tmpDir, 'out');

  await fs.mkdir(path.join(templateDir, '$if{prod}'), { recursive: true });
  await fs.mkdir(path.join(templateDir, '$ifn{prod}'), { recursive: true });
  await fs.mkdir(partialsDir, { recursive: true });

  await fs.writeFile(path.join(templateDir, 'always.hbs'), 'always', 'utf8');
  await fs.writeFile(
    path.join(templateDir, '$if{prod}', 'prod.hbs'),
    'prod',
    'utf8',
  );
  await fs.writeFile(
    path.join(templateDir, '$ifn{prod}', 'dev.hbs'),
    'dev',
    'utf8',
  );

  return { templateDir, partialsDir, outDir };
}

describe('renderDirectory', () => {
  beforeEach(() => {
    // Clear registered partials before each test
    for (const name of Object.keys(Handlebars.partials)) {
      Handlebars.unregisterPartial(name);
    }
  });

  it('renders single template to output directory', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'partials');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, 'file.hbs'),
        'Hello {{name}}!',
        'utf8',
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: { name: 'World' },
        extname: '.hbs',
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(path.join(outDir, 'file'), 'utf8');
      assert.strictEqual(output, 'Hello World!');
    });
  });

  it('renders multiple templates', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'partials');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(path.join(templateDir, 'a.hbs'), 'File A', 'utf8');
      await fs.writeFile(path.join(templateDir, 'b.hbs'), 'File B', 'utf8');

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: '.hbs',
      };

      await renderDirectory(cfg);

      const outputA = await fs.readFile(path.join(outDir, 'a'), 'utf8');
      const outputB = await fs.readFile(path.join(outDir, 'b'), 'utf8');
      assert.strictEqual(outputA, 'File A');
      assert.strictEqual(outputB, 'File B');
    });
  });

  it('preserves directory structure', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'partials');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(path.join(templateDir, 'subdir'), { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(path.join(templateDir, 'root.hbs'), 'Root', 'utf8');
      await fs.writeFile(
        path.join(templateDir, 'subdir', 'nested.hbs'),
        'Nested',
        'utf8',
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: '.hbs',
      };

      await renderDirectory(cfg);

      const rootOutput = await fs.readFile(path.join(outDir, 'root'), 'utf8');
      const nestedOutput = await fs.readFile(
        path.join(outDir, 'subdir', 'nested'),
        'utf8',
      );
      assert.strictEqual(rootOutput, 'Root');
      assert.strictEqual(nestedOutput, 'Nested');
    });
  });

  it('renders dynamic paths', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'partials');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, '${env}.hbs'),
        'Environment: {{env}}',
        'utf8',
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: { env: 'production' },
        extname: '.hbs',
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(path.join(outDir, 'production'), 'utf8');
      assert.strictEqual(output, 'Environment: production');
    });
  });

  it('renders dynamic nested paths', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'partials');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(path.join(templateDir, '${dir}'), { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, '${dir}', '${file}.hbs'),
        'Content',
        'utf8',
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: { dir: 'configs', file: 'app' },
        extname: '.hbs',
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(
        path.join(outDir, 'configs', 'app'),
        'utf8',
      );
      assert.strictEqual(output, 'Content');
    });
  });

  it('uses registered partials in templates', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'partials');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, 'page.hbs'),
        '{{> header}}Content{{> footer}}',
        'utf8',
      );
      await fs.writeFile(
        path.join(partialsDir, 'header.hbs'),
        '[Header]',
        'utf8',
      );
      await fs.writeFile(
        path.join(partialsDir, 'footer.hbs'),
        '[Footer]',
        'utf8',
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: '.hbs',
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(path.join(outDir, 'page'), 'utf8');
      assert.strictEqual(output, '[Header]Content[Footer]');
    });
  });

  it('uses namespaced partials in templates', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'partials');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(path.join(partialsDir, 'components'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(templateDir, 'page.hbs'),
        '{{> components.button}}',
        'utf8',
      );
      await fs.writeFile(
        path.join(partialsDir, 'components', 'button.hbs'),
        'Button',
        'utf8',
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: '.hbs',
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(path.join(outDir, 'page'), 'utf8');
      assert.strictEqual(output, 'Button');
    });
  });

  it('strips template extension from output', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'partials');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, 'config.json.hbs'),
        '{"key": "value"}',
        'utf8',
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: '.hbs',
      };

      await renderDirectory(cfg);

      // Should create config.json, not config.json.hbs
      const output = await fs.readFile(
        path.join(outDir, 'config.json'),
        'utf8',
      );
      assert.strictEqual(output, '{"key": "value"}');
    });
  });

  it('uses custom extension', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'partials');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(path.join(templateDir, 'file.tmpl'), 'Custom', 'utf8');

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: '.tmpl',
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(path.join(outDir, 'file'), 'utf8');
      assert.strictEqual(output, 'Custom');
    });
  });

  it('creates nested output directories as needed', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'partials');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(path.join(templateDir, 'a', 'b', 'c'), {
        recursive: true,
      });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, 'a', 'b', 'c', 'deep.hbs'),
        'Deep',
        'utf8',
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: '.hbs',
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(
        path.join(outDir, 'a', 'b', 'c', 'deep'),
        'utf8',
      );
      assert.strictEqual(output, 'Deep');
    });
  });

  it('handles empty template directory', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'partials');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: '.hbs',
      };

      await renderDirectory(cfg);

      // Should not throw, and outDir should not be created if empty
      assert.ok(true);
    });
  });

  it('handles empty partials directory', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'partials');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, 'file.hbs'),
        'No partials',
        'utf8',
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: '.hbs',
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(path.join(outDir, 'file'), 'utf8');
      assert.strictEqual(output, 'No partials');
    });
  });

  it('throws when partialsDir does not exist', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'nonexistent');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(templateDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, 'file.hbs'),
        'Hello {{name}}!',
        'utf8',
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: { name: 'World' },
        extname: '.hbs',
      };

      await assert.rejects(async () => renderDirectory(cfg), /ENOENT/);
    });
  });

  it('renders complex nested structure with partials', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'partials');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(path.join(templateDir, 'pages'), { recursive: true });
      await fs.mkdir(path.join(partialsDir, 'layouts'), { recursive: true });
      await fs.mkdir(path.join(partialsDir, 'components'), {
        recursive: true,
      });

      await fs.writeFile(
        path.join(templateDir, 'pages', 'home.hbs'),
        '{{> layouts.main}}',
        'utf8',
      );
      await fs.writeFile(
        path.join(partialsDir, 'layouts', 'main.hbs'),
        'Header: {{> components.nav}}\nContent',
        'utf8',
      );
      await fs.writeFile(
        path.join(partialsDir, 'components', 'nav.hbs'),
        'Navigation',
        'utf8',
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: '.hbs',
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(
        path.join(outDir, 'pages', 'home'),
        'utf8',
      );
      assert.strictEqual(output, 'Header: Navigation\nContent');
    });
  });

  it('uses namespaced partials in templates', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'partials');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(path.join(partialsDir, 'helpers'), { recursive: true });
      await fs.writeFile(
        path.join(templateDir, 'page.hbs'),
        '{{> helpers.badge}}',
        'utf8',
      );
      await fs.writeFile(
        path.join(partialsDir, 'helpers', 'badge.hbs'),
        'Badge: {{label}}',
        'utf8',
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: { label: 'New' },
        extname: '.hbs',
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(path.join(outDir, 'page'), 'utf8');
      assert.strictEqual(output, 'Badge: New');
    });
  });

  it('uses root partials in templates', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'partials');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, 'page.hbs'),
        '{{> utils}}',
        'utf8',
      );
      await fs.writeFile(
        path.join(partialsDir, 'utils.hbs'),
        'Utility content',
        'utf8',
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: '.hbs',
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(path.join(outDir, 'page'), 'utf8');
      assert.strictEqual(output, 'Utility content');
    });
  });

  it('does not pollute global Handlebars', async () => {
    const before = { ...Handlebars.partials };

    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'partials');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, 'page.hbs'),
        '{{> test_partial}}',
        'utf8',
      );
      await fs.writeFile(
        path.join(partialsDir, 'test_partial.hbs'),
        'Test',
        'utf8',
      );

      await renderDirectory({
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: '.hbs',
      });

      assert.deepStrictEqual(Handlebars.partials, before);
    });
  });

  it('uses provided Handlebars instance', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'partials');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, 'page.hbs'),
        '{{shout name}}',
        'utf8',
      );

      const scopedHandlebars = Handlebars.create();
      scopedHandlebars.registerHelper('shout', (v) => String(v).toUpperCase());

      await renderDirectory(
        {
          templateDir,
          partialsDir,
          outDir,
          view: { name: 'hello' },
          extname: '.hbs',
        },
        scopedHandlebars,
      );

      const output = await fs.readFile(path.join(outDir, 'page'), 'utf8');
      assert.strictEqual(output, 'HELLO');
    });
  });

  it('uses @ flattened partials in templates', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'partials');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(path.join(partialsDir, '@helpers', 'deep'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(templateDir, 'page.hbs'),
        '{{> date}} {{> nested}}',
        'utf8',
      );
      await fs.writeFile(
        path.join(partialsDir, '@helpers', 'date.hbs'),
        'Today',
        'utf8',
      );
      await fs.writeFile(
        path.join(partialsDir, '@helpers', 'deep', 'nested.hbs'),
        'Deep',
        'utf8',
      );

      await renderDirectory({
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: '.hbs',
      });

      const output = await fs.readFile(path.join(outDir, 'page'), 'utf8');
      assert.strictEqual(output, 'Today Deep');
    });
  });

  it('uses recursively nested partials in templates', async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, 'templates');
      const partialsDir = path.join(tmpDir, 'partials');
      const outDir = path.join(tmpDir, 'out');

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(path.join(partialsDir, 'components', 'forms'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(templateDir, 'page.hbs'),
        '{{> components.forms.login}}',
        'utf8',
      );
      await fs.writeFile(
        path.join(partialsDir, 'components', 'forms', 'login.hbs'),
        'Login: {{user}}',
        'utf8',
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: { user: 'admin' },
        extname: '.hbs',
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(path.join(outDir, 'page'), 'utf8');
      assert.strictEqual(output, 'Login: admin');
    });
  });

  // ── Path guards ($if / $ifn) ──────────────────────────────────────

  describe('path guards', () => {
    it('renders only prod-guarded files when prod=true', async () => {
      await withTempDir(async (tmpDir) => {
        const dirs = await seedGuardTree(tmpDir);

        await renderDirectory({
          ...dirs,
          view: { prod: true },
          extname: '.hbs',
        });

        assert.ok(
          await fs
            .stat(path.join(dirs.outDir, 'always'))
            .then(() => true)
            .catch(() => false),
        );
        assert.ok(
          await fs
            .stat(path.join(dirs.outDir, 'prod'))
            .then(() => true)
            .catch(() => false),
        );
        await assert.rejects(fs.stat(path.join(dirs.outDir, 'dev')));
      });
    });

    it('renders only dev-guarded files when prod=false', async () => {
      await withTempDir(async (tmpDir) => {
        const dirs = await seedGuardTree(tmpDir);

        await renderDirectory({
          ...dirs,
          view: { prod: false },
          extname: '.hbs',
        });

        assert.ok(
          await fs
            .stat(path.join(dirs.outDir, 'always'))
            .then(() => true)
            .catch(() => false),
        );
        assert.ok(
          await fs
            .stat(path.join(dirs.outDir, 'dev'))
            .then(() => true)
            .catch(() => false),
        );
        await assert.rejects(fs.stat(path.join(dirs.outDir, 'prod')));
      });
    });

    it('nested guards — both must pass', async () => {
      await withTempDir(async (tmpDir) => {
        const templateDir = path.join(tmpDir, 'templates');
        const partialsDir = path.join(tmpDir, 'partials');
        const outDir = path.join(tmpDir, 'out');
        const nested = path.join(templateDir, '$if{a}', '$if{b}');

        await fs.mkdir(nested, { recursive: true });
        await fs.mkdir(partialsDir, { recursive: true });
        await fs.writeFile(path.join(nested, 'deep.hbs'), 'deep', 'utf8');

        await renderDirectory({
          templateDir,
          partialsDir,
          outDir,
          view: { a: true, b: true },
          extname: '.hbs',
        });

        assert.ok(
          await fs
            .stat(path.join(outDir, 'deep'))
            .then(() => true)
            .catch(() => false),
        );
      });
    });

    it('throws with relPath on missing guard variable', async () => {
      await withTempDir(async (tmpDir) => {
        const templateDir = path.join(tmpDir, 'templates');
        const partialsDir = path.join(tmpDir, 'partials');
        const outDir = path.join(tmpDir, 'out');

        await fs.mkdir(path.join(templateDir, '$if{missing}'), {
          recursive: true,
        });
        await fs.mkdir(partialsDir, { recursive: true });
        await fs.writeFile(
          path.join(templateDir, '$if{missing}', 'x.hbs'),
          'x',
          'utf8',
        );

        await assert.rejects(
          renderDirectory({
            templateDir,
            partialsDir,
            outDir,
            view: {},
            extname: '.hbs',
          }),
          /undefined view variable 'missing'/,
        );
      });
    });
  });
});

// Round 06 — output confinement (security) and target collisions.
describe('renderDirectory — output safety', () => {
  /**
   * @param {string} tmpDir
   * @param {Record<string, string>} files - relPath (POSIX) → content
   */
  async function seed(tmpDir, files) {
    const templateDir = path.join(tmpDir, 'templates');
    for (const [rel, content] of Object.entries(files)) {
      const abs = path.join(templateDir, ...rel.split('/'));
      await fs.mkdir(path.dirname(abs), { recursive: true });
      await fs.writeFile(abs, content, 'utf8');
    }
    return { templateDir, outDir: path.join(tmpDir, 'out') };
  }

  /** @param {string} dir */
  async function exists(dir) {
    return fs
      .stat(dir)
      .then(() => true)
      .catch(() => false);
  }

  for (const [label, name] of [
    ['../ segment', `..${path.sep}escaped`],
    ['bare ..', '..'],
    ['deep ../..', `..${path.sep}..${path.sep}escaped`],
  ]) {
    it(`refuses a path value that escapes outDir (${label})`, async () => {
      await withTempDir(async (tmpDir) => {
        const { templateDir, outDir } = await seed(tmpDir, {
          '${name}/x.txt.hbs': 'x',
        });

        await assert.rejects(
          renderDirectory({
            templateDir,
            outDir,
            extname: '.hbs',
            view: { name },
          }),
          // 0.2.0: rejected at the path level first ('..' part, or '\' on
          // Windows); the outDir guard stays as a second line of defence.
          (err) => {
            assert.ok(
              [
                'JSTMPL_PATH_EMPTY_SEGMENT',
                'JSTMPL_PATH_INVALID_VALUE',
              ].includes(err.code),
              err.message,
            );
            return true;
          },
        );
        assert.strictEqual(await exists(path.join(tmpDir, 'escaped')), false);
        assert.strictEqual(await exists(path.join(tmpDir, 'x.txt')), false);
      });
    });
  }

  it('rejects a leading-slash value (empty first part, 0.2.0)', async () => {
    await withTempDir(async (tmpDir) => {
      const { templateDir, outDir } = await seed(tmpDir, {
        '${name}/x.txt.hbs': 'x',
      });

      await assert.rejects(
        renderDirectory({
          templateDir,
          outDir,
          extname: '.hbs',
          view: { name: '/abs' },
        }),
        /every part must name a file or directory/,
      );
      assert.strictEqual(await exists(outDir), false);
    });
  });

  it('allows names that merely start with dots', async () => {
    await withTempDir(async (tmpDir) => {
      const { templateDir, outDir } = await seed(tmpDir, {
        '${name}.txt.hbs': 'x',
      });

      await renderDirectory({
        templateDir,
        outDir,
        extname: '.hbs',
        view: { name: '..hidden' },
      });

      assert.strictEqual(await exists(path.join(outDir, '..hidden.txt')), true);
    });
  });

  it('writes nothing when any template escapes', async () => {
    await withTempDir(async (tmpDir) => {
      const { templateDir, outDir } = await seed(tmpDir, {
        'a-good.txt.hbs': 'ok',
        '${name}/x.txt.hbs': 'x',
      });

      await assert.rejects(
        renderDirectory({
          templateDir,
          outDir,
          extname: '.hbs',
          view: { name: '..' },
        }),
        /every part must name a file or directory/,
      );
      assert.strictEqual(await exists(outDir), false);
    });
  });

  it('nests a value with / (variable depth)', async () => {
    await withTempDir(async (tmpDir) => {
      const { templateDir, outDir } = await seed(tmpDir, {
        '${skill}/SKILL.md.hbs': 'S',
      });

      await renderDirectory({
        templateDir,
        outDir,
        extname: '.hbs',
        view: { skill: 'skills/group/nested' },
      });

      const out = path.join(outDir, 'skills', 'group', 'nested', 'SKILL.md');
      assert.strictEqual(await fs.readFile(out, 'utf8'), 'S');
    });
  });

  it('throws when two templates render to the same file, naming both', async () => {
    await withTempDir(async (tmpDir) => {
      const { templateDir, outDir } = await seed(tmpDir, {
        '${a}/x.txt.hbs': 'A',
        '${b}/x.txt.hbs': 'B',
      });

      await assert.rejects(
        renderDirectory({
          templateDir,
          outDir,
          extname: '.hbs',
          view: { a: 'same', b: 'same' },
        }),
        (err) => {
          assert.match(err.message, /both render to/);
          assert.ok(err.message.includes(path.join('${a}', 'x.txt.hbs')));
          assert.ok(err.message.includes(path.join('${b}', 'x.txt.hbs')));
          return true;
        },
      );
      assert.strictEqual(await exists(outDir), false);
    });
  });

  it('treats targets differing only by case as a collision (0.2.0)', async () => {
    await withTempDir(async (tmpDir) => {
      const { templateDir, outDir } = await seed(tmpDir, {
        '${a}.txt.hbs': 'A',
        '${b}.txt.hbs': 'B',
      });

      await assert.rejects(
        renderDirectory({
          templateDir,
          outDir,
          extname: '.hbs',
          view: { a: 'README', b: 'readme' },
        }),
        /render to 'README\.txt' and 'readme\.txt', the same file on case-insensitive file systems/,
      );
      assert.strictEqual(await exists(outDir), false);
    });
  });

  it('renders both when path values differ', async () => {
    await withTempDir(async (tmpDir) => {
      const { templateDir, outDir } = await seed(tmpDir, {
        '${a}/x.txt.hbs': 'A',
        '${b}/x.txt.hbs': 'B',
      });

      await renderDirectory({
        templateDir,
        outDir,
        extname: '.hbs',
        view: { a: 'one', b: 'two' },
      });

      const one = await fs.readFile(path.join(outDir, 'one', 'x.txt'), 'utf8');
      const two = await fs.readFile(path.join(outDir, 'two', 'x.txt'), 'utf8');
      assert.deepStrictEqual([one, two], ['A', 'B']);
    });
  });
});

// Round 07 — outDir is the container, checked against the real disk.
describe('renderDirectory — outDir containment through symlinks', () => {
  /** @param {string} tmpDir */
  async function tree(tmpDir) {
    const templateDir = path.join(tmpDir, 'templates');
    await fs.mkdir(path.join(templateDir, '${a}'), { recursive: true });
    await fs.writeFile(path.join(templateDir, '${a}', 'x.txt.hbs'), 'X');
    const outDir = path.join(tmpDir, 'out');
    await fs.mkdir(outDir);
    await fs.mkdir(path.join(tmpDir, 'elsewhere'));
    return { templateDir, outDir, elsewhere: path.join(tmpDir, 'elsewhere') };
  }

  it('refuses to write through a directory symlink that leaves outDir', async () => {
    await withTempDir(async (tmpDir) => {
      const { templateDir, outDir, elsewhere } = await tree(tmpDir);
      await fs.symlink(elsewhere, path.join(outDir, 'link'), 'junction');

      await assert.rejects(
        renderDirectory({
          templateDir,
          outDir,
          extname: '.hbs',
          view: { a: 'link' },
        }),
        { code: 'JSTMPL_OUTPUT_OUTSIDE_OUTDIR' },
      );
      assert.deepStrictEqual(await fs.readdir(elsewhere), []);
    });
  });

  it('allows a symlink that stays inside outDir', async () => {
    await withTempDir(async (tmpDir) => {
      const { templateDir, outDir } = await tree(tmpDir);
      await fs.mkdir(path.join(outDir, 'real'));
      await fs.symlink(
        path.join(outDir, 'real'),
        path.join(outDir, 'link'),
        'junction',
      );

      await renderDirectory({
        templateDir,
        outDir,
        extname: '.hbs',
        view: { a: 'link' },
      });
      const out = await fs.readFile(path.join(outDir, 'real', 'x.txt'), 'utf8');
      assert.strictEqual(out, 'X');
    });
  });

  // File symlinks need privileges on Windows; the logic is the same.
  it(
    'refuses to write through a dangling file symlink',
    { skip: process.platform === 'win32' },
    async () => {
      await withTempDir(async (tmpDir) => {
        const { templateDir, outDir, elsewhere } = await tree(tmpDir);
        await fs.mkdir(path.join(outDir, 'd'));
        await fs.symlink(
          path.join(elsewhere, 'created.txt'),
          path.join(outDir, 'd', 'x.txt'),
        );

        await assert.rejects(
          renderDirectory({
            templateDir,
            outDir,
            extname: '.hbs',
            view: { a: 'd' },
          }),
          { code: 'JSTMPL_OUTPUT_OUTSIDE_OUTDIR' },
        );
        assert.deepStrictEqual(await fs.readdir(elsewhere), []);
      });
    },
  );
});

// Round 07 — targetFs declares the file system the output is for.
describe('renderDirectory — targetFs', () => {
  /**
   * Whether the temp dir's file system is case-sensitive. The test probes;
   * js-tmpl never does.
   * @param {string} dir
   */
  async function diskIsCaseSensitive(dir) {
    await fs.writeFile(path.join(dir, 'PROBE'), '');
    const sensitive = !(await fs
      .stat(path.join(dir, 'probe'))
      .then(() => true)
      .catch(() => false));
    await fs.rm(path.join(dir, 'PROBE'));
    return sensitive;
  }

  /** @param {string} tmpDir */
  async function caseTree(tmpDir) {
    const templateDir = path.join(tmpDir, 'templates');
    await fs.mkdir(templateDir);
    await fs.writeFile(path.join(templateDir, '${a}.txt.hbs'), 'UPPER');
    await fs.writeFile(path.join(templateDir, '${b}.txt.hbs'), 'lower');
    return {
      templateDir,
      outDir: path.join(tmpDir, 'out'),
      view: { a: 'README', b: 'readme' },
    };
  }

  it("'portable' (default) rejects case-only differences on every OS", async () => {
    await withTempDir(async (tmpDir) => {
      const cfg = await caseTree(tmpDir);
      await assert.rejects(
        renderDirectory({ ...cfg, extname: '.hbs', targetFs: 'portable' }),
        /set targetFs: 'case-sensitive'/,
      );
    });
  });

  it("'case-sensitive' writes both where the disk agrees, and fails loudly where it does not", async () => {
    await withTempDir(async (tmpDir) => {
      const cfg = await caseTree(tmpDir);
      const run = renderDirectory({
        ...cfg,
        extname: '.hbs',
        targetFs: 'case-sensitive',
      });

      if (await diskIsCaseSensitive(tmpDir)) {
        await run;
        const upper = await fs.readFile(
          path.join(cfg.outDir, 'README.txt'),
          'utf8',
        );
        const lower = await fs.readFile(
          path.join(cfg.outDir, 'readme.txt'),
          'utf8',
        );
        assert.deepStrictEqual([upper, lower], ['UPPER', 'lower']);
      } else {
        await assert.rejects(run, (err) => {
          assert.strictEqual(err.code, 'JSTMPL_OUTPUT_COLLISION');
          assert.match(
            err.message,
            /which this file system treats as one file/,
          );
          return true;
        });
      }
    });
  });

  // Two names, one inode: exactly what a case-insensitive disk does with
  // README.txt / readme.txt, reproduced with a hard link on any OS.
  it("'case-sensitive' detects two names that are one file on disk", async () => {
    await withTempDir(async (tmpDir) => {
      const cfg = await caseTree(tmpDir);
      await fs.mkdir(cfg.outDir);
      await fs.writeFile(path.join(cfg.outDir, 'README.txt'), 'old');
      try {
        await fs.link(
          path.join(cfg.outDir, 'README.txt'),
          path.join(cfg.outDir, 'readme.txt'),
        );
      } catch {
        return; // case-insensitive disk: the names already are one file
      }

      await assert.rejects(
        renderDirectory({
          ...cfg,
          extname: '.hbs',
          targetFs: 'case-sensitive',
        }),
        (err) => {
          assert.strictEqual(err.code, 'JSTMPL_OUTPUT_COLLISION');
          assert.deepStrictEqual(err.details.templates, [
            '${a}.txt.hbs',
            '${b}.txt.hbs',
          ]);
          return true;
        },
      );
    });
  });

  it('a file left from an earlier run is not mistaken for a collision', async () => {
    await withTempDir(async (tmpDir) => {
      if (!(await diskIsCaseSensitive(tmpDir))) {
        return; // only meaningful where both names can coexist
      }
      const cfg = await caseTree(tmpDir);
      await fs.mkdir(cfg.outDir);
      await fs.writeFile(path.join(cfg.outDir, 'readme.txt'), 'stale');

      await renderDirectory({
        ...cfg,
        extname: '.hbs',
        targetFs: 'case-sensitive',
      });
      const lower = await fs.readFile(
        path.join(cfg.outDir, 'readme.txt'),
        'utf8',
      );
      assert.strictEqual(lower, 'lower');
    });
  });

  it('resolveConfig passes targetFs through and defaults to portable', async () => {
    await withTempDir(async (tmpDir) => {
      assert.strictEqual(resolveConfig({}, tmpDir).targetFs, 'portable');
      assert.strictEqual(
        resolveConfig({ targetFs: 'case-sensitive' }, tmpDir).targetFs,
        'case-sensitive',
      );
    });
  });
});
