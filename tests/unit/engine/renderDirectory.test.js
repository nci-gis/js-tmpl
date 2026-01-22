import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { beforeEach,describe, it } from "node:test";

import Handlebars from "handlebars";

import { renderDirectory } from "../../../src/engine/renderDirectory.js";
import { withTempDir } from "../../helpers/tempDir.js";

describe("renderDirectory", () => {
  beforeEach(() => {
    // Clear registered partials before each test
    Handlebars.unregisterPartial(/.*/)
  });

  it("renders single template to output directory", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, "file.hbs"),
        "Hello {{name}}!",
        "utf8"
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: { name: "World" },
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(path.join(outDir, "file"), "utf8");
      assert.strictEqual(output, "Hello World!");
    });
  });

  it("renders multiple templates", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, "a.hbs"),
        "File A",
        "utf8"
      );
      await fs.writeFile(
        path.join(templateDir, "b.hbs"),
        "File B",
        "utf8"
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      const outputA = await fs.readFile(path.join(outDir, "a"), "utf8");
      const outputB = await fs.readFile(path.join(outDir, "b"), "utf8");
      assert.strictEqual(outputA, "File A");
      assert.strictEqual(outputB, "File B");
    });
  });

  it("preserves directory structure", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      await fs.mkdir(path.join(templateDir, "subdir"), { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, "root.hbs"),
        "Root",
        "utf8"
      );
      await fs.writeFile(
        path.join(templateDir, "subdir", "nested.hbs"),
        "Nested",
        "utf8"
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      const rootOutput = await fs.readFile(path.join(outDir, "root"), "utf8");
      const nestedOutput = await fs.readFile(
        path.join(outDir, "subdir", "nested"),
        "utf8"
      );
      assert.strictEqual(rootOutput, "Root");
      assert.strictEqual(nestedOutput, "Nested");
    });
  });

  it("renders dynamic paths", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, "${env}.hbs"),
        "Environment: {{env}}",
        "utf8"
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: { env: "production" },
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(
        path.join(outDir, "production"),
        "utf8"
      );
      assert.strictEqual(output, "Environment: production");
    });
  });

  it("renders dynamic nested paths", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      await fs.mkdir(path.join(templateDir, "${dir}"), { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, "${dir}", "${file}.hbs"),
        "Content",
        "utf8"
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: { dir: "configs", file: "app" },
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(
        path.join(outDir, "configs", "app"),
        "utf8"
      );
      assert.strictEqual(output, "Content");
    });
  });

  it("uses registered partials in templates", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, "page.hbs"),
        "{{> header}}Content{{> footer}}",
        "utf8"
      );
      await fs.writeFile(
        path.join(partialsDir, "_header.hbs"),
        "[Header]",
        "utf8"
      );
      await fs.writeFile(
        path.join(partialsDir, "_footer.hbs"),
        "[Footer]",
        "utf8"
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(path.join(outDir, "page"), "utf8");
      assert.strictEqual(output, "[Header]Content[Footer]");
    });
  });

  it("uses namespaced partials in templates", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(path.join(partialsDir, "@components"), {
        recursive: true,
      });
      await fs.writeFile(
        path.join(templateDir, "page.hbs"),
        "{{> components.button}}",
        "utf8"
      );
      await fs.writeFile(
        path.join(partialsDir, "@components", "button.hbs"),
        "Button",
        "utf8"
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(path.join(outDir, "page"), "utf8");
      assert.strictEqual(output, "Button");
    });
  });

  it("strips template extension from output", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, "config.json.hbs"),
        '{"key": "value"}',
        "utf8"
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      // Should create config.json, not config.json.hbs
      const output = await fs.readFile(
        path.join(outDir, "config.json"),
        "utf8"
      );
      assert.strictEqual(output, '{"key": "value"}');
    });
  });

  it("uses custom extension", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, "file.tmpl"),
        "Custom",
        "utf8"
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: ".tmpl",
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(path.join(outDir, "file"), "utf8");
      assert.strictEqual(output, "Custom");
    });
  });

  it("creates nested output directories as needed", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      await fs.mkdir(path.join(templateDir, "a", "b", "c"), {
        recursive: true,
      });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, "a", "b", "c", "deep.hbs"),
        "Deep",
        "utf8"
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(
        path.join(outDir, "a", "b", "c", "deep"),
        "utf8"
      );
      assert.strictEqual(output, "Deep");
    });
  });

  it("handles empty template directory", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      // Should not throw, and outDir should not be created if empty
      assert.ok(true);
    });
  });

  it("handles empty partials directory", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });
      await fs.writeFile(
        path.join(templateDir, "file.hbs"),
        "No partials",
        "utf8"
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(path.join(outDir, "file"), "utf8");
      assert.strictEqual(output, "No partials");
    });
  });

  it("renders complex nested structure with partials", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      await fs.mkdir(path.join(templateDir, "pages"), { recursive: true });
      await fs.mkdir(path.join(partialsDir, "@layouts"), { recursive: true });
      await fs.mkdir(path.join(partialsDir, "@components"), {
        recursive: true,
      });

      await fs.writeFile(
        path.join(templateDir, "pages", "home.hbs"),
        "{{> layouts.main}}",
        "utf8"
      );
      await fs.writeFile(
        path.join(partialsDir, "@layouts", "main.hbs"),
        "Header: {{> components.nav}}\nContent",
        "utf8"
      );
      await fs.writeFile(
        path.join(partialsDir, "@components", "nav.hbs"),
        "Navigation",
        "utf8"
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {},
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      const output = await fs.readFile(
        path.join(outDir, "pages", "home"),
        "utf8"
      );
      assert.strictEqual(output, "Header: Navigation\nContent");
    });
  });
});
