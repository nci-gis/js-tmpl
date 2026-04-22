# API Reference

Complete reference for the js-tmpl programmatic API.

## Installation

```bash
npm install @nci-gis/js-tmpl
```

## Imports

```javascript
import { resolveConfig, renderDirectory } from '@nci-gis/js-tmpl';
```

## API Functions

### resolveConfig(options)

Resolves configuration by merging user options with project config and defaults.

**Precedence:** `options` > project config file > internal defaults

#### Parameters

`options` (Object):

| Property      | Type     | Required | Default         | Description                                      |
| ------------- | -------- | -------- | --------------- | ------------------------------------------------ |
| `valuesFile`  | string   | No       | —               | Path to values file (`.yaml` / `.yml` / `.json`) |
| `valuesDir`   | string   | No       | —               | Value-partials root (see "Value Partials" below) |
| `templateDir` | string   | No       | `"templates"`   | Path to template directory                       |
| `partialsDir` | string   | No       | `""` (skipped)  | Path to partials directory                       |
| `outDir`      | string   | No       | `"dist"`        | Path to output directory                         |
| `extname`     | string   | No       | `".hbs"`        | Template file extension                          |
| `configFile`  | string   | No       | Auto-discovered | Explicit config file path                        |
| `envKeys`     | string[] | No       | `[]`            | Env var names to expose                          |
| `envPrefix`   | string   | No       | `""`            | Auto-include env vars with prefix                |

Both `valuesFile` and `valuesDir` are optional (VP-5, VP-6, VP-8). If neither
is supplied, `view` is `{ env: {...} }` only — the CLI invocation itself is
the declaration. Missing `{{var}}` references in templates throw loudly
(VP-9, strict mode).

#### Value sources and path resolution

- **`valuesFile`** — resolved from cwd (or used as-is if absolute). Loaded
  into top-level `view` keys. One file, no merging.
- **`valuesDir`** — resolved from cwd (or used as-is if absolute). Scanned
  recursively; each file becomes a namespace in view by its directory path
  (see "Value Partials" below).

**Migration note (0.1.0):** Prior to 0.1.0, `valuesDir` was a base path
that `valuesFile` resolved against (`valuesDir + valuesFile` → file path).
That behavior is retired. If you relied on it, combine the paths yourself:
`valuesFile: foo/app.yaml` instead of `valuesDir: foo, valuesFile: app.yaml`.

#### Returns

`Object` - Resolved configuration with absolute paths

#### Throws

- `Error` — If the config file is specified but not found.
- `Error` — **C-1**: if `valuesFile` resolves to a path inside `valuesDir`.
- `Error` — **C-2**: if a top-level key in `valuesFile` collides with a
  top-level namespace scanned from `valuesDir`.
- `Error` — **C-3**: if a file under `valuesDir` resolves to the reserved
  `env` namespace.
- `Error` — If a file under `valuesDir` contains invalid namespace segments
  (characters outside `/^\w+$/`).
- `Error` — If two files under `valuesDir` resolve to the same namespace,
  or one file's namespace is a strict prefix of another (shadow collision).

#### Example

```javascript
import { resolveConfig } from '@nci-gis/js-tmpl';

const config = resolveConfig({
  valuesFile: './data/production.yaml',
  templateDir: './my-templates',
  outDir: './output',
});

console.log(config);
// {
//   valuesFile: '/absolute/path/to/data/production.yaml',
//   templateDir: '/absolute/path/to/my-templates',
//   partialsDir: '',
//   outDir: '/absolute/path/to/output',
//   extname: '.hbs'
// }
```

---

### renderDirectory(config[, hbs])

Executes the complete rendering process.

**Process:**

1. Load values file (YAML/JSON)
2. Build view object (`{...values, env: pickEnv({keys, prefix})}`) — only allowlisted env vars
3. Use the provided Handlebars instance, or create a scoped one (`Handlebars.create()`)
4. Register partials from `partialsDir` (if configured)
5. Discover templates via BFS tree walk
6. For each template:
   - Render path placeholders (`${var}`)
   - Render content (Handlebars, scoped instance)
   - Write to `outDir`

#### Parameters

`config` (Object) - Configuration object from `resolveConfig()`

`hbs` (Object, optional) - A Handlebars instance to use for rendering. If omitted, an isolated instance is created via `Handlebars.create()`.

#### Returns

`Promise<void>` - Resolves when rendering completes

#### Throws

- `Error` - If values file cannot be loaded
- `Error` - If template rendering fails
- `Error` - If file writing fails

#### Example

```javascript
import { resolveConfig, renderDirectory } from '@nci-gis/js-tmpl';

async function generate() {
  const config = resolveConfig({
    valuesFile: './values.yaml',
    templateDir: './templates',
    outDir: './dist',
  });

  await renderDirectory(config);
  console.log('✅ Rendering complete');
}

generate().catch(console.error);
```

## Configuration Files

### Auto-Discovery

If `configFile` is not specified, js-tmpl searches for config in this order:

1. `js-tmpl.config.yaml`
2. `js-tmpl.config.yml`
3. `js-tmpl.config.json`
4. `config/js-tmpl.yaml`
5. `config/js-tmpl.json`

### Config File Format

**YAML:**

```yaml
templateDir: templates
partialsDir: templates.partials # optional — omit to skip partials
valuesDir: ''
outDir: dist
extname: .hbs
envKeys: # optional — env var names to expose
  - NODE_ENV
envPrefix: JS_TMPL_ # optional — auto-include vars with this prefix
```

**JSON:**

```json
{
  "templateDir": "templates",
  "partialsDir": "templates.partials",
  "valuesDir": "",
  "outDir": "dist",
  "extname": ".hbs",
  "envKeys": ["NODE_ENV"],
  "envPrefix": "JS_TMPL_"
}
```

## View Object

The view object is passed to all templates and contains:

```javascript
{
  ...rootValues,     // Top-level keys from `valuesFile` (if any)
  ...namespaces,     // Namespaced sub-trees from `valuesDir` (if any)
  env: { ... }       // Allowlisted environment variables (reserved key)
}
```

> **Security:** js-tmpl does not automatically expose the host environment to templates.
> If environment data is needed, it must be allowlisted via `envKeys` or `envPrefix`.
>
> **Reserved key:** `env` is always reserved for environment data.
> If your values file contains a top-level `env` key, a warning is logged and it will be overwritten.

### Value Partials (`valuesDir`)

`valuesDir` is a **value-partials root**. Each file under it becomes a
namespace in `view` determined by its directory path — mirroring the
template partials system:

| File path (under `valuesDir`) | View placement        |
| ----------------------------- | --------------------- |
| `app.yaml`                    | `view.app.*`          |
| `env/prod.yaml`               | `view.env.prod.*`     |
| `services/api.yaml`           | `view.services.api.*` |
| `@shared/consts.yaml`         | `view.consts.*`       |
| `env/@overrides/app.yaml`     | `view.app.*`          |

**Rules:**

- **Formats**: `.yaml`, `.yml`, `.json`. Other extensions are skipped.
- **Segment validation**: each directory / filename segment must match
  `/^\w+$/` (letters, digits, underscore). Other characters throw.
- **`@<name>/` flatten**: any segment starting with `@` (anywhere in the
  relative path) collapses the chain to `[basename]`. Root-independent —
  scanning `values/` and `values/env/` yield the same namespace for
  `values/env/@overrides/app.yaml`.
- **No merge, no precedence**: every value has exactly one source.
  Duplicates throw, naming both files.
- **Shadow collisions throw**: `env.yaml` and `env/prod.yaml` can't
  coexist — a leaf can't simultaneously be a sub-tree.
- **Optional**: absent `valuesDir` contributes nothing.
- **`env` is reserved**: a file that resolves to the top-level `env`
  namespace throws (collision rule C-3).

### Strict templates

Templates are compiled with Handlebars `strict: true`. A `{{var}}` on an
undefined path throws an error that includes the template's relative path
and the variable name. Present-but-empty values (`''`, `0`, `false`,
`null`) render as normal — only **missing** properties fail loudly.

This pairs with the Path Guards rule (G-4) and the Value Partials design:
missing data is always loud, never silent.

### Exposing Environment Variables

Use `envKeys` for explicit variable names, and/or `envPrefix` to include all variables matching a prefix. Both combine (union).

**Config file:**

```yaml
envKeys:
  - NODE_ENV
  - APP_NAME
envPrefix: JS_TMPL_
```

**CLI:**

```bash
js-tmpl render --values data.yaml --env-keys NODE_ENV,APP_NAME
js-tmpl render --values data.yaml --env-prefix JS_TMPL_
```

**Programmatic:**

```javascript
const config = resolveConfig({
  valuesFile: './values.yaml',
  envKeys: ['NODE_ENV', 'APP_NAME'],
  envPrefix: 'JS_TMPL_',
});
```

Without `envKeys` or `envPrefix`, `env` is an empty object `{}`.

**Recommended conventions:**

- Use `NODE_ENV` via `envKeys` for environment-aware rendering
- Use `JS_TMPL_` as a prefix for project-specific variables (e.g. `JS_TMPL_PORT`, `JS_TMPL_REGION`)

### Example

**values.yaml:**

```yaml
project:
  name: my-app
  version: 1.0.0
```

**Config with `envKeys: [NODE_ENV]`:**

**Resulting view:**

```javascript
{
  project: {
    name: 'my-app',
    version: '1.0.0'
  },
  env: {
    NODE_ENV: 'production'   // only allowlisted keys
  }
}
```

## Path Rendering

Paths support `${var}` placeholders:

### Syntax

```text
${variableName}
${nested.property}
${array.0.item}
```

### Examples

**Template path:**

```text
templates/${env.NODE_ENV}/${project.name}-config.yaml.hbs
```

**With view:**

```javascript
{
  project: { name: 'my-app' },
  env: { NODE_ENV: 'production' }
}
```

**Output path:**

```text
dist/production/my-app-config.yaml
```

### Rules

- Missing values resolve to empty string `""`
- Nested access supported: `${a.b.c}`
- Array access supported: `${items.0.name}`
- No glob expansion

### Path Guards — conditional files

Paths also support **guard formulas** that conditionally include or skip a
file based on view data:

| Form        | Role                 |
| ----------- | -------------------- |
| `${var}`    | Insert value         |
| `$if{var}`  | Pass if `var` truthy |
| `$ifn{var}` | Pass if `var` falsy  |

**Example:**

```text
templates/$if{monitoring.enabled}/dashboard.yaml.hbs
templates/$if{prod}/$ifn{debug}/config.yaml.hbs
```

If any guard in the path fails, the file is not written to the output
directory. The guarded subtree is never traversed, so unrelated files
under it cost nothing.

**Semantics (strict):**

- **Whole-segment, directories only.** A path segment containing a guard
  must be _exactly_ the guard — `$if{a}folder` and `folder/$if{a}file.hbs`
  throw at render time.
- **One guard per segment.** `$if{a}$if{b}` throws.
- **JS-truthy rule.** `false`, `0`, `''`, `null`, `undefined` → falsy;
  everything else → truthy. Matches Handlebars `{{#if}}`.
- **Missing variable throws.** A guard on a variable not present in `view`
  is a hard error with the template's relPath and variable name.
- **Passing guard collapses to an empty segment** — `$if{prod}/app.yaml`
  renders to `app.yaml` when `prod` is truthy.
- **`$ifn` inverts `$if`.** No other operators: no `else`, `elif`, `and`,
  `or`, `not`, or comparisons — ever. Compound logic lives in values
  (precomputed boolean) or in two files (`$if` + `$ifn` pair).

**Worked example:**

Tree:

```text
templates/
  common.yaml.hbs
  $if{prod}/
    alerts.yaml.hbs
  $ifn{prod}/
    debug-panel.yaml.hbs
```

With `view = { prod: true }`:

```text
dist/
  common.yaml
  alerts.yaml
```

With `view = { prod: false }`:

```text
dist/
  common.yaml
  debug-panel.yaml
```

## Content Rendering

Templates use full Handlebars syntax.

### Variables

```handlebars
{{variableName}}
{{nested.object.path}}
{{array.[0].property}}
```

### Conditionals

```handlebars
{{#if condition}}
  content if true
{{else}}
  content if false
{{/if}}
```

### Loops

```handlebars
{{#each items}}
  {{this}}
  {{@index}}
  {{@key}}
{{/each}}
```

### Partials

```handlebars
{{> partialName}}
{{> namespaced.partial}}
```

See [Handlebars documentation](https://handlebarsjs.com/) for complete syntax.

## Partial System

Each `renderDirectory()` call creates an isolated Handlebars instance. All partials are scoped to that render pass — no global state, no cross-render leakage.

### Naming Conventions

**Default — namespaced by directory structure:**

```text
templates.partials/
├── header.hbs                → {{> header}}
├── components/
│   ├── button.hbs           → {{> components.button}}
│   └── forms/
│       └── login.hbs        → {{> components.forms.login}}
```

**`@` directory (root level) — flatten entire subtree:**

Files inside `@` directories register by filename only, ignoring directory structure:

```text
templates.partials/
└── @helpers/
    ├── date.hbs             → {{> date}}
    └── deep/
        └── nested.hbs       → {{> nested}}
```

### Complete Example

```text
templates.partials/
├── header.hbs                    → "header"              (root file)
├── components/
│   ├── button.hbs               → "components.button"   (namespaced)
│   └── forms/
│       └── login.hbs            → "components.forms.login"
├── @helpers/                                              (@ flattens all)
│   ├── date.hbs                 → "date"
│   └── deep/
│       └── nested.hbs           → "nested"
```

### Name Validation

Partial name segments (directory names and file basenames) must match `/^\w+$/` — only alphanumeric characters and underscores. Invalid names throw an error at registration time.

### Duplicate Detection

If two partials resolve to the same name (e.g., `_date.hbs` and `@helpers/date.hbs` both → `"date"`), `registerPartials` throws an error identifying both source files.

### Lifecycle

- A scoped Handlebars instance is created per `renderDirectory()` call
- All partials are registered on the scoped instance only
- No global Handlebars state is modified
- The scoped instance is garbage-collected when the render pass completes

## Error Handling

### Common Errors

**Missing values file:**

```javascript
Error: Missing valuesFile (use --values)
```

**Template syntax error:**

```javascript
Error: Parse error on line 5:
...{{#if foo}
```

**File write error:**

```javascript
Error: ENOENT: no such file or directory
```

### Best Practices

```javascript
import { resolveConfig, renderDirectory } from '@nci-gis/js-tmpl';

async function safeRender() {
  try {
    const config = resolveConfig({
      valuesFile: './values.yaml',
    });

    await renderDirectory(config);
    console.log('✅ Success');
  } catch (error) {
    console.error('❌ Rendering failed:', error.message);
    process.exit(1);
  }
}
```

## Advanced Usage

### Custom Working Directory

```javascript
import { resolveConfig, renderDirectory } from '@nci-gis/js-tmpl';
import process from 'node:process';

// Change working directory
process.chdir('/path/to/project');

const config = resolveConfig({
  valuesFile: './values.yaml',
});

await renderDirectory(config);
```

### Multiple Render Passes

```javascript
const environments = ['development', 'staging', 'production'];

for (const env of environments) {
  const config = resolveConfig({
    valuesFile: `./values-${env}.yaml`,
    outDir: `./dist/${env}`,
    envKeys: ['NODE_ENV'],
  });

  await renderDirectory(config);
}
```

### Integration with Build Tools

```javascript
// build.js
import { resolveConfig, renderDirectory } from '@nci-gis/js-tmpl';

export async function generateConfigs() {
  const config = resolveConfig({
    valuesFile: process.env.VALUES_FILE || './values.yaml',
  });

  await renderDirectory(config);
}

// Usage in other tools
import { generateConfigs } from './build.js';
await generateConfigs();
```

## TypeScript Support

Currently, js-tmpl does not include TypeScript definitions. They may be added in a future release.

**Workaround:**

```typescript
// types/js-tmpl.d.ts
declare module '@nci-gis/js-tmpl' {
  export function resolveConfig(options: {
    valuesFile: string;
    templateDir?: string;
    partialsDir?: string;
    outDir?: string;
    extname?: string;
    configFile?: string;
  }): any;

  export function renderDirectory(
    config: any,
    hbs?: typeof Handlebars,
  ): Promise<void>;
}
```

## See Also

- **[📚 Documentation Hub](ToC.md)** - Complete documentation index
- [README.md](../README.md) - Quick start and overview
- [WORKFLOW.md](WORKFLOW.md) - Visual workflow diagrams with rendering pipeline
- [Configuration Rules](../README.md#fixed-rules-for-minimal-auto-discovery) - Auto-discovery behavior
- [PRINCIPLES.md](PRINCIPLES.md) - Design principles and philosophy
- [examples/yaml-templates/](../examples/yaml-templates/) - Complete working example
