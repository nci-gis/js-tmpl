import path from "node:path";

import { getNested } from "../utils/object.js";

/**
 * Render `${var}` placeholders in each segment of the relPath.
 */
export function renderPath(relPath, view) {
  const segments = relPath.split(path.sep);

  const rendered = segments.map((seg) =>
    //NOSONAR -- ignore S5842: Regular expression is safe here
    seg.replace(/\$\{([^}]+)\}/g, (_, expr) => {
      const v = getNested(view, expr.trim());
      return String(v ?? "");
    })
  );

  return path.join(...rendered);
}
