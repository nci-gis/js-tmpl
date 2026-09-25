# Round 05: Hard Gates — CI, release, cross-platform, golden examples

**Status**: Planning
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

[Progress log — update as work proceeds]

## Check

- [ ] Throwaway PRs with a lint error, a broken md link, and a coverage
      drop each fail CI.
- [ ] Release workflow runs every CI gate before its version-bump commit.
- [ ] Deliberately breaking an example template fails `pnpm test`.
- [ ] Windows result for `bin/js-tmpl` recorded in Do (works / broken).

## Act

**Learnings**:

- ...

**Promotions**:

- [ ] → context/ : [topic]
- [ ] → skills/ : [topic]
