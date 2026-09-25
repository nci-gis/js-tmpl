# Round 07: No Silent Outcomes — strict engine contract + error codes

**Status**: Complete
**Date started**: 2026-09-25
**Date completed**: 2026-09-26
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
- Target collisions are checked by exact path (Round 06). Targets that
  differ only by case (`README.md` / `readme.md`) are distinct on Linux
  but the same file on default macOS/Windows file systems, so one silently
  overwrites the other there: output depends on the OS.
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

- [x] **Spike first — Proxy on `view`** (shared with Round 09). Under
      Handlebars strict mode, measure: (a) every missing read is caught,
      including helper / block-helper arguments; (b) no false positives from
      Handlebars' internal probes (`hasOwnProperty`, `length`, `toJSON`,
      symbols, `each` over objects/arrays, partials, `@root`, `../`);
      (c) output byte-identical when nothing is missing; (d) overhead on the
      examples. Record the verdict in Do; it decides the next two items.
- [x] ~~**Internal missing handler** (if spike passes)~~ — spike failed; took the AST fallback instead (see Do) — default throws with
      template `relPath` + path + position (`mustache` / `helper-arg` /
      `block-param`). Flips the Round 04 "known gap" tests.
      _If the spike fails:_ close the helper-argument gap by marking param
      `PathExpression`s strict on the `hbs.parse()` AST (private compiler
      flag — verify on the pinned Handlebars version, add a guard test),
      and defer collect-all.
- [x] ~~**Collect-all diagnostics**~~ — moved to Round 08 (2026-09-26).
      Collecting across templates needs every template rendered in memory
      before anything is written (otherwise a failure leaves a partial
      output), which is `planRender`. Round 07 stays fail-fast. Rejected
      alternative: a separate `validate` command that the error points to —
      it would use the same engine and know nothing the failing run did not,
      so it only adds a step; a branch-complete (static) validator would be
      approximate and is evidence-gated. Missing values keep exit code 1;
      detail goes in the error `code`.
- [x] **`${missing}` throws** with template `relPath` + var name (same shape
      as G-4). Present-but-empty (`''`) still renders empty. Update
      API.md:350 + migration note.
- [x] **Migration note for strict helper arguments** — declare optional
      keys (`key: null` / `false` / `''`); `{{#if missing}}` now throws.
- [x] ~~**Interpolated value must be one segment**~~ — revised after
      a2scaffold evidence: values may nest with `/`; every part must name
      something; `\` rejected (see Do).
- [x] **Case-insensitive target collisions** — treat targets equal under
      case folding as a collision on every OS, so a tree renders the same
      files everywhere. Breaking for trees relying on case-only
      differences (rare); migration note.
- [x] **Config discovery moves to the CLI layer** — `resolveConfig` only
      loads a config file when given one explicitly (`configFile`); the CLI
      keeps today's auto-discovery by resolving the path before calling it.
      Update README § "Fixed Rules for Minimal Auto-Discovery" to say it is
      CLI behaviour.
- [x] **`src/errors.js`** — `JsTmplError` + frozen `ErrorCodes`; export from
      `src/index.js`. Migrate all 14 `throw new Error` sites and Round 06's
      `UsageError`. `contentRenderer` rethrows with `{ cause }`.
- [x] ~~CLI prints `hint` when present;~~ `--verbose` also prints `code` (no `hint` field; see Do).
- [x] docs/API.md "Errors" table (code, when, `details` shape, hint);
      `scripts/check-doc-exports.js` fails on an undocumented code.
- [x] Tests: one per code (`assert.throws(fn, { code })`) + meta-test that
      every `ErrorCodes` value is exercised; migration tests for each
      breaking item.
- [x] Before release: run a2scaffold against the build and record needed
      changes (expected: drop the `cwd` workaround).

### Out of Scope

- Warning on unused values (noisy; shared value files are normal).
- Public `onMissing`, `strict: false`, CLI injection of functions (see
  Design notes: evidence-gated).
- Changing existing message wording beyond what the new rules need.

## Do

- **2026-09-25 — Spike verdict: Proxy fails; AST path taken.** Throwaway
  scripts, Handlebars 4.7.8.
  - _Proxy on `view`_ (`has` trap records a miss and pretends present,
    `get` wraps nested objects):
    - (a) completeness ✗ — a missing parent (`{{a.b}}`, no `a`) is read
      through `lookupProperty` (`get`), then `container.strict(undefined, …)` throws natively, so collecting stops there; block-param paths
      are never seen.
    - (b) false positives ✗ — a helper doing `'opt' in o` hits the `has`
      trap: recorded as a miss, and in collect mode the lie changed the
      helper's result (`y` instead of `n`). Behaviour change: rejected.
    - (c) output identical when nothing is missing ✓.
  - _AST marking_ (set `strict` on `PathExpression`s in params, hash values,
    sub-expressions, partial contexts; skip `this` / `..`): 26 / 28 spike
    cases as expected; the 2 others were a wrong expectation (HTML
    escaping) and block params, which Handlebars never strict-checks, even
    in `{{x.m}}` (native gap, documented and pinned as a known limit).
    Errors come from Handlebars with `line:col`. Helper-internal JS reads
    are untouched.
  - Consequences: default throw via AST (below). Proxy-based collect-all
    **not** built. Round 09 must re-verify its own Proxy use (read
    recording only, no lying `has`) rather than assume this spike passed.
- **Strict helper arguments** — `src/engine/strictCompile.js`
  (`compileStrict(hbs, source)`), used by `contentRenderer` and by
  `registerPartials`, which now registers pre-compiled partials (a string
  partial would be compiled by Handlebars without the marking). 26 tests in
  `strictCompile.test.js`; Round 04 "known gap" tests flipped.
  - Golden tests caught the breaking change on a shipped example:
    `examples/yaml-templates` used `{{#if colorize}}` / `{{#if path}}` on
    list items that lacked those keys. Migrated by declaring them
    (`colorize: false`, `path: null`); rendered output unchanged.
  - `partials.test.js` asserted `hbs.partials[name] === source`; now asserts
    the rendered partial (18 + 2 assertions), since partials are stored
    compiled.
  - Docs: API.md § Strict templates rewritten (table, known limit,
    migration note); README and `examples/helpers` README updated.
- **2026-09-26** — `${missing}` throws, single-segment values, empty /
  `.` / `..` segments rejected (`03f2969`); case-insensitive collisions
  (`93bf1d7`); config discovery CLI-only + `findProjectConfig` (`b9ddeb1`);
  `JsTmplError` / `ErrorCodes` (27 codes), every code tested (meta-test)
  and documented (`docs:check`) (`aa3984d`). Deviation: no separate `hint`
  field — messages already carry the recovery line (project convention),
  so a `hint` would duplicate it; `--verbose` prints `code:`.
  - Round 06's outDir guard is unreachable once values cannot contain
    separators or `..`; kept as defence in depth, logic moved to
    `isInsideDir` (utils/fs) with direct tests; its code is listed as
    intentionally unreachable in the error meta-test.
- **2026-09-26 — a2scaffold 0.2.0 against this build: 227 / 237.**
  - 9 failures: `JSTMPL_PATH_INVALID_VALUE`. The `skill-ref` template is
    `${skill.path}/SKILL.md.hbs` with values such as `skills/test-skill`
    and `skills/group/nested-skill`: **variable depth**, which template
    directories cannot express. The single-segment rule blocks a legitimate
    use with no alternative inside js-tmpl. Counter-evidence to the rule;
    decision pending (see below).
  - 1 failure: a2scaffold's own mirror test pins "`${missing}` renders
    empty". Expected; the mirror goes away with `planRender` (Round 08).
  - No failures from strict helper arguments: a2scaffold declares its keys.
- **2026-09-26 — Rule revised (human-approved): values may nest with `/`.**
  Each rendered `/`-part must not be `""`, `.` or `..` (rules out `/abs`,
  `a//b`, `../x`, `a/..`); `\` rejected on every OS; primitives only;
  missing still throws. Still stricter than 0.1.x (no `..`, no leading `/`,
  no `\`), and a2scaffold's variable-depth `${skill.path}` keeps working.
  a2scaffold re-run: **236 / 237**, the remaining failure being its mirror
  test of the old `${missing}` → `""` rule (expected; Round 08).
- **2026-09-26 — `targetFs` + symlink-aware containment (human-approved,
  `25d5897`).**
  - `targetFs: 'portable' | 'case-sensitive'` (config file + API; no CLI
    flag). Named for the _target_, not a behaviour switch: the user declares
    where the output goes; js-tmpl never reads `process.platform` (render
    host ≠ target, e.g. macOS CI for a Linux image). `portable`: case-only
    differences collide at plan time. `case-sensitive`: exact keys at plan
    time, and at write time a target that the disk resolves to a file
    already written in this run (same `dev` + `ino`) throws
    `JSTMPL_OUTPUT_COLLISION` instead of overwriting. Inode, not "exists":
    a stale `readme.md` from an earlier run on Linux must not be a false
    positive. Trade-off accepted: that write-time failure can leave earlier
    files on disk. Tested on Linux with a hard link (two names, one inode —
    what a case-insensitive disk does). Invalid values →
    `JSTMPL_CONFIG_INVALID_VALUE` (new code).
  - outDir is the container for every write: right before each write,
    `realPathOfNearest(target)` must be `realpath(outDir)` or inside it.
    Covers directory symlinks and **dangling** symlinks (which `existsSync`
    reports as absent, while `writeFile` would follow them and create the
    target outside). Loops stop after 40 links. `JSTMPL_OUTPUT_OUTSIDE_OUTDIR`
    is now reachable and tested; the lexical plan-time check was removed as
    dead code. Out of scope: TOCTOU races on a directory someone else
    modifies during the render.
- **2026-09-26 — CI (PR #14).** Run 1: macOS green (real case-insensitive
  disk: `targetFs` write-time collision and junctions verified); Windows
  red on 3 `realPathOfNearest` unit tests — the JS `fs.realpathSync` keeps
  8.3 short names (`RUNNER~1`) while the OS returns `runneradmin`. Engine
  comparisons were consistent (same function on both sides), but the
  canonical form is the OS's: switched to `realpathSync.native`
  (`1444b07`). Run 2: all 11 checks green.

## Check

- [x] No silent case left: each row in Evidence has a throwing test
      (known limit pinned: block-param fields, a Handlebars gap).
- [x] No `throw new Error(` left in `src/` (except `realPathOfNearest`'s
      symlink-loop guard, an OS-level condition like ELOOP).
- [x] `resolveConfig` without `configFile` reads no file from `cwd`
      (test with a config present); CLI behaviour unchanged (spawn test).
- [x] Every code documented; `docs:check` enforces it.
- [x] Migration notes present for every breaking item (Strict templates,
      Path Rendering rules, `findProjectConfig`, `targetFs`).
- [x] Spike verdict recorded in Do, with the path taken (AST).
- [x] ~~A template with three missing values reports all three in one
      run.~~ Moved to Round 08 with collect-all.
- [x] CI green on macOS and Windows (junctions, case-insensitive disks):
      PR #14 @ `1444b07`, 11 / 11.

## Act

**Learnings**:

- **Spike before committing to a mechanism.** The Proxy idea looked like
  one tool for three features; the spike showed it changes helper
  behaviour and misses missing parents. The AST route is narrower and
  exact. Record the verdict where the next round (09) will read it.
- **The embedder is the fastest reviewer.** Running a2scaffold against the
  build overturned "one value, one segment" in minutes — before it
  shipped, when changing it cost nothing. Run the embedder before calling
  a breaking round done.
- **Name options after the fact the user declares, not the behaviour they
  toggle.** `targetFs: case-sensitive` says "my output lives here";
  `caseSensitiveOutput: true` would invite reading it as a preference.
- **Security checks belong at the last moment and on the real object.**
  A lexical `outDir` check missed symlinks, including dangling ones that
  `existsSync` reports as absent. Check the real path right before writing.
- **Cross-platform CI keeps finding the canonical form.** Windows 8.3 names
  made two "real paths" of one directory differ; use the OS's resolution.

**Promotions**:

- [ ] → skills/ : `handlebars-helpers` — note that helper arguments are
      now strict-checked by js-tmpl (compileStrict); pending human edit.
- [ ] → context/ : [topic]
