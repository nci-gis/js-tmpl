# js-tmpl Test Suite

Comprehensive test coverage for the js-tmpl JavaScript templating engine.

## Overview

- **Total Tests**: 156
- **Line Coverage**: 99.80%
- **Branch Coverage**: 99.74%
- **Function Coverage**: 99.36%

## Test Structure

```text
tests/
├── unit/                    # Unit tests for individual modules
│   ├── config/             # Config layer (46 tests)
│   ├── engine/             # Engine layer (68 tests)
│   └── utils/              # Utils layer (31 tests)
├── integration/            # End-to-end tests (11 tests)
├── fixtures/               # Test data and templates
│   ├── config/            # Config test fixtures
│   └── project-template/  # Realistic project templates
└── helpers/               # Test utilities
```

## Running Tests

```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run with coverage report
pnpm test:coverage
```

## Test Categories

### Unit Tests

#### Utils Layer (31 tests)

- `tests/unit/utils/object.test.js` - Tests for `getNested()` function
  - Simple and nested property access
  - Edge cases (null, undefined, empty strings, falsy values)
- `tests/unit/utils/fs.test.js` - Tests for filesystem utilities
  - Directory creation (`ensureDir`)
  - Safe file writing (`writeFileSafe`)
  - Path resolution (`resolvePath`, `safeResolvePath`)

#### Config Layer (46 tests)

- `tests/unit/config/defaults.test.js` - Default configuration values
- `tests/unit/config/view.test.js` - View object building
- `tests/unit/config/loader.test.js` - YAML/JSON loading and project config discovery
- `tests/unit/config/resolver.test.js` - Config resolution with precedence rules

#### Engine Layer (68 tests)

- `tests/unit/engine/pathRenderer.test.js` - Dynamic path rendering with `${var}` syntax
- `tests/unit/engine/contentRenderer.test.js` - Handlebars template rendering
- `tests/unit/engine/treeWalker.test.js` - BFS directory traversal
- `tests/unit/engine/partials.test.js` - Partial registration and namespacing
- `tests/unit/engine/renderDirectory.test.js` - Full orchestration

### Integration Tests (11 tests)

#### Full Rendering Flow (8 tests)

- `tests/integration/full-render.test.js`
  - Complete project structure rendering
  - Partials and dynamic paths
  - Environment variables
  - Complex nested structures
  - Conditionals and loops

#### Fixture-based Tests (3 tests)

- `tests/integration/fixture-render.test.js`
  - Realistic project rendering from fixtures
  - Custom value overrides
  - Minimal value handling

## Test Fixtures

### Config Fixtures

Located in `tests/fixtures/config/`:

- `values.yaml`, `values.json` - Sample value files
- `js-tmpl.config.yaml`, `js-tmpl.config.json` - Sample project configs

### Project Template Fixture

Located in `tests/fixtures/project-template/`:

A complete, realistic project template demonstrating all features:

- **Templates**: README, package.json, source code, configs, docs
- **Partials**: Root partials (`_header.hbs`) and namespaced (`@components/nav.hbs`)
- **Values**: Comprehensive default values with nested structures
- **Features**: Conditionals, loops, dynamic paths, multiple file types

Structure:

```
project-template/
├── templates/
│   ├── README.md.hbs
│   ├── package.json.hbs
│   ├── src/
│   │   └── index.js.hbs
│   ├── config/
│   │   ├── app.json.hbs
│   │   └── database.yaml.hbs
│   └── docs/
│       └── API.md.hbs
├── partials/
│   ├── _header.hbs
│   ├── _footer.hbs
│   ├── @components/
│   │   └── nav.hbs
│   └── @layouts/
│       └── base.hbs
└── values/
    └── defaults.yaml
```

## Test Helpers

### `withTempDir(callback)`

Creates and automatically cleans up a temporary directory for test isolation.

```javascript
import { withTempDir } from "../helpers/tempDir.js";

await withTempDir(async (tmpDir) => {
  // Use tmpDir for testing
  // Automatically cleaned up after callback
});
```

### `getFixturePath(name)`

Returns absolute path to a fixture.

```javascript
import { getFixturePath } from "../helpers/fixtures.js";

const valuesPath = getFixturePath("config/values.yaml");
```

### `loadFixture(fixturePath)`

Loads fixture file contents as text.

```javascript
import { loadFixture } from "../helpers/fixtures.js";

const content = await loadFixture("config/values.yaml");
```

## Coverage Details

### Source Code Coverage (100%)

All core modules have 100% line and function coverage:

- ✅ `src/config/defaults.js` - 100%
- ✅ `src/config/loader.js` - 100%
- ✅ `src/config/resolver.js` - 100%
- ✅ `src/config/view.js` - 100%
- ✅ `src/engine/contentRenderer.js` - 100%
- ✅ `src/engine/partials.js` - 100%
- ✅ `src/engine/pathRenderer.js` - 100%
- ✅ `src/engine/renderDirectory.js` - 100%
- ✅ `src/engine/treeWalker.js` - 100%
- ✅ `src/utils/fs.js` - 100% lines, 90% branches
- ✅ `src/utils/object.js` - 100%

### What's Tested

#### Configuration System

- [x] Default values
- [x] YAML and JSON loading
- [x] Project config discovery (5 file locations)
- [x] Precedence: CLI > Project > Defaults
- [x] Path resolution (absolute/relative)
- [x] View building with environment variables

#### Engine

- [x] Template discovery (BFS tree walking)
- [x] File extension filtering
- [x] Ignore patterns (strings and regex)
- [x] Path rendering with `${var}` placeholders
- [x] Nested property access in paths
- [x] Content rendering with Handlebars
- [x] Partial registration (root and namespaced)
- [x] Full orchestration flow

#### Edge Cases

- [x] Empty directories
- [x] Missing values (undefined handling)
- [x] Null values
- [x] Falsy values (0, false, "")
- [x] Deeply nested properties
- [x] Complex conditionals and loops
- [x] Multiple file types
- [x] Whitespace in placeholders

## Test Philosophy

1. **Isolation**: Each test uses temporary directories and is fully isolated
2. **Comprehensive**: Both happy path and edge cases covered
3. **Realistic**: Integration tests use real project structures
4. **Fast**: 156 tests run in ~260ms
5. **Deterministic**: No flaky tests, no external dependencies

## Writing New Tests

### Unit Test Template

```javascript
import { describe, it } from "node:test";
import assert from "node:assert";
import { functionToTest } from "../../src/module.js";

describe("functionToTest", () => {
  it("does something expected", () => {
    const result = functionToTest(input);
    assert.strictEqual(result, expected);
  });
});
```

### Integration Test Template

```javascript
import { describe, it, beforeEach } from "node:test";
import Handlebars from "handlebars";
import { withTempDir } from "../helpers/tempDir.js";

describe("Integration: Feature Name", () => {
  beforeEach(() => {
    Handlebars.unregisterPartial(/.*/);
  });

  it("tests end-to-end flow", async () => {
    await withTempDir(async (tmpDir) => {
      // Setup templates, run renderDirectory, verify output
    });
  });
});
```

## Continuous Integration

Tests run automatically on:

- Every commit
- Pull requests
- Pre-commit hooks (if configured)

All tests must pass before merging.

## Future Improvements

Potential test additions for future phases:

- [ ] CLI integration tests (when CLI is implemented)
- [ ] Performance benchmarks
- [ ] Error message clarity tests
- [ ] Cross-platform path handling tests (Windows/Unix)
- [ ] Memory leak tests for large projects
