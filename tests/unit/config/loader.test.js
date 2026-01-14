import { describe, it } from "node:test";
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  loadYamlOrJson,
  loadProjectConfig,
} from "../../../src/config/loader.js";
import { getFixturePath } from "../../helpers/fixtures.js";
import { withTempDir } from "../../helpers/tempDir.js";
import fs from "node:fs/promises";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe("loadYamlOrJson", () => {
  it("loads YAML file with .yaml extension", () => {
    const filePath = getFixturePath("config/values.yaml");
    const data = loadYamlOrJson(filePath);

    assert.strictEqual(data.name, "test-app");
    assert.strictEqual(data.version, "1.0.0");
    assert.deepStrictEqual(data.config, { port: 3000, debug: true });
  });

  it("loads YAML file with .yml extension", async () => {
    await withTempDir(async (tmpDir) => {
      const ymlFile = path.join(tmpDir, "test.yml");
      await fs.writeFile(ymlFile, "key: value\nnumber: 42", "utf8");

      const data = loadYamlOrJson(ymlFile);
      assert.strictEqual(data.key, "value");
      assert.strictEqual(data.number, 42);
    });
  });

  it("loads JSON file", () => {
    const filePath = getFixturePath("config/values.json");
    const data = loadYamlOrJson(filePath);

    assert.strictEqual(data.name, "json-app");
    assert.strictEqual(data.version, "2.0.0");
    assert.strictEqual(data.enabled, true);
  });

  it("handles empty YAML file", () => {
    const filePath = getFixturePath("config/empty.yaml");
    const data = loadYamlOrJson(filePath);

    assert.deepStrictEqual(data, {});
  });

  it("throws error for unsupported file extension", async () => {
    await withTempDir(async (tmpDir) => {
      const txtFile = path.join(tmpDir, "test.txt");
      await fs.writeFile(txtFile, "content", "utf8");

      assert.throws(
        () => loadYamlOrJson(txtFile),
        /Unsupported values file/
      );
    });
  });

  it("throws error for non-existent file", () => {
    assert.throws(
      () => loadYamlOrJson("/non/existent/file.yaml"),
      /ENOENT/
    );
  });

  it("throws error for invalid YAML syntax", async () => {
    await withTempDir(async (tmpDir) => {
      const yamlFile = path.join(tmpDir, "invalid.yaml");
      await fs.writeFile(yamlFile, "key: [unclosed", "utf8");

      assert.throws(
        () => loadYamlOrJson(yamlFile),
        Error
      );
    });
  });

  it("throws error for invalid JSON syntax", async () => {
    await withTempDir(async (tmpDir) => {
      const jsonFile = path.join(tmpDir, "invalid.json");
      await fs.writeFile(jsonFile, "{invalid json}", "utf8");

      assert.throws(
        () => loadYamlOrJson(jsonFile),
        SyntaxError
      );
    });
  });

  it("handles case-insensitive YAML extension", async () => {
    await withTempDir(async (tmpDir) => {
      const yamlFile = path.join(tmpDir, "test.YAML");
      await fs.writeFile(yamlFile, "upper: case", "utf8");

      const data = loadYamlOrJson(yamlFile);
      assert.strictEqual(data.upper, "case");
    });
  });
});

describe("loadProjectConfig", () => {
  it("loads js-tmpl.config.yaml from cwd", async () => {
    await withTempDir(async (tmpDir) => {
      const configPath = path.join(tmpDir, "js-tmpl.config.yaml");
      await fs.writeFile(
        configPath,
        "templateDir: my-templates\noutDir: my-output",
        "utf8"
      );

      const config = loadProjectConfig(tmpDir);
      assert.strictEqual(config.templateDir, "my-templates");
      assert.strictEqual(config.outDir, "my-output");
    });
  });

  it("loads js-tmpl.config.yml from cwd", async () => {
    await withTempDir(async (tmpDir) => {
      const configPath = path.join(tmpDir, "js-tmpl.config.yml");
      await fs.writeFile(configPath, "templateDir: yml-templates", "utf8");

      const config = loadProjectConfig(tmpDir);
      assert.strictEqual(config.templateDir, "yml-templates");
    });
  });

  it("loads js-tmpl.config.json from cwd", async () => {
    await withTempDir(async (tmpDir) => {
      const configPath = path.join(tmpDir, "js-tmpl.config.json");
      await fs.writeFile(
        configPath,
        JSON.stringify({ templateDir: "json-templates" }),
        "utf8"
      );

      const config = loadProjectConfig(tmpDir);
      assert.strictEqual(config.templateDir, "json-templates");
    });
  });

  it("loads config/js-tmpl.yaml from cwd", async () => {
    await withTempDir(async (tmpDir) => {
      const configDir = path.join(tmpDir, "config");
      await fs.mkdir(configDir, { recursive: true });
      const configPath = path.join(configDir, "js-tmpl.yaml");
      await fs.writeFile(configPath, "templateDir: config-yaml", "utf8");

      const config = loadProjectConfig(tmpDir);
      assert.strictEqual(config.templateDir, "config-yaml");
    });
  });

  it("loads config/js-tmpl.json from cwd", async () => {
    await withTempDir(async (tmpDir) => {
      const configDir = path.join(tmpDir, "config");
      await fs.mkdir(configDir, { recursive: true });
      const configPath = path.join(configDir, "js-tmpl.json");
      await fs.writeFile(
        configPath,
        JSON.stringify({ templateDir: "config-json" }),
        "utf8"
      );

      const config = loadProjectConfig(tmpDir);
      assert.strictEqual(config.templateDir, "config-json");
    });
  });

  it("returns null when no config file found", async () => {
    await withTempDir(async (tmpDir) => {
      const config = loadProjectConfig(tmpDir);
      assert.strictEqual(config, null);
    });
  });

  it("loads explicit config file when provided", async () => {
    await withTempDir(async (tmpDir) => {
      const customConfig = path.join(tmpDir, "custom.yaml");
      await fs.writeFile(customConfig, "templateDir: explicit", "utf8");

      const config = loadProjectConfig(tmpDir, customConfig);
      assert.strictEqual(config.templateDir, "explicit");
    });
  });

  it("handles absolute path for explicit config file", async () => {
    await withTempDir(async (tmpDir) => {
      const customConfig = path.join(tmpDir, "absolute.yaml");
      await fs.writeFile(customConfig, "templateDir: absolute-path", "utf8");

      const config = loadProjectConfig(tmpDir, customConfig);
      assert.strictEqual(config.templateDir, "absolute-path");
    });
  });

  it("returns empty object for empty YAML config", async () => {
    await withTempDir(async (tmpDir) => {
      const configPath = path.join(tmpDir, "js-tmpl.config.yaml");
      await fs.writeFile(configPath, "# empty", "utf8");

      const config = loadProjectConfig(tmpDir);
      assert.deepStrictEqual(config, {});
    });
  });

  it("prioritizes js-tmpl.config.yaml over other candidates", async () => {
    await withTempDir(async (tmpDir) => {
      // Create multiple config files
      await fs.writeFile(
        path.join(tmpDir, "js-tmpl.config.yaml"),
        "templateDir: yaml-file",
        "utf8"
      );
      await fs.writeFile(
        path.join(tmpDir, "js-tmpl.config.json"),
        JSON.stringify({ templateDir: "json-file" }),
        "utf8"
      );

      const config = loadProjectConfig(tmpDir);
      // Should load .yaml first
      assert.strictEqual(config.templateDir, "yaml-file");
    });
  });
});
