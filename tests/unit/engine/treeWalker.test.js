import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import { describe, it } from "node:test";

import { walkTemplateTree } from "../../../src/engine/treeWalker.js";
import { withTempDir } from "../../helpers/tempDir.js";

describe("walkTemplateTree", () => {
  it("walks single file in root", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, "test.hbs"), "content", "utf8");

      const results = await walkTemplateTree(tmpDir);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].relPath, "test.hbs");
      assert.strictEqual(results[0].absPath, path.join(tmpDir, "test.hbs"));
    });
  });

  it("walks multiple files in root", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, "a.hbs"), "a", "utf8");
      await fs.writeFile(path.join(tmpDir, "b.hbs"), "b", "utf8");

      const results = await walkTemplateTree(tmpDir);

      assert.strictEqual(results.length, 2);
      const relPaths = results.map((r) => r.relPath).sort();
      assert.deepStrictEqual(relPaths, ["a.hbs", "b.hbs"]);
    });
  });

  it("walks nested directories", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, "subdir"), { recursive: true });
      await fs.writeFile(path.join(tmpDir, "root.hbs"), "root", "utf8");
      await fs.writeFile(
        path.join(tmpDir, "subdir", "nested.hbs"),
        "nested",
        "utf8"
      );

      const results = await walkTemplateTree(tmpDir);

      assert.strictEqual(results.length, 2);
      const relPaths = results.map((r) => r.relPath).sort();
      assert.deepStrictEqual(relPaths, ["root.hbs", "subdir/nested.hbs"]);
    });
  });

  it("walks deeply nested directories", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, "a", "b", "c"), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, "a", "b", "c", "deep.hbs"),
        "deep",
        "utf8"
      );

      const results = await walkTemplateTree(tmpDir);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].relPath, "a/b/c/deep.hbs");
    });
  });

  it("filters files by extension", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, "template.hbs"), "hbs", "utf8");
      await fs.writeFile(path.join(tmpDir, "readme.md"), "md", "utf8");
      await fs.writeFile(path.join(tmpDir, "data.json"), "json", "utf8");

      const results = await walkTemplateTree(tmpDir);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].relPath, "template.hbs");
    });
  });

  it("uses custom extension", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, "template.tmpl"), "tmpl", "utf8");
      await fs.writeFile(path.join(tmpDir, "other.hbs"), "hbs", "utf8");

      const results = await walkTemplateTree(tmpDir, ".tmpl");

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].relPath, "template.tmpl");
    });
  });

  it("ignores files by exact name match", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, "include.hbs"), "inc", "utf8");
      await fs.writeFile(path.join(tmpDir, "ignore.hbs"), "ign", "utf8");

      const results = await walkTemplateTree(tmpDir, ".hbs", ["ignore.hbs"]);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].relPath, "include.hbs");
    });
  });

  it("ignores files by regex pattern", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, "file.hbs"), "file", "utf8");
      await fs.writeFile(path.join(tmpDir, "_partial.hbs"), "partial", "utf8");

      const results = await walkTemplateTree(tmpDir, ".hbs", [/^_/]);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].relPath, "file.hbs");
    });
  });

  it("ignores directories", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, "include"), { recursive: true });
      await fs.mkdir(path.join(tmpDir, "node_modules"), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, "include", "file.hbs"),
        "inc",
        "utf8"
      );
      await fs.writeFile(
        path.join(tmpDir, "node_modules", "lib.hbs"),
        "lib",
        "utf8"
      );

      const results = await walkTemplateTree(tmpDir, ".hbs", ["node_modules"]);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].relPath, "include/file.hbs");
    });
  });

  it("handles empty directory", async () => {
    await withTempDir(async (tmpDir) => {
      const results = await walkTemplateTree(tmpDir);

      assert.strictEqual(results.length, 0);
      assert.deepStrictEqual(results, []);
    });
  });

  it("handles directory with only non-matching files", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, "file.txt"), "txt", "utf8");
      await fs.writeFile(path.join(tmpDir, "file.md"), "md", "utf8");

      const results = await walkTemplateTree(tmpDir);

      assert.strictEqual(results.length, 0);
    });
  });

  it("walks breadth-first order", async () => {
    await withTempDir(async (tmpDir) => {
      // Create structure: root files first, then subdir files
      await fs.mkdir(path.join(tmpDir, "subdir"), { recursive: true });
      await fs.writeFile(path.join(tmpDir, "a.hbs"), "a", "utf8");
      await fs.writeFile(path.join(tmpDir, "b.hbs"), "b", "utf8");
      await fs.writeFile(
        path.join(tmpDir, "subdir", "c.hbs"),
        "c",
        "utf8"
      );

      const results = await walkTemplateTree(tmpDir);

      // BFS should find root files before subdir files
      assert.strictEqual(results.length, 3);
      const rootFiles = results.filter((r) => !r.relPath.includes("/"));
      assert.strictEqual(rootFiles.length, 2);
    });
  });

  it("ignores multiple patterns", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, "file.hbs"), "file", "utf8");
      await fs.writeFile(path.join(tmpDir, "_partial.hbs"), "partial", "utf8");
      await fs.writeFile(path.join(tmpDir, "test.hbs"), "test", "utf8");

      const results = await walkTemplateTree(tmpDir, ".hbs", [
        /^_/,
        "test.hbs",
      ]);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].relPath, "file.hbs");
    });
  });

  it("handles mixed file extensions in nested structure", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, "templates"), { recursive: true });
      await fs.mkdir(path.join(tmpDir, "docs"), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, "templates", "page.hbs"),
        "hbs",
        "utf8"
      );
      await fs.writeFile(
        path.join(tmpDir, "docs", "readme.md"),
        "md",
        "utf8"
      );

      const results = await walkTemplateTree(tmpDir);

      assert.strictEqual(results.length, 1);
      assert.strictEqual(results[0].relPath, "templates/page.hbs");
    });
  });
});
