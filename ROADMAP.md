# Roadmap

This document outlines the planned features and improvements for js-tmpl.

## Versioning Strategy

- **0.0.x** - Beta releases, API may change
- **0.x.0** - Feature additions, may have breaking changes
- **x.0.0** - Stable API, semantic versioning guarantees

## 🟥 0.1.x — Block Phase: Correctness & Trust

> This phase prioritizes determinism, explicitness, and clear failure modes.
> Convenience and performance are secondary.

### Core Engine (Block-aligned ✅)

- [x] **Path guards (`$if{var}` / `$ifn{var}`)** — conditional file output via view-driven whole-segment formulas; early-exit on pruned subtrees, visible in the template tree. Shipped in **0.1.0** (Round 02). See [docs/agents/plan/20260418-richer-inputs.plan.md](docs/agents/plan/20260418-richer-inputs.plan.md).
- [x] **Value partials (`--values-dir`)** — compose `view` from multiple structured files by directory namespace, no merge semantics, root-independent `@` flatten, hard errors on collision. Shipped in **0.1.0** (Round 03). See [docs/agents/plan/20260418-richer-inputs.plan.md](docs/agents/plan/20260418-richer-inputs.plan.md).
- [x] **Strict templates** — Handlebars compiled with `strict: true`; missing `{{var}}` throws with template relPath + var name. Shipped in **0.1.0** (Round 03, VP-9).
- [x] **CLI `--help` without `--values`** — closed by VP-8 making `valuesFile` optional. Shipped in **0.1.0**.
- [ ] Custom Handlebars helpers registration API (planned for 0.1.1, see [Round 04](.agents/plan/cycles/Round_04.md))
- [ ] Multi-pass rendering orchestration **(engine-level only, no orchestration semantics)** — speculative; open an issue with a concrete case before this earns a version.
- [ ] Dry-run mode (`--dry-run`) — planned for a later 0.1.x minor.

> ⚠️ Note: multi-pass here must be explicitly configured, never inferred.

### Error Handling & Clarity (Block-aligned ✅)

- [x] **Locatable error messages** — Path-guard missing-var, strict-template undefined-var, C-1/C-2/C-3 collision errors all name the source file(s) and variable. Shipped in **0.1.0**.
- [ ] Further error-message polish (suggestions, proximity hints) — planned for a later 0.1.x minor.

These directly support:

- [x] Explicit > Implicit
- [x] Deterministic > Clever

### ❌ Deferred (not Block)

The following are intentionally deferred to avoid premature scaling:

- [ ] ⏸ Watch mode — DX, not correctness.
- [ ] ⏸ Progress indicators — DX, not correctness.
- [ ] ⏸ Parallel rendering optimization — performance belongs in 0.2.x (Scale phase); must preserve deterministic output.

Reason:

> These features improve developer experience but do not increase correctness.

### Documentation

- [ ] Additional examples (Kubernetes, Terraform, etc.)

## 🟦 0.2.x — Scale Phase: Extension & Performance

### Extensibility (Scale-aligned ✅)

- [ ] Plugin system for extensibility
- [ ] Advanced filtering and ignore rules — **deferred from 0.1.x**; path guards (0.1.0) cover most real-world skip needs via `view` data. Revisit only with concrete user cases that guards can't express; decide then whether ignore earns a second skip mechanism. Rationale: [docs/agents/plan/20260418-richer-inputs.plan.md#why-ignore-was-deferred](docs/agents/plan/20260418-richer-inputs.plan.md#why-ignore-was-deferred).
- [ ] Custom path placeholder syntax configuration

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
- [ ] Comprehensive real-world examples
- [ ] Enterprise documentation

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
