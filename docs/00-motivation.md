# The Beginning: Why js-tmpl Exists

## The Problem

In the world of DevOps, scaffolding, and code generation, we repeatedly face the same challenge:

**How do we transform template structures into actual files, predictably and programmatically?**

Existing solutions fall into several camps:

### The "Too Simple" Camp

Basic string replacement tools that:

- Can't handle directory structures
- Don't support nested contexts
- Break on edge cases
- Require custom scripting for anything non-trivial

### The "Too Complex" Camp

Full-featured generators and frameworks that:

- Impose heavy opinions and conventions
- Mix templating with workflow management
- Hide behavior behind "smart" defaults
- Become difficult to embed or extend
- Couple the transform logic with the orchestration

### The "Almost There" Camp

Template engines like Handlebars, Mustache, Jinja that:

- Excel at content templating
- But don't handle file paths
- Don't manage directory structures
- Don't provide a complete file generation solution
- Need custom code wrapped around them every time

## The Gap

What we needed was a **pure transformation layer**:

```text
[Template Structure] + [Data] → [File Structure]
```

A layer that:

- **Does one thing well**: transforms templates into files
- **Is predictable**: same input always produces same output
- **Is embeddable**: can be used as a library, not just a CLI
- **Is composable**: can be a building block in larger systems
- **Doesn't assume**: no hidden conventions, no magic, no opinions about your workflow

## The Vision

js-tmpl was created to be that missing layer.

### It Should Be

**1. Engine-First**  

```javascript
// This should always be possible
import { renderDirectory } from 'js-tmpl';
await renderDirectory(config);
```

The CLI is just a convenience wrapper. The real product is the engine.

**2. Deterministic**  

```text
Same templates + Same data = Same output
Every. Single. Time.
```

No surprises. No "intelligent" behavior that breaks in production. No "it worked on my machine" moments.

**3. Composable**  

```text
Higher-level tools (x-devops, CoSF-AWF)
    ↓
js-tmpl (Transform Layer)
    ↓
Handlebars (Content Engine)
```

js-tmpl sits at the right level of abstraction. It's low-level enough to be flexible, high-level enough to be useful.

**4. Explicit**  

```yaml
# Configuration is explicit
templateDir: "./templates"
partialsDir: "./templates.partials"
outDir: "./dist"
valuesFile: "./values.yaml"
```

No auto-detection. No scanning parent directories. No inferring project structure. You tell it what to do.

## The Core Insight

The insight that drove js-tmpl's design:

> **Templating has two dimensions: content and structure.**

Most template engines solve content templating:

```handlebars
{{#each users}}
  Hello {{name}}!
{{/each}}
```

But they don't solve structure templating:

```text
templates/
  ${service.name}/
    deployment-${env.NODE_ENV}.yaml.hbs
```

js-tmpl handles **both**:

- **Content**: Handlebars templates with full expression support
- **Structure**: `${var}` path placeholders that render dynamically

## The Use Cases

### 1. DevOps Infrastructure

```text
templates/
  ${environment}/
    ${service.name}/
      deployment.yaml.hbs
      service.yaml.hbs
      ingress.yaml.hbs
```

Generate Kubernetes manifests for multiple services across multiple environments, from a single template structure.

### 2. Code Scaffolding

```text
templates/
  src/
    models/
      ${table.name}Model.js.hbs
    controllers/
      ${table.name}Controller.js.hbs
```

Generate boilerplate code for database models, controllers, services—all from schema definitions.

### 3. Multi-Project Generation

```text
templates/
  ${project.name}/
    package.json.hbs
    src/
      index.js.hbs
    README.md.hbs
```

Create multiple projects from a template, each with different configurations.

### 4. Documentation Generation

```text
templates/
  docs/
    ${api.version}/
      ${endpoint.path}.md.hbs
```

Generate API documentation from OpenAPI specs or code annotations.

## The Design Principles

From day one, js-tmpl was built on five principles:

### 1. Engine > CLI

The engine is the product. The CLI is just one way to use it.

### 2. Explicit > Implicit

If it's not in the config or data, it doesn't happen. No magic.

### 3. Composable > Monolithic

Small, focused layers. Each does one thing. No mixing concerns.

### 4. Deterministic > Smart

Predictable beats clever. Every time.

### 5. Embeddable > Standalone

Built to be integrated, not just run standalone.

## The Non-Goals

What js-tmpl intentionally **does not** try to be:

❌ **Not a workflow engine**

- We don't orchestrate multiple steps
- We don't manage dependencies between operations
- We don't provide lifecycle hooks

❌ **Not a project manager**

- We don't track project state
- We don't manage versions
- We don't handle updates or migrations

❌ **Not a configuration system**

- We don't validate your data structures
- We don't provide schema definitions
- We don't merge complex config hierarchies

❌ **Not a framework**

- We don't impose project structure
- We don't require you to organize code a certain way
- We don't provide opinions about architecture

## The Path Forward

js-tmpl v0.0.1 is intentionally minimal. It proves the concept:

✅ Config resolution works
✅ Path rendering works
✅ Content rendering works
✅ Partials work
✅ The engine can be embedded

From here, the project can grow along a clear path:

### v0.1.x - Refinement

- Custom Handlebars helpers API
- Ignore patterns
- Better error messages
- Comprehensive test suite

### v0.2.x - Orchestration

- Multi-pass rendering
- Template composition
- Advanced partial management

### v0.3.x - Developer Experience

- Better CLI (yargs-based)
- Watch mode
- Interactive mode
- Validation helpers

### v1.0.x - Production Ready

- Plugin system
- Performance optimization
- Production hardening
- Full documentation

But at every step, the core principles remain:

- Engine-first
- Deterministic
- Explicit
- Composable
- Embeddable

## The Invitation

js-tmpl exists to solve a specific problem in a specific way.

If you need:

- A predictable file templating engine
- Something you can embed in your tools
- A clean separation between templating and orchestration
- Deterministic behavior without surprises

Then js-tmpl might be exactly what you're looking for.

If you need a full-featured project generator with workflows, conventions, and opinions—there are excellent tools for that (Yeoman, Plop, Hygen).

js-tmpl is the foundation layer. It's the transform engine. It's the part that takes templates and data and produces files.

Everything else is built on top.

---

**Welcome to js-tmpl.**

Let's build something predictable.
