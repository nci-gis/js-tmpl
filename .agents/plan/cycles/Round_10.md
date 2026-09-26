# Round 10 — Patch 0.1.2: value trees use own properties only, and the walker cannot loop

**Status**: Complete
**Date started**: 2026-09-26
**Date completed**: 2026-09-26
**Release target**: v0.1.2 (patch; branch `fix/0.1.2` from `main` = `v0.1.1`)

## Goal

Fix two defects present in 0.1.1 without changing documented behaviour, so
`^0.1.0` consumers (a2scaffold) get them automatically. Source: review of
PR #15, 2026-09-26 (findings R1, A3).

### Findings

- **R1 — Prototype pollution.** `valuesDir/__proto__/x.yaml` passes
  `SEGMENT_RE` (`\w+`); `placeInTree` checks `seg in cur`, gets
  `Object.prototype`, and writes `x` onto it. Reproduced: `({}).x === 1`.
- **R1b — Inherited keys count as present.** A values file with top-level
  `toString:` throws a false `NS_ROOT_COLLISION` (C-2 uses `key in partials`).
  Same pattern: C-3 check, `pickEnv` (`envKeys: ['toString']` picks a
  function).
- **A3 — Walker hangs on symlink loops.** `fs.stat` follows links and there
  is no cycle check: two `l -> .` links in `templateDir` walk exponentially
  (still running after 15 s); one loop dies with a raw `ELOOP`.

## Invariants

- No documented behaviour changes; public exports unchanged.
- `pnpm verify` green after every phase (Round 05 gate).
- A shared template dir symlinked in twice (no cycle) still renders.
- After release: merge `main` into `dev`, resolve conflicts there.

## Phases

### Phase 1 — Look up value-tree keys as own properties only

- **Files:** `src/config/valuePartials.js`, `src/utils/namespacing.js`,
  `src/config/view.js`, tests in `tests/unit/config/`, `tests/unit/utils/`.
- **Change:**
  - `placeInTree`: `Object.hasOwn(cur, seg)` instead of `seg in cur`.
  - `assertValidSegments`: reject `__proto__` (`NS_INVALID_SEGMENT`). It
    cannot become an own key through plain assignment. `constructor` and
    `prototype` work once lookups are own-only, so they stay allowed.
  - `view.js` C-2 / C-3 and `pickEnv`: `Object.hasOwn`.
  - Verify: does a `__proto__:` key in a `valuesFile` (js-yaml, JSON.parse)
    become an own property or the prototype? Add a test either way.
- **Tests:** `__proto__/x.yaml` rejected and `({}).x` stays `undefined`;
  `constructor/prototype/x.yaml` lands as own keys, prototype untouched;
  root key `toString` renders without collision; `envKeys: ['toString']`
  picks nothing.
- **Gate:** `pnpm verify`.

### Phase 2 — Stop the template walker on directory cycles

- **Files:** `src/engine/treeWalker.js`, `src/errors.js`, `docs/API.md`,
  `tests/unit/engine/treeWalker.test.js`.
- **Change:** each queued directory carries the real paths of its
  ancestors; a directory whose real path is one of them throws
  `JSTMPL_TEMPLATE_DIR_LOOP` (new code, additive), naming both paths.
  Detect ancestors only. A plain visited set would reject a shared dir
  linked twice, which is legitimate.
- **Tests:** two self-links → error in < 1 s; link to an ancestor → error;
  same sibling dir linked twice → both copies walked. Symlink tests skip
  where the OS denies symlink creation (as in Round 07).
- **Gate:** `pnpm verify`; CI matrix (Windows symlink behaviour).

### Phase 3 — Reconcile trust docs and release 0.1.2

- **Files:** `SECURITY.md`, `ROADMAP.md`, `CHANGELOG.md`, `package.json`.
- **Change:**
  - SECURITY.md (R6): supported versions `0.1.x`; `env` is allowlisted
    (`envKeys` / `envPrefix`), not all of `process.env`.
  - ROADMAP (R6): tick the shipped 0.1.1 items; add 0.1.2 line.
  - Release per Round 05 workflow (it bumps the version and writes the
    CHANGELOG); merge `main` → `dev`.
- **Gate:** `pnpm verify`; publish workflow tag == version.

## Do

- **2026-09-26 — decisions (human):** 0.1.x keeps getting security fixes
  after 0.2.0; hard links in `outDir` are refused (Round 11).
- **Phase 1** (`05960af`). `__proto__` rejected in `assertValidSegments`
  (shared with partial names); own-key checks in `placeInTree`, C-2, C-3,
  `pickEnv`. Verified: js-yaml and `JSON.parse` both keep a `__proto__:`
  key as an own property, and the view spread keeps it own, so
  `valuesFile` could not pollute; it only hit the false C-2.
- **Phase 2** (`e040d7d`). Deviation: `main` has no `JsTmplError` (Round
  07 is on `dev`), so the loop error is a plain `Error`. Add a code
  when merging `main` into `dev`. Without the fix the new test hangs.
- **Phase 3.** SECURITY.md and ROADMAP only. Version and CHANGELOG are
  written by the release workflow (git-cliff on `main`), not by hand.

## Check

- [x] No prototype key reachable from `valuesDir` or `valuesFile`: a
      `__proto__` segment is rejected; `valuesFile` keys stay own (tests).
- [x] Symlink cycle fails fast on all three CI OSes (PR #16, 11 / 11).
      Plain `Error` on 0.1.x; the code is added on `dev`.
- [x] a2scaffold (`42fd312`) 251 / 251 against the 0.1.2 build.

## Act

**Learnings**:

- **`in` is the wrong presence test for data.** It sees inherited names:
  it polluted `Object.prototype`, and it raised a false collision for a
  key named `toString`. Use `Object.hasOwn` for any lookup of
  user-supplied keys.
- **Cycle checks: ancestors, not "visited".** Only a link back to an
  ancestor loops. A shared directory linked twice is legitimate and must
  still walk.
- **A patch branches from the release, not from `dev`.** `main` had no
  `JsTmplError`, so the fix used a plain `Error`. Plan the code for the
  `main` → `dev` merge.

**Promotions**:

- None. Closed by human direction before merging PR #16.
