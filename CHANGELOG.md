# Changelog

All notable changes to js-tmpl will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.0.1] - 2026-01-20 (Beta Release)

### Added

#### Core Engine

- **Config Resolution System** - Merges CLI args > project config > internal defaults
- **View Builder** - Combines values file data with `process.env`
- **BFS Tree Walker** - Async, non-blocking template discovery
- **Path Renderer** - Renders `${var}` placeholders in file/folder paths
- **Content Renderer** - Full Handlebars template compilation and rendering
- **Partials Manager** - Supports root (`_name.hbs`) and namespaced (`@group/name.hbs`) partials

#### CLI

- Single `render` command with options:
  - `--values` - Values file (YAML/JSON)
  - `--template-dir` - Template directory
  - `--out` - Output directory
  - `--partials-dir` - Partials directory
  - `--ext` - Template file extension
  - `--config-file` - Explicit config file path

#### Configuration

- Auto-discovery of config files:
  - `js-tmpl.config.yaml`
  - `js-tmpl.config.yml`
  - `js-tmpl.config.json`
  - `config/js-tmpl.yaml`
  - `config/js-tmpl.json`
- Support for YAML and JSON values files

#### API

- `resolveConfig(options)` - Configuration resolution
- `renderDirectory(config)` - Main rendering orchestrator

#### Documentation

- Comprehensive README with examples
- Contributing guidelines
- Security policy
- API reference documentation
- Working example: `examples/yaml-templates/`

#### Testing

- 156 comprehensive tests
- 99.8% line coverage
- 99.7% branch coverage
- Unit tests for all layers
- Integration tests for full workflows

### Known Limitations (Beta)

- CLI `--help` flag requires `--values` argument
- No custom Handlebars helpers registration API yet
- No watch mode for development
- No multi-pass rendering orchestration
- No plugin system
- No advanced filtering/ignore rules

### Design Decisions

- **Engine-First**: Programmatic API is primary, CLI is thin wrapper
- **Explicit Configuration**: No magic defaults or auto-detection
- **Deterministic Rendering**: Same input always produces same output
- **Separation of Concerns**: Each layer has single responsibility
- **No Global State**: Partials scoped to render lifecycle

See [docs/PRINCIPLES.md](docs/PRINCIPLES.md) for complete design philosophy.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features and improvements.

## Links

- [GitHub Repository](https://github.com/nci-gis/js-tmpl)
- [NPM Package](https://www.npmjs.com/package/js-tmpl)
- [Documentation](https://github.com/nci-gis/js-tmpl/tree/main/docs)
