# js-tmpl Project Context

## Project Overview

**js-tmpl** (JavaScript Template) is a lightweight, deterministic file templating engine built on Handlebars. It generates files and directory structures from templates with predictable, explicit behavior.

**Version:** 0.0.1
**Author:** pasxd245
**License:** MIT
**Node Version:** ≥ 20
**Type:** ES Module

## Core Philosophy

### Engine-First Design

- The **engine is the primary product**, not the CLI
- CLI is a thin wrapper around the engine API
- Everything CLI does must be possible programmatically
- Designed for embedding into other tools (e.g., x-devops, CoSF-AWF)

### Deterministic & Explicit

js-tmpl **does NOT**:

- Auto-detect project roots
- Infer "smart defaults" from filesystem layout
- Guess user intent
- Use hidden conventions or magic

js-tmpl **DOES**:

- Resolve all paths from `process.cwd()`
- Control behavior via explicit config + CLI overrides
- Document precedence rules clearly
- Provide predictable, repeatable output

### What It Is & Isn't

**js-tmpl IS:**

- A rendering engine
- Deterministic and composable
- Embeddable in larger systems
- Suitable for DevOps, scaffolding, and codegen

**js-tmpl IS NOT:**

- A workflow tool
- A project manager
- A config framework
- A DSL with hidden conventions

## Architecture

### Separation of Concerns

Each layer has **one responsibility only**:

| Layer                | Responsibility                               | Location                                                       |
| -------------------- | -------------------------------------------- | -------------------------------------------------------------- |
| **Config Resolver**  | Merge defaults, project config, and CLI args | [src/config/resolver.js](src/config/resolver.js)               |
| **View Builder**     | Build render context from values + env       | [src/config/view.js](src/config/view.js)                       |
| **Tree Walker**      | Discover template files (BFS, async)         | [src/engine/treeWalker.js](src/engine/treeWalker.js)           |
| **Path Renderer**    | Render `${var}` in file/folder paths         | [src/engine/pathRenderer.js](src/engine/pathRenderer.js)       |
| **Content Renderer** | Render Handlebars content                    | [src/engine/contentRenderer.js](src/engine/contentRenderer.js) |
| **Partials Manager** | Register/unregister Handlebars partials      | [src/engine/partials.js](src/engine/partials.js)               |
| **Orchestrator**     | Coordinate the entire render pass            | [src/engine/renderDirectory.js](src/engine/renderDirectory.js) |

### Folder Structure

```bash
src/
├── cli/              # CLI argument parsing and entry point
│   ├── args.js       # Hand-written CLI arg parser (no yargs yet)
│   └── main.js       # CLI entry point
├── config/           # Configuration resolution
│   ├── defaults.js   # Internal fallback defaults
│   ├── loader.js     # YAML/JSON config loaders
│   ├── resolver.js   # Config precedence resolver
│   └── view.js       # View model builder
├── engine/           # Core rendering engine
│   ├── contentRenderer.js  # Handlebars content rendering
│   ├── partials.js         # Partial registration system
│   ├── pathRenderer.js     # Path placeholder rendering
│   ├── renderDirectory.js  # Main orchestrator
│   └── treeWalker.js       # BFS template tree walker
├── utils/            # Shared utilities
│   ├── fs.js         # Filesystem helpers
│   └── object.js     # Nested object access
└── index.js          # Public API exports
```

## Configuration System

### Configuration Precedence

Strict precedence order (higher overrides lower):

```plaintext
CLI arguments
   > Project config file
      > Internal defaults
```

### Project Config Discovery

Auto-discovered locations (in order):

1. `js-tmpl.config.yaml`
2. `js-tmpl.config.json`
3. `config/js-tmpl.yaml`
4. `config/js-tmpl.json`

Alternatively, provide explicit config via CLI: `--config path/to/config.yaml`

### Internal Defaults

Implemented in [src/config/defaults.js](src/config/defaults.js):

```javascript
{
  templateDir: "templates",
  partialsDir: "templates.partials",
  outDir: "dist",
  extname: ".hbs"
}
```

### Required Configuration

- **valuesFile**: Must be provided via `--values` CLI flag or config file
  - Supports YAML or JSON
  - Contains data for template rendering

## View Model

The view is the object passed to the template engine:

```javascript
view = {
  ...valuesFromYamlOrJson,  // User-provided data
  env: process.env          // Environment variables
}
```

**Usage Examples:**

In Handlebars content:

```handlebars
{{env.NODE_ENV}}
{{service.name}}
{{#each tables}}
  export class {{name}}Model {}
{{/each}}
```

In file paths:

```plaintext
templates/${service.name}/deployment-${env.NODE_ENV}.yaml.hbs
```

The engine **never mutates** the view object.

## Template System

### Template Files

- Located under `templateDir` (default: `templates/`)
- Extension configurable via `extname` (default: `.hbs`)
- Paths may contain `${var}` placeholders
- Content uses Handlebars syntax

**Example:**

```plaintext
templates/
├── ${service.name}/
│   ├── index-${env.NODE_ENV}.js.hbs
│   └── README.md.hbs
└── shared/
    └── config.json.hbs
```

### Partial System

Located under `partialsDir` (default: `templates.partials/`)

**Naming Conventions:**

1. **Root partials**: `_name.hbs` → `{{> name}}`

   ```plaintext
   templates.partials/
   └── _header.hbs  → {{> header}}
   ```

2. **Namespaced partials**: `@group/name.hbs` → `{{> group.name}}`

   ```plaintext
   templates.partials/
   └── @components/
       ├── button.hbs    → {{> components.button}}
       └── input.hbs     → {{> components.input}}
   ```

**Lifecycle:**

- Registered before rendering starts
- Scoped to the render lifecycle
- Engine-managed (not globally polluted)

## Rendering Process

### 1. Tree Walking ([src/engine/treeWalker.js](src/engine/treeWalker.js))

- **Strategy**: Breadth-First Search (BFS)
- **Async**: Non-blocking filesystem operations
- **No recursion**: Queue-based iteration
- **Returns**: `{ absPath, relPath }` for each template file

**Characteristics:**

- Applies ignore rules
- No rendering logic (pure discovery)
- Extensible for future filtering

### 2. Path Rendering ([src/engine/pathRenderer.js](src/engine/pathRenderer.js))

- **Independent** of Handlebars
- Renders `${var}` placeholders in paths
- Operates per path segment

**Rules:**

- Nested access supported: `${a.b.c}`
- Missing values resolve to empty string `""`
- No glob expansion
- No magic or auto-coercion

**Example:**

```javascript
renderPath("${service.name}/config-${env.NODE_ENV}.yaml.hbs", view)
// → "api-gateway/config-production.yaml.hbs"
```

### 3. Content Rendering ([src/engine/contentRenderer.js](src/engine/contentRenderer.js))

- Uses **Handlebars** as the template engine
- Helpers registered explicitly (extensible)
- Supports all Handlebars features: loops, conditionals, partials

**Example:**

```handlebars
{{#each tables}}
export class {{name}}Model {
  constructor() {
    this.tableName = "{{tableName}}";
  }
}
{{/each}}
```

### 4. Orchestration ([src/engine/renderDirectory.js](src/engine/renderDirectory.js))

Main rendering coordinator:

1. Register partials from `partialsDir`
2. Walk template tree
3. For each template file:
   - Render path with view context
   - Strip template extension (`.hbs`)
   - Render content with Handlebars
   - Write to `outDir`

## CLI Usage

### Current v0.0.1 CLI

**Single command:** `render`

```bash
js-tmpl render --values values.yaml --out dist
```

**Characteristics:**

- Minimal, hand-written argument parser
- No heavy dependencies (no `yargs` yet)
- Maps user input → engine config
- Reports success/failure

**Future:** May adopt `yargs` when complexity grows.

## Repeat Rendering (Future-Ready)

js-tmpl is designed to support repeat rendering without architectural changes:

### Content Repeat (Already Supported)

Via Handlebars helpers:

```handlebars
{{#each items}}
  // repeated content
{{/each}}
```

### File/Directory Repeat (Planned)

Via multi-pass orchestration:

```javascript
for (const table of view.tables) {
  await renderDirectory({
    ...config,
    view: { ...view, table }
  });
}
```

**Requires:**

- No changes to tree walker
- No changes to path renderer
- Only orchestration logic changes

## Development

### Dependencies

```json
{
  "handlebars": "^4.7.8",     // Template engine
  "js-yaml": "^4.1.1",        // YAML config support
  "config": "^4.1.1",         // Config management
  "lodash": "^4.17.21"        // Utilities
}
```

### Scripts

```bash
pnpm test      # Run tests
pnpm start     # Run CLI
pnpm dev       # Development mode
pnpm help      # Show CLI help
```

### Testing

Current test: [tests/test-template-config.js](tests/test-template-config.js)

## Key Implementation Details

### Path Resolution

All paths resolve from `process.cwd()` unless absolute:

```javascript
const abs = (p) => (path.isAbsolute(p) ? p : path.join(cwd, p));
```

### View Building

Simple merge pattern in [src/config/view.js](src/config/view.js):

```javascript
export function buildView(values) {
  return {
    ...values,
    env: process.env
  };
}
```

### Async File Writing

Uses safe write patterns in [src/utils/fs.js](src/utils/fs.js):

- Ensures parent directories exist
- Atomic writes where possible
- Proper error handling

## Design Principles Summary

1. **Engine > CLI**: Core is the engine, CLI is a thin wrapper
2. **Explicit > Implicit**: No magic, no hidden defaults
3. **Composable > Monolithic**: Small, focused layers
4. **Deterministic > Smart**: Predictable over clever
5. **Embeddable > Standalone**: Designed to be integrated

## Long-Term Vision

js-tmpl is designed to:

- Remain simple at v0.0.1
- Grow features without breaking core assumptions
- Serve as the **Transform Layer** in higher-level systems
- Integrate cleanly with orchestration frameworks (e.g., CoSF-AWF)
- Support both standalone and embedded use cases

## Integration Notes

When embedding js-tmpl into other tools:

1. Import the engine API:

   ```javascript
   import { resolveConfig, renderDirectory } from 'js-tmpl';
   ```

2. Build config programmatically:

   ```javascript
   const cfg = resolveConfig({
     valuesFile: './values.yaml',
     templateDir: './templates',
     outDir: './output'
   });
   ```

3. Execute rendering:

   ```javascript
   await renderDirectory(cfg);
   ```

## Current Status (v0.0.1)

**Implemented:**

- ✅ Config resolution with precedence
- ✅ BFS tree walker
- ✅ Path placeholder rendering (`${var}`)
- ✅ Handlebars content rendering
- ✅ Partial system (root + namespaced)
- ✅ View model with env access
- ✅ Basic CLI with render command

**Not Yet Implemented:**

- ❌ Advanced CLI (yargs-based)
- ❌ Multi-pass rendering orchestration
- ❌ Custom Handlebars helpers registration API
- ❌ Comprehensive test suite
- ❌ Plugin system
- ❌ Watch mode

## Contributing Guidelines

When contributing to js-tmpl:

1. **Maintain separation of concerns** - don't mix layer responsibilities
2. **No hidden magic** - all behavior must be explicit and documented
3. **Test determinism** - same input must always produce same output
4. **Preserve engine-first design** - CLI is secondary
5. **Follow existing patterns** - consistency over cleverness

### Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org) for changelog generation via [git-cliff](cliff.toml).

**Format:**

```text
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**Types and their changelog groups:**

| Type       | Changelog Group | Description                                      |
| ---------- | --------------- | ------------------------------------------------ |
| `feat`     | Added           | New features                                     |
| `fix`      | Fixed           | Bug fixes                                        |
| `docs`     | Documentation   | Documentation changes                            |
| `perf`     | Performance     | Performance improvements                         |
| `refactor` | Changed         | Code refactoring (no feature/fix)                |
| `style`    | Styling         | Code style changes (formatting, whitespace)      |
| `test`     | Testing         | Adding or updating tests                         |
| `build`    | Build           | Build system or external dependency changes      |
| `ci`       | CI/CD           | CI/CD configuration changes                      |
| `chore`    | Miscellaneous   | Other changes (except release/pr commits)        |

**Examples:**

```bash
feat: add watch mode for template hot-reload
fix(pathRenderer): handle empty placeholder values
docs: update API documentation for renderDirectory
refactor(treeWalker): simplify BFS queue logic
test: add integration tests for partial system
chore(deps): update handlebars to 4.7.9
```

**Notes:**

- Use lowercase for type and scope
- Keep the description concise (50 chars or less preferred)
- Use imperative mood: "add" not "added" or "adds"
- `chore(release)` and `chore(pr)` commits are excluded from changelog

## Questions & Clarifications

When working on js-tmpl, always ask:

- Does this maintain deterministic behavior?
- Is this explicit or relying on convention?
- Can this be used programmatically?
- Does this violate separation of concerns?
- Is this the simplest solution?
