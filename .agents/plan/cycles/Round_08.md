# Round 08: Render Plan — `planRender()` + `--check`

**Status**: Planning
**Date started**: 2026-09-25
**Date completed**: —
**Release target**: v0.2.0 (additive; ships with Round 07)

## Goal

Expose the engine's decisions (which files, with what content) as data, so
embedders stop re-implementing them, and give CI a way to fail on stale
generated output.

### Evidence (a2scaffold 0.2.0)

- `src/scaffold/output-paths.js` (192 lines) is "a deliberate mirror of
  js-tmpl's `pathSegment` / `pathFormula` / `pathRenderer` trio … it would be
  better to call those directly, but js-tmpl's `exports` map publishes only
  `resolveConfig` and `renderDirectory`". A pinned test keeps the mirror
  honest.
- `mergeRenderedTree` / `sync` render into a temp staging dir, then walk it,
  only to learn what a render would write.

### Design notes

- **Expose the decision, not the mechanism.** Export `planRender`, not
  `pathSegment` / `pathFormula`. Internals stay free to change before 1.0,
  and it is one export instead of three or more.
- No separate `listOutputs`: a preview that fails exactly where the real
  render fails is correct behaviour, not a cost.
- `planRender(cfg, hbs) → Promise<Array<{ relPath, target, content }>>`,
  sorted by `target`. `renderDirectory` = `planRender` + write loop, with
  public behaviour unchanged.
- Write policy (merge, adopt, force, managed regions) stays with the
  embedder. js-tmpl plans and compares; it does not decide what may be
  destroyed.
- Leave room in the shape for a later async-iterator variant for very large
  trees. Do not build that now.
- **`--check`**: compare the plan with `outDir`.
  - Missing → `added`; bytes differ → `changed`.
  - Files in `outDir` not in the plan → ignored. js-tmpl does not own
    `outDir` (no state, no manifest). Documented.
  - Output: sorted `added <path>` / `changed <path>` lines + summary.
  - Exit `0` clean, `3` drift (distinct from `1` error / `2` usage), so CI
    can tell stale output from broken templates.
  - Supersedes the 0.1.x "dry-run" candidate.

## Plan

- [ ] Extract `planRender` from `renderDirectory`; existing tests pass
      unchanged. Export + document in API.md.
- [ ] `compareWithOutDir(plan, outDir) → { added, changed }` (internal).
- [ ] CLI `--check`.
- [ ] Tests: clean / added / changed / extra files ignored / byte-exact
      (trailing newline, CRLF) / guards pruning reflected in plan /
      `--check` never writes (read-only temp dir).
- [ ] Golden examples (Round 05) switch to `planRender`, no temp dir.
- [ ] Docs: README "Using js-tmpl in CI"; API.md `planRender`, `--check`.
- [ ] Prototype: replace a2scaffold's `output-paths.js` + staging with
      `planRender` in a branch; record lines removed in Do (success metric:
      mirrored engine logic → 0).

### Out of Scope

- `--clean` / deleting stale files (would require owning `outDir`).
- Content diffs (use `git diff` after a real render).

## Do

[Progress log — update as work proceeds]

## Check

- [ ] `renderDirectory` output byte-identical before/after the refactor.
- [ ] `--check` exit codes match the design.
- [ ] a2scaffold prototype drops its path mirror.

## Act

**Learnings**:

- ...

**Promotions**:

- [ ] → context/ : [topic]
- [ ] → skills/ : [topic]
