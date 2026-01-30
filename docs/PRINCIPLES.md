# js-tmpl Development Principles

**Version:** 0.0.1
**Last Updated:** 2026-01-20

---

## Principle Stability Levels

Not all principles have the same rigidity.

Some define the identity of js-tmpl and are non-negotiable.
Others guide design decisions and may evolve as the project matures.

---

## Core Principles

These principles guide **all** development decisions in js-tmpl. When in doubt, refer back to these.

### 🧱 Foundational (identity-level)

#### 1. **Engine First, CLI Second**

- The engine is the primary product
- CLI is a thin wrapper around the engine API
- Everything CLI does must be achievable programmatically
- Design for embedding into other tools, not just standalone use

#### 2. **Explicit Over Implicit**

- No magic defaults or hidden conventions
- No auto-detection or "smart" inference
- All behavior must be explicitly configured or passed as arguments
- When there's ambiguity, error clearly rather than guess

#### 3. **Deterministic Over Clever**

- Same input **always** produces same output
- No runtime surprises or context-dependent behavior
- Predictability trumps convenience
- Document all resolution rules and precedence orders

#### 4. **Separation of Concerns**

- Each layer has **one responsibility only**
- No mixing of config, discovery, rendering, and I/O logic
- Clear boundaries between modules
- Dependencies flow one direction only

### 🌱 Guiding (evolutionary)

#### 5. **Composable Over Monolithic**

- Small, focused functions that do one thing well
- Layers can be tested and used independently
- Future features extend without breaking existing abstractions
- No tight coupling between components

#### 6. **Simple Over Feature-Rich**

- Resist adding features "just in case"
- Keep the API surface minimal
- Only add complexity when there's a clear, present need
- When in doubt, leave it out

> When principles appear to conflict, determinism and explicitness take precedence.

## Principles and Project Phase

js-tmpl principles are applied in the context of the project’s current phase.

Early versions emphasize constraint and clarity.
Later versions may reinterpret guiding principles while preserving foundational ones.

---

## Anti-Patterns to Avoid

- **Auto-magic**: Don't infer user intent from filesystem layout or conventions
- **Global state**: No shared mutable state across render passes
- **Hidden conventions**: Don't rely on undocumented "standard practices"
- **Framework creep**: Don't turn js-tmpl into a workflow orchestrator or project manager
- **Premature abstraction**: Don't add extensibility points before there's a concrete use case

---

## Decision Framework

When evaluating a new feature or change, ask:

1. **Does it maintain determinism?** (Same input → same output)
2. **Is it explicit?** (User controls it, not convention)
3. **Can it be used programmatically?** (Not just via CLI)
4. **Does it respect separation of concerns?** (Right layer?)
5. **Is it the simplest solution?** (Avoid over-engineering)

If the answer to any question is "no," reconsider the approach.

---

## Evolution of Principles

These principles are **versioned with the project**.

- Updates require explicit documentation in the changelog
- Breaking principle changes require major version bump
- Principles should remain stable as the project grows
- When principles conflict with new requirements, update principles first, then code

---

## Examples in Practice

### ✅ Good: Explicit Path Resolution

```javascript
// All paths resolve from process.cwd() unless absolute
const abs = (p) => path.isAbsolute(p) ? p : path.join(cwd, p);
```

### ❌ Bad: Magic Project Root Detection

```javascript
// Don't do this - relies on hidden convention
const projectRoot = findUp('.git') || findUp('package.json');
```

### ✅ Good: Clear Precedence Rules

```javascript
// CLI args > project config > internal defaults
const config = { ...defaults, ...projectConfig, ...cliArgs };
```

### ❌ Bad: Context-Dependent Behavior

```javascript
// Don't do this - behavior changes based on hidden state
if (process.env.NODE_ENV === 'production') {
  // different behavior
}
```

---

## Conclusion

js-tmpl is **not trying to be everything**. It's a focused, deterministic templating engine designed to be embedded and composed.

When these principles feel constraining, that's often a sign you're building the right thing.

## Closing Note

> Principles are not meant to freeze the project.
> They exist to ensure that growth remains intentional.

---

## See Also

- **[📚 Documentation Hub](ToC.md)** - Complete documentation index
- [Motivation](Motivation.md) - Why we established these principles
- [CONTRIBUTING.md](../CONTRIBUTING.md) - How to apply principles when contributing
- [WORKFLOW.md](WORKFLOW.md) - See principles in action throughout the pipeline
- [README.md](../README.md) - Quick start and overview
