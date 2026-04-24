---
name: code-conventions
description: >
  Enforces project-specific coding conventions that tooling (ESLint, Prettier)
  does not catch. Use this skill before writing or reviewing any source code
  in src/ or tests/ to ensure consistency with established patterns.
---

## Trigger

This skill activates whenever:

- Writing new source code in `src/` or `tests/`
- Reviewing or modifying existing source code
- Adding a new module, function, or test file
- A user asks to "check conventions", "review style", or "follow project patterns"

## What Tooling Already Enforces

These are handled automatically — do not duplicate effort:

| Rule                                                                      | Tool                            |
| ------------------------------------------------------------------------- | ------------------------------- |
| Single quotes, trailing commas, 2-space indent, semicolons, 80-char lines | Prettier                        |
| Import sort order (built-ins, packages, local)                            | ESLint `simple-import-sort`     |
| `const` by default, no `var`                                              | ESLint `prefer-const`, `no-var` |
| Strict equality (`===`)                                                   | ESLint `eqeqeq`                 |
| Curly braces required                                                     | ESLint `curly`                  |
| No unused variables (except `_` prefixed)                                 | ESLint `no-unused-vars`         |
| No throw literals                                                         | ESLint `no-throw-literal`       |

## Conventions That Require Manual Adherence

The following patterns are established throughout the codebase but have no
automated enforcement. Agents MUST follow these manually.

### 1. Module Structure

**Use `node:` prefix for all Node.js built-in imports.**

```js
// Correct
import fs from 'node:fs';
import path from 'node:path';

// Wrong
import fs from 'fs';
import path from 'path';
```

**Use named exports everywhere. Reserve `export *` for `src/index.js` only.**

```js
// src/engine/pathRenderer.js — named export
export function renderPath(relPath, view) { ... }

// src/index.js — re-exports only
export * from './config/resolver.js';
export * from './engine/renderDirectory.js';
```

**Keep internal helpers unexported.** Functions used only within a module are
defined without `export`. Only public API functions are exported.

```js
// Internal — no export
function resolveValuesFilePath(valuesFile, valuesDir, cwd) { ... }

// Public — exported
export function resolveConfig(cli, cwd = process.cwd()) { ... }
```

### 2. JSDoc

**Every exported function MUST have JSDoc** with `@param` types and `@returns`.

```js
/**
 * Render template file with Handlebars & view object.
 * @param {string} filePath
 * @param {Record<string, unknown>} view
 * @param {typeof Handlebars} [hbs] - Scoped Handlebars instance; falls back to global
 * @returns {Promise<string>}
 */
export async function renderContent(filePath, view, hbs) { ... }
```

**Use `@type` casts for type narrowing** where the type checker cannot infer:

```js
return /** @type {Record<string, unknown>} */ (YAML.load(raw) || {});
```

**Centralize shared type definitions in `src/types.js`** using `@typedef`.
Reference them with `@param {import('../types.js').TemplateConfig} cfg`.

### 3. Async / Await

**Always use `async`/`await`** — never raw Promise chains or callbacks.

```js
// Correct
const raw = await fs.readFile(filePath, 'utf8');

// Wrong
fs.readFile(filePath, 'utf8').then(raw => { ... });
```

### 4. Error Handling

**Error messages MUST include context and recovery suggestions.** Multi-line
messages with actionable guidance are the established pattern.

```js
throw new Error(
  `Values file not found: ${filePath}\n` +
    'Check that the file exists and the path is correct.',
);
```

```js
throw new Error(
  'Missing required configuration: valuesFile\n' +
    'Provide via:\n' +
    '  - CLI: --values path/to/values.yaml\n' +
    '  - Config: valuesFile: "path/to/values.yaml" in js-tmpl.config.yaml',
);
```

**Library code lets errors propagate.** Only the CLI entry point
(`src/cli/main.js`) has a top-level `try`/`catch`. Engine and config layers
throw and never catch.

### 5. Layer Separation

The architecture has four layers with strict boundaries:

| Layer  | Directory     | Responsibility                                 | Must NOT                                |
| ------ | ------------- | ---------------------------------------------- | --------------------------------------- |
| Config | `src/config/` | Merge defaults, load files, resolve precedence | Do rendering or I/O beyond config files |
| Engine | `src/engine/` | Template discovery, rendering, file output     | Load config or parse CLI args           |
| Utils  | `src/utils/`  | Pure, reusable helpers                         | Depend on config or engine              |
| CLI    | `src/cli/`    | Argument parsing, entry point                  | Contain business logic                  |

**Never mix responsibilities across layers.** If you need config data in the
engine, pass it as a parameter — do not import from `src/config/` in
`src/engine/`.

### 6. Handlebars Scoping

**Always use scoped `Handlebars.create()` instances** — never register helpers
or partials on the global Handlebars object.

```js
// Correct — scoped instance
hbs = hbs || Handlebars.create();
await registerPartials(partialsDir, extname, hbs);

// Wrong — global mutation
Handlebars.registerPartial('header', template);
```

### 7. Function Design

**Prefer pure functions.** Side effects (file I/O) are confined to the
outermost orchestration layer (`renderDirectory`) and utilities (`src/utils/fs.js`).

**Accept dependencies as parameters** rather than importing them internally.
This supports the "Explicit" and "Composable" design principles.

```js
// Correct — hbs is a parameter
export async function renderContent(filePath, view, hbs) { ... }

// Wrong — hidden dependency
import Handlebars from 'handlebars';
export async function renderContent(filePath, view) {
  const compile = Handlebars.compile(...);
}
```

**Use `cwd` parameters instead of `process.cwd()` calls** deep in the stack.
Only the outermost call site should default to `process.cwd()`.

### 8. Naming

| Category             | Convention                      | Example                       |
| -------------------- | ------------------------------- | ----------------------------- |
| Functions, variables | camelCase                       | `renderPath`, `templateDir`   |
| Constants            | UPPER_SNAKE_CASE                | `DEFAULTS`, `USAGE`           |
| Boolean predicates   | `is`/`has`/`can` prefix         | `isDirectRun`, `hasEnvConfig` |
| Unused params        | `_` prefix                      | `(_, expr) => { ... }`        |
| Abbreviations        | Avoid, except industry standard | `hbs` for Handlebars is OK    |

## Testing Conventions

### File Structure

Tests mirror the source structure:

```text
tests/
  unit/           # One test file per source module
    config/       # Tests for src/config/
    engine/       # Tests for src/engine/
    utils/        # Tests for src/utils/
    cli/          # Tests for src/cli/
  integration/    # End-to-end tests
  fixtures/       # Static test data
  helpers/        # Reusable test utilities
```

### Framework

**Use Node.js native `node:test` and `node:assert` only** — no Jest, Vitest,
or Mocha.

```js
import assert from 'node:assert';
import { describe, it } from 'node:test';
```

### Patterns

**Use `withTempDir` for tests that touch the filesystem.** This ensures
automatic cleanup.

```js
import { withTempDir } from '../../helpers/tempDir.js';

it('renders simple template', async () => {
  await withTempDir(async (tmpDir) => {
    const templateFile = path.join(tmpDir, 'template.hbs');
    await fs.writeFile(templateFile, 'Hello {{name}}!', 'utf8');
    const result = await renderContent(templateFile, { name: 'World' });
    assert.strictEqual(result, 'Hello World!');
  });
});
```

**Use `assert.strictEqual` for value checks and `assert.rejects` for async
error assertions.** Never use `assert.equal` (loose comparison).

**Coverage must remain at 99%+ lines, branches, and functions.**

## Pre-Code Checklist

Before writing or reviewing source code, verify:

- [ ] `node:` prefix on all built-in imports
- [ ] JSDoc with `@param` and `@returns` on every exported function
- [ ] Types centralized in `src/types.js`, not scattered
- [ ] Errors include context message and recovery suggestion
- [ ] No cross-layer imports (engine does not import config, etc.)
- [ ] Scoped Handlebars instance, never global
- [ ] `async`/`await`, no Promise chains
- [ ] Dependencies passed as parameters, not imported internally
- [ ] New tests use `withTempDir`, `assert.strictEqual`, native `node:test`
- [ ] No new external dependencies without explicit discussion
