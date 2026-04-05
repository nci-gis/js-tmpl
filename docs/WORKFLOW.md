# js-tmpl Working Flow

**Version:** 0.0.1
**Last Updated:** 2026-01-20

---

## High-Level Overview

This document provides a visual guide to understanding how js-tmpl processes templates from input to output.

---

## Complete Rendering Flow

```mermaid
graph TD
    Start([User invokes js-tmpl]) --> CLI[CLI Layer<br/>Parse Arguments]
    CLI --> ConfigResolve[Config Resolver<br/>Merge: CLI > Project > Defaults]

    ConfigResolve --> LoadValues[Load Values File<br/>YAML or JSON]
    LoadValues --> BuildView[View Builder<br/>values + env → view]

    BuildView --> CreateHbs[Create Scoped Instance<br/>Handlebars.create]
    CreateHbs --> RegisterPartials[Partials Manager<br/>Register partials]
    RegisterPartials --> TreeWalk[Tree Walker<br/>BFS discovery of templates]

    TreeWalk --> ForEach{For each<br/>template file}

    ForEach -->|Next file| PathRender[Path Renderer<br/>Render placeholders in paths]
    PathRender --> StripExt[Strip Extension<br/>Remove .hbs]
    StripExt --> ContentRender[Content Renderer<br/>Handlebars scoped instance]
    ContentRender --> WriteFile[File Writer<br/>Create output file]

    WriteFile -->|More files?| ForEach
    ForEach -->|Done| End([Rendering Complete<br/>Scoped instance GC'd])

    style Start fill:#e1f5e1
    style End fill:#e1f5e1
    style CLI fill:#fff4e6
    style ConfigResolve fill:#e3f2fd
    style BuildView fill:#e3f2fd
    style RegisterPartials fill:#f3e5f5
    style TreeWalk fill:#fce4ec
    style PathRender fill:#fff9c4
    style ContentRender fill:#fff9c4
    style WriteFile fill:#e0f2f1
```

---

## Layer-by-Layer Breakdown

### 1️⃣ **Configuration Phase**

```mermaid
graph LR
    A[CLI Args] --> D[Final Config]
    B[Project Config] --> D
    C[Internal Defaults] --> D

    D --> E[Resolved Paths:<br/>templateDir, partialsDir,<br/>outDir, valuesFile]

    style A fill:#ffeb3b
    style B fill:#81c784
    style C fill:#90caf9
    style D fill:#e1bee7
    style E fill:#ffccbc
```

**Precedence:** CLI Args > Project Config > Internal Defaults

---

### 2️⃣ **View Building Phase**

```mermaid
graph LR
    A[Values File<br/>YAML/JSON] --> C[View Object]
    B[process.env] --> C

    C --> D{View Content}
    D --> E[User Data:<br/>service, tables, etc.]
    D --> F[Environment:<br/>env.NODE_ENV, etc.]

    style A fill:#81c784
    style B fill:#64b5f6
    style C fill:#ffb74d
    style E fill:#fff9c4
    style F fill:#b0bec5
```

**Result:** `view = { ...values, env: process.env }`

---

### 3️⃣ **Template Discovery Phase**

```mermaid
graph TD
    A[Template Directory] --> B[Tree Walker<br/>Breadth-First Search]
    B --> C{Process Queue}

    C -->|Directory| D[Add children to queue]
    C -->|File with .hbs| E[Collect template]
    C -->|Other file| F[Ignore]

    D --> C
    E --> G[Template List]
    F --> C

    C -->|Queue empty| G

    style A fill:#90caf9
    style B fill:#ce93d8
    style G fill:#a5d6a7
```

**Output:** List of `{ absPath, relPath }` for all `.hbs` files

---

### 4️⃣ **Path Rendering Phase**

```mermaid
graph LR
    A["Path:<br/>${service.name}/config-${env.NODE_ENV}.yaml.hbs"] --> B[Path Renderer]
    C[View Object] --> B

    B --> D["Rendered:<br/>api-gateway/config-production.yaml.hbs"]
    D --> E[Strip .hbs extension]
    E --> F["Final:<br/>api-gateway/config-production.yaml"]

    style A fill:#fff9c4
    style B fill:#ffab91
    style D fill:#c5e1a5
    style F fill:#81c784
```

**Rules:**

- `${var}` placeholders replaced with view values
- Nested access supported: `${a.b.c}`
- Missing values → empty string `""`

---

### 5️⃣ **Content Rendering Phase**

```mermaid
graph TD
    A[Template Content] --> B[Handlebars Engine]
    C[View Object] --> B
    D[Registered Partials] --> B

    B --> E{Processing}
    E --> F[Variables]
    E --> G[Loops]
    E --> H[Conditionals]
    E --> I[Partials]

    F --> J[Rendered Content]
    G --> J
    H --> J
    I --> J

    style A fill:#fff9c4
    style B fill:#ce93d8
    style J fill:#81c784
```

**Engine:** Handlebars with full feature support

---

### 6️⃣ **Partial System (Isolated)**

```mermaid
graph TD
    A[Partials Directory] --> B{Scan Recursively}

    B --> C["name.hbs<br/>Register by filename"]
    B --> D["dir/<br/>Namespaced recursive"]
    B --> E["@dir/<br/>Flatten to filename"]

    C --> F[Collect All Entries]
    D --> F
    E --> F

    F --> G{Duplicate Check}
    G -->|Pass| H[Register on<br/>Scoped Instance]
    G -->|Fail| I[Throw Error]

    H --> J[Available in Templates]

    style A fill:#b39ddb
    style C fill:#90caf9
    style D fill:#90caf9
    style E fill:#81c784
    style H fill:#ffab91
```

**Lifecycle:** Scoped instance created per render pass, garbage-collected after completion. No global state modified.

---

## Data Flow Summary

```mermaid
graph LR
    A[Input Files] --> B[Processing Layers] --> C[Output Files]

    A1[Templates] --> A
    A2[Values] --> A
    A3[Config] --> A
    A4[Partials] --> A

    B1[Config Resolution] --> B
    B2[View Building] --> B
    B3[Tree Walking] --> B
    B4[Path Rendering] --> B
    B5[Content Rendering] --> B

    C1[Rendered Files] --> C
    C2[Directory Structure] --> C

    style A fill:#e1f5e1
    style B fill:#fff9c4
    style C fill:#bbdefb
```

---

## Key Characteristics

### 🎯 **Deterministic**

Same input → Same output, always

### 🔄 **Async & Non-Blocking**

BFS tree walking with async I/O

### 🧩 **Composable**

Each layer is independently testable and reusable

### 📦 **Isolated**

No global state pollution, partials scoped to render lifecycle

### 🚀 **Engine-First**

All operations available programmatically, not just via CLI

---

## Example End-to-End Flow

```mermaid
sequenceDiagram
    participant User
    participant CLI
    participant Config
    participant Engine
    participant FS as File System

    User->>CLI: js-tmpl render --values data.yaml
    CLI->>Config: Parse & resolve configuration
    Config->>Config: Load values.yaml
    Config->>Config: Build view = {...values, env}

    Config->>Engine: renderDirectory(config)
    Engine->>Engine: Create scoped Handlebars instance
    Engine->>FS: Register partials
    Engine->>FS: Walk template tree (BFS)

    loop For each template
        Engine->>Engine: Render path with view
        Engine->>Engine: Render content (scoped instance)
        Engine->>FS: Write output file
    end

    Note over Engine: Scoped instance garbage-collected
    Engine->>CLI: Success
    CLI->>User: ✓ Rendering complete
```

---

## Mental Model

Think of js-tmpl as a **pipeline**:

1. **Gather inputs** (config, values, templates)
2. **Build context** (view object)
3. **Discover templates** (tree walking)
4. **Transform** (path + content rendering)
5. **Write outputs** (file system)

Each step is **explicit**, **deterministic**, and **composable**.

---

## Questions This Flow Answers

- **Where does config come from?** → CLI args > project config > defaults
- **What data is available in templates?** → Everything in values file + `env`
- **How are templates discovered?** → BFS walk of `templateDir`
- **How are paths transformed?** → `${var}` rendering, then extension stripping
- **How is content rendered?** → Handlebars with registered partials (scoped instance)
- **When are partials available?** → Registered on a scoped instance per render pass, available to all templates within that pass

---

## See Also

- **[📚 Documentation Hub](ToC.md)** - Complete documentation index
- [API.md](API.md) - Function signatures and programmatic usage
- [PRINCIPLES.md](PRINCIPLES.md) - Design philosophy and decision framework
- [README.md](../README.md) - Quick start and overview
- [Motivation](Motivation.md) - Why js-tmpl exists and our vision
