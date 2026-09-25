import assert from 'node:assert';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';

import { renderContent } from '../../../src/engine/contentRenderer.js';
import { withTempDir } from '../../helpers/tempDir.js';

describe('renderContent', () => {
  it('renders simple template', async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, 'template.hbs');
      await fs.writeFile(templateFile, 'Hello {{name}}!', 'utf8');

      const view = { name: 'World' };
      const result = await renderContent(templateFile, view);

      assert.strictEqual(result, 'Hello World!');
    });
  });

  it('renders template with nested properties', async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, 'template.hbs');
      await fs.writeFile(
        templateFile,
        'App: {{app.name}}, Version: {{app.version}}',
        'utf8',
      );

      const view = { app: { name: 'MyApp', version: '1.0.0' } };
      const result = await renderContent(templateFile, view);

      assert.strictEqual(result, 'App: MyApp, Version: 1.0.0');
    });
  });

  it('renders template with conditionals', async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, 'template.hbs');
      await fs.writeFile(
        templateFile,
        '{{#if enabled}}Enabled{{else}}Disabled{{/if}}',
        'utf8',
      );

      const view = { enabled: true };
      const result = await renderContent(templateFile, view);

      assert.strictEqual(result, 'Enabled');
    });
  });

  it('renders template with loops', async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, 'template.hbs');
      await fs.writeFile(
        templateFile,
        '{{#each items}}{{this}},{{/each}}',
        'utf8',
      );

      const view = { items: ['a', 'b', 'c'] };
      const result = await renderContent(templateFile, view);

      assert.strictEqual(result, 'a,b,c,');
    });
  });

  it('renders template with environment variables', async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, 'template.hbs');
      await fs.writeFile(templateFile, 'Node: {{env.NODE_ENV}}', 'utf8');

      const view = { env: { NODE_ENV: 'test' } };
      const result = await renderContent(templateFile, view);

      assert.strictEqual(result, 'Node: test');
    });
  });

  it('handles static content without placeholders', async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, 'template.hbs');
      const content = 'Static content with no variables';
      await fs.writeFile(templateFile, content, 'utf8');

      const view = {};
      const result = await renderContent(templateFile, view);

      assert.strictEqual(result, content);
    });
  });

  it('throws on missing property (strict mode, VP-9)', async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, 'template.hbs');
      await fs.writeFile(templateFile, 'Value: {{missing}}', 'utf8');

      const view = {};
      await assert.rejects(
        renderContent(templateFile, view, undefined, 'template.hbs'),
        /Template 'template\.hbs': "missing" not defined/,
      );
    });
  });

  it('renders present-but-empty string as empty (not missing)', async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, 'template.hbs');
      await fs.writeFile(templateFile, 'Value: {{name}}', 'utf8');

      const result = await renderContent(templateFile, { name: '' });
      assert.strictEqual(result, 'Value: ');
    });
  });

  it('renders multiline template', async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, 'template.hbs');
      await fs.writeFile(
        templateFile,
        'Line 1: {{line1}}\nLine 2: {{line2}}',
        'utf8',
      );

      const view = { line1: 'First', line2: 'Second' };
      const result = await renderContent(templateFile, view);

      assert.strictEqual(result, 'Line 1: First\nLine 2: Second');
    });
  });

  it('handles complex object structures', async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, 'template.hbs');
      await fs.writeFile(
        templateFile,
        '{{#each users}}{{name}}: {{email}}\n{{/each}}',
        'utf8',
      );

      const view = {
        users: [
          { name: 'Alice', email: 'alice@test.com' },
          { name: 'Bob', email: 'bob@test.com' },
        ],
      };
      const result = await renderContent(templateFile, view);

      assert.strictEqual(result, 'Alice: alice@test.com\nBob: bob@test.com\n');
    });
  });

  it('throws error for non-existent file', async () => {
    await assert.rejects(
      async () => renderContent('/non/existent/file.hbs', {}),
      /ENOENT/,
    );
  });

  it('handles empty template file', async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, 'template.hbs');
      await fs.writeFile(templateFile, '', 'utf8');

      const view = { name: 'test' };
      const result = await renderContent(templateFile, view);

      assert.strictEqual(result, '');
    });
  });
});

// Patterns documented in docs/API.md § Strict templates → Optional values.
describe('renderContent — optional values under strict mode', () => {
  /**
   * @param {string} src
   * @param {Record<string, unknown>} view
   */
  async function renderString(src, view) {
    return withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, 'template.hbs');
      await fs.writeFile(templateFile, src, 'utf8');
      return renderContent(templateFile, view, undefined, 'template.hbs');
    });
  }

  it('declared empty values render empty', async () => {
    const result = await renderString('[{{a}}|{{b}}|{{#each c}}x{{/each}}]', {
      a: '',
      b: null,
      c: [],
    });
    assert.strictEqual(result, '[||]');
  });

  it('boolean switch hides an optional block', async () => {
    const src = '{{#if monitoring}}on{{else}}off{{/if}}';
    assert.strictEqual(await renderString(src, { monitoring: false }), 'off');
    assert.strictEqual(await renderString(src, { monitoring: true }), 'on');
  });

  it('body of a false {{#if}} is not evaluated', async () => {
    const src = '{{#if db}}{{db.host}}{{/if}}';
    assert.strictEqual(await renderString(src, { db: null }), '');
    assert.strictEqual(await renderString(src, { db: false }), '');
    assert.strictEqual(await renderString(src, { db: { host: 'h' } }), 'h');
  });

  it('nested read on a declared-but-empty object still throws', async () => {
    await assert.rejects(
      renderString('{{db.host}}', { db: {} }),
      /Template 'template\.hbs': "host" not defined/,
    );
  });

  // Known gap (Round 07): helper arguments are not strict-checked.
  it('missing key in {{#if}} is treated as falsy (known gap)', async () => {
    assert.strictEqual(await renderString('{{#if nope}}x{{/if}}', {}), '');
  });
});
