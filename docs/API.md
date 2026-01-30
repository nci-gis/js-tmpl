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

| Property      | Type   | Required | Default                | Description                     |
| ------------- | ------ | -------- | ---------------------- | ------------------------------- |
| `valuesFile`  | string | **Yes**  | -                      | Path to values file (YAML/JSON) |
| `templateDir` | string | No       | `"templates"`          | Path to template directory      |
| `partialsDir` | string | No       | `"templates.partials"` | Path to partials directory      |
| `outDir`      | string | No       | `"dist"`               | Path to output directory        |
| `extname`     | string | No       | `".hbs"`               | Template file extension         |
| `configFile`  | string | No       | Auto-discovered        | Explicit config file path       |

#### Returns

`Object` - Resolved configuration with absolute paths

#### Throws

- `Error` - If `valuesFile` is missing
- `Error` - If config file is specified but not found

#### Example

```javascript
import { resolveConfig } from '@nci-gis/js-tmpl';

const config = resolveConfig({
  valuesFile: './data/production.yaml',
  templateDir: './my-templates',
  outDir: './output'
});

console.log(config);
// {
//   valuesFile: '/absolute/path/to/data/production.yaml',
//   templateDir: '/absolute/path/to/my-templates',
//   partialsDir: '/absolute/path/to/templates.partials',
//   outDir: '/absolute/path/to/output',
//   extname: '.hbs'
// }
```

---

### renderDirectory(config)

Executes the complete rendering process.

**Process:**

1. Load values file (YAML/JSON)
2. Build view object (`{...values, env: process.env}`)
3. Register partials from `partialsDir`
4. Discover templates via BFS tree walk
5. For each template:
   - Render path placeholders (`${var}`)
   - Render content (Handlebars)
   - Write to `outDir`
6. Unregister partials

#### Parameters

`config` (Object) - Configuration object from `resolveConfig()`

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
    outDir: './dist'
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
partialsDir: templates.partials
outDir: dist
extname: .hbs
```

**JSON:**

```json
{
  "templateDir": "templates",
  "partialsDir": "templates.partials",
  "outDir": "dist",
  "extname": ".hbs"
}
```

## View Object

The view object is passed to all templates and contains:

```javascript
{
  ...valuesData,     // All data from values file
  env: process.env   // Environment variables
}
```

### Example

**values.yaml:**

```yaml
project:
  name: my-app
  version: 1.0.0
```

**Resulting view:**

```javascript
{
  project: {
    name: 'my-app',
    version: '1.0.0'
  },
  env: {
    NODE_ENV: 'production',
    PATH: '...',
    // ... all process.env variables
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

## Content Rendering

Templates use full Handlebars syntax.

### Variables

```handlebars
{{variableName}}
{{nested.object.path}}
{{array.0.property}}
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

### Root Partials

**File:** `templates.partials/_name.hbs`
**Usage:** `{{> name}}`

**Example:**

```text
templates.partials/
├── _header.hbs  → {{> header}}
├── _footer.hbs  → {{> footer}}
└── _nav.hbs     → {{> nav}}
```

### Namespaced Partials

**File:** `templates.partials/@group/name.hbs`
**Usage:** `{{> group.name}}`

**Example:**

```text
templates.partials/
└── @components/
    ├── button.hbs  → {{> components.button}}
    ├── form.hbs    → {{> components.form}}
    └── input.hbs   → {{> components.input}}
```

### Lifecycle

- Registered before rendering starts
- Available to all templates
- Unregistered after rendering completes
- Scoped to render pass (no global pollution)

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
      valuesFile: './values.yaml'
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
  valuesFile: './values.yaml'
});

await renderDirectory(config);
```

### Multiple Render Passes

```javascript
const environments = ['development', 'staging', 'production'];

for (const env of environments) {
  process.env.NODE_ENV = env;

  const config = resolveConfig({
    valuesFile: `./values-${env}.yaml`,
    outDir: `./dist/${env}`
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
    valuesFile: process.env.VALUES_FILE || './values.yaml'
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

  export function renderDirectory(config: any): Promise<void>;
}
```

## See Also

- **[📚 Documentation Hub](ToC.md)** - Complete documentation index
- [README.md](../README.md) - Quick start and overview
- [WORKFLOW.md](WORKFLOW.md) - Visual workflow diagrams with rendering pipeline
- [Configuration Rules](../README.md#fixed-rules-for-minimal-auto-discovery) - Auto-discovery behavior
- [PRINCIPLES.md](PRINCIPLES.md) - Design principles and philosophy
- [examples/yaml-templates/](../examples/yaml-templates/) - Complete working example
