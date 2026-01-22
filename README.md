# js-tmpl

> A lightweight, deterministic file templating engine built on Handlebars

[![npm version](https://img.shields.io/npm/v/js-tmpl.svg)](https://www.npmjs.com/package/js-tmpl)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is js-tmpl?

js-tmpl is a **pure transformation layer** that generates files and directory structures from templates with predictable, explicit behavior.

It's designed for:

- DevOps configuration management
- Code scaffolding and generation
- Multi-environment deployments
- Project template systems

**Not a framework. Not a workflow tool. Just a focused rendering engine.**

## Why js-tmpl?

Most template tools are either too simple (basic string replacement) or too complex (opinionated frameworks). js-tmpl fills the gap:

- ✅ **Engine-First**: Programmatic API, CLI is secondary
- ✅ **Deterministic**: Same input → same output, always
- ✅ **Explicit**: No magic defaults or hidden conventions
- ✅ **Composable**: Small, focused layers
- ✅ **Embeddable**: Designed to integrate into larger tools

See [docs/00-Motivation.md](docs/00-Motivation.md) for the full story.

## Features

- 🎯 **Dynamic File Paths** - Use `${var}` placeholders in paths and filenames
- 🧩 **Handlebars Templates** - Full Handlebars feature set (loops, conditionals, helpers)
- 📦 **Partial System** - Reusable components with root and namespaced partials
- ⚙️ **Flexible Configuration** - CLI args > project config > defaults
- 🌲 **BFS Tree Walking** - Async, non-blocking template discovery
- 🔒 **No Global State** - Isolated render passes, no pollution
- 📝 **YAML/JSON Support** - Load values from either format

## Installation

```bash
npm install js-tmpl
```

**Requirements:** Node.js ≥ 20

## Quick Start

### 1. Create a values file

```yaml
# values.yaml
project:
  name: my-app
  version: 1.0.0

config:
  port: 3000
  host: localhost
```

### 2. Create templates

```text
templates/
├── ${project.name}/
│   └── config.json.hbs
└── README.md.hbs
```

**Template content** (`templates/${project.name}/config.json.hbs`):

```handlebars
{
  "name": "{{project.name}}",
  "version": "{{project.version}}",
  "server": {
    "port": {{config.port}},
    "host": "{{config.host}}"
  }
}
```

### 3. Render templates

**CLI:**

```bash
js-tmpl render --values values.yaml
```

**Programmatic API:**

```javascript
import { resolveConfig, renderDirectory } from 'js-tmpl';

const config = resolveConfig({
  valuesFile: './values.yaml',
  templateDir: './templates',
  outDir: './dist'
});

await renderDirectory(config);
```

### 4. Get output

```text
dist/
├── my-app/
│   └── config.json
└── README.md
```

## Core Concepts

### Configuration Precedence

```text
CLI arguments
  > Project config file (js-tmpl.config.yaml)
    > Internal defaults
```

### View Model

Templates receive a view object:

```javascript
{
  ...valuesFromFile,  // Your YAML/JSON data
  env: process.env    // Environment variables
}
```

Access in templates:

```handlebars
{{project.name}}
{{env.NODE_ENV}}
```

### Path Rendering

Use `${var}` in file/folder paths:

```text
templates/
└── ${env.NODE_ENV}/
    └── config-${project.name}.yaml.hbs

→ dist/production/config-my-app.yaml
```

### Partial System

**Root partials** (`_name.hbs`):

```text
templates.partials/
└── _header.hbs  → {{> header}}
```

**Namespaced partials** (`@group/name.hbs`):

```text
templates.partials/
└── @common/
    └── metadata.hbs  → {{> common.metadata}}
```

## CLI Reference

```bash
js-tmpl render [options]
```

### Options

| Option                   | Description             | Default              |
| ------------------------ | ----------------------- | -------------------- |
| `-c, --values FILE`      | Values file (YAML/JSON) | **Required**         |
| `-t, --template-dir DIR` | Template directory      | `templates`          |
| `-o, --out DIR`          | Output directory        | `dist`               |
| `-p, --partials-dir DIR` | Partials directory      | `templates.partials` |
| `-x, --ext EXT`          | Template extension      | `.hbs`               |
| `--config-file FILE`     | Explicit config file    | Auto-discovered      |

### Examples of Usage

```bash
# Basic usage
js-tmpl render --values data.yaml

# Custom directories
js-tmpl render \
  --values data.yaml \
  --template-dir ./my-templates \
  --out ./output

# Multi-environment
NODE_ENV=production js-tmpl render --values prod-values.yaml
```

## Programmatic API

See [docs/API.md](docs/API.md) for comprehensive API documentation.

### Import

```javascript
import { resolveConfig, renderDirectory } from 'js-tmpl';
```

### resolveConfig(options)

Resolves configuration with proper precedence.

**Parameters:**

- `options.valuesFile` (string, required) - Path to values file
- `options.templateDir` (string) - Template directory path
- `options.partialsDir` (string) - Partials directory path
- `options.outDir` (string) - Output directory path
- `options.extname` (string) - Template file extension
- `options.configFile` (string) - Explicit config file path

**Returns:** Resolved configuration object

### renderDirectory(config)

Executes the rendering process.

**Parameters:**

- `config` (object) - Configuration from `resolveConfig`

**Returns:** Promise that resolves when rendering completes

### Example

```javascript
import { resolveConfig, renderDirectory } from 'js-tmpl';

const config = resolveConfig({
  valuesFile: './values.yaml',
  templateDir: './templates',
  partialsDir: './partials',
  outDir: './dist'
});

await renderDirectory(config);
console.log('✅ Rendering complete');
```

## Project Configuration

Create `js-tmpl.config.yaml` in your project root:

```yaml
templateDir: templates
partialsDir: templates.partials
outDir: dist
extname: .hbs
```

Auto-discovered config files (in order):

1. `js-tmpl.config.yaml`
2. `js-tmpl.config.yml`
3. `js-tmpl.config.json`
4. `config/js-tmpl.yaml`
5. `config/js-tmpl.json`

## Examples

See [examples/yaml-templates/](examples/yaml-templates/) for a complete working example demonstrating:

- Dynamic file paths with `${env.NODE_ENV}`
- Handlebars features (loops, conditionals)
- Root and namespaced partials
- Multi-format output (YAML, Markdown)

## Testing

This project has comprehensive test coverage:

- 156 tests
- 99.8% line coverage
- 99.7% branch coverage

See [tests/README.md](tests/README.md) for testing documentation.

## Development Principles

js-tmpl follows strict design principles:

1. **Engine First, CLI Second** - Programmatic API is primary
2. **Explicit Over Implicit** - No magic or hidden conventions
3. **Deterministic Over Clever** - Predictable behavior
4. **Separation of Concerns** - Each layer has one responsibility
5. **Composable Over Monolithic** - Small, focused functions
6. **Simple Over Feature-Rich** - Minimal API surface

See [docs/PRINCIPLES.md](docs/PRINCIPLES.md) for details.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for planned features and improvements.

See [CHANGELOG.md](CHANGELOG.md) for version history.

## Contributing

We welcome contributions! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.
For maintainers: See [CONTRIBUTING.md#release-process](CONTRIBUTING.md#release-process) for release instructions.

## Installing Pre-release Versions

```bash
# Stable (latest)
npm install js-tmpl

# Beta
npm install js-tmpl@beta

# Alpha
npm install js-tmpl@alpha
```

## Security

For security concerns, see [SECURITY.md](SECURITY.md).

## License

MIT © pasxd245

## Links

- [Documentation](docs/)
- [Examples](examples/)
- [Issue Tracker](https://github.com/nci-gis/js-tmpl/issues)
- [NPM Package](https://www.npmjs.com/package/js-tmpl)
