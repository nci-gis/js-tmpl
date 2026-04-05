---
name: doc-update
description: >
  Guides documentation creation and updates following the project's
  Single Source of Truth (SSOT) strategy. Use this skill whenever you
  add, change, or remove any user-facing feature, config option, API
  function, or architectural concept.
---

## Trigger

This skill activates whenever:

- A new feature, config option, or API function is added or changed
- Any markdown file under `docs/`, `tests/`, or the repo root is created or edited
- A user asks to "update the docs", "document X", or "add docs for Y"
- A pull request touches source code that affects public API surface

## SSOT Topic Map

Every topic has exactly ONE canonical file. Content lives there and nowhere else.

| Topic                                         | Canonical File       | Owns                                                       |
| --------------------------------------------- | -------------------- | ---------------------------------------------------------- |
| API functions, parameters, return types       | `docs/API.md`        | All exported functions, config file format, config options |
| Design principles                             | `docs/PRINCIPLES.md` | Core philosophy, principle stability levels                |
| Workflow / architecture                       | `docs/WORKFLOW.md`   | Mermaid diagrams, rendering pipeline                       |
| Motivation / vision                           | `docs/Motivation.md` | Why js-tmpl exists, positioning                            |
| Overview, install, CLI reference, quick start | `README.md`          | Project summary, CLI options table, quick start            |
| Contributing guidelines                       | `CONTRIBUTING.md`    | Dev setup, PR process, release process                     |
| Testing documentation                         | `tests/README.md`    | Test structure, coverage, how to run tests                 |
| Documentation index                           | `docs/ToC.md`        | Links to all docs (hub only, never repeats content)        |

## Decision Table: "Where does this go?"

| You are documenting...                 | Write it in                                                                               |
| -------------------------------------- | ----------------------------------------------------------------------------------------- |
| A new exported function                | `docs/API.md`                                                                             |
| A new config option or config file key | `docs/API.md`                                                                             |
| A new CLI flag                         | `README.md` (CLI Reference table) AND `docs/API.md` (if it maps to a programmatic option) |
| A new design principle                 | `docs/PRINCIPLES.md`                                                                      |
| A change to the rendering pipeline     | `docs/WORKFLOW.md`                                                                        |
| A new test pattern or test utility     | `tests/README.md`                                                                         |
| A new example                          | `examples/` directory + link from `docs/ToC.md`                                           |
| An entirely new topic                  | New file in `docs/` + register in `docs/ToC.md` (see step 6)                              |

## Procedure

### 1. Identify the canonical file

Before writing anything, consult the SSOT Topic Map above. Find the ONE file that owns your topic.

- If the topic fits an existing file: edit that file only.
- If the topic is genuinely new and does not fit any existing file: proceed to step 6.

### 2. Write content in the canonical file only

Add or update the section in the canonical source. Follow the file's existing heading structure and style.

**Style rules:**

- Use the heading hierarchy already present in the file (do not skip levels).
- Code examples use fenced blocks with language tags (`js`, `bash`, `yaml`, `handlebars`, `text`).
- Config option tables follow the `| Property | Type | Required | Default | Description |` format in `docs/API.md`.
- CLI option tables follow the `| Option | Description | Default |` format in `README.md`.

### 3. Cross-reference from other files (never duplicate)

Other files that mention the topic must LINK to the canonical source instead of repeating content.

**Correct (link):**

```markdown
See [API docs](docs/API.md#configuration-files) for the complete config file format.
```

**Wrong (duplication):**

```markdown
## Configuration Files

js-tmpl searches for config in these locations:

1. js-tmpl.config.yaml
2. js-tmpl.config.yml
   ...
```

Apply this rule to:

- `README.md` -- summarizes topics in one or two sentences, then links out.
- `docs/ToC.md` -- links only, never repeats content.
- `CONTRIBUTING.md` -- links to `docs/PRINCIPLES.md` for design philosophy, links to `tests/README.md` for testing.

### 4. Update cross-reference points

After editing a canonical file, check whether these files need a link update:

| If you changed...         | Also check / update                                                   |
| ------------------------- | --------------------------------------------------------------------- |
| `docs/API.md`             | `README.md` "Programmatic API" section, `docs/ToC.md` Reference Index |
| `docs/PRINCIPLES.md`      | `README.md` "Development Principles" section                          |
| `docs/WORKFLOW.md`        | `docs/ToC.md` "Choose Your Path" section                              |
| `README.md` (new section) | `docs/ToC.md` "Start Here" or "Reference Index"                       |
| `tests/README.md`         | `CONTRIBUTING.md` testing references                                  |
| Any file (new heading)    | `docs/ToC.md` if the heading is a major entry point                   |

### 5. Run validation

Always run after any documentation change:

```bash
pnpm docs:check
```

This runs two checks:

- **`remark-validate-links`** -- verifies all markdown links resolve (files exist, anchors exist).
- **`check-doc-exports.js`** -- verifies `docs/API.md` mentions every exported function from `src/index.js` and every config file candidate from `src/config/loader.js`.

Fix any failures before considering the task complete.

### 6. Handle new topics

If a genuinely new topic does not fit any existing canonical file:

1. Create a new file in `docs/` using naming consistent with existing files (e.g., `docs/SECURITY-MODEL.md`, `docs/Plugins.md`).
2. Register the new file in `docs/ToC.md`:
   - Add it under the most relevant "Choose Your Path" category.
   - Add it to the "Reference Index" section.
   - Keep `ToC.md` as links only -- do not add content summaries.
3. If the README should reference it, add a one-line summary + link in the "Learn More" section at the bottom of `README.md`.
4. Update the SSOT Topic Map in this skill (or flag for human review).

### 7. README discipline

The `README.md` follows strict conventions:

- **Summarize, then link.** Each topic gets at most a short paragraph or a table in README, then a link to the canonical doc.
- **CLI Reference table** is the ONE place CLI flags are fully listed in README. Keep it in sync with `docs/API.md`.
- **"Learn More" section** (bottom of README) contains two subsections:
  - `### Documentation` -- links to docs hub and individual doc files.
  - `### Others` -- links to examples, issue tracker, NPM.
- **Never expand README inline** to cover a topic that has a canonical doc. If README needs more detail, the detail belongs in the canonical file; README gets a link.

### 8. Pre-commit checklist

Before finishing any documentation task, verify:

- [ ] Content lives in exactly one canonical file (no duplication)
- [ ] Other files link to the canonical source, not copy from it
- [ ] `docs/ToC.md` is updated if a new section or file was added
- [ ] `README.md` summary is still accurate (brief + links out)
- [ ] `pnpm docs:check` passes with no errors
- [ ] New exported functions or config candidates appear in `docs/API.md`
- [ ] All markdown links use relative paths (not absolute URLs to the repo)

## Examples

### Example A: New config option `dryRun`

1. **Canonical file**: `docs/API.md` -- add `dryRun` to the `resolveConfig` parameters table.
2. **Cross-reference**: `README.md` CLI Reference table -- add `--dry-run` flag row.
3. **No duplication**: README row has a short description; full semantics are in `docs/API.md` only.
4. **Validate**: `pnpm docs:check` -- `check-doc-exports.js` will confirm the option is documented.

### Example B: New architectural doc `docs/PLUGIN-SYSTEM.md`

1. **Create** `docs/PLUGIN-SYSTEM.md` with full content.
2. **Register in `docs/ToC.md`**: add under "Choose Your Path > I want to learn how it works" and "Reference Index".
3. **README**: add one line to "Learn More > Documentation": `- [Plugin System](docs/PLUGIN-SYSTEM.md) - How to extend js-tmpl with plugins`.
4. **Validate**: `pnpm docs:check` to confirm all new links resolve.
