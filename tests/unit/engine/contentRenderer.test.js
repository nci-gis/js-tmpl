import { describe, it } from "node:test";
import assert from "node:assert";
import path from "node:path";
import fs from "node:fs/promises";
import { renderContent } from "../../../src/engine/contentRenderer.js";
import { withTempDir } from "../../helpers/tempDir.js";

describe("renderContent", () => {
  it("renders simple template", async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, "template.hbs");
      await fs.writeFile(templateFile, "Hello {{name}}!", "utf8");

      const view = { name: "World" };
      const result = await renderContent(templateFile, view);

      assert.strictEqual(result, "Hello World!");
    });
  });

  it("renders template with nested properties", async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, "template.hbs");
      await fs.writeFile(
        templateFile,
        "App: {{app.name}}, Version: {{app.version}}",
        "utf8"
      );

      const view = { app: { name: "MyApp", version: "1.0.0" } };
      const result = await renderContent(templateFile, view);

      assert.strictEqual(result, "App: MyApp, Version: 1.0.0");
    });
  });

  it("renders template with conditionals", async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, "template.hbs");
      await fs.writeFile(
        templateFile,
        "{{#if enabled}}Enabled{{else}}Disabled{{/if}}",
        "utf8"
      );

      const view = { enabled: true };
      const result = await renderContent(templateFile, view);

      assert.strictEqual(result, "Enabled");
    });
  });

  it("renders template with loops", async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, "template.hbs");
      await fs.writeFile(
        templateFile,
        "{{#each items}}{{this}},{{/each}}",
        "utf8"
      );

      const view = { items: ["a", "b", "c"] };
      const result = await renderContent(templateFile, view);

      assert.strictEqual(result, "a,b,c,");
    });
  });

  it("renders template with environment variables", async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, "template.hbs");
      await fs.writeFile(templateFile, "Node: {{env.NODE_ENV}}", "utf8");

      const view = { env: { NODE_ENV: "test" } };
      const result = await renderContent(templateFile, view);

      assert.strictEqual(result, "Node: test");
    });
  });

  it("handles static content without placeholders", async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, "template.hbs");
      const content = "Static content with no variables";
      await fs.writeFile(templateFile, content, "utf8");

      const view = {};
      const result = await renderContent(templateFile, view);

      assert.strictEqual(result, content);
    });
  });

  it("handles missing properties gracefully", async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, "template.hbs");
      await fs.writeFile(templateFile, "Value: {{missing}}", "utf8");

      const view = {};
      const result = await renderContent(templateFile, view);

      assert.strictEqual(result, "Value: ");
    });
  });

  it("renders multiline template", async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, "template.hbs");
      await fs.writeFile(
        templateFile,
        "Line 1: {{line1}}\nLine 2: {{line2}}",
        "utf8"
      );

      const view = { line1: "First", line2: "Second" };
      const result = await renderContent(templateFile, view);

      assert.strictEqual(result, "Line 1: First\nLine 2: Second");
    });
  });

  it("handles complex object structures", async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, "template.hbs");
      await fs.writeFile(
        templateFile,
        "{{#each users}}{{name}}: {{email}}\n{{/each}}",
        "utf8"
      );

      const view = {
        users: [
          { name: "Alice", email: "alice@test.com" },
          { name: "Bob", email: "bob@test.com" },
        ],
      };
      const result = await renderContent(templateFile, view);

      assert.strictEqual(result, "Alice: alice@test.com\nBob: bob@test.com\n");
    });
  });

  it("throws error for non-existent file", async () => {
    await assert.rejects(
      async () => renderContent("/non/existent/file.hbs", {}),
      /ENOENT/
    );
  });

  it("handles empty template file", async () => {
    await withTempDir(async (tmpDir) => {
      const templateFile = path.join(tmpDir, "template.hbs");
      await fs.writeFile(templateFile, "", "utf8");

      const view = { name: "test" };
      const result = await renderContent(templateFile, view);

      assert.strictEqual(result, "");
    });
  });
});
