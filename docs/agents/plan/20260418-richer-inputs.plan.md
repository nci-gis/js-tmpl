# Richer Inputs — Path Guards & Value Partials

> **Status**: ✅ Co-planning complete — Feature 1 & Feature 2 both locked, ready for implementation rounds.
> **Date**: 2026-04-18 (revised 2026-04-20, finalized 2026-04-22)
> **Revised in place**: Yes — update this doc as decisions land.
> **Companion viz**: [../workflows/render-pipeline.workflow.md](../workflows/render-pipeline.workflow.md) (diagrams only — this doc owns the design details).

---

## Why this plan exists

Two feature gaps surfaced while using js-tmpl:

1. **No way to conditionally include files based on view data.** → addressed by **Path Guards** (v0.1.0, Phase 3 extension).
2. **No way to compose `view` from multiple structured files.** → addressed by **Value Partials** (v0.1.0, Phase 2 extension — directory-as-namespace, mirroring the template partial system).

An earlier version of this plan included a third feature — explicit `ignore` patterns — but it was **deferred to 0.2.x** (see [Roadmap reconciliation](#roadmap-reconciliation) below) on the grounds that Path Guards cover most real-world skip needs in a more principled way. Neither feature is yet wired, though the render pipeline already exposes the hook points — see [../workflows/render-pipeline.workflow.md#extension-points](../workflows/render-pipeline.workflow.md#extension-points).

---

## Mental model — why these features belong

### The function (zoomed out)

```text
f(config, view, templates) → files
```

- `config` and `view` are the **user's knobs**. If the user knows both, they can predict every output file.
- `templates` is a **shared artifact** — often authored once, reused across projects.
- The engine is a **black box with a pure contract**: same inputs, same outputs, no lifecycle.

### Internal decomposition (three phases)

`f` is computed as a three-phase pipeline — this is the implementation-level view and where each feature slots in:

```text
Phase 1  cli + projectConfig + defaults            → mergedConfig
Phase 2  valuesFile + valuesDir + allowedEnv       → view
Phase 3  view + templateDir + partialsDir          → files
```

- Phases 1 and 2 live in [resolveConfig](../../../src/config/resolver.js).
- Phase 3 lives in [renderDirectory](../../../src/engine/renderDirectory.js).
- `view` is the **bridge**: a user-facing knob at the top-level; a Phase-2 product at implementation level.
- **Feature 1 (Path Guards)** extends **Phase 3** (inside `pathRenderer`). **Feature 2 (Value Partials)** extends **Phase 2** (new scan helper in `src/config/`). Neither changes the other's phase — they compose cleanly.

### Principle filter

(from [../../../docs/PRINCIPLES.md](../../../docs/PRINCIPLES.md) + [../../../AGENTS.md](../../../AGENTS.md))

| Direction                                                               | Aligned?                              |
| ----------------------------------------------------------------------- | ------------------------------------- |
| Enrich the **user's input vocabulary** (config, values)                 | ✅ lean engine, more expressive users |
| Grow **engine intelligence** (hooks, plugins, lifecycle, orchestration) | ❌ "people build that around"         |

Both features in this plan fall on the aligned side. They expand the left-hand side of `f` without touching the engine's internals. Dry-run, plugin APIs, and trace modes are **explicitly out of scope** for this plan — if we want those, they belong in user wrappers, not inside the engine.

---

## Roadmap reconciliation

[ROADMAP.md](../../../ROADMAP.md) is updated alongside this plan:

- **0.1.x (Correctness/Trust)** — adds two new line items: **Path Guards** (`$if{var}` / `$ifn{var}`) and **Value Partials** (`--values-dir`). Both fit the phase themes of "Explicit > Implicit" and "Deterministic > Clever": guards are view-driven and per-file; value partials give every value exactly one source with no merge/precedence mystery. Neither adds engine intelligence.
- **0.2.x (Scale)** — the existing "Advanced filtering and ignore rules" line is annotated with the reason it was deferred (see below). Guards cover most real-world skip needs; ignore revisits only if users hit a concrete gap guards can't express.

### Why "ignore" was deferred

Path Guards and explicit `ignore` patterns solve overlapping problems by different means:

| Approach                | Control lives in              | Skip decision is                 | Visible in                             |
| ----------------------- | ----------------------------- | -------------------------------- | -------------------------------------- |
| Path Guards (0.1.0)     | `view` + template tree layout | Per-file, driven by view data    | The template tree itself               |
| Ignore patterns (0.2.x) | Config file / CLI flag        | Per-pattern, independent of view | A config file, away from the templates |

Path Guards win for **correctness** because they keep the `f(config, view, templates) → files` promise tight: the user's config + view fully determine which files appear. Ignore patterns add a third input channel, which is fine but doesn't earn its complexity until we have evidence users need it that guards can't give them. Revisiting ignore later with real use cases in hand means we can design it **with context** instead of rushing.

---

## Feature 1 — Path Guards (decisions locked)

### Where it fits (path guards)

**Phase 3** extension — a **view-aware walker** ([treeWalker.js](../../../src/engine/treeWalker.js)) evaluates path formulas and skips subtrees; [pathRenderer.js](../../../src/engine/pathRenderer.js) handles only `${var}` expansion. Two new pure modules ([pathSegment.js](../../../src/engine/pathSegment.js), [pathFormula.js](../../../src/engine/pathFormula.js)) carry the shared syntax logic. No change to Phases 1 or 2.

### Goal

Let a template author declare, inline in the path, whether a file should be rendered based on view data:

```text
templates/features/$if{monitoring.enabled}/dashboard.yaml.hbs
templates/envs/$if{prod}/$ifn{debug}/config.yaml.hbs
```

If any guard in the path fails, the file is not written to `dist/`.

### Why this (not ignore) for 0.1.0

- Control surface is `view` — same data the user already authors. No parallel ignore config to learn.
- Skip conditions are **visible in the template tree**, not hidden in a YAML file elsewhere.
- Composes naturally with Feature 2 (Multi-values) — layered values flip guards across environments.
- Lean engine: formulas are a **language feature** of path templates, not a pluggable filter system. No new config keys, no merge rules, no filter-array interface committed before a second consumer exists.

### Syntax

| Form        | Role                  | Notes                        |
| ----------- | --------------------- | ---------------------------- |
| `${var}`    | Insert value          | Existing behavior, unchanged |
| `$if{var}`  | Guard: pass if truthy | New                          |
| `$ifn{var}` | Guard: pass if falsy  | New                          |

`var` uses the same nested access (`features.monitoring.enabled`) via [getNested](../../../src/utils/object.js).

### Segment rule (whole-segment only, directories only)

A path segment that contains a guard must be **exactly** the guard — nothing else. One guard per segment. Guards appear only in **directory segments**, never in the filename.

- ✅ `templates/configs/$if{monitoring.enabled}/dashboard.yaml.hbs`
- ✅ `templates/envs/$if{prod}/$ifn{debug}/config.yaml.hbs` (two guards → two segments)
- ❌ `templates/$if{a}folder/x.hbs` → mixed segment, throw at render time
- ❌ `templates/folder/$if{a}file.hbs` → guard in filename, throw at render time
- ❌ `templates/$if{a}$if{b}/x.hbs` → two guards in one segment, throw at render time

Parse rule per segment:

1. If segment matches `^\$if(n?)\{([^}]+)\}$` → treat as guard.
2. Else if segment contains `$if{` or `$ifn{` substring anywhere → throw "guards must be whole segments, one per segment, in directory positions only".
3. Else → render `${var}` placeholders as today.

### Semantic commitments (locked)

| #   | Decision                                                                                   | Rationale                                                                                                                     |
| --- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| G-1 | **Skip-file semantics**: any failing guard in the path → file not written                  | Only useful meaning; drop-segment alone reduces to a no-op                                                                    |
| G-2 | Passing guard contributes **empty string** to the path; `path.join` collapses it           | Already how [pathRenderer.js](../../../src/engine/pathRenderer.js) + `path.join` behave                                       |
| G-3 | **JS-truthy** rule: `false`, `0`, `''`, `null`, `undefined` → fail; everything else → pass | Matches Handlebars `{{#if}}`; document clearly in API docs                                                                    |
| G-4 | **Missing var throws** with segment + var name in the message                              | Guards are control flow; typos must fail loud. Accountability: if you guard on a var, specify it.                             |
| G-5 | **One guard per segment, whole segment only, directories only**                            | Parse simplicity; "don't compute too much on the path"                                                                        |
| G-6 | **No `else`, `elif`, `and`, `or`, `not`, comparisons** — ever, not just v0.1.0             | Path stays dumb. Users who need compound conditions precompute a boolean in values, or split into two files (`$if` + `$ifn`). |

### Implementation approach — locked (formula vs expansion)

**Conceptual split** — the path template language has **two distinct operations**, not one:

| Concept                        | Signature                              | Produces                | Lives in                                  |
| ------------------------------ | -------------------------------------- | ----------------------- | ----------------------------------------- |
| Var expansion `${var}`         | `(var, view) → string \| undefined`    | A string fragment       | `pathRenderer.js` (post-walk)             |
| Formula `$if{..}` / `$ifn{..}` | `(expr, view) → pass \| skip \| throw` | A control-flow decision | `treeWalker.js` (during walk, early-exit) |

Because formulas produce a **skip decision**, they must be consumed by whichever stage can act on it — the walker, which gets early-exit (no `stat`/`readdir` on skipped subtrees) for free. By the time a path reaches `pathRenderer.js`, every formula has already been evaluated away: passing formulas leave an empty segment (collapsed by `path.join`, per G-2); failing formulas never arrive because the walker short-circuited. The renderer's only job is `${var}` substitution. No formula awareness. No skip logic.

**Filename-position formulas** are a syntax error. The **classifier** (pure, shared) labels a segment as `formula`; whoever iterates segments (walker for directories, renderer for filenames) throws when a formula appears in filename position. Single source of truth for guard syntax.

**Module layout:**

- `src/engine/pathSegment.js` — **pure** string logic. `classifySegment(segment) → SegmentKind` tagged union: `literal | interpolation | if-formula | ifn-formula | malformed`. No view. No runtime errors — classification is always total.
- `src/engine/pathFormula.js` — **view-coupled**. `evalFormula(segment, view) → 'pass' | 'skip'`. Throws on malformed segments or missing vars, with segment + var name in the message. Uses `classifySegment` internally.
- `src/engine/treeWalker.js` — options-object signature: `walkTemplateTree(rootDir, { ext = '.hbs', view })`. During walk, calls `evalFormula` on directory segments; skip → don't descend; pass → continue. Errors are wrapped with `relPath` context.
- `src/engine/pathRenderer.js` — uses `classifySegment` for segment dispatch. Formulas reaching the renderer at all are a bug; a formula in filename position throws ("guards are directory-only").
- `src/engine/renderDirectory.js` — passes `cfg.view` to walker.

**Extension-point diagram (locked):**

```mermaid
flowchart LR
  TW[treeWalker] -->|NEW: classify + evalFormula per segment| Eval{formula eval}
  Eval -->|pass → empty segment| C[continue walk]
  Eval -->|skip| SX[NEW: prune subtree, no fs]
  Eval -->|malformed / missing var| Err[hard error]
  C --> PR[pathRenderer]
  PR -->|NEW: filename-formula check via classifier| RR[rendered path]
  RR --> RD[renderDirectory]
```

**Why this shape won over the two earlier candidates** (pathRenderer-returns-skip and walker-level `PathFilter[]`):

- Names the real distinction (formula vs expansion) — not a code-placement dispute.
- Early-exit on skipped subtrees for free (walker is the only place that can do this).
- No `PathFilter[]` interface committed before a second consumer exists — formulas aren't a pluggable filter, they're a language feature. 0.2.x ignore, when it arrives, is a genuinely different concept and can get its own shape with concrete context.
- `classifySegment` gives us one source of truth for guard syntax, used by both stages.

### Proposed phases (locked — 6 commits)

- **Phase 1** — `src/engine/pathSegment.js`: regex constants + `classifySegment()` tagged-union classifier. Pure unit tests for all 5 kinds, malformed cases, mixed-segment detection.
- **Phase 2** — `src/engine/pathFormula.js`: `evalFormula(segment, view)`. Builds on Phase 1. Tests cover missing-var throws (G-4), JS-truthy rule (G-3), `$ifn` negation.
- **Phase 3** — [treeWalker.js](../../../src/engine/treeWalker.js): options-object refactor + `view` param; consume formulas during walk with early-exit; wrap errors with `relPath`. Tests for `view` absent (parity with today), skip-subtree, error propagation.
- **Phase 4** — [pathRenderer.js](../../../src/engine/pathRenderer.js): use `classifySegment` for dispatch; reject filename-position formulas; continue to expand `${var}` for `interpolation` segments. Existing tests pass; new tests for passing-formula collapse + filename-formula rejection.
- **Phase 5** — [renderDirectory.js](../../../src/engine/renderDirectory.js): pass `cfg.view` to walker. Integration test: guards across two environments produce expected `dist/` tree.
- **Phase 6** — Docs + example: new section in [docs/API.md](../../../docs/API.md); short paragraph in [README.md](../../../README.md) Quick Start; update [docs/agents/workflows/render-pipeline.workflow.md](../workflows/render-pipeline.workflow.md); example under [examples/](../../../examples/) demonstrating guards across dev vs prod.

**Gate for each phase**: `pnpm test` green + coverage ≥ 99%.

### Session-side cleanup already executed (not a phase)

As part of this brainstorm, the dormant `ignore = []` param was **removed** from [treeWalker.js](../../../src/engine/treeWalker.js) along with 4 related tests. Rationale: dead code (zero callers, not in public API), and 0.2.x ignore will be designed with concrete context when it arrives — a genuinely different concept from path formulas. Keeping this note so the change reads intentionally, not accidentally, in git log. The walker is currently `walkTemplateTree(rootDir, ext = '.hbs')` and becomes `walkTemplateTree(rootDir, { ext, view })` in Phase 3 of Feature 1.

---

## Feature 2 — Value Partials (decisions locked)

### Where it fits (value partials)

**Phase 2** extension — a new `scanValuePartials()` helper under `src/config/`, integrated into [resolveConfig](../../../src/config/resolver.js). Phase 3 consumes the richer `view` exactly as before. This is what "enrich the left-hand side of `f` without touching the engine" looks like concretely.

### Goal (value partials)

Let users compose `view` from multiple files without merge semantics. Directory layout becomes namespace, exactly mirroring the template partial system at [src/engine/partials.js](../../../src/engine/partials.js):

```text
app.yaml                          → --values app.yaml              → view.project.*, view.config.*
values-partials/
  env/prod.yaml                   → --values-dir values-partials   → view.env.prod.*
  services/api.yaml                                                 → view.services.api.*
  @shared/constants.yaml          (deferred — see "not in scope")   → (future) view.*
```

Templates access everything through the resulting `view` object: `{{project.name}}`, `{{env.prod.replicas}}`, `{{services.api.port}}`.

### Why partial-analogue (not merge)

Merge-based layering (Helm/Ansible style) trades predictability for ergonomics. Every layered-config user eventually loses time to "which layer won this key?" debugging. Value Partials pick the other side: every value has **exactly one source**, visible in the file tree, and the template **names the source**. Predictability isn't documented — it's structural. This matches the ethos already in [README.md:239](../../../README.md#L239) ("fail loudly over guess silently") and [README.md:63](../../../README.md#L63) ("explicit over implicit").

### Syntax (value partials) — CLI + config

CLI (mirrors `-p, --partials-dir`):

```text
-c, --values FILE         Values file (YAML/JSON) — contents become root view
--values-dir DIR          Value partials directory — namespaced into view by path
```

Config keys:

```yaml
valuesFile: app.yaml
valuesDir: values-partials # repurposed — see "breaking change" below
```

### Semantic commitments (value partials, locked)

| #     | Decision                                                                                                                                                                                                                                                              | Rationale                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| VP-1  | **Namespace by path** — `env/prod.yaml` → `view.env.prod.*`. Segments separated by `.`.                                                                                                                                                                               | Mirrors [partials.js:42](../../../src/engine/partials.js#L42) exactly.                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| VP-2  | **Segment validation** — each segment must match `/^\w+$/`.                                                                                                                                                                                                           | Reuse [partials.js:4](../../../src/engine/partials.js#L4). Identical rule, no new surface.                                                                                                                                                                                                                                                                                                                                                                                                                              |
| VP-3  | **Duplicate-throws** — two paths resolving to the same namespace → hard error naming both files.                                                                                                                                                                      | Mirror [partials.js:69](../../../src/engine/partials.js#L69).                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| VP-4  | **No merge, no precedence** — each value has one source; duplicates are an error, not a cascade.                                                                                                                                                                      | The whole point.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| VP-5  | **Single file stays flat** — `--values app.yaml` alone loads into root view (today's behavior, unchanged).                                                                                                                                                            | Back-compat + simple Quick Start.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| VP-6  | **`valuesDir` is optional** — skipped if absent, same as [partials.js:105](../../../src/engine/partials.js#L105).                                                                                                                                                     | Users opt into the scale path.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| VP-7  | **`@` flatten escape — included, root-independent.** Any segment starting with `@` anywhere in the relative path triggers flatten: the file's namespace is the filename basename (chain discarded). Collisions land in the existing duplicate-throws / C-2 machinery. | Single source of truth with template partials: same rule, shared primitive. "Any-segment" (not "first-segment") makes the semantic root-independent — crucial because value partials are re-rooted for env selection (`valuesDir=values` vs `valuesDir=values/env`); root-dependent `@` would silently change view shape. This also fixes a latent identical issue in [partials.js:59](../../../src/engine/partials.js#L59) — audit confirms no existing test or example relies on the old first-segment-only behavior. |
| VP-8  | **`valuesFile` is optional** (mirrors VP-6). If both `valuesFile` and `valuesDir` are absent, `view` is `{ env }` only.                                                                                                                                               | Cases like "partials-only" or "env-only" shouldn't require ceremonial empty files. The CLI invocation itself is the declaration of "no file-based values."                                                                                                                                                                                                                                                                                                                                                              |
| VP-9  | **Strict templates** — Handlebars compiled with `strict: true`; `{{var}}` on an undefined path throws with template `relPath` + var name.                                                                                                                             | "Must be aware of what you provide" belongs at _read time_, not _declaration time_. Consistent with G-4 (Path Guards missing-var throws). Closes the silent-empty trap that would otherwise undermine VP-8.                                                                                                                                                                                                                                                                                                             |
| VP-10 | **File formats: `.yaml` / `.yml` / `.json`** for both `valuesFile` and files under `valuesDir`. `.yml` routes through the YAML parser unchanged. INI and other formats rejected (see "rejected").                                                                     | Consistent types across value sources; avoids the stringly-typed footgun INI would introduce vs G-3 (JS-truthy) + VP-9 (strict).                                                                                                                                                                                                                                                                                                                                                                                        |

### Overlap & collision rules (three cases, all hard errors)

| #   | Case                                                                                        | Detection                   | Error message (shape)                                                                          |
| --- | ------------------------------------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------- |
| C-1 | `valuesFile` path is inside `valuesDir`                                                     | Phase 1 (config resolution) | "`valuesFile` 'X' is inside `valuesDir` 'Y'. Move the file out, or drop `valuesDir`."          |
| C-2 | Top-level key in `valuesFile` collides with a top-level namespace scanned from `valuesDir`  | Phase 2 (view build)        | "Duplicate view key 'K' — registered by both: `valuesFile` top-level key, `valuesDir/K.yaml`." |
| C-3 | `valuesDir` produces a top-level namespace named `env` (reserved for environment variables) | Phase 2 (view build)        | "Value partial '{path}' conflicts with reserved 'env' namespace."                              |

All three fail at load, before any rendering. No silent resolution.

### Extension point (value partials)

What's **new** inside Phase 2 (everything else stays):

```mermaid
flowchart LR
  VD[valuesDir] -->|NEW| Scan[scanValuePartials]
  Scan -->|NEW: namespaced subtree| Merge[view assembly]
  VF[valuesFile] -->|existing: root keys| Merge
  EV[allowed env] -->|existing: view.env| Merge
  Merge --> CC{NEW: collision checks C-1..C-3}
  CC -->|ok| View[view]
  CC -->|fail| Err[hard error with file trace]
```

All new code is confined to Phase 2: a `scanValuePartials(valuesDir, ext)` helper in `src/config/` (mirroring `scanPartialFiles` from [partials.js:53](../../../src/engine/partials.js#L53)) plus the three collision checks. Phase 3 is untouched.

### Breaking change

Today's `valuesDir` is a **base-path helper** for resolving `valuesFile` ([resolver.js:15](../../../src/config/resolver.js#L15)). Under this plan it becomes the **value partials root**. This is a semantic break:

- **What breaks**: existing users who rely on `valuesDir: foo` + `valuesFile: app.yaml` to resolve to `foo/app.yaml` must instead write `valuesFile: foo/app.yaml`.
- **Why acceptable**: project is at `v0.0.1`; no CLI flag today; no examples use it; migration is a path-string rewrite in one config key.
- **Documented in**: CHANGELOG at ship time, plus a short "migration" note in the release PR.

### Proposed phases (value partials)

- **Phase 0 (shared prerequisite)** — Extract shared primitives into `src/utils/namespacing.js`: `SEGMENT_RE`, `assertValidSegments`, `deriveNamespace({ relPath, ext })` (returns chain; flattens to `[basename]` when any `@<name>` segment appears), and `assertNoDuplicate`. Update [partials.js](../../../src/engine/partials.js) to consume these; `@` detection becomes root-independent (audit confirms no test depends on the old first-segment-only rule). Tests: the new "any-segment `@` triggers flatten" cases for both systems.
- **Phase 1** — Introduce `scanValuePartials(valuesDir, ext)` under `src/config/valuePartials.js`, built on the namespacing primitives. Unit tests: nested, `@`-flattened at top level, `@`-flattened at nested level (root-independence), invalid segment, duplicate, `env` collision, empty dir, missing dir.
- **Phase 2** — Retire current `valuesDir` base-path behavior. Rewrite [resolver.js](../../../src/config/resolver.js): `valuesDir` now passes to `scanValuePartials`; `valuesFile` is resolved from cwd (no implicit base-path). Update [defaults.js](../../../src/config/defaults.js) comments, [types.js](../../../src/types.js) types.
- **Phase 3** — Integrate into view build: `buildView(rootValues, env, namespaces)`. Implement collision checks C-1, C-2, C-3. Integration tests: one file, dir-only, both, each collision case.
- **Phase 4** — CLI: add `--values-dir DIR` flag alongside existing `--values` in [src/cli/args.js](../../../src/cli/args.js) and usage in [src/cli/usage.js](../../../src/cli/usage.js).
- **Phase 5** — Docs: update [README.md](../../../README.md) CLI table, Quick Start "scale" variant, [docs/API.md](../../../docs/API.md) config schema, migration note. Update [docs/agents/workflows/render-pipeline.workflow.md](../workflows/render-pipeline.workflow.md) with three-phase model.
- **Phase 6** — New example `examples/value-partials/` showing a tree with two environments (`env/dev`, `env/prod`) and a shared root `app.yaml`.
- **Phase 7** — Migration-focused tests: the old `valuesDir = foo + valuesFile = app.yaml` shape should produce a clear error pointing users to the new rule.

**Gate for each phase**: `pnpm test` green + coverage ≥ 99%.

---

## What's rejected (and why — for the record)

- **Plugin / hook system** — violates "no lifecycle, no side effects" in [PRINCIPLES.md](../../../docs/PRINCIPLES.md). If users need mid-pipeline intervention, they compose around `resolveConfig` + `renderDirectory` (already separately exported).
- **Ignore patterns in 0.1.0** — deferred to 0.2.x; Path Guards cover most real-world skip needs more principled. Revisit only with concrete user evidence.
- **Default ignore list** (e.g. auto-ignore `.git`, `node_modules`) — violates "Explicit over Implicit" in [README.md:63](../../../README.md#L63).
- **`else` / `elif` / `and` / `or` / `not` / comparisons in guards** — not v0.1.0, not ever. Path rendering stays dumb. Compound logic goes in values (precomputed boolean) or into two files (`$if` + `$ifn` pair). Principle: "don't compute too much on the path — if you really need that, use filter/ignore or build around the engine."
- **Guards in filenames or mixed with literals in a segment** — parse ambiguity, user surprise, no real-world need. Whole-segment-only, directories-only.
- **Merge-based multi-values** (layered files with precedence, Helm/Ansible-style) — trades predictability for ergonomics. Replaced by Value Partials (namespaced, no merge). Users who want override cascades either pre-merge externally (`yq eval-all`) or, once helpers ship, use a `{{coalesce a b c}}` helper in templates. [README.md:239](../../../README.md#L239) explicitly refused this tradeoff.
- **Root-dependent `@` semantics** (`f.startsWith('@')` — partials' current behavior) — rejected. `@` applying only when the scan root sits directly above the `@` segment means the same file yields different keys under different `valuesDir`/`partialsDir` choices. Value partials are explicitly re-rooted for env selection, which would make this an active footgun. Fixed in VP-7 via "any-segment triggers flatten" — partials gets the same fix as a silent correctness improvement.
- **Preserving old `valuesDir` base-path behavior** — the repurposing of `valuesDir` to mean "value partials root" is a semantic break, acceptable pre-1.0; costs ~4 tests + ~6 doc sections to migrate, all in one commit.
- **Selective loading for `valuesDir` (include/exclude lists) or multi-file `valuesFile`** — rejected for 0.1.0. Include/exclude lists break structural explicitness (VP-4): you'd need to read both the config and the tree to know what's in view. Multi-file `valuesFile` either reintroduces merge/precedence (rejected) or degrades to a low-value array-with-duplicate-throws surface that `valuesDir` already covers better. Extension-filtering + the eventual 0.2.x `ignore` feature cover the real needs.
- **Magic `{}` sentinel for "no values file"** — rejected. Introduces an in-band magic value where every other `valuesFile` value is a path; causes shell-quoting surprises; and is strictly equivalent to making the field absent. Solved instead by VP-8 (optional `valuesFile`).
- **Merging `mergedConfig` into `view`** — rejected. Engine knobs (`templateDir`, `partialsDir`, etc.) don't belong in template scope; "user controls the config file" ≠ "explicit about value provenance." Collision surface (C-2) would explode. If a specific engine-surfaced datum ever needs to reach templates, add a narrow, opt-in reserved namespace (like `view.env.*`) with an allowlist — don't bulk-merge.
- **Pre-rendering value files as Handlebars templates** (inline `{{#if}}` in YAML values, seeded from env + `config.values.*`) — rejected. Re-creates Helm's templated-YAML debuggability cost; weakens "each value has one source" (VP-4); brings back silent-empty via Handlebars defaults. Real use cases are covered by Value Partials (split per env), Path Guards (per-file skip), or `{{#if}}` inside the template body. Revisit only with a concrete case none of those three covers.
- **INI format for values files** — rejected. INI is stringly-typed: `false` loads as `"false"` (JS-truthy), silently subverting G-3. Strict mode (VP-9) can't distinguish "missing" from "empty string". Nesting beyond `[section]` is dialect-dependent. A format whose semantics are _quieter_ than YAML/JSON is opposite the plan's ethos. Users with existing INI files convert once externally (`yq`, configparser).

---

## Execution handoff

When a feature's decisions land and you green-light execution:

1. The corresponding section above becomes the input to **master-plan** skill.
2. A `Round_02.md` (and/or `Round_03.md`) is written under [.agents/plan/cycles/](../../../.agents/plan/cycles/) in the PDCA format (see [Round_01.md](../../../.agents/plan/cycles/Round_01.md)).
3. This plan doc is updated in place: check off the feature and link to the round.
4. Phases commit one-by-one behind their acceptance gates.

**Doc-update division of concerns.** Each phase in this plan names the docs it touches at strategy level (e.g. "update API.md, README.md Quick Start, workflow diagram"). The corresponding `Round_XX.md` expands those bullets into file-level acceptance gates (section anchors, heading text, example README, CHANGELOG entry). The [`doc-update` skill](../../../.agents/skills/doc-update/) handles visibility classification (user-facing vs internal) during execution — no doc classification belongs in this plan.

Until decisions land, **no code changes** — this is a thinking artifact.

---

## Decision log

### Feature 1 — Path Guards: ✅ locked (semantics + implementation)

**Semantic commitments (locked — do not revisit without cause):**

| #      | Decision                                                       |
| ------ | -------------------------------------------------------------- |
| Syntax | `$if{var}` / `$ifn{var}`, whole-segment, directories only      |
| G-1    | Skip-file semantics                                            |
| G-2    | Passing guard collapses to empty segment                       |
| G-3    | JS-truthy                                                      |
| G-4    | Missing var throws                                             |
| G-5    | One guard per segment, whole segment, directories only         |
| G-6    | No `else` / `elif` / `and` / `or` / `not` / comparisons — ever |

**Implementation commitments (locked 2026-04-22):**

| Decision           | Outcome                                                                                                              |
| ------------------ | -------------------------------------------------------------------------------------------------------------------- |
| Conceptual model   | Two operations: **var expansion** (`${var}`, pure string sub) vs **formula** (`$if`/`$ifn`, control-flow decision)   |
| Formula evaluation | Happens in `treeWalker.js` during walk — gets early-exit on skipped subtrees for free                                |
| Expansion          | Stays in `pathRenderer.js` — renderer never sees a live formula                                                      |
| Module split       | `pathSegment.js` (pure classifier) + `pathFormula.js` (view-coupled evaluator)                                       |
| Filename formulas  | Syntax error detected via shared `classifySegment` in pathRenderer                                                   |
| No `PathFilter[]`  | Formulas are a language feature, not a pluggable filter. 0.2.x ignore gets its own shape when designed with context. |

Ready for Round_02 when green-lit (6 phases as listed in the Feature 1 section).

### Feature 2 — Value Partials: ✅ locked

Earlier iterations of this plan explored a merge-based multi-values design (layered files with precedence rules). That was **rejected** after observing that Helm/Ansible-style merges trade predictability for ergonomics — exactly the trade js-tmpl has already refused in [README.md:239](../../../README.md#L239) and [README.md:63](../../../README.md#L63). The partial-analogue design (below) replaced it.

| #        | Decision                                                                                                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Model    | Directory-as-namespace, mirroring template partials at [src/engine/partials.js](../../../src/engine/partials.js)                |
| CLI      | `--values-dir DIR` (new, mirrors `-p, --partials-dir`)                                                                          |
| VP-1     | Namespace by path: `env/prod.yaml` → `view.env.prod.*`                                                                          |
| VP-2     | Segment validation: `/^\w+$/` per segment                                                                                       |
| VP-3     | Duplicate-throws with both paths named                                                                                          |
| VP-4     | No merge, no precedence — each value has one source                                                                             |
| VP-5     | Single `--values FILE` stays flat into root (unchanged)                                                                         |
| VP-6     | `valuesDir` is optional, skipped if absent                                                                                      |
| VP-7     | `@`-segment flatten: any `@<name>` segment in the relative path collapses the chain to filename-as-namespace (root-independent) |
| VP-8     | `valuesFile` is optional (mirrors VP-6); both absent → `view = { env }` only                                                    |
| VP-9     | Handlebars compiled `strict: true`; undefined `{{var}}` throws with `relPath` + var name                                        |
| VP-10    | Supported formats: `.yaml` / `.yml` / `.json`; INI rejected (see "rejected")                                                    |
| C-1      | Overlap: `valuesFile` inside `valuesDir` → hard error at Phase 1                                                                |
| C-2      | Root-vs-namespace key collision → hard error at Phase 2                                                                         |
| C-3      | Reserved `env` namespace collision → hard error at Phase 2                                                                      |
| Breaking | Existing `valuesDir` base-path behavior retires (pre-1.0, documented in CHANGELOG + migration note)                             |

Ready for Round_03 when green-lit.
