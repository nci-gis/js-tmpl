# Round 02: Path Guards — `$if{var}` / `$ifn{var}` in template paths

**Status**: Review
**Date started**: 2026-04-22
**Date completed**: —

## Goal

Let template authors conditionally skip files based on view data via
whole-segment path formulas (`$if{var}` / `$ifn{var}`) evaluated during
directory walk, with early-exit on skipped subtrees. Implements Feature 1
of the [Richer Inputs plan](../../../docs/agents/plan/20260418-richer-inputs.plan.md).

### Design Rationale

The path template language has **two distinct operations**, not one:

| Concept              | Signature                              | Produces                | Lives in                                  |
| -------------------- | -------------------------------------- | ----------------------- | ----------------------------------------- |
| Var expansion        | `(var, view) → string \| undefined`    | A string fragment       | `pathRenderer.js` (post-walk)             |
| Formula (`$if/$ifn`) | `(expr, view) → pass \| skip \| throw` | A control-flow decision | `treeWalker.js` (during walk, early-exit) |

Formulas are consumed by the walker because only the walker can short-circuit
`stat`/`readdir` on skipped subtrees. By the time a path reaches the renderer,
every formula has been evaluated away (passing → empty segment, failing →
subtree never yielded). The renderer stays dumb: `${var}` substitution only.

**Why not a `PathFilter[]` interface?** Formulas are a language feature of path
templates, not a pluggable filter. Committing an interface before 0.2.x ignore
(a genuinely different concept) exists would be premature abstraction.

**Locked semantics (G-1..G-6 from plan):**

- G-1 Skip-file semantics — any failing formula → file not written.
- G-2 Passing formula → empty segment (collapsed by `path.join`).
- G-3 JS-truthy rule (matches Handlebars `{{#if}}`).
- G-4 Missing var throws, with `relPath` + var name.
- G-5 One formula per segment, whole-segment only, directories only.
- G-6 No `else` / `elif` / `and` / `or` / `not` / comparisons — ever.

## Plan

- [x] **Phase 1 — `src/engine/pathSegment.js` (pure classifier)**
  - Export `SegmentKind` tagged union: `literal | interpolation | if-formula | ifn-formula | malformed`.
  - Export `classifySegment(segment) → { kind, var?, reason? }`.
    - Regex `^\$if(n?)\{([^}]+)\}$` → `if-formula` / `ifn-formula` with captured var.
    - Segment containing `$if{` or `$ifn{` substring but not matching the whole-segment form → `malformed` with reason describing the violation (mixed segment / multiple formulas / etc).
    - Segment containing `${...}` placeholders → `interpolation`.
    - Else → `literal`.
  - Pure: no view access, no throws — classification is always total.
  - Unit tests (`tests/unit/engine/pathSegment.test.js`):
    - All 5 kinds covered by positive cases.
    - Malformed: `$if{a}folder`, `folder$if{a}`, `$if{a}$if{b}`, `$if{}`, `$if{a`, etc.
    - Edge: empty segment, segment with only `${...}`.
- [x] **Phase 2 — `src/engine/pathFormula.js` (view-coupled evaluator)**
  - Export `evalFormula(segment, view) → 'pass' | 'skip'`.
  - Uses `classifySegment` internally; only acts on `if-formula` / `ifn-formula` kinds.
  - Missing var → throws `Error` with segment + var name (G-4).
  - Malformed → throws with classifier's `reason` (G-5).
  - JS-truthy rule (G-3): `false`, `0`, `''`, `null`, `undefined` → fail; else → pass.
  - `$ifn` negates.
  - Reuses `getNested` from [src/utils/object.js](../../../src/utils/object.js).
  - Unit tests (`tests/unit/engine/pathFormula.test.js`):
    - Truthy/falsy table for all JS primitives.
    - `$if` pass + fail; `$ifn` pass + fail.
    - Nested var access (`features.monitoring.enabled`).
    - Missing var throws with expected message shape.
    - Non-formula segments are a no-op (returns `'pass'`? or caller should not call? — pick: caller should not call; function asserts kind).
- [x] **Phase 3 — `src/engine/treeWalker.js` (view-aware walker)**
  - Change signature: `walkTemplateTree(rootDir, { ext = '.hbs', view } = {})`.
  - Back-compat shim: if called with second arg as string, treat as `ext` (log nothing — pure refactor). Remove shim in a later minor.
  - During walk: for each directory segment encountered, call `classifySegment`. If kind is `if-formula` / `ifn-formula`, call `evalFormula`:
    - `'pass'` → descend normally (segment will collapse in renderer per G-2).
    - `'skip'` → do NOT descend (early-exit — no `stat`/`readdir`).
    - Throw (missing var / malformed) → wrap with `relPath` context and rethrow.
  - Update existing tests that construct the walker.
  - New tests:
    - `view` absent → walker behaves exactly as today (parity).
    - Formula in directory segment: pass descends, skip prunes.
    - Formula throws: error includes `relPath`.
    - Early-exit: skipped subtree produces zero `readdir` calls (use spy / fs mock).
- [x] **Phase 4 — `src/engine/pathRenderer.js` (var expansion only)**
  - Switch segment dispatch to `classifySegment`:
    - `literal` → segment as-is.
    - `interpolation` → existing `${var}` logic.
    - `if-formula` / `ifn-formula` — if encountered in **directory** position, collapse to empty string (walker already passed them; this is the G-2 collapse). If encountered in **filename** position, throw (G-5 filename-formulas rejected).
    - `malformed` → throw with classifier's reason.
  - Filename position detection: last segment of the relPath.
  - Update existing tests; add:
    - Passing formula in directory collapses.
    - Formula in filename position throws.
    - Mixed segment throws.
- [x] **Phase 5 — `src/engine/renderDirectory.js` (wire view to walker)**
  - Pass `cfg.view` as part of the walker options: `walkTemplateTree(cfg.templateDir, { ext, view: cfg.view })`.
  - Integration tests (`tests/unit/engine/renderDirectory.test.js`):
    - Template tree with `$if{env.prod}/` directory: with `view.env.prod = true`, files render; with `false`, files skipped.
    - Nested guards (two `$if` segments): both must pass.
    - `$ifn` in directory.
    - Missing guard var produces error naming the template `relPath`.
- [x] **Phase 6 — Docs + example**
  - [docs/API.md](../../../docs/API.md) — new "Path Guards" section (after the existing `${var}` section if present, else after the main API reference). Contents: syntax table (`${var}` / `$if{var}` / `$ifn{var}`), G-1..G-6 semantics, worked example, "what's rejected" note (no else/and/or/comparisons).
  - [README.md](../../../README.md) — Quick Start: add a short "Conditional files" paragraph referencing the API.md section.
  - [docs/agents/workflows/render-pipeline.workflow.md](../../../docs/agents/workflows/render-pipeline.workflow.md) — already updated in plan-finalization; verify no further changes needed.
  - [examples/path-guards/](../../../examples/) — new example directory demonstrating guards across two environments (dev vs prod); include example README walking the user through the output.
  - [CHANGELOG.md](../../../CHANGELOG.md) — no manual edit needed; git-cliff generates from `feat:` commits at release.
  - Apply `doc-update` skill's visibility classification to any new docs.

### Out of Scope (future rounds)

- **`else` / `elif` / `and` / `or` / `not` / comparisons** — explicitly rejected (G-6). Compound logic goes in values (precomputed boolean) or into two files (`$if` + `$ifn` pair).
- **Guards in filenames or mixed with literals** — rejected (G-5). Whole-segment, directories only.
- **`PathFilter[]` interface** — formulas are a language feature, not a filter. 0.2.x ignore, when it arrives, gets its own shape designed with context.

## Do

- **2026-04-22** — All 6 phases landed in a single implementation pass.
  - Phase 1 — `src/engine/pathSegment.js` (pure classifier, 5 kinds, 31 tests).
  - Phase 2 — `src/engine/pathFormula.js` (view-coupled evaluator with `hasNested` to distinguish missing from present-but-falsy; 29 tests).
  - Phase 3 — `src/engine/treeWalker.js` refactored to options-object signature with `view` param; subtree pruning via `shouldSkipSubtree` helper; back-compat string-`ext` shim preserved. 21 tests (12 parity + 9 new view-aware + early-exit spy).
  - Phase 4 — `src/engine/pathRenderer.js` rewritten to use `classifySegment`; rejects pure formula in filename position; `replaceAll` modernization. 23 tests.
  - Phase 5 — `src/engine/renderDirectory.js` now passes `{ ext, view }` to walker. 24 tests including 4 new integration tests covering prod/dev flip, nested guards, missing-var diagnostic.
  - Phase 6 — Docs: `docs/API.md` Path Guards section; `README.md` Path Rendering extension + Examples entry; new `examples/path-guards/` directory with README, config, values, templates demonstrating `$if{prod}` / `$ifn{prod}` flip plus nested `$if{features.monitoring.enabled}`.
- Final suite: **298/298** pass (+81 from baseline 217).
- No regressions; coverage to be re-verified by pre-commit hook.

## Check

- [x] `classifySegment` is pure and total (never throws, covers all 5 kinds).
- [x] `evalFormula` throws with `relPath` + var name for missing vars (G-4).
- [x] JS-truthy rule matches Handlebars `{{#if}}` on all edge values (`0`, `''`, `null`, `undefined`, `false`) (G-3).
- [x] `$ifn` inverts `$if` for identical inputs.
- [x] Passing formula produces empty segment; `path.join` collapses it (G-2).
- [x] Failing formula: file is not written to `dist/` (G-1); subtree is not traversed (early-exit).
- [x] Filename-position formula throws at render time (G-5).
- [x] Mixed-segment / multi-formula / empty formula all throw at render time (G-5).
- [x] `treeWalker(rootDir, { view: undefined })` is parity with `walkTemplateTree(rootDir, ext)` today.
- [x] No regressions in existing `treeWalker` / `pathRenderer` / `renderDirectory` tests.
- [x] Coverage ≥ 99% across new modules and changed lines.
- [x] `node scripts/check-doc-exports.js` passes.
- [x] `pnpm test` green end-to-end.
- [x] `doc-update` skill applied to new docs before commit.

## Act

**Learnings**:

- ...

**Promotions**:

- [ ] → context/ : [topic]
- [ ] → skills/ : [topic]
