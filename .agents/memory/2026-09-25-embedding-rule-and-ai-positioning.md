# Embedding Rule & AI-Agent Positioning

**Date**: 2026-09-25
**Agent**: Claude Code
**Confidence**: Medium
**Status**: New

## Problem

Ease of embedding pulls toward absorbing every embedder request; the
principles (Explicit, Deterministic, Simple) pull the other way. Absorbing
policy is effectively irreversible, and repeated one-off concessions are how
the design drifts.

## Finding

1. **Filter**: "Expose decisions, don't adopt policies" (now in
   `docs/PRINCIPLES.md` § Embedding Rule). Applied to a2scaffold 0.2.0's six
   workarounds, it accepts three (path-rule mirror → `planRender`; staging
   render → `planRender`; faked `cwd` → engine stops auto-discovering) and
   rejects three (managed-region merge / adopt / force, `deepMerge` of
   overrides, env handling). One of the three accepted changes is the engine
   doing _less_.
2. **Reversibility**: strict → loose and narrow → wide are non-breaking;
   the reverse directions break users. Default to the reversible side, and
   tighten while pre-1.0 with a single known embedder.
3. **AI positioning**: "probabilistic proposer (agent picks values) →
   deterministic disposer (js-tmpl)". Determinism does not make values
   correct; it makes errors attributable and runs replayable. Keep the core
   positioning neutral ("deterministic transform layer"); AI agents are the
   primary documented use case.
   - Preconditions before claiming it: output confinement (Round 06), no
     silent outcomes (Round 07), pure helpers (Round 04), provenance with a
     `caller-supplied` label (Round 09).
   - Falsifiable claim: agent → values → js-tmpl has a lower output error
     rate than an agent writing files directly. Falsified if, on the same
     a2scaffold tasks, it does not, or if strict-error retries cost more than
     the errors avoided.

## Evidence

- a2scaffold 0.2.0 (`npm pack a2scaffold@0.2.0`):
  `src/scaffold/output-paths.js`, `src/scaffold/index.js`,
  `templates/skills/a2scaffold/SKILL.md` ("Render, never hand-write").
- Reproduced on js-tmpl `dev` @ `fac1bfd`: `${name}='../escaped'` writes
  outside `outDir`; two templates with the same target overwrite silently;
  `${missing}` renders empty (documented, API.md:350).

## Recommendation

**Do**: run every embedder request through the filter and record the verdict
in the round that handles it.

**Don't**: export engine internals (`pathSegment`, `pathFormula`) to satisfy
an embedder; expose the decision (`planRender`) instead.

## Promotion Candidate?

[ ] context/ – Stable pattern, broadly applicable
[ ] skills/ – Reusable procedure/checklist
[x] Not yet – Needs more validation (a second embedder)
