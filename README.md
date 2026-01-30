# js-tmpl

> A lightweight, deterministic file templating engine built on Handlebars.
> An explicit file templating engine for developers who care about **control, predictability, and composability**.

[![npm version](https://img.shields.io/npm/v/@nci-gis/js-tmpl.svg)](https://www.npmjs.com/package/@nci-gis/js-tmpl)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is js-tmpl?

js-tmpl is a **pure transformation layer** that turns **templates + data → files**, nothing more, nothing less.

It's designed for:

- DevOps configuration management
- Code scaffolding and generation
- Multi-environment deployments
- Project template systems

**Not a framework. Not a workflow tool. Just a focused rendering engine.**

## Is js-tmpl for you?

js-tmpl is a good fit if you:

- embed templating inside other tools or pipelines
- want **the same input to always produce the same output**
- prefer explicit configuration over conventions
- need programmatic control, not just a CLI

It may **not** be a good fit if you want:

- opinionated project generators
- convention-based magic
- interactive scaffolding workflows

## Why js-tmpl?

Most templating tools fail in one of two ways:

- they are too simple to scale beyond string replacement
- or too opinionated to embed safely in larger systems

js-tmpl sits intentionally in between.

See [Motivation](docs/Motivation.md) - The full story.
See [Design Principles](docs/PRINCIPLES.md) - Core philosophy guiding all decisions.

## Features

- 🎯 **Dynamic File Paths** - Use `${var}` placeholders in paths and filenames
- 🧩 **Handlebars Templates** - Full Handlebars feature set (loops, conditionals, helpers)
- 📦 **Partial System** - Reusable components with root and namespaced partials
- ⚙️ **Flexible Configuration** - CLI args > project config > defaults
- 🌲 **BFS Tree Walking** - Async, non-blocking template discovery
- 🔒 **No Global State** - Isolated render passes, no pollution
- 📝 **YAML/JSON Support** - Load values from either format

## Fixed Rules for Minimal Auto-Discovery

js-tmpl follows the principle **"Explicit Over Implicit"** - most configuration must be provided explicitly. However, for developer convenience, exactly **ONE** type of auto-discovery is allowed:

### Project Configuration File (Optional)

js-tmpl will search for a project config file in **exactly these locations**, in this order, relative to the current working directory:

1. `js-tmpl.config.yaml` (highest priority)
2. `js-tmpl.config.yml`
3. `js-tmpl.config.json`
4. `config/js-tmpl.yaml`
5. `config/js-tmpl.json` (lowest priority)

**First match wins.** If no config file is found, internal defaults are used.

### What is NOT Auto-Discovered

Everything else must be **explicitly specified**:

- ✅ **Values file** - Required via `--values` flag or `valuesFile` config
- ✅ **Template directory** - Must be in config or defaults to `templates/`
- ✅ **Output directory** - Must be in config or defaults to `dist/`
- ✅ **Partials directory** - Must be in config or defaults to `templates.partials/`

### Override Auto-Discovery

You can bypass auto-discovery entirely:

```bash
# Explicit config file (no auto-discovery)
js-tmpl render --values data.yaml --config-file /path/to/custom-config.yaml

# No config file (use defaults only)
js-tmpl render --values data.yaml --template-dir ./templates --out ./dist
```

### Why These Rules?

1. **Predictable** - Fixed search order, no magic
2. **Minimal** - Only config file location is auto-discovered
3. **Overridable** - Always use `--config-file` for explicit control
4. **Documented** - You're reading the complete list right now

**These are the ONLY auto-discovery rules. Nothing else is implicit.**

## Installation

```bash
npm install @nci-gis/js-tmpl
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
import { resolveConfig, renderDirectory } from '@nci-gis/js-tmpl';

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

## Mental Model

> ⚠️ Design note
> js-tmpl prefers failing loudly over guessing silently.

Think of js-tmpl as a function:

```text
(input templates, data, config) → output files
```

There is no hidden state, no lifecycle, and no side effects.
If you need orchestration, state, or interactivity, build it **around** js-tmpl — not inside it.

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
import { resolveConfig, renderDirectory } from '@nci-gis/js-tmpl';
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
import { resolveConfig, renderDirectory } from '@nci-gis/js-tmpl';

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
npm install @nci-gis/js-tmpl

# Beta
npm install @nci-gis/js-tmpl@beta

# Alpha
npm install @nci-gis/js-tmpl@alpha
```

## Security

For security concerns, see [SECURITY.md](SECURITY.md).

## License

MIT © pasxd245

## Learn More

### 📚 Documentation

- **[📖 Documentation Hub](docs/ToC.md)** - Complete documentation index with learning paths
- [Design Principles](docs/PRINCIPLES.md) - Core philosophy guiding all decisions
- [Workflow Overview](docs/WORKFLOW.md) - Visual diagrams of the rendering pipeline
- [API Reference](docs/API.md) - Complete programmatic API documentation
- [Motivation](docs/Motivation.md) - Why js-tmpl exists and our vision

### 🔗 Others

- [Examples](examples/) - Working examples and templates
- [Issue Tracker](https://github.com/nci-gis/js-tmpl/issues) - Report bugs or request features
- [NPM Package](https://www.npmjs.com/package/@nci-gis/js-tmpl) - Package registry
