# Round 08: Render Plan — `planRender()` + `--check`

**Status**: Review
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
- **Canonical `/` relPaths.** Today `relPath` uses `path.sep` (Round 05
  found 20 tests assuming `/`). Once `planRender` / `--check` (and Round 09
  explain) expose it, output would differ between Windows and POSIX. Plan
  entries and messages use `/`; convert to native only at filesystem
  calls.
- **Collect-all diagnostics (from Round 07).** `planRender` renders every
  template in memory; per template it records the first missing value
  (Handlebars stops there — Round 07 spike), and records every path-level
  miss (`${}`, `$if{}`, js-tmpl's own code). Any error → one aggregate
  error (sorted by template, then path; exit 1), and nothing is written:
  the same all-or-nothing rule as Round 06's `planTargets`.
- **Memory.** Holding the plan costs the total output size — KB to MB for
  config and scaffold trees; not a concern at that size. If a real tree
  makes it one: render twice (pass 1 validates and discards content, pass 2
  renders and writes), memory ≈ largest file, 2× CPU. Correct only because
  helpers must be pure (Round 04 contract). Evidence-gated; large-scale
  work belongs to 0.4.x.
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

- [x] Extract `planRender` from `renderDirectory`; existing tests pass
      unchanged. Export + document in API.md.
- [x] Collect-all: aggregate error for all templates (first miss each) plus
      every path-level miss; nothing written on error.
- [x] ~~`compareWithOutDir`~~ `comparePlan(plan, outDir) → { added, changed }` (exported, not internal: the CLI must stay reproducible through the API).
- [x] CLI `--check`.
- [x] Tests: clean / added / changed / extra files ignored / byte-exact
      (trailing newline, CRLF) / guards pruning reflected in plan /
      `--check` never writes (read-only temp dir).
- [x] Golden examples (Round 05) switch to `planRender`, no temp dir.
- [x] Docs: README "Using js-tmpl in CI"; API.md `planRender`, `comparePlan`, collect-all, `--check`.
- [x] Prototype: replace a2scaffold's `output-paths.js` + staging with
      `planRender` in a branch; record lines removed in Do (success metric:
      mirrored engine logic → 0).

### Out of Scope

- `--clean` / deleting stale files (would require owning `outDir`).
- Content diffs (use `git diff` after a real render).

## Do

- **2026-09-26** — Implemented on `feat/render-plan` (`5db937c`).
  - `planRender(cfg, hbs) → { relPath, target, content }[]`, sorted by
    `target` (locale-independent compare). `renderDirectory` = `planRender`
    - write, so a content error now also leaves `outDir` untouched (Round 06
      only guaranteed that for path errors).
  - Canonical `/`: the walker builds `relPath` with `/` on every OS and
    `renderPath` returns `path.posix.join`; native paths only at fs calls.
    Messages and `details.relPath` are therefore identical across OSes.
  - Collect-all: walker takes an `errors` sink (failing guard → recorded,
    subtree skipped); `planTargets` collects path errors and collisions;
    content errors collected per template via one `collect()` helper that
    rethrows anything that is not a `JsTmplError` (I/O stops the run,
    `EACCES` test). One error → thrown as-is (codes and existing tests
    unchanged); several → `JSTMPL_MULTIPLE_ERRORS` with `details.errors`,
    sorted by `relPath` then message, plus the "declare optional keys" line
    when any is a missing-value error.
  - Missing-value messages rewritten from Handlebars'
    `"x" not defined in [object Object] - 5:4` to
    `"x" is not defined in the view (line 5, column 4)`. Acceptable in
    0.2.0: codes, not text, are the contract now.
  - `comparePlan(plan, outDir) → { added, changed }` (exported: what the
    CLI does must be possible through the API), byte-exact, extra files
    ignored, reads held to the container rule. CLI `--check`: drift on
    stdout, summary on stderr, exit 3; render errors still exit 1.
  - Golden tests plan in memory (no temp dir); golden files unchanged.
  - Suite 505; coverage 99.71 / 99.55 / 100.
- **2026-09-26 — a2scaffold prototype** (scratch clone, not pushed; patch
  kept locally as `a2scaffold-planRender-prototype.patch`):
  - `output-paths.js` 192 → 34 lines: a thin wrapper over `planRender`,
    **zero lines mirroring engine rules** (success metric met).
  - `scaffold()` and `sync()` iterate the plan instead of rendering into
    `mkdtemp` staging dirs and walking them.
  - `conflicts.js` compares existing files with the **rendered** content
    instead of the raw template (its own comment called the old check a
    prediction).
  - `src/` net −203 lines (+53 / −256). Tests: 225 / 229; the 4 failures
    are tests of the removed mirror API (sync signature, partial view,
    `resolveOutputPath`).
  - Observation, not yet evidence: a2scaffold's `checkExistingFiles` is
    called with a partial view (path variables only). `planRender` needs
    the full view because it renders content. In a2scaffold's real flow
    the full view is always available, so no path-only planning API is
    added.
  - First real collect-all output: 11 errors (8 guards, 3 templates) in one
    run, with the hint line.
- **2026-09-26 — CI (PR #15).** Run 1: Windows red — the engine was right,
  the tests were not: they still converted template paths to native
  separators (`toNative`, `path.join`) before `renderPath`, and expected
  `\` in `relPath`. Fixed the tests, removed the unused `toNative`
  (`9b480e6`). Run 2: 11 / 11 green.

## Check

- [x] `renderDirectory` output byte-identical before/after the refactor
      (golden tests unchanged; `examples:update` produced no diff).
- [x] `planRender` output (relPath, target, order) identical on the
      Windows and POSIX CI jobs (the `/`-path `deepStrictEqual` test runs on
      all three OSes; PR #15 @ `9b480e6`, 11 / 11).
- [x] `--check` exit codes match the design (spawn tests: 3 / 0 / 3 / 1).
- [x] Several missing values in several templates are reported in one run,
      and `outDir` is untouched (`planRender.test.js`).
- [x] a2scaffold prototype drops its path mirror (192 → 34 lines).

## Act

**Learnings**:

- ...

**Promotions**:

- [ ] → context/ : [topic]
- [ ] → skills/ : [topic]
