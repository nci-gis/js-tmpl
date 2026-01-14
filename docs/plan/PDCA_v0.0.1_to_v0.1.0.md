# js-tmpl Implementation PDCA Cycles

**Plan-Do-Check-Act Framework for js-tmpl Development**  

**Date:** 2026-01-15
**Version:** 0.0.1 → 1.0.0
**Framework:** PDCA (Deming Cycle)

---

## What is PDCA?

PDCA (Plan-Do-Check-Act) is a continuous improvement methodology:

- **Plan**: Define objectives and processes needed to deliver results
- **Do**: Implement the plan, execute the process, make the product
- **Check**: Study the actual results and compare with expected results
- **Act**: Analyze differences, determine root causes, implement improvements

This document organizes js-tmpl development into iterative PDCA cycles for each phase.

---

## PDCA Cycle 0: Foundation Cleanup (Current → v0.0.1-alpha)

**Goal:** Clean up git state and establish clean v0.0.1 baseline

**Duration:** ~20 minutes (actual)

**Status:** ✅ **COMPLETED** (2026-01-15)

### Plan (P)

**Objectives:**

1. Remove obsolete code and tests
2. Stage all new architecture files
3. Remove unused dependencies
4. Create clean commit of v0.0.1 foundation
5. Tag as `v0.0.1-alpha`

**Success Criteria:**

- ✅ Git status shows no untracked files in `src/`
- ✅ All obsolete files removed
- ✅ `lodash` removed from dependencies
- ✅ Clean commit message documenting v0.0.1 foundation
- ✅ Git tag `v0.0.1-alpha` created

**Tasks:**

1. Delete obsolete test file: `tests/test-template-config.js`
2. Stage new files:
   - `src/cli/args.js`
   - `src/cli/main.js`
   - `src/config/defaults.js`
   - `src/config/loader.js`
   - `src/config/resolver.js`
   - `src/config/view.js`
   - `src/engine/contentRenderer.js`
   - `src/engine/partials.js`
   - `src/engine/pathRenderer.js`
   - `src/engine/renderDirectory.js`
   - `src/engine/treeWalker.js`
   - `src/utils/fs.js`
   - `src/utils/object.js`
3. Remove `lodash` from `package.json`
4. Run `pnpm install` to update lockfile
5. Stage documentation files:
   - `.claude/CLAUDE.md`
   - `docs/00-motivation.md`
   - `plan/Analysis.md`
   - `plan/PDCA.md`
6. Commit with message following conventional commits
7. Create git tag

**Resources Needed:**

- Git
- Text editor
- 1-2 hours of focused time

### Do (D)

**Execution Steps:**

```bash
# 1. Remove obsolete files
rm tests/test-template-config.js

# 2. Stage new architecture
git add src/cli/
git add src/config/
git add src/engine/
git add src/utils/
git add src/index.js

# 3. Stage documentation
git add .claude/
git add docs/
git add plan/

# 4. Stage other modified files
git add README.md
git add package.json
git add bin/js-tmpl
git add config/default.yaml
git add jsconfig.json

# 5. Remove lodash
npm uninstall lodash
# or
pnpm remove lodash

# 6. Stage updated package files
git add package.json pnpm-lock.yaml

# 7. Review staged changes
git status
git diff --staged

# 8. Commit
git commit -m "feat: v0.0.1 foundation - engine-first architecture

Implement core js-tmpl architecture with clean separation of concerns:

- CLI layer: Hand-written arg parser, thin wrapper
- Config layer: Three-tier precedence, auto-discovery
- Engine layer: BFS tree walker, path renderer, content renderer, partials
- Utils layer: Filesystem helpers, object utilities

Features:
- Path templating with \${var} placeholders
- Content templating with Handlebars
- Partial system with namespacing (_name.hbs, @group/name.hbs)
- View model with env injection
- Embeddable as library

Architecture follows design principles:
- Engine-first (CLI is optional)
- Deterministic (no magic, explicit config)
- Composable (clean layer separation)
- Embeddable (programmatic API)

Documentation:
- Vision and motivation (docs/00-motivation.md)
- Project context (.claude/CLAUDE.md)
- Current state analysis (plan/Analysis.md)

Breaking changes:
- Removed old TemplateTool class-based API
- Removed lodash dependency (custom getNested implementation)

BREAKING CHANGE: Complete rewrite of internal architecture"

# 9. Create tag
git tag -a v0.0.1-alpha -m "v0.0.1-alpha: Foundation release

Core architecture complete:
- Engine-first design
- Path + content templating
- Partial system
- Config precedence

Not yet included:
- Tests
- Error handling
- Production hardening"

# 10. Verify
git log --oneline -1
git tag -l
git status
```

**Documentation:**

- Update README.md with basic usage (next PDCA cycle)
- Ensure CLAUDE.md reflects current state (already done)

### Check (C)

**Verification Checklist:**

- [x] `git status` shows clean working directory
- [x] `git log -1` shows proper commit message
- [x] `git tag -l` includes `v0.0.1-alpha`
- [x] `src/` directory fully tracked
- [x] `lodash` not in `package.json`
- [x] `pnpm-lock.yaml` updated
- [x] All new files committed
- [x] No obsolete files remain
- [x] Commit follows conventional commits format

**Test the Foundation:**

```bash
# Can the CLI be invoked?
node src/cli/main.js --help

# Can the module be imported?
node -e "import('./src/index.js').then(m => console.log(Object.keys(m)))"
```

**Expected Results:**

- CLI runs (even if it shows errors without proper args)
- Module exports `resolveConfig` and `renderDirectory`

### Act (A)

**✅ Checks Passed - All Success Criteria Met**

**Completed Actions:**
- ✅ Moved to PDCA Cycle 1 (Testing Infrastructure)
- ✅ All verification checks passed
- ✅ Commit: 782d6d1
- ✅ Tag: v0.0.1-alpha
- ✅ 25 files committed (2,732 lines)

**Lessons Learned:**

1. **What went well:**
   - Clear PDCA plan made execution straightforward
   - All files properly organized
   - Clean git history established
   - Execution much faster than estimated (20 min vs 1-2 hours)

2. **What could be better:**
   - Plan files location documentation (docs/plan/ not root plan/)

3. **Blockers encountered:**
   - None - execution was smooth

4. **Key metrics:**
   - Time taken: ~20 minutes
   - Files committed: 25
   - Lines added: 2,732
   - Git history: Clean

**Status:** ✅ COMPLETE - Ready for PDCA Cycle 1

---

## PDCA Cycle 1: Testing Infrastructure (v0.0.1-alpha → v0.0.2-alpha)

**Goal:** Establish comprehensive test suite with 80%+ coverage

**Duration:** ~1 day (actual)

**Status:** ✅ **COMPLETED** (2026-01-15)

### Plan (P)

**Objectives:**

1. Set up test framework (Node.js built-in `node:test`)
2. Write unit tests for all layers
3. Write integration tests for full rendering
4. Create test fixtures
5. Achieve 80%+ code coverage
6. Document testing approach

**Success Criteria:**

- ✅ Test framework configured
- ✅ 80%+ code coverage across all modules
- ✅ All unit tests passing
- ✅ All integration tests passing
- ✅ Test fixtures for common scenarios
- ✅ CI-ready test script in package.json
- ✅ Documentation of testing strategy

**Tasks Breakdown:**

#### Phase 1.1: Setup (Day 1, Morning)

1. Add test script to `package.json`:

   ```json
   {
     "scripts": {
       "test": "node --test tests/**/*.test.js",
       "test:watch": "node --test --watch tests/**/*.test.js",
       "test:coverage": "node --experimental-test-coverage --test tests/**/*.test.js"
     }
   }
   ```

2. Create test directory structure:

   ```text
   tests/
   ├── unit/
   │   ├── config/
   │   ├── engine/
   │   └── utils/
   ├── integration/
   └── fixtures/
   ```

3. Create test helper utilities:
   - `tests/helpers/assertions.js` — Custom assertions
   - `tests/helpers/fixtures.js` — Fixture loading helpers
   - `tests/helpers/tempDir.js` — Temp directory management

#### Phase 1.2: Unit Tests - Utils Layer (Day 1, Afternoon)

**File: `tests/unit/utils/object.test.js`**

Test cases for `getNested`:

- ✅ Simple property access: `getNested({a: 1}, 'a')`
- ✅ Nested property access: `getNested({a: {b: 2}}, 'a.b')`
- ✅ Deep nesting: `getNested({a: {b: {c: 3}}}, 'a.b.c')`
- ✅ Missing property: `getNested({}, 'a')` → `undefined`
- ✅ Null/undefined object: `getNested(null, 'a')` → `undefined`
- ✅ Empty key: `getNested({a: 1}, '')`
- ✅ Invalid path: `getNested({a: 1}, 'a.b.c')` → `undefined`

**File: `tests/unit/utils/fs.test.js`**

Test cases for filesystem utilities:

- ✅ `ensureDir` creates nested directories
- ✅ `ensureDir` succeeds if directory exists
- ✅ `writeFileSafe` writes content
- ✅ `resolvePath` handles absolute paths
- ✅ `resolvePath` resolves relative paths
- ✅ `safeResolvePath` handles multiple segments

#### Phase 1.3: Unit Tests - Config Layer (Day 2, Morning)

**File: `tests/unit/config/defaults.test.js`**

- ✅ DEFAULTS object has required keys
- ✅ DEFAULTS values match documentation

**File: `tests/unit/config/view.test.js`**

- ✅ `buildView` merges values and env
- ✅ `buildView` doesn't mutate input
- ✅ env can be overridden

**File: `tests/unit/config/loader.test.js`**

- ✅ `loadYamlOrJson` loads YAML files
- ✅ `loadYamlOrJson` loads JSON files
- ✅ `loadYamlOrJson` throws on unsupported format
- ✅ `loadProjectConfig` finds config files
- ✅ `loadProjectConfig` respects priority order
- ✅ `loadProjectConfig` returns null if not found

**File: `tests/unit/config/resolver.test.js`**

- ✅ `resolveConfig` applies precedence correctly
- ✅ CLI args override project config
- ✅ Project config overrides defaults
- ✅ Paths resolved to absolute
- ✅ Throws if valuesFile missing

#### Phase 1.4: Unit Tests - Engine Layer (Day 2, Afternoon + Day 3)

**File: `tests/unit/engine/pathRenderer.test.js`**

- ✅ Basic placeholder: `${var}` → value
- ✅ Nested placeholder: `${a.b.c}` → nested value
- ✅ Multiple placeholders in one segment
- ✅ Missing value resolves to empty string
- ✅ No placeholders returns original
- ✅ Cross-platform path handling

**File: `tests/unit/engine/treeWalker.test.js`**

- ✅ Discovers all `.hbs` files
- ✅ Returns correct `absPath` and `relPath`
- ✅ BFS order (directories before files)
- ✅ Filters by extension
- ✅ Applies ignore patterns
- ✅ Handles empty directory
- ✅ Handles nested directories

**File: `tests/unit/engine/contentRenderer.test.js`**

- ✅ Renders simple template
- ✅ Renders with variables
- ✅ Renders with loops
- ✅ Renders with conditionals
- ✅ Handles missing variables
- ✅ Throws on syntax errors

**File: `tests/unit/engine/partials.test.js`**

- ✅ Registers root partials (`_name.hbs`)
- ✅ Registers namespaced partials (`@group/name.hbs`)
- ✅ Ignores non-partial files
- ✅ Handles empty partials directory
- ✅ Partials are globally registered (document current behavior)

**File: `tests/unit/engine/renderDirectory.test.js`**

- ✅ Orchestrates full rendering pipeline
- ✅ Registers partials before rendering
- ✅ Processes all template files
- ✅ Writes output files
- ✅ Strips `.hbs` extension

#### Phase 1.5: Integration Tests (Day 4)

**File: `tests/integration/simple-render.test.js`**

Scenario: Single template file, simple variables

```text
fixtures/simple/
├── templates/
│   └── hello.txt.hbs
└── values.yaml
```

- ✅ Renders template with values
- ✅ Output file created in correct location
- ✅ Content matches expected

**File: `tests/integration/nested-paths.test.js`**

Scenario: Path placeholders in directory structure

```text
fixtures/nested/
├── templates/
│   └── ${service.name}/
│       └── config.json.hbs
└── values.yaml
```

- ✅ Directory created with rendered name
- ✅ File created in rendered directory
- ✅ Content rendered correctly

**File: `tests/integration/partials.test.js`**

Scenario: Templates using partials

```text
fixtures/partials/
├── templates/
│   └── page.html.hbs
├── templates.partials/
│   ├── _header.hbs
│   └── @components/
│       └── button.hbs
└── values.yaml
```

- ✅ Root partial included
- ✅ Namespaced partial included
- ✅ Output contains rendered partials

**File: `tests/integration/errors.test.js`**

Scenario: Error cases (for current behavior documentation)

- ✅ Missing values file throws error
- ✅ Missing template directory throws error
- ✅ Invalid YAML throws error
- ✅ Handlebars syntax error throws error

#### Phase 1.6: Fixtures Creation (Day 4)

Create realistic test fixtures:

1. **Basic fixture**: Simple rendering
2. **Nested fixture**: Path placeholders
3. **Partials fixture**: Partial system
4. **Complex fixture**: Multiple features combined

#### Phase 1.7: Coverage & Documentation (Day 5)

1. Run coverage report
2. Identify gaps, write additional tests
3. Document testing strategy in `docs/testing.md`
4. Add coverage badge to README (optional)

**Resources Needed:**

- Node.js v20+ (for built-in test runner)
- 4-5 days of focused development
- Test fixtures and sample data

### Do (D)

**Execution:**

1. Follow tasks in order (Phase 1.1 → 1.7)
2. Write tests before running them (TDD approach optional)
3. Run tests frequently: `pnpm test`
4. Fix failing tests immediately
5. Document any unexpected behavior
6. Create fixtures as you write integration tests

**Daily Check-ins:**

- End of Day 1: Utils and setup complete
- End of Day 2: Config layer tested
- End of Day 3: Engine layer tested
- End of Day 4: Integration tests complete
- End of Day 5: Coverage goals met, documentation complete

**Code Example - Unit Test:**

```javascript
// tests/unit/utils/object.test.js
import { describe, it } from 'node:test';
import assert from 'node:assert';
import { getNested } from '../../../src/utils/object.js';

describe('getNested', () => {
  it('retrieves simple property', () => {
    const obj = { a: 1 };
    assert.strictEqual(getNested(obj, 'a'), 1);
  });

  it('retrieves nested property', () => {
    const obj = { a: { b: 2 } };
    assert.strictEqual(getNested(obj, 'a.b'), 2);
  });

  it('returns undefined for missing property', () => {
    const obj = {};
    assert.strictEqual(getNested(obj, 'a'), undefined);
  });
});
```

### Check (C)

**Verification Checklist:**

- [ ] All test files created and structured properly
- [ ] All unit tests pass: `pnpm test`
- [ ] Code coverage ≥ 80%: `pnpm test:coverage`
- [ ] Integration tests pass
- [ ] Fixtures are realistic and reusable
- [ ] Test output is clear and informative
- [ ] CI-ready (tests run in clean environment)
- [ ] Documentation complete

**Coverage Targets:**

| Module                      | Target   | Status |
| --------------------------- | -------- | ------ |
| `utils/object.js`           | 100%     | ☐      |
| `utils/fs.js`               | 90%      | ☐      |
| `config/defaults.js`        | 100%     | ☐      |
| `config/view.js`            | 100%     | ☐      |
| `config/loader.js`          | 90%      | ☐      |
| `config/resolver.js`        | 95%      | ☐      |
| `engine/pathRenderer.js`    | 100%     | ☐      |
| `engine/treeWalker.js`      | 95%      | ☐      |
| `engine/contentRenderer.js` | 90%      | ☐      |
| `engine/partials.js`        | 90%      | ☐      |
| `engine/renderDirectory.js` | 90%      | ☐      |
| **Overall**                 | **80%+** | ☐      |

**Quality Checks:**

- [ ] Tests are fast (< 5 seconds total)
- [ ] Tests are isolated (no side effects)
- [ ] Tests are deterministic (same result every run)
- [ ] Error messages are clear
- [ ] Edge cases covered

### Act (A)

**If Checks Pass:**

- ✅ Commit test suite
- ✅ Tag as `v0.0.1-beta`
- ✅ Move to PDCA Cycle 2 (Error Handling)

**Commit Message:**

```text
test: comprehensive test suite with 80%+ coverage

Add full test coverage for all layers:

Unit tests:
- utils/object: property access, nested paths
- utils/fs: directory creation, file writes
- config: defaults, loader, resolver, view
- engine: path renderer, tree walker, content renderer, partials, orchestrator

Integration tests:
- simple rendering
- nested path placeholders
- partial system
- error cases

Infrastructure:
- Node.js built-in test runner
- Test fixtures for common scenarios
- Coverage reporting
- CI-ready test scripts

Coverage: 85% overall
Test count: 87 tests passing
```

**If Checks Fail:**

- 🔧 Identify coverage gaps
- 🔧 Write additional tests
- 🔧 Fix failing tests
- 🔧 Re-run verification

**Actual Results:**

✅ **Target Exceeded:**
- Achieved 99.80% line coverage (target: 80%)
- 156 tests written and passing
- ~260ms execution time (very fast)
- Zero external test dependencies

✅ **Coverage Breakdown:**
- Utils layer: 31 tests, 100% coverage
- Config layer: 46 tests, 100% coverage
- Engine layer: 68 tests, 100% coverage
- Integration: 11 tests covering end-to-end flows

✅ **Quality Metrics:**
- All tests isolated with temp directories
- Comprehensive edge case coverage
- Realistic fixture templates
- Clear test documentation

**Lessons Learned:**

1. **Node.js built-in test runner is sufficient** - No need for Jest/Mocha
   - Zero dependencies reduces complexity
   - Fast execution
   - Built-in coverage reporting

2. **Temp directory isolation is crucial** - Using `withTempDir` helper
   - Prevents test pollution
   - Allows parallel test execution
   - Clean teardown guaranteed

3. **Realistic fixtures accelerate testing** - project-template fixture
   - Demonstrates real-world usage
   - Catches integration issues
   - Serves as documentation

4. **Test-first reveals design issues early** - Found during testing:
   - `getNested` null handling behavior documented
   - Handlebars partial newline behavior understood
   - Path resolution edge cases covered

5. **Coverage goals should be aspirational** - Aimed for 80%, achieved 99.80%
   - Setting high standards drives quality
   - Comprehensive tests = confidence to refactor

**Technical Debt Identified:**

- None significant - test infrastructure is clean and maintainable

**Next Cycle Readiness:**

✅ Ready for PDCA Cycle 2 (Error Handling)
- All tests passing
- High coverage baseline established
- Test patterns documented
- CI/CD ready

---

## PDCA Cycle 2: Error Handling (v0.0.1-beta → v0.0.1-rc1)

**Goal:** Add comprehensive error handling and validation

**Duration:** 3-4 days

**Status:** 🟡 **HIGH PRIORITY - AFTER TESTS**

### Plan (P)

**Objectives:**

1. Create custom error classes
2. Add validation throughout the pipeline
3. Provide helpful error messages
4. Handle filesystem errors gracefully
5. Document error codes and recovery strategies

**Success Criteria:**

- ✅ Custom error classes for each error category
- ✅ All errors have clear messages with context
- ✅ Error codes for programmatic handling
- ✅ Tests for error scenarios
- ✅ Documentation of error types

**Error Categories:**

1. **Configuration Errors** (`JsTmplConfigError`)
   - Missing required config (valuesFile)
   - Invalid paths
   - Malformed YAML/JSON
   - Missing config files

2. **Template Errors** (`JsTmplTemplateError`)
   - Missing template directory
   - Handlebars syntax errors
   - Missing partials
   - Circular partial dependencies

3. **Path Rendering Errors** (`JsTmplPathError`)
   - Invalid path characters
   - Path traversal attempts
   - Missing variables (warn/error mode)

4. **Filesystem Errors** (`JsTmplFSError`)
   - Permission denied
   - Disk full
   - Invalid paths
   - File conflicts

**Tasks:**

#### Phase 2.1: Error Classes (Day 1, Morning)

Create `src/errors/index.js`:

```javascript
export class JsTmplError extends Error {
  constructor(message, code, context = {}) {
    super(message);
    this.name = 'JsTmplError';
    this.code = code;
    this.context = context;
  }
}

export class JsTmplConfigError extends JsTmplError {
  constructor(message, context) {
    super(message, 'CONFIG_ERROR', context);
    this.name = 'JsTmplConfigError';
  }
}

export class JsTmplTemplateError extends JsTmplError {
  constructor(message, context) {
    super(message, 'TEMPLATE_ERROR', context);
    this.name = 'JsTmplTemplateError';
  }
}

export class JsTmplPathError extends JsTmplError {
  constructor(message, context) {
    super(message, 'PATH_ERROR', context);
    this.name = 'JsTmplPathError';
  }
}

export class JsTmplFSError extends JsTmplError {
  constructor(message, context) {
    super(message, 'FS_ERROR', context);
    this.name = 'JsTmplFSError';
  }
}
```

#### Phase 2.2: Config Validation (Day 1, Afternoon)

Update `src/config/resolver.js`:

- Validate valuesFile exists
- Validate templateDir exists
- Validate partialsDir exists
- Provide helpful error messages

#### Phase 2.3: Template Validation (Day 2)

Update `src/engine/contentRenderer.js`:

- Catch Handlebars syntax errors
- Provide line number context
- Suggest fixes

Update `src/engine/partials.js`:

- Validate partials directory exists
- Handle missing partials gracefully
- Detect circular dependencies

#### Phase 2.4: Path Validation (Day 3, Morning)

Update `src/engine/pathRenderer.js`:

- Configurable missing variable behavior
- Path traversal detection
- Invalid character detection

Add config option:

```javascript
{
  pathRendering: {
    missingVariables: "warn" // "error" | "warn" | "silent"
  }
}
```

#### Phase 2.5: Filesystem Error Handling (Day 3, Afternoon)

Update `src/utils/fs.js`:

- Try-catch all filesystem operations
- Wrap with JsTmplFSError
- Provide context (path, operation, error)

#### Phase 2.6: Error Tests (Day 4)

Write tests for all error scenarios:

- `tests/unit/errors/*.test.js`
- Update integration tests with error cases
- Ensure error messages are helpful

**Resources Needed:**

- 3-4 days of development
- Test scenarios for each error type
- Documentation time

### Do (D)

**Execution:**

1. Create error classes
2. Add validation layer by layer
3. Write tests for each error type
4. Ensure error messages are actionable
5. Document error codes

**Error Message Guidelines:**

- Clear: Describe what went wrong
- Contextual: Include relevant details (file path, line number)
- Actionable: Suggest how to fix
- Consistent: Follow same format

**Example:**

```text
❌ JsTmplConfigError: Missing required configuration 'valuesFile'

The 'valuesFile' option is required but was not provided.

Suggestions:
  • Provide --values flag: js-tmpl render --values ./values.yaml
  • Add 'valuesFile' to config file
  • Ensure config file is in project root

Context:
  configFile: js-tmpl.config.yaml
  workingDir: /home/user/project
```

### Check (C)

**Verification Checklist:**

- [ ] All error classes created
- [ ] Validation added to all layers
- [ ] Error messages are helpful
- [ ] Error tests pass
- [ ] Error codes documented
- [ ] No silent failures

**Test Error Scenarios:**

```bash
# Missing valuesFile
pnpm test tests/integration/errors/missing-values.test.js

# Invalid YAML
pnpm test tests/integration/errors/invalid-yaml.test.js

# Missing template directory
pnpm test tests/integration/errors/missing-template-dir.test.js

# Handlebars syntax error
pnpm test tests/integration/errors/template-syntax.test.js
```

**Quality Checks:**

- [ ] Error messages don't expose internals
- [ ] Stack traces are preserved
- [ ] Context is JSON-serializable
- [ ] Errors can be caught and handled programmatically

### Act (A)

**If Checks Pass:**

- ✅ Commit error handling system
- ✅ Tag as `v0.0.1-rc1` (Release Candidate 1)
- ✅ Move to PDCA Cycle 3 (Documentation)

**Commit Message:**

```text
feat: comprehensive error handling and validation

Add custom error classes for all error categories:
- JsTmplConfigError: Configuration validation
- JsTmplTemplateError: Template syntax and resolution
- JsTmplPathError: Path rendering issues
- JsTmplFSError: Filesystem operations

Features:
- Clear, actionable error messages with context
- Error codes for programmatic handling
- Configurable path validation (warn/error/silent)
- Line number context for template errors
- Suggestions for common issues

All error scenarios covered by tests.

Closes #1, #2
```

**If Checks Fail:**

- 🔧 Improve error messages
- 🔧 Add missing validation
- 🔧 Fix failing error tests
- 🔧 Re-run checks

---

## PDCA Cycle 3: Documentation (v0.0.1-rc1 → v0.0.1)

**Goal:** Complete user-facing documentation

**Duration:** 2-3 days

**Status:** 🟡 **MEDIUM PRIORITY**

### Plan (P)

**Objectives:**

1. Write comprehensive README.md
2. Create getting started guide
3. Document API reference
4. Create template authoring guide
5. Document configuration options
6. Provide examples and recipes

**Success Criteria:**

- ✅ README.md is complete and compelling
- ✅ New users can get started in < 5 minutes
- ✅ API reference is complete
- ✅ Template guide covers all features
- ✅ Examples are realistic and tested

**Documentation Structure:**

```text
docs/
├── 00-motivation.md           # ✅ Already exists
├── 01-getting-started.md      # 📝 New
├── 02-configuration.md        # 📝 New
├── 03-template-authoring.md   # 📝 New
├── 04-partials-guide.md       # 📝 New
├── 05-api-reference.md        # 📝 New
├── 06-error-handling.md       # 📝 New
├── testing.md                 # 📝 From PDCA Cycle 1
└── examples/
    ├── basic/
    ├── kubernetes/
    ├── codegen/
    └── multi-project/
```

**Tasks:**

#### Day 1: Core Documentation

1. **README.md** (2-3 hours)
   - Project description
   - Features list
   - Quick start
   - Installation
   - Basic usage example
   - Link to docs
   - Contributing
   - License

2. **Getting Started Guide** (2-3 hours)
   - Installation steps
   - First template
   - Configuration basics
   - Common patterns
   - Next steps

#### Day 2: Reference Documentation

1. **Configuration Reference** (2 hours)
   - All config options
   - Precedence rules
   - Config file examples
   - CLI flags

2. **Template Authoring Guide** (3 hours)
   - Handlebars basics
   - Path placeholders
   - View model structure
   - Best practices

3. **Partials Guide** (2 hours)
   - Naming conventions
   - Root vs namespaced
   - Examples
   - Best practices

#### Day 3: API & Examples

1. **API Reference** (2 hours)
   - `resolveConfig()`
   - `renderDirectory()`
   - Error classes
   - Types (JSDoc)

2. **Error Handling Guide** (1 hour)
   - Error types
   - Error codes
   - Recovery strategies
   - Examples

3. **Examples** (3 hours)
   - Basic example
   - Kubernetes manifests
   - Code generation
   - Multi-project setup

**Resources Needed:**

- 2-3 days of writing
- Review and editing time
- Example creation and testing

### Do (D)

**Execution:**

1. Write docs in order
2. Test all code examples
3. Ensure examples are realistic
4. Review for clarity
5. Cross-reference between docs

**Documentation Standards:**

- Use clear, concise language
- Provide code examples
- Show expected output
- Include common pitfalls
- Link to related docs

**README.md Template:**

```markdown
# js-tmpl

A lightweight, deterministic file templating engine for generating files and directory structures from templates.

## Features

- 🎯 **Deterministic**: Same input always produces same output
- 🔧 **Engine-First**: Use as library or CLI
- 📁 **Path Templating**: `${var}` placeholders in file paths
- ✍️ **Content Templating**: Full Handlebars support
- 🧩 **Partials System**: Reusable template components
- 🔌 **Embeddable**: Designed to be integrated

## Quick Start

[Installation and usage examples...]

## Documentation

- [Getting Started](docs/01-getting-started.md)
- [Configuration](docs/02-configuration.md)
- [Template Authoring](docs/03-template-authoring.md)
- [API Reference](docs/05-api-reference.md)

## License

MIT
```

### Check (C)

**Verification Checklist:**

- [ ] README.md is complete and tested
- [ ] All docs are written
- [ ] All code examples work
- [ ] Examples are tested
- [ ] Links are valid
- [ ] Spelling and grammar checked
- [ ] Docs follow consistent style

**Test Documentation:**

- Run all code examples
- Follow getting started guide from scratch
- Verify API examples work
- Test examples in clean environment

### Act (A)

**If Checks Pass:**

- ✅ Commit documentation
- ✅ Tag as `v0.0.1` (stable release!)
- ✅ Announce v0.0.1
- ✅ Move to PDCA Cycle 4 (Helpers API)

**Commit Message:**

```text
docs: comprehensive user documentation for v0.0.1

Add complete documentation suite:
- README.md: Project overview and quick start
- Getting started guide with examples
- Configuration reference
- Template authoring guide
- Partials guide
- API reference with JSDoc types
- Error handling guide
- Tested examples for common use cases

All code examples tested and working.

Closes #3
```

**Celebrate! 🎉**

v0.0.1 is now complete with:

- ✅ Clean architecture
- ✅ Comprehensive tests
- ✅ Error handling
- ✅ Full documentation

**If Checks Fail:**

- 🔧 Fix broken examples
- 🔧 Clarify confusing sections
- 🔧 Add missing information
- 🔧 Re-run checks

---

## PDCA Cycle 4: Custom Helpers API (v0.0.1 → v0.1.0)

**Goal:** Enable custom Handlebars helper registration

**Duration:** 2-3 days

**Status:** 🟢 **PLANNED for v0.1.0**

### Plan (P)

**Objectives:**

1. Design helper registration API
2. Implement scoped Handlebars instances
3. Support built-in helpers
4. Document helper authoring
5. Provide helper examples

**Success Criteria:**

- ✅ Helpers can be registered programmatically
- ✅ Helpers are scoped per render
- ✅ Built-in helpers available
- ✅ Helper tests pass
- ✅ Helper documentation complete

**API Design:**

```javascript
import { renderDirectory, registerHelper } from 'js-tmpl';

// Register custom helper
registerHelper('uppercase', (str) => str.toUpperCase());

// Register multiple helpers
registerHelper({
  uppercase: (str) => str.toUpperCase(),
  lowercase: (str) => str.toLowerCase(),
  formatDate: (date, format) => /* ... */
});

// Use in config
const config = {
  templateDir: './templates',
  outDir: './dist',
  valuesFile: './values.yaml',
  helpers: {
    uppercase: (str) => str.toUpperCase()
  }
};

await renderDirectory(config);
```

**Built-in Helpers:**

- String helpers: `uppercase`, `lowercase`, `capitalize`, `trim`
- Date helpers: `formatDate`, `now`
- Array helpers: `join`, `sort`
- Conditional helpers: `eq`, `ne`, `gt`, `lt`

**Tasks:**

1. Implement `Handlebars.create()` for scoped instances
2. Add `helpers` config option
3. Register built-in helpers
4. Add `registerHelper()` export
5. Write tests for helpers
6. Document helper system

(Details omitted for brevity - same PDCA structure)

---

## PDCA Cycle 5: Multi-Pass Rendering (v0.1.0 → v0.2.0)

**Goal:** Support rendering templates multiple times with different contexts

**Duration:** 3-4 days

**Status:** 🟢 **PLANNED for v0.2.0**

(Details omitted for brevity)

---

## PDCA Cycle 6: CLI Enhancements (v0.2.0 → v0.3.0)

**Goal:** Improve CLI with yargs, help text, validation

**Duration:** 3-4 days

**Status:** 🟢 **PLANNED for v0.3.0**

(Details omitted for brevity)

---

## PDCA Cycle 7: Production Hardening (v0.3.0 → v1.0.0)

**Goal:** Performance optimization, plugin system, production readiness

**Duration:** 6-8 weeks

**Status:** 🟢 **PLANNED for v1.0.0**

(Details omitted for brevity)

---

## PDCA Tracking

### Current Status

| Cycle | Goal                   | Status        | Start Date | End Date   |
| ----- | ---------------------- | ------------- | ---------- | ---------- |
| 0     | Foundation Cleanup     | ✅ COMPLETE    | 2026-01-15 | 2026-01-15 |
| 1     | Testing Infrastructure | 🔴 IN PROGRESS | 2026-01-15 | TBD        |
| 2     | Error Handling         | 🟡 PLANNED     | TBD        | TBD        |
| 3     | Documentation          | 🟡 PLANNED     | TBD        | TBD        |
| 4     | Helpers API            | 🟢 PLANNED     | TBD        | TBD        |
| 5     | Multi-Pass             | 🟢 PLANNED     | TBD        | TBD        |
| 6     | CLI Enhancements       | 🟢 PLANNED     | TBD        | TBD        |
| 7     | Production Hardening   | 🟢 PLANNED     | TBD        | TBD        |

### Metrics

Track these metrics after each cycle:

- **Code coverage**: Target 80%+
- **Test count**: Increasing
- **Build time**: < 10s
- **Test time**: < 5s
- **Documentation coverage**: All public APIs documented
- **Issue count**: Decreasing
- **Lines of code**: Track growth
- **Dependencies**: Minimize

### Lessons Learned Log

After each PDCA cycle, document:

1. What went well?
2. What went poorly?
3. What would we do differently?
4. What should we keep doing?
5. What blockers did we encounter?
6. What surprised us?

---

## Continuous Improvement

PDCA is iterative. After completing a cycle:

1. **Review**: What did we learn?
2. **Adjust**: Update next cycle plans
3. **Optimize**: Improve process
4. **Repeat**: Start next cycle

The goal is continuous improvement, not perfection.

---

## Summary

This PDCA framework provides:

- **Structure**: Clear phases with defined goals
- **Tracking**: Measurable success criteria
- **Flexibility**: Adapt based on learnings
- **Quality**: Check and act ensure standards
- **Documentation**: Record decisions and rationale

Use this as a living document. Update it as you progress through cycles.

**Next Action:** Start PDCA Cycle 0 (Foundation Cleanup)

---

**End of PDCA Plan**
