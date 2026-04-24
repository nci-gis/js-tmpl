# Changelog

All notable changes to js-tmpl will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
