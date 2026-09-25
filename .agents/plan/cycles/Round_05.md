# Round 05: Hard Gates — CI, release, cross-platform, golden examples

**Status**: Review
**Date started**: 2026-09-25
**Date completed**: —
**Release target**: v0.1.1 (no library behaviour change)

## Goal

Make every quality promise machine-checked before anything else changes:
the gates a human runs locally are the gates CI and the release pipeline
enforce, on every supported Node version and OS, and the shipped examples
cannot silently break. Runs first so Rounds 06–09 land behind real gates.

### Evidence (observed on `dev` @ `fac1bfd`)

- [ci.yml](../../../.github/workflows/ci.yml): `pnpm lint` has
  `continue-on-error: true`; `format:check`, `docs:check`, coverage are not
  run.
- [release.yml](../../../.github/workflows/release.yml) and
  [publish.yml](../../../.github/workflows/publish.yml) run only `pnpm test`.
- `pnpm test:coverage` enforces no threshold, so "coverage ≥ 99%" in every
  round's Check depends on someone remembering to look.
- Linux only, Node 20 only (publish: 24). ROADMAP § Node.js Support says
  primary 22, 24; compatible 20. Windows is untested; `bin/js-tmpl` is a
  bash script (Windows breakage suspected, not yet verified).
- `examples/*` have `index.js` + README describing output, but `pnpm test`
  never runs them.
- ROADMAP 0.1.0 "Release gate" checklist was never ticked.

## Plan

- [ ] **`pnpm verify`** = lint + format:check + docs:check + test:coverage
      with threshold (`--test-coverage-lines=99` and branch/function
      equivalents; needs Node ≥ 22.8). CI, release, and publish all call it.
- [ ] **`ci.yml`**:
  - Remove `continue-on-error`; drop the no-op `pnpm build` step.
  - `pnpm test` matrix: Node 20 / 22 / 24 on ubuntu; Node 22 / 24 on macOS
    and Windows.
  - `pnpm verify` job on Node 24 / ubuntu.
  - `npm pack --dry-run` job asserting the tarball contains only
    `package.json#files` (no `tests/`, `.agents/`, `docs/analysis/`,
    `examples/`).
- [ ] **`release.yml` / `publish.yml`**: run `pnpm verify` on Node 24 before
      the version bump / publish.
- [ ] **Golden examples** — `tests/integration/examples.test.js` renders
      each `examples/*/` into a temp dir and compares byte-for-byte with a
      committed `expected/` (one `expected-<mode>/` per mode, e.g.
      path-guards dev vs prod). `pnpm examples:update` regenerates
      explicitly, never automatically. Runs on every OS in the matrix, so
      it is also the first cross-platform determinism check.
- [ ] **CONTRIBUTING.md § Release Process** — preflight = `pnpm verify` +
      review of `npm pack --dry-run`; document `release.yml` inputs with one
      example per channel; list required status-check names for branch
      protection.
- [ ] **ROADMAP.md** — tick the 0.1.0 release-gate items that are now
      enforced; reword as "enforced by CI".

### Out of Scope

- Replacing the bash `bin` — library/CLI change, Round 06. This round only
  proves (or disproves) the Windows breakage.
- GitHub branch-protection settings (repo admin, not code).

## Do

- **2026-09-25** — Implemented on `chore/hard-gates`.
  - `pnpm verify` = lint + format:check + docs:check + `pack:check` +
    `test:coverage` (lines / branches / functions ≥ 99, `tests/**` and
    `examples/**` excluded, so the number measures `src/` only: 100 / 99.64
    / 100). Node rounds thresholds **down to integers** (99.9 → 99): verified
    on 22.17.1 and 24.21.0. Fine for a 99 gate; don't write decimals.
  - Coverage flags need Node ≥ 22.8, so `pnpm verify` fails with
    `bad option` on Node 20. Documented in CONTRIBUTING (dev needs 22/24;
    20 stays "compatible" for consumers).
  - `pnpm test` was `node --test $(find tests …)`, which does not run in
    cmd on Windows. Now plain `node --test` (auto-discovers `**/*.test.js`
    on 20 / 22 / 24): 371 tests, same set.
  - `scripts/check-pack.js` (`pnpm pack:check`): tarball has 25 files, none
    from tests / docs / examples / scripts / agent dirs.
  - CI: `test` matrix (ubuntu 20/22/24, macOS + Windows 22/24), `verify`
    (Node 24), `cli` (pack → install into a scratch project →
    `npx js-tmpl --help` on 3 OSes). Release and publish now run
    `pnpm verify` on 24.
  - Golden examples: `tests/integration/examples.golden.js` (shared cases,
    explicit inputs, env pinned), `examples.test.js`, `pnpm examples:update`.
    6 cases: yaml-templates production/development, path-guards prod/dev,
    value-partials, helpers. `tests/golden/` is in `.prettierignore`;
    `.gitattributes` forces LF so bytes match on Windows.
    `examples/helpers/helpers.js` extracted so the example and the test
    share one helper map.
  - **Findings**:
    - `examples/yaml-templates` has been broken since 0.1.0: its header
      partial used `{{env.DATE}}`, not allowlisted, so strict mode (VP-9)
      throws. A render timestamp is non-deterministic anyway, so the line
      is removed. Caught by the golden test on its first run.
    - **The published CLI never worked from an installed package, on any
      OS**: `bin/js-tmpl` resolves `main.js` relative to the
      `node_modules/.bin` symlink, giving
      `Cannot find module …/node_modules/src/cli/main.js` (reproduced on
      Linux). Fix belongs to Round 06 (#6, evidence updated); the `cli`
      job is `continue-on-error: true` until then, and removing it is a
      Round 06 Check item.
    - README "No config file (use defaults only)" is false when a config
      file exists in `cwd`; added to Round 07 evidence.
  - CONTRIBUTING: prerequisites, `pnpm verify` / golden workflow,
    Preflight, release inputs with examples per channel, required status
    checks. ROADMAP: 0.1.0 release gate stated as not machine-checked
    (not ticked retroactively); enforced from 0.1.1.

## Check

- [ ] Throwaway PRs with a lint error, a broken md link, and a coverage
      drop each fail CI. _Pending: needs the branch pushed to GitHub.
      Locally each gate exits non-zero on its failure (lint caught an import
      order error during this round; coverage fails at threshold 100)._
- [x] Release workflow runs every CI gate before its version-bump commit
      (`pnpm verify` step precedes "Update package.json version").
- [x] Deliberately breaking an example template fails `pnpm test`
      (appended a line to path-guards `common.yaml.hbs` → 2 golden cases
      fail with `content differs: common.yaml`; reverted).
- [x] `bin/js-tmpl` result recorded in Do: broken on every OS, not only
      Windows. First real Windows/macOS run happens when CI runs.

## Act

**Learnings**:

- ...

**Promotions**:

- [ ] → context/ : [topic]
- [ ] → skills/ : [topic]
