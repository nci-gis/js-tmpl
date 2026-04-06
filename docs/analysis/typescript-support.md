# TypeScript Support Strategy

## Summary

`js-tmpl` is implemented in JavaScript and documented with JSDoc. That remains
the core implementation approach.

Before `v1.0.0`, the project should ship handwritten `.d.ts` files for the
public package API so TypeScript consumers can use `js-tmpl` directly in
TypeScript projects with a stable, curated type surface.

## Decision

Prefer handwritten declaration files over auto-generated declarations.

## Rationale

### Why not JSDoc-only?

JSDoc and `src/types.js` are useful for internal editor support and source
documentation, but they do not provide shipped package types to downstream
TypeScript consumers.

### Why not auto-generate declarations?

Auto-generation from JSDoc is possible, but it gives less control over the
published type surface and tends to couple the emitted declarations to internal
source structure.

For `js-tmpl`, explicitness and a small curated public API matter more than
automating declaration output.

### Why handwritten `.d.ts`?

Handwritten declarations give the project full control over:

- Which symbols are public
- How public types are named and shaped
- Which internal details remain hidden
- How stable the package contract is across internal refactors

This matches the project's design preference for explicit, intentional public
interfaces.

## Target Scope Before `v1.0.0`

Ship declaration files for the official package surface only, including:

- `resolveConfig`
- `renderDirectory`
- `registerHelpers`
- Public config and template-related types needed by consumers

Do not expose internal engine or config implementation details unless they are
part of the documented package API.

## Validation

When declarations are introduced, add lightweight checks:

- A TypeScript smoke test that imports the package and exercises common usage
- A package metadata check ensuring the `types` entry points at the declaration
  entrypoint
- Ongoing maintenance whenever public exports change

## Non-Goal for Round 01

Round 01 should document helper registration for JavaScript consumers, but it
should not expand scope to ship official TypeScript declarations yet.

That work belongs to a later pre-`v1.0.0` stabilization round.
