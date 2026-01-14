import fs from "node:fs/promises";
import Handlebars from "handlebars";

/**
 * Render template file with Handlebars & view object.
 */
export async function renderContent(filePath, view) {
  const raw = await fs.readFile(filePath, "utf8");
  const compile = Handlebars.compile(raw);
  return compile(view);
}
