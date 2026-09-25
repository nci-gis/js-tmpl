# Round 07: No Silent Outcomes — strict engine contract + error codes

**Status**: Planning
**Date started**: 2026-09-25
**Date completed**: —
**Release target**: v0.2.0 (breaking — do not ship in 0.1.x; a2scaffold
pins `^0.1.0`)

## Goal

Make the engine's contract uniform: every input is either used as
documented or rejected with a stable, machine-readable error. Removes the
last inconsistencies between path interpolation, path guards (G-4), and
content (VP-9), and stops the engine API from making implicit decisions for
embedders.

### Evidence

- `${var}` with a missing var renders `""` ([API.md:350](../../../docs/API.md#L350),
  documented). `t/${missing}/y.txt.hbs` → `out/y.txt`, so the file moves up a
  directory without any message. `$if{missing}` throws (G-4) and
  `{{missing}}` throws (VP-9); path interpolation is the odd one out.
- `${var}` value containing `/` creates nested directories. Not documented
  either way.
- `resolveConfig(cli, cwd)` (public engine API) auto-discovers
  `js-tmpl.config.*` in `cwd`. a2scaffold passes its own template root as
  `cwd` only to prevent picking up the user's project config (see
  `a2scaffold/src/scaffold/index.js` comment). The engine is making a
  decision it does not need to make.
- Handlebars `strict: true` checks simple mustaches only. A missing var as a
  **helper argument** is passed as `undefined` — including built-ins:
  `{{#if missing}}` renders the else branch, `{{#each missing}}` renders
  nothing, `{{upper missing}}` gets `undefined` (found in Round 04; pinned by
  "known gap" tests in `helpers.test.js` and `contentRenderer.test.js`).
  API.md previously claimed "missing data is always loud"; corrected in
  Round 04. a2scaffold templates use `{{#if …}}` on keys that may be absent,
  so closing this is breaking.
- All errors are plain `Error`; callers (a2scaffold, agents) can only match
  on message text. Handlebars' original error is lost on rethrow.

### Design notes

- Filter applied (PRINCIPLES § Embedding Rule): each item is the engine
  _doing less_ or _stating more_; none adds policy.
- Error codes are public API from this round. One class, `JsTmplError`
  (`code`, `hint?`, `details?`, `cause`). Naming `JSTMPL_<AREA>_<WHAT>`.
  Messages kept verbatim where possible; codes and hints are additive.
- Hints only where the fix is mechanical. No fuzzy "did you mean".

## Plan

- [ ] **`${missing}` throws** with template `relPath` + var name (same shape
      as G-4). Present-but-empty (`''`) still renders empty. Update
      API.md:350 + migration note.
- [ ] **Strict helper arguments** — make missing path expressions in helper
      and block-helper arguments throw like `{{var}}`. Candidate: walk the
      `hbs.parse()` AST and mark param `PathExpression`s strict before
      `hbs.compile(ast, { strict: true })`; spike first (private compiler
      flag — verify on the pinned Handlebars version and add a guard test).
      Flip the "known gap" tests; migration note: declare optional keys
      (`key: null` / `false` / `''`).
- [ ] **Interpolated value must be one segment** — reject values that
      contain `/` or `\`, or that are `.` / `..` / empty after
      interpolation. Migration note: nested output dirs come from template
      directories, not from values.
- [ ] **Config discovery moves to the CLI layer** — `resolveConfig` only
      loads a config file when given one explicitly (`configFile`); the CLI
      keeps today's auto-discovery by resolving the path before calling it.
      Update README § "Fixed Rules for Minimal Auto-Discovery" to say it is
      CLI behaviour.
- [ ] **`src/errors.js`** — `JsTmplError` + frozen `ErrorCodes`; export from
      `src/index.js`. Migrate all 14 `throw new Error` sites and Round 06's
      `UsageError`. `contentRenderer` rethrows with `{ cause }`.
- [ ] CLI prints `hint` when present; `--verbose` also prints `code`.
- [ ] docs/API.md "Errors" table (code, when, `details` shape, hint);
      `scripts/check-doc-exports.js` fails on an undocumented code.
- [ ] Tests: one per code (`assert.throws(fn, { code })`) + meta-test that
      every `ErrorCodes` value is exercised; migration tests for each
      breaking item.
- [ ] Before release: run a2scaffold against the build and record needed
      changes (expected: drop the `cwd` workaround).

### Out of Scope

- Warning on unused values (noisy; shared value files are normal).
- Changing existing message wording beyond what the new rules need.

## Do

[Progress log — update as work proceeds]

## Check

- [ ] No silent case left: each row in Evidence has a throwing test.
- [ ] No `throw new Error(` left in `src/`.
- [ ] `resolveConfig` without `configFile` reads no file from `cwd` (fs
      spy); CLI behaviour unchanged.
- [ ] Every code documented; `docs:check` enforces it.
- [ ] Migration notes present for all three breaking items.

## Act

**Learnings**:

- ...

**Promotions**:

- [ ] → context/ : [topic]
- [ ] → skills/ : [topic]
