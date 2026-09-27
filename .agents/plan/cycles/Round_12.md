# Round 12 — Security: patched runtime dependencies and a pinned release pipeline, for 0.1.3 and 0.2.0

**Status**: Complete
**Date started**: 2026-09-26
**Date completed**: 2026-09-27
**Release target**: v0.1.3 (patch; branch `fix/0.1.3` from `main` = `v0.1.2`) and v0.2.0 (on `dev`, PR #18)

## Goal

Ship no release whose runtime dependencies have published advisories, and
make the pipeline that cuts releases trust nothing mutable. 0.1.x gets the
dependency fix as a patch, as SECURITY.md promises.

### Findings (review of PR #18, 2026-09-26)

| ID  | Finding                                                                                                                                                                           | Release       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| S1  | Lockfile pins `handlebars@4.7.8`: JS injection via AST type confusion (critical / high), prototype-access gaps, decorator DoS. `pnpm audit --prod`: 8 advisories, fixed in 4.7.9. | 0.1.3, 0.2.0  |
| S2  | Lockfile pins `js-yaml@4.1.1`: quadratic CPU in merge keys and `!!omap`. 4 advisories, fixed in 4.3.2.                                                                            | 0.1.3, 0.2.0  |
| S3  | Actions referenced by mutable tags; `release.yml` runs with `contents: write`.                                                                                                    | 0.1.3, 0.2.0  |
| S4  | `ci.yml` has no `permissions` block (inherits the repository default).                                                                                                            | 0.1.3, 0.2.0  |
| S5  | No Dependabot: S1 / S2 were found by hand.                                                                                                                                        | 0.2.0         |
| S6  | `engines.node >=20`, but Node 20 reached end of life in April 2026.                                                                                                               | 0.2.0 (break) |

Threat-model note: SECURITY.md trusts templates and values, so S1 / S2 need
untrusted input to be exploited. They are fixed anyway: consumers with old
lockfiles keep the vulnerable versions, and audit scanners flag the ranges.

## Plan

1. `fix/0.1.3` from `main`: raise the dependency floors (S1, S2); pin
   actions by SHA and set CI read-only (S3, S4). Same action majors, no
   behaviour change. **Gate:** `pnpm verify`; `pnpm audit --prod` clean.
2. PR → `main`, Release workflow `stable` / `patch` → v0.1.3. **Must run
   before PR #18 merges:** `release.yml` checks out `main`, so once `main`
   is 0.2.0 no 0.1.x release can be cut from it.
3. `dev`: the same S1–S4 commits, plus Dependabot (S5) and Node ≥ 22 (S6).
4. Merge `main` (v0.1.3) into `dev`; then PR #18 → Release `stable` /
   `minor` → v0.2.0.

## Do

- **2026-09-26 — `fix/0.1.3`.** Floors `handlebars ^4.7.9`,
  `js-yaml ^4.3.2`. Audit prod 12 → 0. `pnpm verify` green: 403 tests,
  coverage 100 / 99.68 / 100. Actions pinned: checkout, setup-node,
  pnpm/action-setup v4.4.0; action-gh-release v2.6.2; install-action
  v2.87.21 (`tool: git-cliff` instead of the `@git-cliff` tag).
- **2026-09-26 — `dev`.** Same two commits, plus Dependabot (npm with
  `versioning-strategy: increase`, GitHub Actions; both target `dev`) and
  `build!:` Node ≥ 22 (engines, CI matrix, README, CONTRIBUTING, ROADMAP).
  `pnpm verify` green: 554 tests, coverage 99.74 / 99.41 / 100.
- **Merge rehearsal.** `fix/0.1.3` + a simulated `chore: release v0.1.3`
  merged into the `dev` branch cleanly (identical hunks on both sides).

## Check

- [x] v0.1.3 published 2026-09-26; `npm view @nci-gis/js-tmpl@0.1.3
  dependencies` → `handlebars ^4.7.9`, `js-yaml ^4.3.2`.
- [x] `main` → `dev` merge clean; PR #18 CI green on Node 22 / 24, three
      OSes.
- [x] v0.2.0 published 2026-09-26 (PR #18); `pnpm audit --prod` clean.
- [x] Dependabot alerts enabled (API check 2026-09-27); first version PRs
      (#20–#25) opened against `dev` right after PR #18 merged.
- [x] Dependabot security updates enabled by hand 2026-09-27
      (repository setting; `automated-security-fixes` → `enabled: true`).

## Act

**Learnings**:

- **A patch must ship before the minor merges.** `release.yml` checks out
  `main`, so once `main` is 0.2.0 no 0.1.x can be cut. Rehearse the
  ordering with a throwaway merge before opening the release PR.
- **Advisories found by hand mean a missing gate.** S1 / S2 sat in the
  lockfile until a review read it. Dependabot now watches; `pnpm audit
--prod` is still not in `pnpm verify`.
- **Pinning by SHA changes some action inputs.** `install-action@<sha>`
  cannot select a tool by tag, so `tool: git-cliff` replaces `@git-cliff`.
- **Dependabot reads its config from `main` only.** Committing
  `dependabot.yml` to `dev` does nothing until it reaches `main`; version
  PRs target `dev` as configured.
- **A new prettier can fail a dependency PR.** #21 (prettier 3.9.9)
  reformats `docs/analysis/overview.md`; formatter bumps need a `--write`
  commit on the same PR.

**Promotions**:

- [ ] → context/ : release ordering rule (patch from `main` before the
      minor merges) — candidate once a second release confirms it.
