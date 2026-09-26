# js-tmpl

> A lightweight, deterministic file templating engine built on Handlebars.
>
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
- 🧩 **Handlebars Templates** - Full Handlebars feature set (loops, conditionals, partials)
- 🛠️ **Custom Helpers** - `registerHelpers` on a scoped instance, validated and atomic
- 📦 **Partial System** - Reusable components with root and namespaced partials
- ⚙️ **Flexible Configuration** - CLI args > project config > defaults
- 🌲 **BFS Tree Walking** - Async, non-blocking template discovery
- 🔒 **No Global State** - Isolated render passes, no pollution
- 📝 **YAML/JSON Support** - Load values from either format

## Fixed Rules for Minimal Auto-Discovery

js-tmpl follows the principle **"Explicit Over Implicit"** - most configuration must be provided explicitly. However, for developer convenience, exactly **ONE** type of auto-discovery is allowed, and only in the **CLI**:

### Project Configuration File (Optional)

The `js-tmpl` CLI searches for a project config file in **exactly these locations**, in this order, relative to the current working directory:

1. `js-tmpl.config.yaml` (highest priority)
2. `js-tmpl.config.yml`
3. `js-tmpl.config.json`
4. `config/js-tmpl.yaml`
5. `config/js-tmpl.json` (lowest priority)

**First match wins.** If no config file is found, internal defaults are used.

The programmatic API never searches: `resolveConfig()` reads a config file
only when given `configFile`. Call `findProjectConfig(cwd)` to get the CLI's
behaviour.

### What is NOT Auto-Discovered

Everything else must be **explicitly specified**:

- ✅ **Values file** — Optional via `--values` flag or `valuesFile` config (VP-8)
- ✅ **Values directory** — Optional via `--values-dir` flag or `valuesDir` config (VP-6)
- ✅ **Template directory** — Must be in config or defaults to `templates/`
- ✅ **Output directory** — Must be in config or defaults to `dist/`
- ✅ **Partials directory** — Must be in config; not loaded if omitted

### Override Auto-Discovery

Name the file explicitly and no search happens:

```bash
js-tmpl render --values data.yaml --config-file /path/to/custom-config.yaml
```

CLI options always win over the config file, so
`--template-dir ./templates --out ./dist` overrides those two keys even when
a discovered config file sets them.

### Why These Rules?

1. **Predictable** - Fixed search order, no magic
2. **Minimal** - Only the config file location is auto-discovered, and only by the CLI
3. **Overridable** - Always use `--config-file` for explicit control
4. **Documented** - You're reading the complete list right now

**These are the ONLY auto-discovery rules. Nothing else is implicit.**

## Installation

```bash
npm install @nci-gis/js-tmpl
```

**Requirements:** Node.js ≥ 22

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
{ "name": "{{project.name}}", "version": "{{project.version}}", "server": {
"port":
{{config.port}}, "host": "{{config.host}}" } }
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
  outDir: './dist',
});

await renderDirectory(config);
```

**With custom helpers:**

```javascript
import Handlebars from 'handlebars';
import {
  registerHelpers,
  renderDirectory,
  resolveConfig,
} from '@nci-gis/js-tmpl';

const hbs = Handlebars.create();
registerHelpers(hbs, { upper: (s) => s.toUpperCase() });

await renderDirectory(resolveConfig({ valuesFile: './values.yaml' }), hbs);
```

Helpers must be pure functions. Strict mode applies to their arguments too:
`{{upper missing}}` throws; see
[Strict templates](docs/API.md#strict-templates).

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

Templates receive a view object containing your values data plus an `env` object with allowlisted environment variables. The `env` key is reserved — if your values file contains a top-level `env` key, a warning is logged and it is overwritten.

Use `envKeys` and `envPrefix` in your config file or via CLI (`--env-keys`, `--env-prefix`) to control which environment variables are exposed. Without either, `env` is an empty object `{}`.

See [docs/API.md](docs/API.md#view-object) for full details, examples, and recommended conventions.

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

Use `$if{var}` / `$ifn{var}` as whole directory segments to conditionally
include or skip files based on view data:

```text
templates/
├── common.yaml.hbs
├── $if{prod}/
│   └── alerts.yaml.hbs          → written only when view.prod is truthy
└── $ifn{prod}/
    └── debug-panel.yaml.hbs     → written only when view.prod is falsy
```

Guards are directory-only, whole-segment, and throw loudly on missing
variables. See [API docs](docs/API.md#path-guards--conditional-files) for
the full semantics and rejected variants.

### Partial System

Each render pass uses an isolated Handlebars instance. Directory structure maps to partial names:

```text
templates.partials/
├── header.hbs                → {{> header}}
├── components/
│   ├── button.hbs           → {{> components.button}}
│   └── forms/
│       └── login.hbs        → {{> components.forms.login}}
```

**`@` directories** flatten their contents (filename only, no namespace):

```text
├── @helpers/
│   └── date.hbs             → {{> date}}
```

Duplicate partial names throw an error. Names must be alphanumeric + underscore only. See [API docs](docs/API.md#partial-system) for details.

## Mental Model

> ⚠️ Design note
> js-tmpl prefers failing loudly over guessing silently.

Think of js-tmpl as a function:

```text
f(config, values/view, input templates) → files (output)
```

There is no hidden state, no lifecycle, and no side effects.
If you need orchestration, state, or interactivity, build it **around** js-tmpl — not inside it.

## CLI Reference

```bash
js-tmpl render [options]
```

### Options

| Option                   | Description                                | Default         |
| ------------------------ | ------------------------------------------ | --------------- |
| `-c, --values FILE`      | Values file (`.yaml` / `.yml` / `.json`)   | Optional        |
| `--values-dir DIR`       | Value-partials root (namespaced by path)   | Optional        |
| `-t, --template-dir DIR` | Template directory                         | `templates`     |
| `-o, --out DIR`          | Output directory                           | `dist`          |
| `-p, --partials-dir DIR` | Partials directory                         | None (skipped)  |
| `-x, --ext EXT`          | Template extension                         | `.hbs`          |
| `--config-file FILE`     | Explicit config file                       | Auto-discovered |
| `--env-keys KEYS`        | Comma-separated env var names to expose    | None            |
| `--env-prefix PREFIX`    | Auto-include env vars with this prefix     | None            |
| `--check`                | Compare with the output dir; write nothing | Off             |
| `--verbose`              | Print stack traces on error                | Off             |
| `-h, --help`             | Show usage                                 |                 |

The CLI is strict: an unknown option, an option without its value, a
repeated option, or an unexpected argument is an error. Exit codes: `0`
success, `1` render or configuration error, `2` usage error, `3` `--check`
found out-of-date output.

Every problem in a run is reported at once (each failing guard and path
variable, and the first missing value in each template), and nothing is
written unless the whole render succeeds.

### Using js-tmpl in CI

Commit the generated files, then fail the build when someone changes
templates or values without re-rendering:

```bash
js-tmpl render --values values.yaml --check
```

```text
changed config/app.yaml
added   config/worker.yaml
js-tmpl: 2 of 14 files out of date (1 added, 1 changed). Run without --check to update.
```

`--check` renders in memory and writes nothing. It exits `0` only if a render
would succeed and change nothing; when a render would fail, it fails the same
way (exit `1`).

- **Line endings:** keep Git from converting generated files, or a CRLF
  checkout (Windows `core.autocrlf`) shows every file as changed. In
  `.gitattributes`: `dist/** -text` (use your output directory).
- **Stale files:** files in the output directory that the templates no
  longer produce are ignored (js-tmpl does not own that directory). If the
  directory holds only generated files, render into it from empty and let Git
  show them as deleted:
  `rm -rf dist && js-tmpl render --values values.yaml && git status --porcelain dist`.

Both `--values` and `--values-dir` are optional (VP-8, VP-6). If neither is
supplied, `view` is `{ env: {...} }` only. Missing `{{var}}` in a template
throws with the template's relative path and variable name (VP-9, strict
mode).

### Examples of Usage

```bash
# Basic usage
js-tmpl render --values data.yaml

# Custom directories
js-tmpl render \
  --values data.yaml \
  --template-dir ./my-templates \
  --out ./output

# Multi-environment (allowlist NODE_ENV to use it in templates)
NODE_ENV=production js-tmpl render --values prod-values.yaml --env-keys NODE_ENV
```

## Programmatic API

See [docs/API.md](docs/API.md) for the complete API reference — parameters, return types, config file format, and advanced usage.

## Examples

- [examples/yaml-templates/](examples/yaml-templates/) — complete walkthrough:
  dynamic paths with `${env.NODE_ENV}`, Handlebars features (loops,
  conditionals), root and namespaced partials, multi-format output.
- [examples/path-guards/](examples/path-guards/) — conditional files via
  `$if{var}` / `$ifn{var}` whole-segment path guards.
- [examples/value-partials/](examples/value-partials/) — composing `view`
  from multiple structured files via `--values-dir` (directory-as-namespace,
  no merge, `@`-flatten escape).
- [examples/helpers/](examples/helpers/) — registering pure custom helpers on
  a scoped Handlebars instance with `registerHelpers`.

## Testing

This project has comprehensive automated test coverage across unit and integration suites.
Current coverage remains above 99% line coverage with high branch coverage as well.

See [tests/README.md](tests/README.md) for testing documentation.

## Development Principles

js-tmpl follows six core design principles — engine-first, explicit, deterministic, separated, composable, and simple. See [docs/PRINCIPLES.md](docs/PRINCIPLES.md) for the full philosophy.

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

See [LICENSE](LICENSE).

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

## Transparency

AI-assisted development (e.g., Claude Code, Copilot) was used for scaffolding and iteration.
