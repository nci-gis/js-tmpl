# Render Pipeline — Visualization

> Diagrams of how `js-tmpl render` transforms inputs into files.
>
> - Conceptual model: [README.md#mental-model](../../../README.md#mental-model)
> - Design principles: [docs/PRINCIPLES.md](../../../docs/PRINCIPLES.md)
> - Proposed extensions: [../plan/20260418-richer-inputs.plan.md](../plan/20260418-richer-inputs.plan.md)
>
> This doc exists to **show** the system. It does not re-explain concepts
> owned by README, API docs, or the plan doc.

---

## Three-phase data flow

```mermaid
flowchart LR
  subgraph P1[Phase 1 — resolveConfig]
    direction TB
    CLI[cli args]
    PC[projectConfig file]
    DF[defaults]
    CLI --> M[mergedConfig]
    PC --> M
    DF --> M
  end
  subgraph P2[Phase 2 — buildView]
    direction TB
    VF["valuesFile (optional, VP-8)"]
    VD["valuesDir scan (optional, VP-6)"]
    EV[allowlisted env]
    VF --> CC{collision checks C-1..C-3}
    VD --> CC
    CC --> V[view]
    EV --> V
  end
  subgraph P3[Phase 3 — renderDirectory]
    direction TB
    T[templateDir]
    P[partialsDir]
    TW["treeWalker (view-aware: formula eval, early-exit)"]
    PR["pathRenderer (var expansion only)"]
    CR["contentRenderer (strict:true, VP-9)"]
    T --> TW
    TW --> PR
    TW --> CR
    P --> REG[registerPartials]
    REG --> CR
    PR --> W[writeFileSafe]
    CR --> W
    W --> F[files]
  end
  M --> VF
  M --> VD
  M --> EV
  V --> TW
  V --> PR
  V --> CR
```

---

## Component view

```mermaid
flowchart TD
  Bin[bin/js-tmpl] --> Main[src/cli/main.js]
  Main --> Args[src/cli/args.js parseArgs]
  Main --> Resolver[src/config/resolver.js resolveConfig]
  Resolver --> Loader[src/config/loader.js loadProjectConfig]
  Resolver --> ValLoad[src/config/loader.js loadYamlOrJson]
  Resolver --> VPScan[src/config/valuePartials.js scanValuePartials]
  ValLoad --> View[src/config/view.js buildView]
  VPScan --> View
  Main --> Render[src/engine/renderDirectory.js]
  Render --> Partials[src/engine/partials.js registerPartials]
  Render --> Walk[src/engine/treeWalker.js walkTemplateTree]
  Walk --> Formula[src/engine/pathFormula.js evalFormula]
  Formula --> Segment[src/engine/pathSegment.js classifySegment]
  Render --> Path[src/engine/pathRenderer.js renderPath]
  Path --> Segment
  Render --> Content[src/engine/contentRenderer.js renderContent]
  Render --> FS[src/utils/fs.js writeFileSafe]
```

---

## Sequence — `js-tmpl render --values values.yaml`

```mermaid
sequenceDiagram
  participant User
  participant Bin as bin/js-tmpl
  participant Main as cli/main.js
  participant Args as cli/args.js
  participant Resolver as config/resolver.js
  participant Loader as config/loader.js
  participant Render as engine/renderDirectory.js
  participant Walker as engine/treeWalker.js
  participant FS as utils/fs.js

  User->>Bin: js-tmpl render --values values.yaml
  Bin->>Main: node src/cli/main.js "$@"
  Main->>Args: parseArgs(process.argv)
  Args-->>Main: cli
  Main->>Resolver: resolveConfig(cli)
  Resolver->>Loader: loadProjectConfig(cwd)
  Loader-->>Resolver: projectConfig | null
  Resolver->>Loader: loadYamlOrJson(valuesFile)
  Loader-->>Resolver: values
  Resolver-->>Main: TemplateConfig
  Main->>Render: renderDirectory(cfg)
  Render->>Render: registerPartials(partialsDir)
  Render->>Walker: walkTemplateTree(templateDir, ext)
  Walker-->>Render: TemplateFile[]
  loop each file
    Render->>Render: renderPath(relPath, view)
    Render->>Render: renderContent(absPath, view, hbs)
    Render->>FS: writeFileSafe(target, content)
  end
  Render-->>Main: done
  Main-->>User: "✔ js-tmpl completed."
```

---

## References

- [README.md](../../../README.md) — user-facing overview and mental model
- [docs/API.md](../../../docs/API.md) — programmatic API
- [docs/PRINCIPLES.md](../../../docs/PRINCIPLES.md) — design principles
- [ROADMAP.md](../../../ROADMAP.md) — planned features
- [src/types.js](../../../src/types.js) — type shapes (JSDoc)
- [../plan/20260418-richer-inputs.plan.md](../plan/20260418-richer-inputs.plan.md) — proposed 0.1.0 features with design details
