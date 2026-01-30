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

- [ ] Custom Handlebars helpers registration API
- [ ] Watch mode for development
- [ ] Multi-pass rendering orchestration **(engine-level only, no orchestration semantics)**
- [ ] CLI `--help` flag that works without `--values`
- [ ] Dry-run mode (`--dry-run`)

> ⚠️ Note: multi-pass here must be explicitly configured, never inferred.

### Error Handling & Clarity (Block-aligned ✅)

- [ ] Enhanced error messages with suggestions
- [ ] Parallel rendering optimization

These directly support:

- [ ] Explicit > Implicit
- [ ] Deterministic > Clever

### ❌ Deferred (not Block)

The following are intentionally deferred to avoid premature scaling:

- [ ] ⏸ Watch mode
- [ ] ⏸ Progress indicators

Reason:

> These features improve developer experience but do not increase correctness.

### Documentation

- [ ] Additional examples (Kubernetes, Terraform, etc.)

## 🟦 0.2.x — Scale Phase: Extension & Performance

### Extensibility (Scale-aligned ✅)

- [ ] Plugin system for extensibility
- [ ] Advanced filtering and ignore rules
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
