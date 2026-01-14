import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import path from "node:path";
import fs from "node:fs/promises";
import Handlebars from "handlebars";
import { renderDirectory } from "../../src/engine/renderDirectory.js";
import { getFixturePath } from "../helpers/fixtures.js";
import { withTempDir } from "../helpers/tempDir.js";
import { loadYamlOrJson } from "../../src/config/loader.js";

describe("Integration: Fixture-based Rendering", () => {
  beforeEach(() => {
    Handlebars.unregisterPartial(/.*/);
  });

  it("renders complete project from fixture templates", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = getFixturePath("project-template/templates");
      const partialsDir = getFixturePath("project-template/partials");
      const valuesFile = getFixturePath("project-template/values/defaults.yaml");
      const outDir = path.join(tmpDir, "output");

      // Load values
      const values = loadYamlOrJson(valuesFile);

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: values,
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      // Verify key outputs
      const packageJson = await fs.readFile(
        path.join(outDir, "package.json"),
        "utf8"
      );
      const pkg = JSON.parse(packageJson);
      assert.strictEqual(pkg.name, "example-app");
      assert.strictEqual(pkg.version, "1.0.0");
      assert.strictEqual(pkg.license, "MIT");

      // Verify nested structure
      const indexJs = await fs.readFile(
        path.join(outDir, "src", "index.js"),
        "utf8"
      );
      assert.ok(indexJs.includes("Starting example-app"));
      assert.ok(indexJs.includes("console.log"));

      // Verify config files
      const appConfig = await fs.readFile(
        path.join(outDir, "config", "app.json"),
        "utf8"
      );
      const config = JSON.parse(appConfig);
      assert.strictEqual(config.host, "localhost");
      assert.strictEqual(config.port, 3000);
      assert.strictEqual(config.debug, false);

      // Verify docs
      const apiDocs = await fs.readFile(
        path.join(outDir, "docs", "API.md"),
        "utf8"
      );
      assert.ok(apiDocs.includes("# example-app API Documentation"));
      assert.ok(apiDocs.includes("https://api.example.com"));

      // Verify README with partials
      const readme = await fs.readFile(
        path.join(outDir, "README.md"),
        "utf8"
      );
      assert.ok(readme.includes("# example-app"));
      assert.ok(readme.includes("An example application"));
      assert.ok(readme.includes("Version: 1.0.0"));
      assert.ok(readme.includes("## Navigation"));
      assert.ok(readme.includes("Generated with js-tmpl"));
    });
  });

  it("renders with custom values overriding defaults", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = getFixturePath("project-template/templates");
      const partialsDir = getFixturePath("project-template/partials");
      const outDir = path.join(tmpDir, "output");

      // Custom values
      const customValues = {
        project: {
          name: "custom-project",
          version: "2.0.0",
          description: "Custom description",
          author: "Jane Smith",
          license: "Apache-2.0",
        },
        config: {
          port: 8080,
          host: "0.0.0.0",
          debug: true,
        },
        database: {
          type: "mysql",
          host: "db.example.com",
          port: 3306,
          name: "production",
        },
        features: {
          auth: false,
          api: true,
          frontend: false,
        },
        services: [
          { name: "api", url: "https://api.custom.com", enabled: true },
        ],
      };

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: customValues,
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      // Verify customizations
      const packageJson = await fs.readFile(
        path.join(outDir, "package.json"),
        "utf8"
      );
      const pkg = JSON.parse(packageJson);
      assert.strictEqual(pkg.name, "custom-project");
      assert.strictEqual(pkg.version, "2.0.0");
      assert.strictEqual(pkg.author, "Jane Smith");

      const appConfig = await fs.readFile(
        path.join(outDir, "config", "app.json"),
        "utf8"
      );
      const config = JSON.parse(appConfig);
      assert.strictEqual(config.port, 8080);
      assert.strictEqual(config.debug, true);
      assert.strictEqual(config.database.type, "mysql");
    });
  });

  it("handles missing optional values gracefully", async () => {
    await withTempDir(async (tmpDir) => {
      const templateDir = getFixturePath("project-template/templates");
      const partialsDir = getFixturePath("project-template/partials");
      const outDir = path.join(tmpDir, "output");

      // Minimal required values
      const minimalValues = {
        project: {
          name: "minimal-app",
          version: "0.1.0",
          description: "Minimal",
          author: "Test",
          license: "MIT",
        },
        config: {
          port: 3000,
          host: "localhost",
          debug: false,
        },
        database: {
          type: "sqlite",
          host: "localhost",
          port: 0,
          name: "db.sqlite",
        },
        features: {
          auth: false,
          api: false,
          frontend: false,
        },
        services: [],
        content: "Minimal content",
      };

      const cfg = {
        templateDir,
        partialsDir,
        outDir,
        view: minimalValues,
        extname: ".hbs",
      };

      await renderDirectory(cfg);

      // Should render without errors
      const packageJson = await fs.readFile(
        path.join(outDir, "package.json"),
        "utf8"
      );
      const pkg = JSON.parse(packageJson);
      assert.strictEqual(pkg.name, "minimal-app");
    });
  });
});
