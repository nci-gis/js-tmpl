# Changelog

All notable changes to js-tmpl will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.3] - 2026-09-26

### CI/CD

- Pin actions to commit SHAs and default CI to read-only — Round 12 by @pasxd245

### Documentation

- **plan:** Open Round 12 and add 0.1.3 to ROADMAP — Round 12 by @pasxd245

### Fixed

- **deps:** Raise handlebars to ^4.7.9 and js-yaml to ^4.3.2 — Round 12 by @pasxd245

## [0.1.2] - 2026-09-26

### Documentation

- Reconcile SECURITY.md and ROADMAP with 0.1.1 and 0.1.2 — Round 10 by @pasxd245
- **plan:** Mark Round 10 complete with learnings by @pasxd245

### Fixed

- **config:** Value trees use own properties only — Round 10 by @pasxd245
- **engine:** Stop the template walker on symbolic link cycles — Round 10 by @pasxd245

## [0.1.1] - 2026-09-25

### Added

- **engine:** RegisterHelpers + strict-mode docs — Round 04 by @pasxd245

### CI/CD

- Hard gates, cross-platform matrix and golden examples — Round 05 by @pasxd245

### Documentation

- Add strict optional values roadmap item by @pasxd245
- **plan:** Correct Round 01-03 status by @pasxd245
- **principles:** Add Embedding Rule by @pasxd245
- **roadmap:** Re-plan 0.1.1-0.2.x around trust and embedding by @pasxd245
- **plan:** Missing-value design for Round 07 — spike, handler, collect-all by @pasxd245
- **plan:** Mark Round 04 complete with learnings by @pasxd245
- **plan:** Record Round 05 CI trial and mark it complete by @pasxd245
- **plan:** Record Round 06 CI result by @pasxd245
- **plan:** Mark Round 06 complete with learnings by @pasxd245

### Fixed

- **examples:** Path-guards referenced an empty partials dir git does not track by @pasxd245
- Output confinement, target collisions, strict CLI, node bin — Round 06 by @pasxd245

### Testing

- Make path assertions separator-agnostic for Windows CI by @pasxd245

## [0.1.0] - 2026-04-24

### Added

- **engine:** Path guards $if{var} / $ifn{var} — Round 02 by @pasxd245
- **config:** Value partials + strict templates — Round 03 by @pasxd245

### Documentation

- Add Round 01 plan for registerHelpers API by @pasxd245
- Add cleanup task to Round 01 plan to remove unused config package by @pasxd245
- **plan:** Brainstorm richer-inputs — path guards + value partials by @pasxd245
- **plan:** Finalize richer-inputs + draft Round_02, Round_03 by @pasxd245
- **plan:** Add Round_04 to formally resume Round_01's deferred scope by @pasxd245
- **roadmap:** Reconcile with v0.1.0 shipped scope by @pasxd245
- Attach walkTemplateTree JSDoc to its declaration by @pasxd245
- Refine roadmap release plan by @pasxd245

### Miscellaneous

- Add code-conventions skill, refine doc-update, and add TS analysis by @pasxd245
- Add handlebars-helpers skill for helper registration guidance by @pasxd245
- Enforce conventional commits via commitlint husky hook by @pasxd245
- **scripts:** Add code-review-graph wrapper with uv-based setup by @pasxd245
- **format:** Fix the files format by @pasxd245
- Add markdown formatting scripts by @pasxd245

## [0.0.1] - 2026-04-05

### Added

- Add environment variable allowlisting with envKeys and envPrefix by @pasxd245
- Accept optional Handlebars instance in renderDirectory by @pasxd245

### Build

- Add prettier, husky, and lint-staged by @pasxd245

### Changed

- Redesign partial system with optional partialsDir by @pasxd245

### Documentation

- Eliminate duplication via SSOT and add doc automation by @pasxd245

### Fixed

- Add JSDoc type annotations for checkJs compatibility by @pasxd245

### Miscellaneous

- Restructure agent knowledge base and add analysis docs by @pasxd245

### Styling

- Format src and tests with prettier by @pasxd245

## [0.0.1-beta.2] - 2026-02-09

### Added

- V0.0.1-beta - foundation with comprehensive test suite by @pasxd245

### CI/CD

- **publish:** Migrate to OIDC trusted publishing for npm by @pasxd245
- Add prerelease flow by @pasxd245
- Modify publish workflow by @pasxd245

### Changed

- **config:** Remove auto-discovery, implement explicit valuesDir path resolution by @pasxd245

### Documentation

- Refresh documentation hub and roadmap by @pasxd245

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features and improvements.

## Links

- [GitHub Repository](https://github.com/nci-gis/js-tmpl)
- [NPM Package](https://www.npmjs.com/package/@nci-gis/js-tmpl)
- [Documentation](https://github.com/nci-gis/js-tmpl/tree/main/docs)
