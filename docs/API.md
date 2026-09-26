# API Reference

Complete reference for the js-tmpl programmatic API.

## Installation

```bash
npm install @nci-gis/js-tmpl
```

## Imports

```javascript
import {
  comparePlan,
  findProjectConfig,
  planRender,
  resolveConfig,
  renderDirectory,
  registerHelpers,
} from '@nci-gis/js-tmpl';
```

## API Functions

### resolveConfig(options)

Resolves configuration by merging user options with project config and defaults.

**Precedence:** `options` > project config file > internal defaults

#### Parameters

`options` (Object):

| Property      | Type     | Required | Default        | Description                                                                            |
| ------------- | -------- | -------- | -------------- | -------------------------------------------------------------------------------------- |
| `valuesFile`  | string   | No       | —              | Path to values file (`.yaml` / `.yml` / `.json`)                                       |
| `valuesDir`   | string   | No       | —              | Value-partials root (see "Value Partials" below)                                       |
| `templateDir` | string   | No       | `"templates"`  | Path to template directory                                                             |
| `partialsDir` | string   | No       | `""` (skipped) | Path to partials directory                                                             |
| `outDir`      | string   | No       | `"dist"`       | Path to output directory                                                               |
| `extname`     | string   | No       | `".hbs"`       | Template file extension                                                                |
| `configFile`  | string   | No       | None           | Config file to read (the engine never searches)                                        |
| `envKeys`     | string[] | No       | `[]`           | Env var names to expose                                                                |
| `envPrefix`   | string   | No       | `""`           | Auto-include env vars with prefix                                                      |
| `targetFs`    | string   | No       | `"portable"`   | File system the output is for — see [Target file system](#target-file-system-targetfs) |

Unknown keys, in `options` or in the config file, throw
`JSTMPL_CONFIG_UNKNOWN_KEY` (with a suggestion for near misses such as
`outdir`); a value of the wrong type, or a config file that is not
`key: value` pairs, throws `JSTMPL_CONFIG_INVALID_VALUE`. An option set to
`undefined` counts as not given.

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

### findProjectConfig([cwd])

Returns the absolute path of the project config file the CLI would use —
the first existing entry of the [Auto-Discovery](#auto-discovery) list in
`cwd` (default `process.cwd()`) — or `null`. `resolveConfig` never searches
on its own; use this to opt into the same behaviour:

```javascript
import { findProjectConfig, resolveConfig } from '@nci-gis/js-tmpl';

const configFile = findProjectConfig();
const config = resolveConfig(configFile ? { configFile } : {});
```

> **0.2.0 migration:** before 0.2.0, `resolveConfig()` searched `cwd` for a
> config file by itself. Embedders that relied on it call
> `findProjectConfig()`; embedders that worked around it (e.g. passing a
> different `cwd`) can drop the workaround.

---

### renderDirectory(config[, hbs])

Executes the complete rendering process.

**Process:** [`planRender`](#planrenderconfig-hbs) (every template rendered
in memory, every problem collected), then the disk checks that
[`comparePlan`](#compareplanplan-outdir) also runs, then write. **Nothing is
written if planning or the disk checks fail.** Writes are not
transactional: an I/O error while writing (permissions, full disk) can leave
earlier files written; fix it and render again.

#### Parameters

`config` (Object) - Configuration object from `resolveConfig()`

`hbs` (Object, optional) - A Handlebars instance to use for rendering. If omitted, an isolated instance is created via `Handlebars.create()`.

#### Returns

`Promise<void>` - Resolves when rendering completes

#### Throws

- `JsTmplError` - see [Error codes](#error-codes); several problems at once are thrown together as `JSTMPL_MULTIPLE_ERRORS`
- Node errors (e.g. `ENOENT`, `EACCES`) - if reading templates or writing files fails

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

### planRender(config[, hbs])

Renders every template **in memory** and returns what `renderDirectory`
would write, without touching `outDir` — the engine's decisions as data.
Use it to preview, to diff, or to apply your own write policy (merging,
confirmation prompts, managed regions) instead of re-implementing path rules.

#### Returns

`Promise<Array<{ relPath, target, content }>>`, sorted by `target`:

| Field     | Description                                            |
| --------- | ------------------------------------------------------ |
| `relPath` | Template path relative to `templateDir`, `/`-separated |
| `target`  | Output path relative to `outDir`, `/`-separated        |
| `content` | Rendered content                                       |

Paths use `/` on every OS, so a plan is identical on Linux, macOS and
Windows.

#### Collect-all errors

Every problem is reported in one run instead of stopping at the first:
each failing path guard, each `${var}` error, each collision, and the
first missing value in each template (Handlebars stops at one per
template). A single problem is thrown as-is; several are thrown as one
`JsTmplError` with code `JSTMPL_MULTIPLE_ERRORS` and `details.errors`:

```text
Error: 3 errors:
  - Path formula '$if{agents.gemini}' in '$if{agents.gemini}' references undefined view variable 'agents.gemini'
  - Template 'AGENTS.md.hbs': "kb_path" is not defined in the view (line 5, column 4)
  - Template 'CLAUDE.md.hbs': "plan" is not defined in the view (line 3, column 6)
Declare optional keys in values (null, false, '', []).
```

Only branches rendered with the current values are checked (strict mode
checks what runs).

#### Example

```javascript
import { planRender, resolveConfig } from '@nci-gis/js-tmpl';

const plan = await planRender(resolveConfig({ valuesFile: './values.yaml' }));
for (const { target, content } of plan) {
  console.log(target, content.length);
}
```

> **Memory:** the plan holds all rendered output (typically KB to MB).

### comparePlan(plan, outDir)

Compares a plan with `outDir` without writing. Returns sorted target lists:

- `added` — the file does not exist in `outDir`
- `changed` — the file exists but its bytes differ (line endings and
  trailing newlines count)

Files in `outDir` that the plan does not produce are **ignored**: js-tmpl
does not own `outDir` and keeps no manifest. This is what the CLI's
`--check` uses.

It first runs the same disk checks as `renderDirectory` does before writing
(containment, `JSTMPL_OUTPUT_BLOCKED`, one file per target,
`JSTMPL_OUTPUT_LINKED`) and throws what the render would throw. So an empty
result means a render would succeed and change nothing.

```javascript
import { comparePlan, planRender, resolveConfig } from '@nci-gis/js-tmpl';

const config = resolveConfig({ valuesFile: './values.yaml' });
const { added, changed } = comparePlan(await planRender(config), config.outDir);
```

### registerHelpers(hbs, helpersMap)

Registers custom Handlebars helpers on a scoped Handlebars instance. Pass the
same instance to `renderDirectory`.

#### Parameters

`hbs` (Object, required) - A Handlebars instance, typically from `Handlebars.create()`.

`helpersMap` (Object, optional) - Helper name → function. `null`, `undefined`, or `{}` is a no-op.

#### Rules

- **Atomic** - every entry is validated before any is registered; one invalid entry registers nothing.
- **Names** - bare identifiers usable as `{{name}}`: `/^[a-zA-Z_$][\w$-]*$/` (`upper`, `date-format`, `$format`, `_private`).
- **No overrides** - a name already on the instance (built-ins such as `if`, `each`, or an earlier registration) throws. To override deliberately, call `hbs.registerHelper()` directly.
- **Pure helpers only** - a helper must return the same result for the same arguments. js-tmpl cannot enforce this; a helper that reads the clock, randomness, environment, or disk makes output non-deterministic.
- **Strict mode** - see [Strict templates](#strict-templates) for what is and is not checked inside helper calls.

#### Returns

`void`

#### Throws

- `Error` - If `hbs` is not a Handlebars instance
- `Error` - If `helpersMap` is not an object
- `Error` - If a name is invalid, a value is not a function, or a name is already registered

#### Example

```javascript
import Handlebars from 'handlebars';
import {
  registerHelpers,
  renderDirectory,
  resolveConfig,
} from '@nci-gis/js-tmpl';

const hbs = Handlebars.create();
registerHelpers(hbs, {
  upper: (s) => s.toUpperCase(),
  eq: function (a, b, options) {
    return a === b ? options.fn(this) : options.inverse(this);
  },
});

await renderDirectory(resolveConfig({ valuesFile: './values.yaml' }), hbs);
```

```handlebars
name:
{{upper app.name}}
{{#eq env 'prod'}}replicas: 3{{else}}replicas: 1{{/eq}}
```

## Configuration Files

### Auto-Discovery

The **CLI** searches for a config file when `--config-file` is not given.
`resolveConfig()` does not search; pass `configFile` (for example from
`findProjectConfig()`). The CLI's search order:

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
targetFs: portable # optional — or case-sensitive; see "Target file system"
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
  "envPrefix": "JS_TMPL_",
  "targetFs": "portable"
}
```

### Target file system (`targetFs`)

By default output is **portable**: two templates whose paths differ only by
case (`README.md`, `readme.md`) or by Unicode normalization (`café` in NFC
and NFD) are a collision, because they are one file on default macOS and
Windows file systems.

If the output is only ever used on a case-sensitive file system — for
example files baked into a Linux container image — declare it:

```yaml
# js-tmpl.config.yaml
targetFs: case-sensitive
```

js-tmpl does not detect the OS: you declare where the output goes, since you
may render on macOS for a Linux target. If you declare `case-sensitive` and
render onto a case-insensitive disk, the write that would overwrite a file
fails instead of silently losing it (files written before it stay on disk):

```text
Error: Templates '${a}.md.hbs' and '${b}.md.hbs' render to 'README.md' and
'readme.md', which this file system treats as one file.
Render on a case-sensitive file system, or use targetFs: 'portable'.
```

Any other value throws `JSTMPL_CONFIG_INVALID_VALUE`.

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

Every path a template reads must exist in the view. A missing path throws an
error with the template's relative path, the variable name, and its
line:column — in a simple mustache and in any argument position:

| Template                    | View | Result |
| --------------------------- | ---- | ------ |
| `{{name}}`                  | `{}` | throws |
| `{{upper name}}`            | `{}` | throws |
| `{{#if name}}…{{/if}}`      | `{}` | throws |
| `{{#each items}}…{{/each}}` | `{}` | throws |
| `{{> card item}}`           | `{}` | throws |

Present-but-empty values (`''`, `0`, `false`, `null`) render as normal —
only **missing** properties fail. Partials follow the same rules.

Only paths the template itself reads are checked; what a helper does with
its arguments in JavaScript is up to the helper.

**Known limit (Handlebars):** fields on block parameters are not checked —
`{{#each items as |item|}}{{item.missing}}{{/each}}` renders empty. Use
`{{#each items}}{{missing}}{{/each}}` (context form) where you want the check.

> **0.2.0 migration:** before 0.2.0, a missing key used in `{{#if}}`,
> `{{#each}}`, `{{#with}}`, `{{#unless}}` or as a helper argument was treated
> as `undefined`. Declare such keys in values (`key: null`, `false`, `''`,
> `[]`) — see [Optional values](#optional-values).

#### Optional values

Keep strict mode on and make "optional" explicit in values:

- **Declare the key** with an empty value: `description: ''`, `replicas: null`, `features: []`. The key exists, so `{{description}}` renders empty and does not throw.
- **Use a boolean switch** for optional blocks: `monitoring: false` with `{{#if monitoring}}…{{/if}}`.
- **Guard nested reads**: `{{#if db}}{{db.host}}{{/if}}` — the body of a false `{{#if}}` is not evaluated, so `db.host` is not looked up when `db` is `null` or `false`.
- **Whole files** that are optional belong in [Path Guards](#path-guards--conditional-files) (`$if{monitoring}/`), not in an empty template.

Avoid disabling strict mode to make templates "forgiving": a typo in a
variable name would then render as an empty string.

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

- **Missing variables throw** — like `$if{var}` and `{{var}}`; the error names the variable and the template path
- **Values are primitives** — a string, number, boolean or `null` (renders `""`); objects and arrays throw
- **Nest with `/` only** — a value may contain `/` (e.g. `skills/group/name`, for depths the template tree cannot express); `\` throws on every OS so a tree renders the same everywhere
- **Every part must name something** — after rendering, each `/`-separated part must not be `""`, `.` or `..` (so `/abs`, `a//b`, `../x`, `a/..` throw); such parts would silently drop or climb and move the file
- Nested access supported: `${a.b.c}`
- Array access supported: `${items.0.name}`
- No glob expansion
- **Output stays inside `outDir`** — `outDir` is the only place js-tmpl writes. Every target is checked before rendering starts, and again against the real disk right before it is written: a symbolic link already inside `outDir` (including a dangling one) cannot redirect a write outside it
- **One template per output file** — two templates rendering to the same path throw, naming both, before any file is written. Paths that differ only by case (`README.md` / `readme.md`) count as the same file, so a tree renders identically on Linux, macOS and Windows

> **0.2.0 migration:** before 0.2.0 a missing `${var}` rendered `""`, and values
> such as `../x`, `/abs` or `a//b` were joined without checks. Declare every
> path variable; nest with `/` inside values (`a/b` still works).

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

### Error codes

Every error js-tmpl raises itself is a `JsTmplError` with a stable `code`
(public API from 0.2.0 — match on `code`, not on message text), optional
`details`, and `cause` when it wraps another error. Errors from Node itself
(e.g. `ENOENT` for a missing template directory) keep Node's `code`.

```javascript
import { ErrorCodes, JsTmplError } from '@nci-gis/js-tmpl';

try {
  await renderDirectory(config);
} catch (err) {
  if (err instanceof JsTmplError && err.code === ErrorCodes.PATH_MISSING_VAR) {
    console.error(`Declare '${err.details.variable}' in values`);
  }
  throw err;
}
```

| Code                               | Raised when                                                                                                    | `details`                                        |
| ---------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| `JSTMPL_CONFIG_NOT_FOUND`          | An explicit config file does not exist                                                                         |                                                  |
| `JSTMPL_CONFIG_INVALID_VALUE`      | A config value has the wrong type or is not allowed (`targetFs`), or the config file is not `key: value` pairs | `key`, `value` (or `file`, `value`)              |
| `JSTMPL_CONFIG_UNKNOWN_KEY`        | An option or config-file key js-tmpl does not know                                                             | `key`, `source`, `suggestion` (near misses)      |
| `JSTMPL_VALUES_NOT_FOUND`          | The values file does not exist                                                                                 |                                                  |
| `JSTMPL_VALUES_UNSUPPORTED_FORMAT` | The values file is not `.yaml` / `.yml` / `.json`                                                              |                                                  |
| `JSTMPL_VALUES_FILE_IN_DIR`        | `valuesFile` is inside `valuesDir` (C-1)                                                                       |                                                  |
| `JSTMPL_NS_INVALID_SEGMENT`        | A partial or value-partial name segment is not `\w+`, or is `__proto__`                                        |                                                  |
| `JSTMPL_NS_DUPLICATE`              | Two files resolve to the same partial or namespace                                                             |                                                  |
| `JSTMPL_NS_SHADOW`                 | A value partial is both a leaf and a sub-tree (`a.yaml`, `a/b.yaml`)                                           |                                                  |
| `JSTMPL_NS_ROOT_COLLISION`         | A root value key and a value-partial namespace collide (C-2)                                                   |                                                  |
| `JSTMPL_NS_RESERVED_ENV`           | A value partial resolves to the reserved `env` namespace (C-3)                                                 |                                                  |
| `JSTMPL_PATH_MISSING_VAR`          | `${var}` in a template path is not in the view                                                                 | `relPath`, `variable`                            |
| `JSTMPL_PATH_INVALID_VALUE`        | A `${var}` value is an object/array or contains `\`                                                            | `relPath`, `variable`                            |
| `JSTMPL_PATH_EMPTY_SEGMENT`        | A rendered path part is `""`, `.` or `..` (also once `extname` is removed)                                     | `relPath`, `segment` or `target`                 |
| `JSTMPL_GUARD_MISSING_VAR`         | `$if{var}` / `$ifn{var}` names a variable not in the view (G-4)                                                | `relPath`, `segment`, `variable`                 |
| `JSTMPL_GUARD_MALFORMED`           | A guard is not a whole directory segment (G-5)                                                                 | `relPath`, `segment`                             |
| `JSTMPL_GUARD_IN_FILENAME`         | A guard is used as a file name (G-5)                                                                           | `relPath`, `segment`                             |
| `JSTMPL_TEMPLATE_MISSING_VALUE`    | A template reads a path not in the view (strict mode)                                                          | `relPath`, `variable`, `line`, `column`          |
| `JSTMPL_TEMPLATE_SYNTAX`           | Handlebars cannot parse a template                                                                             | `relPath`                                        |
| `JSTMPL_TEMPLATE_RENDER_FAILED`    | Rendering failed otherwise (missing partial, a helper threw, …)                                                | `relPath`                                        |
| `JSTMPL_TEMPLATE_DIR_LOOP`         | A template directory links back to one of its own parent directories                                           | `relPath`, `target`                              |
| `JSTMPL_OUTPUT_OUTSIDE_OUTDIR`     | A write would land outside `outDir` (e.g. through a symlink in it)                                             | `relPath`, `target`                              |
| `JSTMPL_OUTPUT_COLLISION`          | Two templates render to one file (see `targetFs`), or one needs the other's file as a directory                | `templates`, `target`                            |
| `JSTMPL_OUTPUT_BLOCKED`            | A target exists in `outDir` as a directory (or non-file), or its parent exists as a file                       | `relPath`, `target`, `path`                      |
| `JSTMPL_OUTPUT_LINKED`             | A target in `outDir` has another hard link; writing it would change that file too                              | `relPath`, `target`                              |
| `JSTMPL_MULTIPLE_ERRORS`           | Several of the errors above in one run (`planRender`, `renderDirectory`, CLI)                                  | `errors` (the individual `JsTmplError`s, sorted) |
| `JSTMPL_HELPER_NO_INSTANCE`        | `registerHelpers` got no Handlebars instance                                                                   |                                                  |
| `JSTMPL_HELPER_INVALID_MAP`        | `helpersMap` is not an object                                                                                  |                                                  |
| `JSTMPL_HELPER_INVALID_NAME`       | A helper name is not a bare identifier                                                                         |                                                  |
| `JSTMPL_HELPER_NOT_FUNCTION`       | A helper value is not a function                                                                               |                                                  |
| `JSTMPL_HELPER_ALREADY_REGISTERED` | A helper name is already on the instance                                                                       |                                                  |
| `JSTMPL_CLI_USAGE`                 | CLI: unknown option, missing value, unexpected argument (exit 2)                                               |                                                  |

The CLI prints `js-tmpl: <message>`; with `--verbose` it also prints
`code: <CODE>` and the stack.

### Common Errors

**Values file not found:**

```text
Error: Values file not found: /project/values.yaml
```

**Template syntax error:**

```javascript
Error: Parse error on line 5:
...{{#if foo}
```

**Missing or unusable path variable:**

```text
Error: Path variable 'name' is not defined in the view (in '${name}/x.txt.hbs').
Error: Path variable 'name' is 'a\b', which contains '\' (in '${name}/x.txt.hbs').
Error: Path segment '${name}' renders to '../x'; every part must name a file or directory (no empty, '.' or '..' parts) (in '${name}/x.txt.hbs').
```

**Two templates, one output file:**

```text
Error: Templates '${a}/x.txt.hbs' and '${b}/x.txt.hbs' both render to 'same/x.txt'.
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
    valuesFile?: string;
    valuesDir?: string;
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

  export function findProjectConfig(cwd?: string): string | null;

  export function planRender(
    config: any,
    hbs?: typeof Handlebars,
  ): Promise<Array<{ relPath: string; target: string; content: string }>>;

  export function comparePlan(
    plan: Array<{ relPath: string; target: string; content: string }>,
    outDir: string,
  ): { added: string[]; changed: string[] };

  export function registerHelpers(
    hbs: typeof Handlebars,
    helpersMap?: Record<string, (...args: any[]) => any>,
  ): void;
}
```

## See Also

- **[📚 Documentation Hub](ToC.md)** - Complete documentation index
- [README.md](../README.md) - Quick start and overview
- [WORKFLOW.md](WORKFLOW.md) - Visual workflow diagrams with rendering pipeline
- [Configuration Rules](../README.md#fixed-rules-for-minimal-auto-discovery) - Auto-discovery behavior
- [PRINCIPLES.md](PRINCIPLES.md) - Design principles and philosophy
- [examples/yaml-templates/](../examples/yaml-templates/) - Complete working example
