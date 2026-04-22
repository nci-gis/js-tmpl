import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import Handlebars from 'handlebars';

import { registerPartials } from '../../../src/engine/partials.js';
import { withTempDir } from '../../helpers/tempDir.js';

describe('registerPartials', () => {
  // ── Root files ─────────────────────────────────────────────────────

  it('registers root file by filename', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.writeFile(path.join(tmpDir, 'header.hbs'), 'Header', 'utf8');

      await registerPartials(tmpDir, '.hbs', hbs);

      assert.strictEqual(hbs.partials['header'], 'Header');
    });
  });

  it('registers multiple root files', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.writeFile(path.join(tmpDir, 'header.hbs'), 'Header', 'utf8');
      await fs.writeFile(path.join(tmpDir, 'footer.hbs'), 'Footer', 'utf8');

      await registerPartials(tmpDir, '.hbs', hbs);

      assert.strictEqual(hbs.partials['header'], 'Header');
      assert.strictEqual(hbs.partials['footer'], 'Footer');
    });
  });

  // ── Namespaced directories ─────────────────────────────────────────

  it('registers files in subdirectory as namespaced', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.mkdir(path.join(tmpDir, 'components'), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'components', 'button.hbs'),
        'Button',
        'utf8',
      );

      await registerPartials(tmpDir, '.hbs', hbs);

      assert.strictEqual(hbs.partials['components.button'], 'Button');
    });
  });

  it('registers deeply nested files with full namespace', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.mkdir(path.join(tmpDir, 'components', 'forms'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(tmpDir, 'components', 'forms', 'login.hbs'),
        'Login',
        'utf8',
      );

      await registerPartials(tmpDir, '.hbs', hbs);

      assert.strictEqual(hbs.partials['components.forms.login'], 'Login');
    });
  });

  it('registers multiple files in same directory', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.mkdir(path.join(tmpDir, 'ui'), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'ui', 'button.hbs'),
        'Button',
        'utf8',
      );
      await fs.writeFile(path.join(tmpDir, 'ui', 'input.hbs'), 'Input', 'utf8');

      await registerPartials(tmpDir, '.hbs', hbs);

      assert.strictEqual(hbs.partials['ui.button'], 'Button');
      assert.strictEqual(hbs.partials['ui.input'], 'Input');
    });
  });

  // ── @ flatten directories ──────────────────────────────────────────

  it('@ directory flattens files to filename only', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.mkdir(path.join(tmpDir, '@helpers'), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, '@helpers', 'date.hbs'),
        'Date',
        'utf8',
      );

      await registerPartials(tmpDir, '.hbs', hbs);

      assert.strictEqual(hbs.partials['date'], 'Date');
      assert.ok(!hbs.partials['helpers.date']);
    });
  });

  it('@ directory flattens deeply nested files', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.mkdir(path.join(tmpDir, '@helpers', 'deep'), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(tmpDir, '@helpers', 'deep', 'nested.hbs'),
        'Nested',
        'utf8',
      );

      await registerPartials(tmpDir, '.hbs', hbs);

      assert.strictEqual(hbs.partials['nested'], 'Nested');
      assert.ok(!hbs.partials['deep.nested']);
      assert.ok(!hbs.partials['helpers.deep.nested']);
    });
  });

  it('@ directory with multiple levels flattens all', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.mkdir(path.join(tmpDir, '@lib', 'a', 'b'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, '@lib', 'top.hbs'), 'Top', 'utf8');
      await fs.writeFile(
        path.join(tmpDir, '@lib', 'a', 'mid.hbs'),
        'Mid',
        'utf8',
      );
      await fs.writeFile(
        path.join(tmpDir, '@lib', 'a', 'b', 'bot.hbs'),
        'Bot',
        'utf8',
      );

      await registerPartials(tmpDir, '.hbs', hbs);

      assert.strictEqual(hbs.partials['top'], 'Top');
      assert.strictEqual(hbs.partials['mid'], 'Mid');
      assert.strictEqual(hbs.partials['bot'], 'Bot');
    });
  });

  // ── Filtering ──────────────────────────────────────────────────────

  it('ignores non-matching extension files', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.writeFile(path.join(tmpDir, 'readme.md'), 'Readme', 'utf8');
      await fs.writeFile(path.join(tmpDir, 'partial.hbs'), 'Partial', 'utf8');

      await registerPartials(tmpDir, '.hbs', hbs);

      assert.ok(hbs.partials['partial']);
      assert.ok(!hbs.partials['readme']);
    });
  });

  it('ignores non-matching extension in directories', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.mkdir(path.join(tmpDir, '@components'), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, '@components', 'button.hbs'),
        'Button',
        'utf8',
      );
      await fs.writeFile(
        path.join(tmpDir, '@components', 'readme.md'),
        'Readme',
        'utf8',
      );

      await registerPartials(tmpDir, '.hbs', hbs);

      assert.ok(hbs.partials['button']);
      assert.ok(!hbs.partials['readme']);
    });
  });

  it('uses custom extension', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.writeFile(path.join(tmpDir, 'header.tmpl'), 'Header', 'utf8');

      await registerPartials(tmpDir, '.tmpl', hbs);

      assert.strictEqual(hbs.partials['header'], 'Header');
    });
  });

  it('handles empty partials directory', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await registerPartials(tmpDir, '.hbs', hbs);
      assert.deepStrictEqual(hbs.partials, {});
    });
  });

  it('throws when partialsDir does not exist', async () => {
    const hbs = Handlebars.create();
    await assert.rejects(
      async () => registerPartials('/non/existent/path', '.hbs', hbs),
      /ENOENT/,
    );
  });

  it('skips registration when partialsDir is empty string', async () => {
    const hbs = Handlebars.create();
    await registerPartials('', '.hbs', hbs);
    assert.deepStrictEqual(hbs.partials, {});
  });

  it('strips extension from partial name', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.writeFile(
        path.join(tmpDir, 'component.hbs'),
        'Component',
        'utf8',
      );

      await registerPartials(tmpDir, '.hbs', hbs);

      assert.strictEqual(hbs.partials['component'], 'Component');
      assert.ok(!hbs.partials['component.hbs']);
    });
  });

  // ── Name validation ────────────────────────────────────────────────

  it('throws on invalid file name with dashes', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.writeFile(
        path.join(tmpDir, 'my-component.hbs'),
        'Content',
        'utf8',
      );

      await assert.rejects(
        async () => registerPartials(tmpDir, '.hbs', hbs),
        /Invalid partial name segment 'my-component'/,
      );
    });
  });

  it('throws on invalid directory name with dashes', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.mkdir(path.join(tmpDir, 'my-group'), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'my-group', 'file.hbs'),
        'Content',
        'utf8',
      );

      await assert.rejects(
        async () => registerPartials(tmpDir, '.hbs', hbs),
        /Invalid partial name segment 'my-group>file'/,
      );
    });
  });

  it('accepts valid names with alphanumeric and underscore', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.writeFile(
        path.join(tmpDir, 'my_partial_2.hbs'),
        'Content',
        'utf8',
      );

      await registerPartials(tmpDir, '.hbs', hbs);

      assert.strictEqual(hbs.partials['my_partial_2'], 'Content');
    });
  });

  // ── Duplicate detection ────────────────────────────────────────────

  it('throws on duplicate partial names', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      // date.hbs → "date" and @helpers/date.hbs → "date"
      await fs.mkdir(path.join(tmpDir, '@helpers'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'date.hbs'), 'Date1', 'utf8');
      await fs.writeFile(
        path.join(tmpDir, '@helpers', 'date.hbs'),
        'Date2',
        'utf8',
      );

      await assert.rejects(
        async () => registerPartials(tmpDir, '.hbs', hbs),
        /Duplicate partial name 'date'/,
      );
    });
  });

  it('throws on duplicate from @ flatten and root file', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.mkdir(path.join(tmpDir, '@helpers'), { recursive: true });
      await fs.writeFile(path.join(tmpDir, 'shared.hbs'), 'Root', 'utf8');
      await fs.writeFile(
        path.join(tmpDir, '@helpers', 'shared.hbs'),
        'Flat',
        'utf8',
      );

      await assert.rejects(
        async () => registerPartials(tmpDir, '.hbs', hbs),
        /Duplicate partial name 'shared'/,
      );
    });
  });

  it('allows same filename in different namespaces (no collision)', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.mkdir(path.join(tmpDir, 'auth'), { recursive: true });
      await fs.mkdir(path.join(tmpDir, 'contact'), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'auth', 'form.hbs'),
        'Auth Form',
        'utf8',
      );
      await fs.writeFile(
        path.join(tmpDir, 'contact', 'form.hbs'),
        'Contact Form',
        'utf8',
      );

      await registerPartials(tmpDir, '.hbs', hbs);

      assert.strictEqual(hbs.partials['auth.form'], 'Auth Form');
      assert.strictEqual(hbs.partials['contact.form'], 'Contact Form');
    });
  });

  // ── Isolation ──────────────────────────────────────────────────────

  it('does not register anything on global Handlebars', async () => {
    const before = { ...Handlebars.partials };

    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.writeFile(path.join(tmpDir, 'test.hbs'), 'Test', 'utf8');

      await registerPartials(tmpDir, '.hbs', hbs);

      assert.deepStrictEqual(Handlebars.partials, before);
    });
  });

  // ── Template compilation ───────────────────────────────────────────

  it('registered partials work in compiled templates', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.writeFile(
        path.join(tmpDir, 'greeting.hbs'),
        'Hello {{name}}!',
        'utf8',
      );

      await registerPartials(tmpDir, '.hbs', hbs);

      const template = hbs.compile('{{> greeting}}');
      assert.strictEqual(template({ name: 'World' }), 'Hello World!');
    });
  });

  it('namespaced partials work in compiled templates', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.mkdir(path.join(tmpDir, 'ui'), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, 'ui', 'alert.hbs'),
        'Alert: {{message}}',
        'utf8',
      );

      await registerPartials(tmpDir, '.hbs', hbs);

      const template = hbs.compile('{{> ui.alert}}');
      assert.strictEqual(template({ message: 'OK' }), 'Alert: OK');
    });
  });

  it('handles partials with complex handlebars syntax', async () => {
    await withTempDir(async (tmpDir) => {
      const hbs = Handlebars.create();
      await fs.writeFile(
        path.join(tmpDir, 'list.hbs'),
        '{{#each items}}{{this}},{{/each}}',
        'utf8',
      );

      await registerPartials(tmpDir, '.hbs', hbs);

      const template = hbs.compile('Items: {{> list}}');
      assert.strictEqual(template({ items: ['a', 'b', 'c'] }), 'Items: a,b,c,');
    });
  });

  // ── Root-independent `@` flatten (Round 03, Phase 0) ───────────────

  describe('@ flatten is root-independent', () => {
    it('@ at a nested level flattens (not just top-level)', async () => {
      // Before: `foo/@shared/helpers.hbs` registered as `foo.shared.helpers`.
      // After: `@<name>` anywhere in the chain flattens to filename-as-key,
      // so this registers as `helpers`.
      await withTempDir(async (tmpDir) => {
        const hbs = Handlebars.create();
        const nested = path.join(tmpDir, 'foo', '@shared');
        await fs.mkdir(nested, { recursive: true });
        await fs.writeFile(path.join(nested, 'helpers.hbs'), 'H', 'utf8');

        await registerPartials(tmpDir, '.hbs', hbs);

        assert.strictEqual(hbs.partials['helpers'], 'H');
        assert.ok(!hbs.partials['foo.shared.helpers']);
      });
    });

    it('produces the same key regardless of which ancestor is the scan root', async () => {
      // Scanning `tmpDir` vs scanning `tmpDir/env` — the file has `@overrides`
      // in its chain either way, so both paths produce key `app`.
      await withTempDir(async (tmpDir) => {
        const inner = path.join(tmpDir, 'env', '@overrides');
        await fs.mkdir(inner, { recursive: true });
        await fs.writeFile(path.join(inner, 'app.hbs'), 'A', 'utf8');

        const hbs1 = Handlebars.create();
        await registerPartials(tmpDir, '.hbs', hbs1);
        assert.strictEqual(hbs1.partials['app'], 'A');

        const hbs2 = Handlebars.create();
        await registerPartials(path.join(tmpDir, 'env'), '.hbs', hbs2);
        assert.strictEqual(hbs2.partials['app'], 'A');
      });
    });
  });
});
