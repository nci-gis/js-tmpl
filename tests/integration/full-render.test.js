import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import path from "node:path";
import fs from "node:fs/promises";
import Handlebars from "handlebars";
import { renderDirectory } from "../../src/engine/renderDirectory.js";
import { withTempDir } from "../helpers/tempDir.js";

describe("Integration: Full Rendering Flow", () => {
  beforeEach(() => {
    Handlebars.unregisterPartial(/.*/);
  });

  it("renders complete project structure", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      // Setup directory structure
      await fs.mkdir(path.join(templateDir, "src"), { recursive: true });
      await fs.mkdir(path.join(templateDir, "config"), { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });

      // Create templates
      await fs.writeFile(
        path.join(templateDir, "README.md.hbs"),
        "# {{project.name}}\n\n{{project.description}}",
        "utf8"
      );
      await fs.writeFile(
        path.join(templateDir, "src", "index.js.hbs"),
        "console.log('{{project.name}}');",
        "utf8"
      );
      await fs.writeFile(
        path.join(templateDir, "config", "app.json.hbs"),
        '{"name": "{{project.name}}", "version": "{{project.version}}"}',
        "utf8"
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {
          project: {
            name: "MyApp",
            version: "1.0.0",
            description: "A test application",
          },
        },
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      // Verify all outputs
      const readme = await fs.readFile(path.join(outDir, "README.md"), "utf8");
      assert.strictEqual(readme, "# MyApp\n\nA test application");

      const indexJs = await fs.readFile(
        path.join(outDir, "src", "index.js"),
        "utf8"
      );
      assert.strictEqual(indexJs, "console.log('MyApp');");

      const appJson = await fs.readFile(
        path.join(outDir, "config", "app.json"),
        "utf8"
      );
      assert.strictEqual(
        appJson,
        '{"name": "MyApp", "version": "1.0.0"}'
      );
    });
  });

  it("renders with partials and dynamic paths", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      // Setup structure
      await fs.mkdir(path.join(templateDir, "${env}"), { recursive: true });
      await fs.mkdir(path.join(partialsDir, "@components"), {
        recursive: true,
      });

      // Create templates with partials
      await fs.writeFile(
        path.join(templateDir, "${env}", "config.yaml.hbs"),
        "name: {{app.name}}\n{{> components.settings}}",
        "utf8"
      );

      // Create partial
      await fs.writeFile(
        path.join(partialsDir, "@components", "settings.hbs"),
        "port: {{app.port}}\ndebug: {{app.debug}}",
        "utf8"
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {
          env: "production",
          app: {
            name: "MyService",
            port: 8080,
            debug: false,
          },
        },
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      const config = await fs.readFile(
        path.join(outDir, "production", "config.yaml"),
        "utf8"
      );
      assert.strictEqual(
        config,
        "name: MyService\nport: 8080\ndebug: false"
      );
    });
  });

  it("renders with environment variables", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });

      await fs.writeFile(
        path.join(templateDir, "env.txt.hbs"),
        "NODE_ENV={{env.NODE_ENV}}\nPATH={{env.PATH}}",
        "utf8"
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {
          env: {
            NODE_ENV: "test",
            PATH: "/usr/bin",
          },
        },
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      const envFile = await fs.readFile(path.join(outDir, "env.txt"), "utf8");
      assert.strictEqual(envFile, "NODE_ENV=test\nPATH=/usr/bin");
    });
  });

  it("renders complex nested structure with multiple partials", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      // Complex structure
      await fs.mkdir(path.join(templateDir, "docs", "api"), {
        recursive: true,
      });
      await fs.mkdir(path.join(partialsDir, "@layouts"), { recursive: true });
      await fs.mkdir(path.join(partialsDir, "@components"), {
        recursive: true,
      });
      await fs.writeFile(path.join(partialsDir, "_header.hbs"), "=== HEADER ===", "utf8");
      await fs.writeFile(path.join(partialsDir, "_footer.hbs"), "=== FOOTER ===", "utf8");

      // Root partial
      await fs.writeFile(
        path.join(partialsDir, "_header.hbs"),
        "# {{title}}",
        "utf8"
      );

      // Namespaced partials
      await fs.writeFile(
        path.join(partialsDir, "@layouts", "page.hbs"),
        "{{> header}}\n{{content}}",
        "utf8"
      );
      await fs.writeFile(
        path.join(partialsDir, "@components", "toc.hbs"),
        "## Table of Contents\n{{#each sections}}{{this}}\n{{/each}}",
        "utf8"
      );

      // Template using nested partials
      await fs.writeFile(
        path.join(templateDir, "docs", "api", "guide.md.hbs"),
        "{{> layouts.page}}\n\n{{> components.toc}}",
        "utf8"
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {
          title: "API Guide",
          content: "Welcome to the API documentation",
          sections: ["Introduction", "Getting Started", "Reference"],
        },
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      const guide = await fs.readFile(
        path.join(outDir, "docs", "api", "guide.md"),
        "utf8"
      );
      assert.ok(guide.includes("# API Guide"));
      assert.ok(guide.includes("Welcome to the API documentation"));
      assert.ok(guide.includes("## Table of Contents"));
      assert.ok(guide.includes("Introduction"));
    });
  });

  it("renders with conditionals and loops", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });

      await fs.writeFile(
        path.join(templateDir, "config.hbs"),
        [
          "{{#if features.auth}}auth: enabled{{/if}}",
          "{{#each services}}",
          "- {{name}}: {{url}}",
          "{{/each}}",
        ].join("\n"),
        "utf8"
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {
          features: { auth: true },
          services: [
            { name: "api", url: "https://api.example.com" },
            { name: "web", url: "https://example.com" },
          ],
        },
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      const config = await fs.readFile(path.join(outDir, "config"), "utf8");
      assert.ok(config.includes("auth: enabled"));
      assert.ok(config.includes("- api: https://api.example.com"));
      assert.ok(config.includes("- web: https://example.com"));
    });
  });

  it("handles empty views gracefully", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });

      await fs.writeFile(
        path.join(templateDir, "static.txt.hbs"),
        "This is static content with no variables",
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
        path.join(outDir, "static.txt"),
        "utf8"
      );
      assert.strictEqual(output, "This is static content with no variables");
    });
  });

  it("preserves file extensions in output", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      await fs.mkdir(templateDir, { recursive: true });
      await fs.mkdir(partialsDir, { recursive: true });

      // Create various file types
      await fs.writeFile(
        path.join(templateDir, "config.json.hbs"),
        '{"test": true}',
        "utf8"
      );
      await fs.writeFile(
        path.join(templateDir, "README.md.hbs"),
        "# Test",
        "utf8"
      );
      await fs.writeFile(
        path.join(templateDir, "script.sh.hbs"),
        "#!/bin/bash",
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

      // Verify extensions are preserved
      await fs.access(path.join(outDir, "config.json"));
      await fs.access(path.join(outDir, "README.md"));
      await fs.access(path.join(outDir, "script.sh"));
    });
  });

  it("handles deeply nested dynamic paths", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = path.join(tmpDir, "templates");
      const partialsDir = path.join(tmpDir, "partials");
      const outDir = path.join(tmpDir, "out");

      await fs.mkdir(
        path.join(templateDir, "${org}", "${repo}", "${branch}"),
        { recursive: true }
      );
      await fs.mkdir(partialsDir, { recursive: true });

      await fs.writeFile(
        path.join(
          templateDir,
          "${org}",
          "${repo}",
          "${branch}",
          "info.txt.hbs"
        ),
        "Org: {{org}}\nRepo: {{repo}}\nBranch: {{branch}}",
        "utf8"
      );

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: {
          org: "mycompany",
          repo: "myproject",
          branch: "main",
        },
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      const info = await fs.readFile(
        path.join(outDir, "mycompany", "myproject", "main", "info.txt"),
        "utf8"
      );
      assert.strictEqual(info, "Org: mycompany\nRepo: myproject\nBranch: main");
    });
  });
});
