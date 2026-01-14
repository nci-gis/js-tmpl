import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the path to a fixture
 * @param {string} name Fixture name
 * @returns {string} Path to fixture
 */
export function getFixturePath(name) {
  return path.join(__dirname, "..", "fixtures", name);
}

/**
 * Load a fixture file as text
 * @param {string} fixturePath Relative path from fixtures directory
 * @returns {Promise<string>} File contents
 */
export async function loadFixture(fixturePath) {
  const fullPath = path.join(__dirname, "..", "fixtures", fixturePath);
  return await fs.readFile(fullPath, "utf8");
}

/**
 * Copy a fixture directory to a destination
 * @param {string} fixtureName Fixture name
 * @param {string} dest Destination path
 */
export async function copyFixture(fixtureName, dest) {
  const src = getFixturePath(fixtureName);
  await fs.cp(src, dest, { recursive: true });
}
