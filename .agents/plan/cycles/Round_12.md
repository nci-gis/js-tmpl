# Round 12 — Security: patched runtime dependencies and a pinned release pipeline, for 0.1.3 and 0.2.0

**Status**: In Progress
**Date started**: 2026-09-26
**Date completed**: —
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

- [ ] v0.1.3 published; `npm view @nci-gis/js-tmpl@0.1.3 dependencies`
      shows the new floors.
- [ ] `main` → `dev` merge clean; PR #18 CI green on Node 22 / 24, three
      OSes.
- [ ] v0.2.0 published; `pnpm audit --prod` clean on the released tree.
- [ ] Dependabot alerts and security updates enabled in the repository
      settings (Dependabot reads `dependabot.yml` from `main` only, so it
      starts after PR #18).

## Act

**Learnings**:

- ...

**Promotions**:

- [ ] → context/ : [topic]
- [ ] → skills/ : [topic]
