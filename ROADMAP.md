# Roadmap

This document outlines the planned features and improvements for js-tmpl.

## Versioning Strategy

- **0.0.x** - Beta releases, API may change
- **0.x.0** - Feature additions, may have breaking changes
- **x.0.0** - Stable API, semantic versioning guarantees

## Node.js Support

- **Primary**: 22, 24
- **Compatible**: 20

## Milestones

Direction, not a contract — revised as real usage produces evidence.
Milestones are themes, not a queue: cheap items from a later milestone may
land early.

| Milestone             | Versions      | Goal                                                         |
| --------------------- | ------------- | ------------------------------------------------------------ |
| M1 Trustworthy Core   | 0.1.1 – 0.2.0 | Every promise (strictness, gates, coverage) machine-checked. |
| M2 Explainable Output | 0.2.0 – 0.2.x | Every output file traceable to its template, guards, values. |
| M3 Community-Ready    | 0.3.x         | Others can use, embed, and contribute without asking.        |
| M4 Trust Contract     | 1.0.0         | Stable API, semver and support guarantees.                   |

Scale work (0.4.x) follows only once real users show where scale is needed.

## 🟥 0.1.x — Block Phase: Correctness & Trust

> This phase prioritizes determinism, explicitness, and clear failure modes.
> Convenience and performance are secondary.

### 0.1.0 — Richer Inputs Release

- [x] **Path guards (`$if{var}` / `$ifn{var}`)** — conditional file output via view-driven whole-segment formulas; early-exit on pruned subtrees, visible in the template tree. Shipped in **0.1.0** (Round 02). See [docs/agents/plan/20260418-richer-inputs.plan.md](docs/agents/plan/20260418-richer-inputs.plan.md).
- [x] **Value partials (`--values-dir`)** — compose `view` from multiple structured files by directory namespace, no merge semantics, root-independent `@` flatten, hard errors on collision. Shipped in **0.1.0** (Round 03). See [docs/agents/plan/20260418-richer-inputs.plan.md](docs/agents/plan/20260418-richer-inputs.plan.md).
- [x] **Strict templates** — Handlebars compiled with `strict: true`; missing `{{var}}` throws with template relPath + var name. Shipped in **0.1.0** (Round 03, VP-9).
- [x] **CLI `--help` without `--values`** — closed by VP-8 making `valuesFile` optional. Shipped in **0.1.0**.

Release gate: not machine-checked for 0.1.0. From 0.1.1 every item —
tests, lint, format, docs, coverage ≥ 99%, package contents — runs as
`pnpm verify` in CI, release, and publish ([Round 05](.agents/plan/cycles/Round_05.md)).
The publish workflow still validates tag == `package.json` version.

- [x] **Locatable error messages** — Path-guard missing-var, strict-template undefined-var, C-1/C-2/C-3 collision errors all name the source file(s) and variable. Shipped in **0.1.0**.

These directly support:

- [x] Explicit > Implicit
- [x] Deterministic > Clever

### 0.1.1 — Trust Fixes, Gates & Helpers

Fixes and additive features only. Consumers on `^0.1.0` receive 0.1.x
automatically, so nothing here may break documented behaviour.

- [ ] **Custom Handlebars helpers** — `registerHelpers(hbs, map)` on scoped instances, purity contract, `examples/helpers/`, optional-values patterns under strict mode ([Round 04](.agents/plan/cycles/Round_04.md)).
- [ ] **Hard CI & release gates** — one `pnpm verify` (lint, format, docs, coverage ≥ 99%) in CI, release and publish; Node/OS matrix; package contents check; golden example tests; release docs ([Round 05](.agents/plan/cycles/Round_05.md)).
- [ ] **Output confinement (security)** — a rendered path can never escape `outDir` ([Round 06](.agents/plan/cycles/Round_06.md)).
- [ ] **Target collisions** — two templates rendering to one path is an error, not an overwrite ([Round 06](.agents/plan/cycles/Round_06.md)).
- [ ] **Strict CLI** — unknown flags, missing values and stray arguments fail with usage guidance; exit codes `0`/`1`/`2`; Node `bin` entry ([Round 06](.agents/plan/cycles/Round_06.md)).

### 0.1.x Candidates Requiring Evidence

These remain possible within 0.1.x, but should not be scheduled without a
concrete issue describing the user problem and acceptance criteria.

- [ ] ~~**Dry-run mode (`--dry-run`)**~~ — superseded by `--check` in 0.2.0 (defined output format and failure semantics).
- [ ] **Multi-pass rendering orchestration** — engine-level only, explicitly configured, no inferred lifecycle or project orchestration.

> ⚠️ Note: multi-pass must be explicitly configured, never inferred.

### ❌ Deferred (not Block)

The following are intentionally deferred to avoid premature scaling:

- [ ] ⏸ Watch mode — DX, not correctness.
- [ ] ⏸ Progress indicators — DX, not correctness.
- [ ] ⏸ Parallel rendering optimization — performance belongs in 0.4.x (Scale phase); must preserve deterministic output.

Reason:

> These features improve developer experience but do not increase correctness.

## 🟨 0.2.x — Strict Contract & Explainable Output (M1 → M2)

> Value partials give every value exactly one source (VP-4) and path guards
> are visible in the tree. That makes output traceable by construction —
> something merge-based tools cannot offer.

### 0.2.0 — No Silent Outcomes + Render Plan (breaking)

- [ ] **`${missing}` throws** — path interpolation joins G-4 / VP-9; interpolated values must be a single path segment ([Round 07](.agents/plan/cycles/Round_07.md)).
- [ ] **Strict helper arguments** — a missing variable passed to a helper (`{{#if missing}}`, `{{upper missing}}`) throws like `{{missing}}` ([Round 07](.agents/plan/cycles/Round_07.md)).
- [ ] **Engine API does not auto-discover config** — discovery becomes CLI-only ([Round 07](.agents/plan/cycles/Round_07.md)).
- [ ] **Stable error codes** — `JsTmplError` with `code` / `hint` / `cause`, documented as public API ([Round 07](.agents/plan/cycles/Round_07.md)).
- [ ] **`planRender()`** — the engine's decisions as data, without writing ([Round 08](.agents/plan/cycles/Round_08.md)).
- [ ] **`--check`** — fail CI when committed output drifts; exit `3` ([Round 08](.agents/plan/cycles/Round_08.md)). Replaces the 0.1.x "dry-run" candidate.

### 0.2.x — Explain

- [ ] **`--explain` / provenance** — per output file: source template, guards passed/pruned, value sources read; caller-supplied values labelled as such ([Round 09](.agents/plan/cycles/Round_09.md)).

## 🟪 0.3.x — Community-Ready (M3)

- [ ] **Template-tree spec + conformance suite** — path language (`${}`, `$if`/`$ifn`, `@` flatten, namespacing, strict mode) written down and tested as a spec.
- [ ] **TypeScript declarations** — handwritten `.d.ts` for the public API.
- [ ] **RFC process** — required for any change touching [PRINCIPLES.md](docs/PRINCIPLES.md).
- [ ] **Community files** — `SECURITY.md`, issue/PR templates, good-first-issue labels.
- [ ] **Embedding case studies** — at least one real system built on js-tmpl.
- [ ] **Real-world examples** — e.g. Kubernetes multi-environment, written with existing features only.

## 🟦 0.4.x — Scale Phase: Extension & Performance

Entry criteria:

- [ ] 0.1.x command behavior is strict and documented.
- [ ] Release workflow gates are blocking and match local gates.
- [ ] At least one real user case demonstrates that path guards and value partials are insufficient for the proposed scale feature.

### Extensibility (Scale-aligned ✅)

- [ ] Plugin system for extensibility — requires principle review before design work.
- [ ] Advanced filtering and ignore rules — **deferred from 0.1.x**; path guards (0.1.0) cover most real-world skip needs via `view` data. Revisit only with concrete user cases that guards can't express; decide then whether ignore earns a second skip mechanism. Rationale: [docs/agents/plan/20260418-richer-inputs.plan.md#why-ignore-was-deferred](docs/agents/plan/20260418-richer-inputs.plan.md#why-ignore-was-deferred).
- [ ] Custom path placeholder syntax configuration — requires a compatibility story for existing `${var}` paths and guard syntax.

> These extend capability without changing the engine’s role.

### Performance & Efficiency (Scale-aligned ✅)

- [ ] Incremental rendering (only changed files)
- [ ] Performance benchmarks
- [ ] Memory optimization for large template sets

Important constraint:

> Optimizations must preserve deterministic output.

### ⚠️ High-risk Scale Features (Require Principle Review)

- [ ] Streaming rendering for massive outputs
- [ ] Template inheritance system

These must pass:

- [ ] Deterministic > Clever
- [ ] Separation of Concerns

## 🟩 1.0.0 — Stabilization & Commitment

> This is **not a feature phase**.
> This is **a trust contract phase**.

Stable release with:

- [ ] Stable API guarantees
- [ ] Backward compatibility commitment
- [ ] Comprehensive real-world examples covering path guards, value partials, partials, env allowlisting, and helper registration
- [ ] Complete release, migration, and support documentation
- [ ] CI/release gates that are mandatory and documented
- [ ] Public API review: exported functions, config schema, CLI flags, error semantics, and package contents

This phase answers:

> “Can I build long-lived systems on top of js-tmpl?”

❗ The following remain intentionally out of scope across all phases:

- Workflow orchestration
- Project lifecycle management
- State persistence
- Convention-based inference

## Contributing to the Roadmap

Have a feature request or suggestion? Please [open an issue](https://github.com/nci-gis/js-tmpl/issues) to discuss it.

## Links

- [CHANGELOG.md](CHANGELOG.md) - Version history
- [CONTRIBUTING.md](CONTRIBUTING.md) - How to contribute
- [GitHub Issues](https://github.com/nci-gis/js-tmpl/issues) - Feature requests and bugs
