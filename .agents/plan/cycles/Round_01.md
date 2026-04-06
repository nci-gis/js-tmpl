# Round 01: `registerHelpers` — First-Class Helper Registration API

**Status**: Planning
**Date started**: 2026-04-05
**Date completed**: —

## Goal

Enable users to register custom Handlebars helpers programmatically via an
explicit utility function, so templates can use project-specific logic like
`{{uppercase name}}` or `{{eq status "active"}}`.

This is the #1 feature gap on the 0.1.x roadmap. Rather than adding `helpers`
to `TemplateConfig` (which would mix executable code into a pure-data config
object), we create a dedicated `registerHelpers(hbs, helpersMap)` utility that
mirrors `registerPartials` in role and error philosophy (validate-then-register,
clear error messages, explicit registration on a scoped instance) — not in
mechanics (helpers is sync and caller-supplied, partials is async and filesystem-driven).

### Design Rationale

The original plan proposed `helpers: Record<string, Function>` on
`TemplateConfig`. This was rejected because:

1. **Config identity crisis** — `TemplateConfig` is pure data (strings + view).
   Adding functions breaks that boundary.
2. **Two paths to the same thing** — The `hbs` param on `renderDirectory(cfg, hbs)`
   already lets callers register helpers. Adding `cfg.helpers` creates ambiguity.
3. **Config pipeline can't carry functions** — `resolveConfig` merges plain data
   via object spread. Functions can't flow through this pipeline.
4. **The escape hatch already works** — `renderDirectory(cfg, hbs)` with a
   pre-configured Handlebars instance is tested and functional, just undocumented.

The new approach: make helper registration a first-class explicit utility,
not push helpers into config.

## Plan

- [ ] Create `src/engine/helpers.js` with `registerHelpers(hbs, helpersMap)`
  - Synchronous (no disk I/O, unlike `registerPartials`)
  - Validates all entries before registering any (atomic behavior)
  - Throws for falsy/invalid `hbs` (required target param — hard error)
  - Skips silently if `helpersMap` is falsy or empty (optional data — mirrors partials pattern)
  - Throws clear errors with helper name and actual type received for non-function values
  - Throws if a helper name collides with an already-registered helper on the `hbs` instance
    (mirrors `registerPartials` throwing on duplicate names — explicit > implicit)
  - Users who deliberately want to override built-ins use `hbs.registerHelper` directly
  - Validates helper names against Handlebars bare-identifier rules:
    must match `/^[a-zA-Z_$][\w$-]*$/` (letters, digits, underscore, dollar, hyphen;
    must start with letter, underscore, or dollar). This covers idiomatic helper names
    (`upper`, `date-format`, `is-active`, `$format`) while rejecting names that would
    require obscure bracket notation `{{[name]}}` in templates (dots, spaces, slashes).
    Rationale: `hbs.registerHelper()` itself accepts any string with zero validation —
    the constraint comes from the template parser's bare `{{helperName}}` syntax.
    Users who need exotic names can use `hbs.registerHelper` directly.
  - Uses `Object.entries` (own enumerable string keys only — no inherited/prototype keys)
- [ ] Export from public API — add `export * from './engine/helpers.js'` to `src/index.js`
- [ ] Unit tests in `tests/unit/engine/helpers.test.js` (mirror partials test conventions):
  - Single helper registration and use in compiled template
  - Multiple helpers registration
  - Helper with arguments
  - Block helper support
  - Skips silently for null/undefined/empty helpersMap
  - Throws for non-function values (string, number, null, object) — error includes helper name + actual type
  - Throws when hbs is missing/falsy (required param)
  - Throws on collision with already-registered helper on the instance
  - Throws on invalid helper names (empty, dots, spaces, leading digit)
  - Accepts valid names (`date-format`, `is-active`, `$format`, `_private`)
  - Atomicity: mixed valid + invalid helpers → error thrown, none registered
  - Isolation: does not affect global Handlebars instance
  - Isolation: helpers on one scoped instance not visible on another
  - Integration: registerHelpers + renderDirectory end-to-end
- [ ] Update `docs/API.md`:
  - Add `registerHelpers` to imports example
  - Add `### registerHelpers(hbs, helpersMap)` section (after renderDirectory, before Configuration Files)
  - Update the TypeScript Support workaround example (`docs/API.md` line ~523) to include
    `registerHelpers(hbs: typeof Handlebars, helpersMap: Record<string, (...args: any[]) => any>): void`
    (this is a docs-only change — the project does not ship `.d.ts` files)
- [ ] Update `README.md`:
  - Add `registerHelpers` to programmatic API example (line ~155) showing the full workflow:
    `Handlebars.create()` → `registerHelpers(hbs, {...})` → `renderDirectory(cfg, hbs)`
  - This is the most common entry point — without it the feature remains invisible
- [ ] CHANGELOG.md — no manual edit needed; git-cliff generates from `feat:` commit at release

### Out of Scope (future rounds)

- **CLI helper registration** (e.g. `--helpers ./my-helpers.js`) — requires dynamic
  `import()` of user modules, a different trust/security surface.
- **`TemplateConfig.helpers`** — rejected by design. Config stays pure data.

## Do

[Progress log — update as work proceeds]

## Check

- [ ] `registerHelpers(hbs, { upper: s => s.toUpperCase() })` registers helper correctly
- [ ] Helpers work in templates rendered via `renderDirectory(cfg, hbs)`
- [ ] Helpers are scoped: concurrent renders with different helpers don't leak
- [ ] Non-function helper value produces error with helper name + actual type
- [ ] Mixed valid + invalid helpers: error thrown, none registered (atomicity)
- [ ] Missing/falsy `hbs` throws (required param)
- [ ] Missing/falsy `helpersMap` is a no-op (optional data, no error)
- [ ] Collision with already-registered helper throws — error includes helper name and states it is already registered on the instance
- [ ] Invalid helper names throw (empty, dots, spaces, leading digit)
- [ ] Hyphenated names accepted (`date-format`, `is-active`)
- [ ] All existing tests pass (no regressions)
- [ ] Test coverage remains 99%+
- [ ] `node scripts/check-doc-exports.js` passes

## Act

**Learnings**:

- ...

**Promotions**:

- [ ] → context/ : [topic]
- [ ] → skills/ : [topic]
