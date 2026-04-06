# TypeScript Support Strategy Before v1.0.0

**Date**: 2026-04-06
**Agent**: Codex
**Confidence**: High
**Status**: New

## Problem

The project is written in JavaScript with JSDoc and shared typedefs in
`src/types.js`. During Round 01 planning, the question came up whether
TypeScript declarations should be added now, auto-generated later, or written
manually before the first stable release.

## Finding

Handwritten `.d.ts` files are the best fit for this project, but they should be
deferred until a pre-`v1.0.0` stabilization phase rather than added as part of
Round 01.

JSDoc already helps internal source clarity and editor support, but it does not
equal shipped TypeScript support for package consumers.

Auto-generated declarations from JSDoc are mechanically possible with `tsc`
(`allowJs` + `checkJs` + `declaration` + `emitDeclarationOnly`), but that path
reduces control over the exported typed surface and risks leaking internal
structure through inferred declarations.

Because the package API is still relatively small, handwritten declarations are
cheap enough to maintain and provide much better control over what is formally
supported.

## Evidence

- Files: `src/types.js`
- Files: `docs/API.md`
- Files: `.agents/plan/cycles/Round_01.md`
- Current docs explicitly say TypeScript definitions are not included.
- Current package metadata does not advertise shipped declarations.
- Round 01 is focused on explicit helper registration, not package-wide type
  support.

## Recommendation

**Do**:

- Keep Round 01 focused on JavaScript API design and documentation
- Add a project-level analysis note proposing handwritten `.d.ts` before
  `v1.0.0`
- When ready, ship declarations only for the official public API
- Add a lightweight TypeScript smoke test when declarations are introduced

**Don't**:

- Expand Round 01 to include official TypeScript support
- Rely on auto-generated declarations as the primary public contract
- Expose internal modules or inferred internal shapes by accident

## Promotion Candidate?

[ ] context/ – Stable pattern, broadly applicable
[ ] skills/ – Reusable procedure/checklist
[x] Not yet – Needs more validation
