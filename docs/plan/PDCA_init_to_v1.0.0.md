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

**Phase:** Block (Correctness & Trust)

**Goal:** Clean up git state and establish clean v0.0.1 baseline

**Duration:** ~20 minutes (actual)

**Status:** ✅ **COMPLETED** (2026-01-15)

---

## PDCA Cycle 1: Testing Infrastructure (v0.0.1-alpha → v0.0.2-alpha)

**Phase:** Block (Correctness & Trust)

**Goal:** Establish comprehensive test suite with 80%+ coverage

**Duration:** ~1 day (actual)

**Status:** ✅ **COMPLETED** (2026-01-15)

---

## PDCA Cycle 2: Error Handling (v0.0.1-beta → v0.0.1-rc1)

**Phase:** Block (Correctness & Trust)

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

### Engine Work

- Error classes and validation across config, engine, and filesystem
- Path rendering guardrails and configurable missing-variable handling

### Project / Repository Hygiene

- Error documentation and test coverage for error scenarios

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

**Principle Check:**

- [x] Deterministic behavior preserved
- [x] No new implicit behavior introduced
- [x] Engine remains embeddable

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

**Phase:** Block (Correctness & Trust)

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

### Engine Work

- None (documentation-only cycle)

### Project / Repository Hygiene

- Full documentation set, examples, and cross-linking
- README polish and validation of all examples

**Documentation Structure:**

```text
docs/
├── ToC.md                         # ✅ Already exists
└── advanced-usage/
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

**Principle Check:**

- [x] Deterministic behavior preserved
- [x] No new implicit behavior introduced
- [x] Engine remains embeddable

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

**Phase:** Block (Correctness & Trust)

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

### Engine Work

- Scoped Handlebars instances and helper registration API
- Built-in helpers and tests

### Project / Repository Hygiene

- Helper documentation and examples

**API Design:**

```javascript
import { renderDirectory, registerHelper } from '@nci-gis/js-tmpl';

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

**Phase:** Scale (Extension & Performance)

**Goal:** Support rendering templates multiple times with different contexts

**Duration:** 3-4 days

**Status:** 🟢 **PLANNED for v0.2.0**

### Engine Work

- Multi-pass rendering support (templates rendered with multiple contexts)

### Project / Repository Hygiene

- Documentation and examples for multi-pass workflows

(Details omitted for brevity)

---

## PDCA Cycle 6: CLI Enhancements (v0.2.0 → v0.3.0)

**Phase:** Scale (Extension & Performance)

**Goal:** Improve CLI with yargs, help text, validation

**Duration:** 3-4 days

**Status:** 🟢 **PLANNED for v0.3.0**

### Engine Work

- CLI enhancements and improved validation

### Project / Repository Hygiene

- Help text, docs, and release notes alignment

(Details omitted for brevity)

---

## PDCA Cycle 7: Production Hardening (v0.3.0 → v1.0.0)

**Phase:** Scale (Extension & Performance)

**Goal:** Performance optimization, plugin system, production readiness

**Duration:** 6-8 weeks

**Status:** 🟢 **PLANNED for v1.0.0**

### Engine Work

- Performance optimization and production readiness

### Project / Repository Hygiene

- Release process hardening and maintenance docs

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
