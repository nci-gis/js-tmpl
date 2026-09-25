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
  decision it does not need to make. README § "Override Auto-Discovery"
  also claims "No config file (use defaults only)" by omitting
  `--config-file`, which is false when a config file exists in `cwd`
  (found in Round 05).
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
- **Strict-only, no flag.** No `strict: false` / `--no-strict` in 0.2.0.
  An opt-out is an extension point (anti-pattern without a use case) and
  a one-way door. Revisit only on a real issue, and then: explicit config,
  content only (paths stay strict), warnings returned as data, never
  logged by the engine.
- **Ownership boundaries** — js-tmpl owns what goes into Handlebars and what
  comes out; Handlebars owns the middle:

  ```text
  js-tmpl → [data boundary] → Handlebars → [file boundary] → js-tmpl
            view, missing       syntax, helpers,     plan, check,
            handler, provenance partials, compile    paths/guards, writes
  ```

  Missing-value handling lives at the data boundary (a `Proxy` on `view`),
  relying on JS property-access semantics, not Handlebars internals.
  `registerHelpers` stays a thin validation layer; replacing Handlebars is
  a non-goal.

- **Missing handler: internal seam first.** One internal mechanism, called
  by js-tmpl when a read misses. It is not a helper: helpers are invoked by
  template authors, the handler by the engine. Two consumers in 0.2.0:
  default throw (covers helper arguments too) and collect-all. Not
  exported.
- **Public `onMissing` only on evidence** — an option on
  `renderDirectory` / `planRender` (third argument), never in `cfg` (config stays pure
  data); content only; ships with an `examples/missing-handler/`; Round 09
  labels its values `handler-supplied`. No CLI: exposing any user function
  on the CLI means loading a user module, the same decision as
  `--helpers ./file.js`, and is made once for both.

## Plan

- [ ] **Spike first — Proxy on `view`** (shared with Round 09). Under
      Handlebars strict mode, measure: (a) every missing read is caught,
      including helper / block-helper arguments; (b) no false positives from
      Handlebars' internal probes (`hasOwnProperty`, `length`, `toJSON`,
      symbols, `each` over objects/arrays, partials, `@root`, `../`);
      (c) output byte-identical when nothing is missing; (d) overhead on the
      examples. Record the verdict in Do; it decides the next two items.
- [ ] **Internal missing handler** (if spike passes) — default throws with
      template `relPath` + path + position (`mustache` / `helper-arg` /
      `block-param`). Flips the Round 04 "known gap" tests.
      _If the spike fails:_ close the helper-argument gap by marking param
      `PathExpression`s strict on the `hbs.parse()` AST (private compiler
      flag — verify on the pinned Handlebars version, add a guard test),
      and defer collect-all.
- [ ] **Collect-all diagnostics** — one run reports every missing value
      (content, `${}` paths, `$if{}` guards) in a single aggregate error,
      sorted by template then path, instead of stopping at the first.
      Document the limit: only branches rendered with the current values
      are checked.
- [ ] **`${missing}` throws** with template `relPath` + var name (same shape
      as G-4). Present-but-empty (`''`) still renders empty. Update
      API.md:350 + migration note.
- [ ] **Migration note for strict helper arguments** — declare optional
      keys (`key: null` / `false` / `''`); `{{#if missing}}` now throws.
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
- Public `onMissing`, `strict: false`, CLI injection of functions (see
  Design notes: evidence-gated).
- Changing existing message wording beyond what the new rules need.

## Do

[Progress log — update as work proceeds]

## Check

- [ ] No silent case left: each row in Evidence has a throwing test.
- [ ] No `throw new Error(` left in `src/`.
- [ ] `resolveConfig` without `configFile` reads no file from `cwd` (fs
      spy); CLI behaviour unchanged.
- [ ] Every code documented; `docs:check` enforces it.
- [ ] Migration notes present for every breaking item.
- [ ] Spike verdict recorded in Do, with the path taken (Proxy or AST).
- [ ] A template with three missing values reports all three in one run.

## Act

**Learnings**:

- ...

**Promotions**:

- [ ] → context/ : [topic]
- [ ] → skills/ : [topic]
