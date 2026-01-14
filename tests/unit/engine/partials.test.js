import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import path from "node:path";
import fs from "node:fs/promises";
import Handlebars from "handlebars";
import { registerPartials } from "../../../src/engine/partials.js";
import { withTempDir } from "../../helpers/tempDir.js";

describe("registerPartials", () => {
  beforeEach(() => {
    // Clear all registered partials before each test
    Handlebars.unregisterPartial(/.*/)
  });

  it("registers root partial with underscore prefix", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, "_header.hbs"),
        "Header Content",
        "utf8"
      );

      await registerPartials(tmpDir);

      const partial = Handlebars.partials["header"];
      assert.ok(partial);
      assert.strictEqual(partial, "Header Content");
    });
  });

  it("registers multiple root partials", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, "_header.hbs"),
        "Header",
        "utf8"
      );
      await fs.writeFile(
        path.join(tmpDir, "_footer.hbs"),
        "Footer",
        "utf8"
      );

      await registerPartials(tmpDir);

      assert.strictEqual(Handlebars.partials["header"], "Header");
      assert.strictEqual(Handlebars.partials["footer"], "Footer");
    });
  });

  it("registers namespaced partial in @group directory", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, "@components"), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, "@components", "button.hbs"),
        "Button",
        "utf8"
      );

      await registerPartials(tmpDir);

      const partial = Handlebars.partials["components.button"];
      assert.ok(partial);
      assert.strictEqual(partial, "Button");
    });
  });

  it("registers multiple partials in same @group", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, "@ui"), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, "@ui", "button.hbs"),
        "Button",
        "utf8"
      );
      await fs.writeFile(
        path.join(tmpDir, "@ui", "input.hbs"),
        "Input",
        "utf8"
      );

      await registerPartials(tmpDir);

      assert.strictEqual(Handlebars.partials["ui.button"], "Button");
      assert.strictEqual(Handlebars.partials["ui.input"], "Input");
    });
  });

  it("registers partials from multiple @group directories", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, "@components"), { recursive: true });
      await fs.mkdir(path.join(tmpDir, "@layouts"), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, "@components", "card.hbs"),
        "Card",
        "utf8"
      );
      await fs.writeFile(
        path.join(tmpDir, "@layouts", "main.hbs"),
        "Main",
        "utf8"
      );

      await registerPartials(tmpDir);

      assert.strictEqual(Handlebars.partials["components.card"], "Card");
      assert.strictEqual(Handlebars.partials["layouts.main"], "Main");
    });
  });

  it("ignores non-underscore files in root", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, "regular.hbs"), "Regular", "utf8");
      await fs.writeFile(
        path.join(tmpDir, "_partial.hbs"),
        "Partial",
        "utf8"
      );

      await registerPartials(tmpDir);

      assert.ok(Handlebars.partials["partial"]);
      assert.ok(!Handlebars.partials["regular"]);
    });
  });

  it("ignores non-.hbs files in root", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(path.join(tmpDir, "_readme.md"), "Readme", "utf8");
      await fs.writeFile(
        path.join(tmpDir, "_partial.hbs"),
        "Partial",
        "utf8"
      );

      await registerPartials(tmpDir);

      assert.ok(Handlebars.partials["partial"]);
      assert.ok(!Handlebars.partials["readme"]);
    });
  });

  it("ignores non-extension files in @group", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, "@components"), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, "@components", "button.hbs"),
        "Button",
        "utf8"
      );
      await fs.writeFile(
        path.join(tmpDir, "@components", "readme.md"),
        "Readme",
        "utf8"
      );

      await registerPartials(tmpDir);

      assert.ok(Handlebars.partials["components.button"]);
      assert.ok(!Handlebars.partials["components.readme"]);
    });
  });

  it("uses custom extension", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, "_header.tmpl"),
        "Header",
        "utf8"
      );

      await registerPartials(tmpDir, ".tmpl");

      assert.strictEqual(Handlebars.partials["header"], "Header");
    });
  });

  it("ignores regular directories without @ prefix", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, "regular"), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, "regular", "file.hbs"),
        "File",
        "utf8"
      );

      await registerPartials(tmpDir);

      assert.ok(!Handlebars.partials["regular.file"]);
    });
  });

  it("handles empty partials directory", async () => {
    await withTempDir(async (tmpDir) => {
      await registerPartials(tmpDir);
      // Should not throw, just register nothing
      assert.ok(true);
    });
  });

  it("strips extension from partial name", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, "_component.hbs"),
        "Component",
        "utf8"
      );

      await registerPartials(tmpDir);

      // Should be registered as "component", not "component.hbs"
      assert.strictEqual(Handlebars.partials["component"], "Component");
      assert.ok(!Handlebars.partials["component.hbs"]);
    });
  });

  it("can use registered partials in templates", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, "_greeting.hbs"),
        "Hello {{name}}!",
        "utf8"
      );

      await registerPartials(tmpDir);

      const template = Handlebars.compile("{{> greeting}}");
      const result = template({ name: "World" });

      assert.strictEqual(result, "Hello World!");
    });
  });

  it("can use namespaced partials in templates", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.mkdir(path.join(tmpDir, "@ui"), { recursive: true });
      await fs.writeFile(
        path.join(tmpDir, "@ui", "alert.hbs"),
        "Alert: {{message}}",
        "utf8"
      );

      await registerPartials(tmpDir);

      const template = Handlebars.compile("{{> ui.alert}}");
      const result = template({ message: "Success" });

      assert.strictEqual(result, "Alert: Success");
    });
  });

  it("handles partials with complex handlebars syntax", async () => {
    await withTempDir(async (tmpDir) => {
      await fs.writeFile(
        path.join(tmpDir, "_list.hbs"),
        "{{#each items}}{{this}},{{/each}}",
        "utf8"
      );

      await registerPartials(tmpDir);

      const template = Handlebars.compile("Items: {{> list}}");
      const result = template({ items: ["a", "b", "c"] });

      assert.strictEqual(result, "Items: a,b,c,");
    });
  });
});
