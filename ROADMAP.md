# Roadmap

This document outlines the planned features and improvements for js-tmpl.

## Versioning Strategy

- **0.0.x** - Beta releases, API may change
- **0.x.0** - Feature additions, may have breaking changes
- **x.0.0** - Stable API, semantic versioning guarantees

## 🟥 0.1.x — Block Phase: Correctness & Trust

> This phase prioritizes determinism, explicitness, and clear failure modes.
> Convenience and performance are secondary.

### 0.1.0 — Richer Inputs Release

- [x] **Path guards (`$if{var}` / `$ifn{var}`)** — conditional file output via view-driven whole-segment formulas; early-exit on pruned subtrees, visible in the template tree. Shipped in **0.1.0** (Round 02). See [docs/agents/plan/20260418-richer-inputs.plan.md](docs/agents/plan/20260418-richer-inputs.plan.md).
- [x] **Value partials (`--values-dir`)** — compose `view` from multiple structured files by directory namespace, no merge semantics, root-independent `@` flatten, hard errors on collision. Shipped in **0.1.0** (Round 03). See [docs/agents/plan/20260418-richer-inputs.plan.md](docs/agents/plan/20260418-richer-inputs.plan.md).
- [x] **Strict templates** — Handlebars compiled with `strict: true`; missing `{{var}}` throws with template relPath + var name. Shipped in **0.1.0** (Round 03, VP-9).
- [x] **CLI `--help` without `--values`** — closed by VP-8 making `valuesFile` optional. Shipped in **0.1.0**.

Release gate:

- [ ] `pnpm test`
- [ ] `pnpm lint`
- [ ] `pnpm format:check`
- [ ] `pnpm docs:check`
- [ ] `pnpm test:coverage` with coverage >= 99%
- [ ] `npm pack --dry-run` confirms the tarball version, file list, and npm metadata
- [ ] GitHub release workflow bumps `package.json`, regenerates `CHANGELOG.md`, tags the release commit, and publish workflow validates tag == package version

- [x] **Locatable error messages** — Path-guard missing-var, strict-template undefined-var, C-1/C-2/C-3 collision errors all name the source file(s) and variable. Shipped in **0.1.0**.

These directly support:

- [x] Explicit > Implicit
- [x] Deterministic > Clever

### 0.1.1 — CLI Trust & Release Gates

Goal: close small correctness gaps around the command surface and make local
quality gates match release quality gates.

- [ ] **Strict CLI argument validation** — unknown flags, missing option values, and unexpected positional arguments should fail with clear usage guidance.
- [ ] **Hard CI gates** — run `pnpm lint`, `pnpm format:check`, `pnpm docs:check`, and `pnpm test` as blocking checks on PRs and pushes.
- [ ] **Hard release gates** — release and publish workflows should block on the same checks as CI, plus `pnpm test:coverage`.
- [ ] **Release process documentation** — document the release workflow, required manual inputs, and preflight checklist in `CONTRIBUTING.md`.
- [ ] **Further error-message polish** — add recovery suggestions and proximity hints where errors already identify the source.

### 0.1.2 — Template Ergonomics Without Hidden Behavior

Goal: add narrowly scoped authoring conveniences that preserve the pure
`f(config, view, templates) -> files` contract.

- [ ] **Custom Handlebars helpers registration API** — planned via [Round 04](.agents/plan/cycles/Round_04.md); helpers must be explicitly supplied and registered on scoped Handlebars instances.
- [ ] **Helper documentation and examples** — add one minimal example that demonstrates explicit helper registration without introducing lifecycle hooks.
- [ ] **Additional examples** — Kubernetes and Terraform examples, if they can be written as plain richer-inputs examples rather than new engine behavior.

### 0.1.x Candidates Requiring Evidence

These remain possible within 0.1.x, but should not be scheduled without a
concrete issue describing the user problem and acceptance criteria.

- [ ] **Dry-run mode (`--dry-run`)** — useful for trust, but must define output format and failure semantics before implementation.
- [ ] **Multi-pass rendering orchestration** — engine-level only, explicitly configured, no inferred lifecycle or project orchestration.

> ⚠️ Note: multi-pass must be explicitly configured, never inferred.

### ❌ Deferred (not Block)

The following are intentionally deferred to avoid premature scaling:

- [ ] ⏸ Watch mode — DX, not correctness.
- [ ] ⏸ Progress indicators — DX, not correctness.
- [ ] ⏸ Parallel rendering optimization — performance belongs in 0.2.x (Scale phase); must preserve deterministic output.

Reason:

> These features improve developer experience but do not increase correctness.

## 🟦 0.2.x — Scale Phase: Extension & Performance

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
