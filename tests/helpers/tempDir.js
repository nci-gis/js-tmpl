import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

/**
 * Create a temporary directory for tests
 * @returns {Promise<string>} Path to temporary directory
 */
export async function createTempDir() {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "js-tmpl-test-"));
  return tmpDir;
}

/**
 * Remove a temporary directory and all its contents
 * @param {string} dir Path to directory to remove
 */
export async function removeTempDir(dir) {
  await fs.rm(dir, { recursive: true, force: true });
}

/**
 * Create a temporary directory with automatic cleanup
 * @param {Function} callback Function to run with temp dir
 * @returns {Promise<any>} Result of callback
 */
export async function withTempDir(callback) {
  const dir = await createTempDir();
  try {
    return await callback(dir);
  } finally {
    await removeTempDir(dir);
  }
}
