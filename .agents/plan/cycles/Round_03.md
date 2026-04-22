# Round 03: Value Partials — `--values-dir` + namespaced-by-path composition

**Status**: Review
**Date started**: 2026-04-22
**Date completed**: —

## Goal

Let users compose `view` from multiple structured files via a value-partials
directory, mirroring the template partial system: directory-as-namespace,
no merge, no precedence, hard errors on collision. Implements Feature 2 of
the [Richer Inputs plan](../../../docs/agents/plan/20260418-richer-inputs.plan.md).

### Design Rationale

Merge-based layering (Helm/Ansible style) trades predictability for
ergonomics. Every layered-config user eventually loses time to "which layer
won this key?" debugging. Value partials pick the other side: **every value
has exactly one source**, visible in the file tree, named by the template.
Predictability is structural, not documented.

Shared primitive with template partials (Phase 0): `@<name>/` segments
anywhere in the relative path trigger flatten (root-independent). Fixes a
latent identical issue in [partials.js:59](../../../src/engine/partials.js#L59)
as a silent correctness improvement — audit confirms no test or example
currently relies on first-segment-only `@` behavior.

**Locked semantics (VP-1..VP-10 + C-1..C-3 from plan):**

- VP-1 Namespace by path (`env/prod.yaml` → `view.env.prod.*`).
- VP-2 Segment validation: `/^\w+$/`.
- VP-3 Duplicate-throws with both paths named.
- VP-4 No merge, no precedence — each value has one source.
- VP-5 Single `--values FILE` stays flat into root (unchanged).
- VP-6 `valuesDir` is optional.
- VP-7 `@<name>/` anywhere in relative path → flatten; filename becomes top-level namespace. Shared with partials via Phase 0 primitive.
- VP-8 `valuesFile` is optional (mirrors VP-6); both absent → `view = { env }` only.
- VP-9 Handlebars compiled `strict: true`; undefined `{{var}}` throws with `relPath` + var name.
- VP-10 Formats: `.yaml` / `.yml` / `.json`; INI rejected.
- C-1 `valuesFile` inside `valuesDir` → hard error at config resolution.
- C-2 Root-vs-namespace key collision → hard error at view build.
- C-3 Reserved `env` namespace collision → hard error at view build.

### Breaking change

Today's `valuesDir` is a base-path helper for `valuesFile`
([resolver.js:15](../../../src/config/resolver.js#L15)). Under this round it
becomes the value-partials root. Pre-1.0 semantic break, documented in
CHANGELOG + migration note.

## Plan

- [x] **Phase 0 — Shared namespacing primitives (`src/utils/namespacing.js`)**
  - Extract from [partials.js](../../../src/engine/partials.js):
    - `SEGMENT_RE = /^\w+$/`
    - `assertValidSegments(segments, filePath)` — throws with context on invalid segment.
    - `assertNoDuplicate(seenMap, key, filePath)` — throws with both paths named on collision.
    - `deriveNamespace({ relPath, ext }) → string[]` — returns segment chain; if any segment matches `/^@\w+$/` anywhere in the path, chain collapses to `[basename]` (root-independent flatten).
  - Update [partials.js](../../../src/engine/partials.js) to consume these:
    - Replace `VALID_SEGMENT` + `validateSegments` → use shared.
    - Replace `processPartialFile`'s `isFlat = f.startsWith('@')` logic → use `deriveNamespace`; `@`-triggered chain becomes `[basename]` (key = `basename`, same as today for top-level `@`).
    - Replace `checkDuplicates` → use `assertNoDuplicate` in a loop.
  - Unit tests for `namespacing.js`:
    - Valid segments pass; invalid throws with filePath.
    - Duplicate throws with both paths named.
    - `deriveNamespace`: nested, flat, `@` at top-level, `@` at nested level (both flatten identically — root-independence), multiple `@` segments (single flatten, `[basename]`), basename with multiple extensions.
  - Existing [partials.test.js](../../../tests/unit/engine/partials.test.js) continues to pass unchanged. **Added** tests for `foo/@shared/x.hbs` → key `x` (new behavior).
- [x] **Phase 1 — `src/config/valuePartials.js` (scan helper)**
  - Export `scanValuePartials(valuesDir, exts = ['.yaml', '.yml', '.json']) → Promise<Map<string[], unknown>>`.
    - Recursive `fs.readdir`, filter by extension.
    - For each file: `deriveNamespace({ relPath, ext: actualExt })` → namespace chain; parse YAML/JSON into value.
    - Use `assertValidSegments` + `assertNoDuplicate` on the way.
  - Skip silently if `valuesDir` is falsy (VP-6).
  - Throw if directory does not exist (symmetry with `registerPartials`).
  - Unit tests:
    - Nested (`env/prod.yaml` → `['env', 'prod']`).
    - Flat (`app.yaml` → `['app']`).
    - `@` at top level (`@shared/app.yaml` → `['app']`).
    - `@` at nested level (`env/@overrides/app.yaml` → `['app']` — root-independence).
    - Invalid segment (`.hidden/x.yaml`) → throws.
    - Duplicate (`env/prod.yaml` + `@flatten/env.yaml` both land at `['env']` somehow? — design this collision case carefully) → throws.
    - Empty dir, missing dir.
    - Mixed `.yaml` / `.yml` / `.json` extensions.
- [x] **Phase 2 — Retire `valuesDir` base-path behavior; update resolver**
  - Rewrite [resolver.js](../../../src/config/resolver.js):
    - `valuesDir` no longer resolves `valuesFile` base path.
    - `valuesFile` is resolved from cwd (or absolute).
    - `valuesFile` is **optional** (VP-8); if absent, no root-value contribution.
  - Add C-1 check at resolver level: if `valuesFile` resolves inside `valuesDir`, throw with message per plan line 279.
  - Update [defaults.js](../../../src/config/defaults.js) comments to reflect new `valuesDir` semantics.
  - Update [types.js](../../../src/types.js) JSDoc types: `valuesFile?: string`, `valuesDir?: string` (already optional likely).
  - Tests:
    - `valuesFile` absent + `valuesDir` absent → resolves to config with no file sources.
    - `valuesFile` absent + `valuesDir` present → resolves.
    - `valuesFile` present + `valuesDir` present (disjoint paths) → resolves.
    - `valuesFile` inside `valuesDir` → C-1 throws.
    - Legacy shape (old `valuesDir = foo` + `valuesFile = app.yaml`) now resolves `valuesFile` from cwd, not `foo/app.yaml` — migration test documents the break.
- [x] **Phase 3 — `src/config/view.js` `buildView(rootValues, env, partialsMap)`**
  - New module (if not already present under `src/config/`) or extend existing view-building code.
  - Assembles view from:
    - `rootValues` (from `valuesFile`, or `{}` if absent).
    - `partialsMap` (from `scanValuePartials`, or empty map if `valuesDir` absent).
    - `env` (from `allowedEnv`) as `view.env.*`.
  - Implements C-2: if any top-level key from `rootValues` collides with a top-level namespace in `partialsMap` → hard error naming both sources.
  - Implements C-3: if any top-level namespace in `partialsMap` is literally `env` → hard error.
  - Unit tests:
    - All-absent → `view = { env: {} }`.
    - `valuesFile` only → view has root keys + `env`.
    - `valuesDir` only → view has namespaces + `env`.
    - Both → both present, no collision.
    - C-2: `valuesFile` has key `app`, `valuesDir` has `app.yaml` → throws.
    - C-3: `valuesDir/env/foo.yaml` tries to produce `view.env.foo` → throws (reserved).
- [x] **Phase 4 — CLI: `--values-dir DIR`**
  - Add flag in [src/cli/args.js](../../../src/cli/args.js) parseArgs alongside `--values` (`-c`).
  - Short form: none (mirrors the pattern where `-p` = `--partials-dir`; skipping short form for values-dir unless conflict-free — decide at implementation).
  - Update [src/cli/usage.js](../../../src/cli/usage.js) help text.
  - Tests for args parsing, usage text.
- [x] **Phase 5 — Strict templates (VP-9)**
  - Update [contentRenderer.js:14](../../../src/engine/contentRenderer.js#L14): `(hbs || Handlebars).compile(raw, { strict: true })`.
  - Consider `preventIndent: true` if it causes issues with existing fixtures — investigate before toggling.
  - Add a `templatePath` context wrapper so the thrown error's message includes the template's `relPath`, not just the var name.
  - Unit tests:
    - `{{foo}}` against `view = {}` → throws naming var + template.
    - `{{foo}}` against `view = { foo: undefined }` → throws (strict treats explicit undefined as missing; verify and document).
    - `{{foo}}` against `view = { foo: '' }` → renders empty string (present-but-empty ≠ missing).
    - `{{#if foo}}` against `view = {}` → throws.
    - Nested `{{a.b.c}}` on missing nested → throws with full path in message.
  - Update any existing fixtures/tests that relied on silent-empty.
- [x] **Phase 6 — Docs**
  - [README.md](../../../README.md):
    - CLI table: add `--values-dir DIR` row (VP-10: formats listed).
    - Quick Start: add "scale" variant showing `--values app.yaml --values-dir values/`.
    - Strict mode paragraph (VP-9) — short, with example error.
  - [docs/API.md](../../../docs/API.md):
    - Config schema: add `valuesDir` (repurposed), `valuesFile` now optional (VP-8).
    - Section: "Value Partials" — VP-1..VP-10, collision rules (C-1..C-3), migration note.
    - Section: "Strict templates" — VP-9 behavior + rationale.
  - [docs/agents/workflows/render-pipeline.workflow.md](../../../docs/agents/workflows/render-pipeline.workflow.md) — already updated in plan-finalization (verify).
  - Migration note (prominently placed in release PR + CHANGELOG): `valuesDir` base-path behavior retired; `valuesFile: foo/app.yaml` instead of `valuesDir: foo + valuesFile: app.yaml`.
  - Apply `doc-update` skill's visibility classification.
- [x] **Phase 7 — Example + migration tests**
  - New [examples/value-partials/](../../../examples/) — tree with `app.yaml` root + `values/env/dev.yaml` + `values/env/prod.yaml` + at least one `@shared/` flatten example.
  - Migration test: old config shape (`valuesDir: foo`, `valuesFile: app.yaml`) now produces either (a) a clear error pointing users to the new rule if `foo/app.yaml` doesn't exist, or (b) a clean resolve against `app.yaml` from cwd (with a comment explaining the behavior change).

### Out of Scope (future rounds)

- **Pre-rendering value files as Handlebars templates** — rejected (plan's "rejected" section). Templated YAML is Helm's other pattern; reopens silent-empty + merge/precedence concerns.
- **Merging `mergedConfig` into `view`** — rejected. Engine knobs don't belong in template scope.
- **Selective loading (include/exclude lists) on `valuesDir`** — rejected. Breaks structural explicitness; "ignore" is 0.2.x scope.
- **Multi-file `valuesFile`** — rejected. Reintroduces merge/precedence or degrades to a low-value surface.
- **`{}` magic literal for "no values file"** — rejected. VP-8 makes the field optional instead.
- **INI format** — rejected. Stringly-typed; silently subverts G-3 and VP-9.

## Do

- **2026-04-23** — All 8 phases landed in a single implementation pass.
  - Phase 0 — `src/utils/namespacing.js` created with shared `SEGMENT_RE`, `assertValidSegments`, `assertNoDuplicate`, `deriveNamespace`. `partials.js` refactored to consume these; `@` detection made root-independent (any-segment rule). Audit confirmed no existing test or example relied on the old first-segment-only behavior. 18 new namespacing tests + 2 root-independent partial tests (`foo/@shared/x.hbs` → key `x`). Error messages keep context via a `label` parameter (`'partial name'` vs `'value partial'` vs default `'namespace'`).
  - Phase 1 — `src/config/valuePartials.js` with synchronous scan (matches `loadYamlOrJson`'s sync-all-the-way model). Root-independent `@` flatten, duplicate-throws, shadow-collision detection via two-pass (collect entries + cross-check prefix shadow before placement). 11 tests covering nested, flat, `@` at top + nested, format mix, collisions, shadow, invalid segment.
  - Phase 2 — `src/config/resolver.js` rewritten: `valuesDir` is now the value-partials root (retired its former base-path role); `valuesFile` optional (VP-8); C-1 "valuesFile inside valuesDir" check. Pre-1.0 break documented via migration note in README + API docs.
  - Phase 3 — `src/config/view.js` refactored to `buildView({ rootValues, partials, env, valuesFile, valuesDir })`. Implements C-2 (root-vs-namespace collision) and C-3 (reserved `env` namespace). Existing tests updated to the new signature; new tests for value-partials merge + C-2 + C-3.
  - Phase 4 — CLI: `--values-dir DIR` in `src/cli/args.js` + usage text update.
  - Phase 5 — VP-9 strict templates: `contentRenderer.js` compiles with `{ strict: true }`, catches + rethrows with `Template 'relPath': <message>`. `renderDirectory` passes `file.relPath`. Fixture tests updated (added `content` field), renderContent test inverted (was silent-empty assertion, now throws assertion + companion present-but-empty assertion).
  - Phase 6 — Docs: `README.md` CLI table, optional-file note, Auto-Discovery list; `docs/API.md` Parameters table, migration note, Throws list expanded with C-1..C-3, Value Partials section, Strict templates section.
  - Phase 7 — `examples/value-partials/` runnable demo (app.yaml root + stages/services namespaces + `@shared` flatten) + README explaining C-3 rationale for avoiding top-level `env/`.
- Final suite: **338/338** pass (+40 over Round_02 baseline of 298).
- No regressions; pre-commit hook will verify coverage.

## Check

- [x] `src/utils/namespacing.js` exports `SEGMENT_RE`, `assertValidSegments`, `assertNoDuplicate`, `deriveNamespace`.
- [x] `partials.js` consumes `namespacing.js`; all existing partials tests still pass.
- [x] `foo/@shared/x.hbs` now produces partial key `x` (new behavior, silent correctness fix).
- [x] `scanValuePartials` produces expected namespace chains for nested, flat, and `@`-flattened (top-level and nested) cases.
- [x] C-1: `valuesFile` inside `valuesDir` → clear hard error at resolver.
- [x] C-2: root-vs-namespace collision → clear hard error at view build.
- [x] C-3: reserved `env` namespace collision → clear hard error at view build.
- [x] VP-6 + VP-8: all combinations of `valuesFile` / `valuesDir` present/absent resolve correctly (4 cases).
- [x] VP-10: `.yaml`, `.yml`, `.json` all load; other extensions silently skipped.
- [x] VP-9: undefined `{{var}}` throws with `relPath` + var name; present-but-empty renders empty.
- [x] `--values-dir DIR` appears in `--help` output.
- [x] All existing tests pass (no regressions).
- [x] Coverage ≥ 99%.
- [x] `node scripts/check-doc-exports.js` passes.
- [x] `pnpm test` green end-to-end.
- [x] Migration note present in README + API docs (CHANGELOG auto-generated at release via git-cliff from `feat:` commits).
- [x] Example in `examples/value-partials/` renders cleanly.
- [x] `doc-update` skill applied.

## Act

**Learnings**:

- ...

**Promotions**:

- [ ] → context/ : [topic]
- [ ] → skills/ : [topic]
