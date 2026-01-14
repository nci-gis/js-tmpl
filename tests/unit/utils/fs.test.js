import { describe, it } from "node:test";
import assert from "node:assert";
import fs from "node:fs/promises";
import path from "node:path";
import {
  ensureDir,
  writeFileSafe,
  resolvePath,
  safeResolvePath,
} from "../../../src/utils/fs.js";
import { withTempDir } from "../../helpers/tempDir.js";

describe("ensureDir", () => {
  it("creates a new directory", async () => {
    await withTempDir(async (tmpDir) => {
      const newDir = path.join(tmpDir, "test-dir");
      await ensureDir(newDir);

      const stats = await fs.stat(newDir);
      assert.ok(stats.isDirectory());
    });
  });

  it("creates nested directories", async () => {
    await withTempDir(async (tmpDir) => {
      const nestedDir = path.join(tmpDir, "a", "b", "c");
      await ensureDir(nestedDir);

      const stats = await fs.stat(nestedDir);
      assert.ok(stats.isDirectory());
    });
  });

  it("succeeds if directory already exists", async () => {
    await withTempDir(async (tmpDir) => {
      const newDir = path.join(tmpDir, "test-dir");
      await ensureDir(newDir);

      // Call again - should not throw
      await ensureDir(newDir);

      const stats = await fs.stat(newDir);
      assert.ok(stats.isDirectory());
    });
  });
});

describe("writeFileSafe", () => {
  it("writes content to a file", async () => {
    await withTempDir(async (tmpDir) => {
      const filePath = path.join(tmpDir, "test.txt");
      const content = "Hello, World!";

      await writeFileSafe(filePath, content);

      const readContent = await fs.readFile(filePath, "utf8");
      assert.strictEqual(readContent, content);
    });
  });

  it("writes empty string", async () => {
    await withTempDir(async (tmpDir) => {
      const filePath = path.join(tmpDir, "empty.txt");

      await writeFileSafe(filePath, "");

      const readContent = await fs.readFile(filePath, "utf8");
      assert.strictEqual(readContent, "");
    });
  });

  it("overwrites existing file", async () => {
    await withTempDir(async (tmpDir) => {
      const filePath = path.join(tmpDir, "test.txt");

      await writeFileSafe(filePath, "first");
      await writeFileSafe(filePath, "second");

      const readContent = await fs.readFile(filePath, "utf8");
      assert.strictEqual(readContent, "second");
    });
  });

  it("writes multi-line content", async () => {
    await withTempDir(async (tmpDir) => {
      const filePath = path.join(tmpDir, "multiline.txt");
      const content = "line1\nline2\nline3";

      await writeFileSafe(filePath, content);

      const readContent = await fs.readFile(filePath, "utf8");
      assert.strictEqual(readContent, content);
    });
  });
});

describe("resolvePath", () => {
  it("returns absolute path unchanged", () => {
    const absolutePath = "/home/user/project";
    const result = resolvePath(absolutePath);
    assert.strictEqual(result, absolutePath);
  });

  it("resolves relative path against cwd", () => {
    const relativePath = "src/index.js";
    const cwd = "/home/user/project";
    const result = resolvePath(relativePath, cwd);
    assert.strictEqual(result, path.join(cwd, relativePath));
  });

  it("resolves relative path against process.cwd() when cwd not provided", () => {
    const relativePath = "src/index.js";
    const result = resolvePath(relativePath);
    assert.strictEqual(result, path.join(process.cwd(), relativePath));
  });

  it("handles dot notation in relative path", () => {
    const relativePath = "./src/index.js";
    const cwd = "/home/user/project";
    const result = resolvePath(relativePath, cwd);
    assert.strictEqual(result, path.join(cwd, relativePath));
  });

  it("handles parent directory notation", () => {
    const relativePath = "../other-project";
    const cwd = "/home/user/project";
    const result = resolvePath(relativePath, cwd);
    assert.strictEqual(result, path.join(cwd, relativePath));
  });
});

describe("safeResolvePath", () => {
  it("resolves absolute path with multiple segments", () => {
    const result = safeResolvePath("/home/user", "project", "src");
    assert.strictEqual(result, path.resolve("/home/user", "project", "src"));
  });

  it("resolves relative path against process.cwd()", () => {
    const result = safeResolvePath("src", "index.js");
    assert.strictEqual(result, path.resolve(process.cwd(), "src", "index.js"));
  });

  it("handles single absolute segment", () => {
    const result = safeResolvePath("/home/user/project");
    assert.strictEqual(result, "/home/user/project");
  });

  it("handles single relative segment", () => {
    const result = safeResolvePath("src");
    assert.strictEqual(result, path.resolve(process.cwd(), "src"));
  });

  it("handles empty segments in relative path", () => {
    const result = safeResolvePath("src", "", "index.js");
    assert.strictEqual(result, path.resolve(process.cwd(), "src", "", "index.js"));
  });

  it("normalizes path with parent directory references", () => {
    const result = safeResolvePath("/home/user/project", "..", "other");
    assert.strictEqual(result, path.resolve("/home/user/project", "..", "other"));
  });

  it("handles dot notation in segments", () => {
    const result = safeResolvePath("./src", "./utils");
    assert.strictEqual(result, path.resolve(process.cwd(), "./src", "./utils"));
  });
});
