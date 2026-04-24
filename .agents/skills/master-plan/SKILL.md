---
name: master-plan
description: Decompose a non-trivial refactor or feature into numbered, commit-sized phases with acceptance gates. Use before starting any multi-step change that will land across several commits (e.g. folder restructures, cross-cutting renames, staged migrations). Skip for one-shot fixes.
metadata:
  author: a2scaffold
  version: '1.0'
---

## Trigger

Activate this skill when the request matches **all** of:

- The change touches multiple files or concerns (not a single-spot fix).
- The change can be staged — each step leaves `pnpm test` green and the
  tree shippable.
- The user has not already given you an explicit phase breakdown.

Skip for typo fixes, single-function tweaks, or docs-only edits — the
planning overhead exceeds the work.

## Procedure

### 1. Restate the goal in one sentence

Write the end state in the form:
`<verb> <subject> so that <outcome>`.

If you can't compress it to one sentence, the scope is too broad — ask
the user to split the request before planning.

### 2. List invariants

Enumerate what must stay true across every phase:

- Public CLI surface unchanged (unless that's the goal).
- `pnpm test` passes after each commit.
- Public exports in [src/index.js](src/index.js) remain stable.
- Any invariants the user called out explicitly.

These become the acceptance gates for each phase.

### 3. Draft phases

One phase = one commit. Each phase must:

- Have a verb-led title (e.g. "Phase 4 — split `src/skills.js` into
  per-concern files").
- Be reviewable in isolation — no phase depends on a later phase to
  pass tests.
- Name the files touched (paths, not vague areas).
- State the acceptance gate (usually "tests pass + manual smoke of
  affected command").

Target 3–8 phases. More than 8 means the steps are too small; fewer
than 3 means the work doesn't need this skill.

### 4. Write the plan to `.agents/plan/cycles/Round_XX.md`

Use the next unused round number. Template:

```markdown
# Round XX — <one-sentence goal>

## Invariants

- <invariant 1>
- <invariant 2>

## Phases

### Phase 1 — <verb-led title>

- **Files:** `path/a.js`, `path/b.js`
- **Change:** <what happens>
- **Gate:** `pnpm test` + <any extra check>

### Phase 2 — ...
```

### 5. Confirm with the user before executing

Post the phase list back. Wait for explicit approval (or amendments)
before starting Phase 1. Do **not** bundle multiple phases into one
commit unless the user asks.

### 6. Execute one phase at a time

For each phase:

1. Make the edits.
2. Run the gate (`pnpm test` at minimum).
3. Commit with message `<scope>(phase N): <title>` matching the
   repo's conventional-commit style — see
   [recent git log](../../../) for the current convention.
4. Report completion and move to the next phase.

If a gate fails, **stop** and report. Do not skip phases or amend
a green commit to squeeze in later work.

### 7. Close the round

After the final phase lands, append a one-line entry to
[.agents/plan/promotions.md](../../plan/promotions.md) noting the
round number and outcome. The plan file itself stays as the record
of what was planned vs. what shipped.

## Example

See commits `1d34b14..da8aad5` on `dev` (Phases 3–7 of the skills/CLI
split) for a worked example of this skill applied end-to-end.
