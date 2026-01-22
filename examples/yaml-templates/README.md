# YAML Templates Example

This example demonstrates using js-tmpl to generate YAML configuration files for applications.

## Features Demonstrated

- **Dynamic File Paths**: Files are generated with environment-specific names using `${env.NODE_ENV}`
- **Partials System**: Reusable components for headers, footers, and common metadata
- **Handlebars Features**: Conditionals (`{{#if}}`), loops (`{{#each}}`), nested data access
- **Multi-format Output**: YAML configs, Markdown documentation

## Project Structure

```text
yaml-templates/
├── index.js                    # API usage example
├── js-tmpl.config.yaml        # Configuration
├── values.yaml                 # Data for rendering
├── templates/                  # Template files
│   ├── config/
│   │   ├── database-${env.NODE_ENV}.yaml.hbs
│   │   ├── logging-${env.NODE_ENV}.yaml.hbs
│   │   └── services.yaml.hbs
│   ├── app/
│   │   └── ${project.name}-config.yaml.hbs
│   └── README.md.hbs
└── templates.partials/         # Reusable components
    ├── _header.hbs
    ├── _footer.hbs
    └── @common/
        ├── metadata.hbs
        └── credentials.hbs
```

## Usage

### Option 1: Using Installed Package (Recommended for users)

If you have js-tmpl installed globally or in your project:

```bash
cd examples/yaml-templates
NODE_ENV=production js-tmpl render --values values.yaml
```

Or from the repository root:

```bash
NODE_ENV=production js-tmpl render \
  --values examples/yaml-templates/values.yaml \
  --template-dir examples/yaml-templates/templates \
  --partials-dir examples/yaml-templates/templates.partials \
  --out examples/yaml-templates/dist
```

### Option 2: Using Local Development Command

For development or if js-tmpl is not installed:

```bash
cd examples/yaml-templates
NODE_ENV=production node ../../src/cli/main.js render --values values.yaml
```

Or from the repository root:

```bash
NODE_ENV=production node src/cli/main.js render \
  --values examples/yaml-templates/values.yaml \
  --template-dir examples/yaml-templates/templates \
  --partials-dir examples/yaml-templates/templates.partials \
  --out examples/yaml-templates/dist
```

### Option 3: Using js-tmpl as an API

For embedding js-tmpl into your own tools, scripts, or automation workflows:

```bash
cd examples/yaml-templates
NODE_ENV=production node index.js
```

The `index.js` demonstrates programmatic usage:

```javascript
import { resolveConfig, renderDirectory } from "js-tmpl";

// Configuration options (equivalent to CLI arguments)
const options = {
  valuesFile: "./values.yaml",
  templateDir: "./templates",
  partialsDir: "./templates.partials",
  outDir: "./dist",
};

// Resolve configuration (merges: defaults < project config < options)
const cfg = resolveConfig(options);

// Execute rendering
await renderDirectory(cfg);
```

**When to use the API:**

- Embedding js-tmpl in larger tools or frameworks
- Custom pre/post-processing logic
- Multi-pass rendering with different values
- Integration with build pipelines
- Programmatic control over configuration

## Expected Output

```text
dist/
├── config/
│   ├── database-production.yaml
│   ├── logging-production.yaml
│   └── services.yaml
├── app/
│   └── my-app-config.yaml
└── README.md
```

## Key Concepts

### 1. Dynamic File Paths

Template: `database-${env.NODE_ENV}.yaml.hbs`

With `NODE_ENV=production`, outputs: `database-production.yaml`

### 2. Root Partials

Defined as: `_header.hbs`
Used as: `{{> header}}`

### 3. Namespaced Partials

Defined as: `@common/metadata.hbs`
Used as: `{{> common.metadata}}`

### 4. Conditionals

```handlebars
{{#if features.authentication}}
auth:
  enabled: true
{{/if}}
```

### 5. Loops

```handlebars
{{#each services}}
  - name: {{name}}
{{/each}}
```

### 6. Nested Data Access

```handlebars
{{database.pool.timeout}}
{{services.0.resources.cpu}}
```

## Customization

Edit `values.yaml` to change:

- Project metadata
- Database connection details
- Logging configuration
- Service definitions
- Feature flags

Then re-run the render command to generate updated configs.
