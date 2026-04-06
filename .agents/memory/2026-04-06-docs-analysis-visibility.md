# docs/analysis Visibility Policy

**Date**: 2026-04-06
**Agent**: Codex
**Confidence**: High
**Status**: New

## Problem

The `doc-update` skill treated any new file under `docs/` as public-facing by
default and instructed agents to add new docs to `docs/ToC.md` and potentially
to `README.md`.

That behavior is too broad for `docs/analysis/`, which this project uses mainly
for internal analysis and AI-agent-oriented reasoning rather than end-user
documentation.

## Finding

`docs/analysis/` should be treated as internal documentation by default.

Files under `docs/analysis/` may still be useful and worth preserving, but they
should not be surfaced in `docs/ToC.md` or `README.md` unless a human explicitly
asks to publish them as user-facing documentation.

## Evidence

- Files: `docs/analysis/overview.md`
- Files: `.agents/skills/doc-update/SKILL.md`
- User clarified that docs under `docs/analysis/` are mostly for AI agents and
  should not be included in `docs/ToC.md` or `README.md` by default.

## Recommendation

**Do**:

- Treat `docs/analysis/` as internal by default
- Keep analysis docs unlisted from public documentation indexes unless
  explicitly requested
- Make this rule explicit in the `doc-update` skill

**Don't**:

- Assume every new file under `docs/` belongs in `docs/ToC.md`
- Add `docs/analysis/` entries to `README.md` automatically

## Promotion Candidate?

[ ] context/ – Stable pattern, broadly applicable
[x] skills/ – Reusable procedure/checklist
[ ] Not yet – Needs more validation
