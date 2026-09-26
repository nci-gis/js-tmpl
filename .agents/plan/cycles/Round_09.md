# Round 09: `--explain` — Output Provenance

**Status**: Planning
**Date started**: 2026-09-25
**Date completed**: —
**Release target**: v0.2.x (additive; needs Round 08)

> **Gate (2026-09-26, human-approved):** not part of 0.2.0. Start only when
> a real user needs "where did this file come from?" — e.g. a2scaffold, or a
> reviewer of agent-generated values. Until then `--check` + `git diff`
> answer "what changed". Re-spike the `view` Proxy first: Round 07 showed it
> is unsafe for detecting misses (lying `has`), not yet whether it is safe
> for recording reads.

## Goal

For every output file, answer "where did this come from?": source template,
guards passed and pruned, and the value sources the template read. This is
what makes "probabilistic proposer (agent) → deterministic disposer
(js-tmpl)" reviewable: a reviewer checks the values diff, and provenance
ties each output change back to it.

### Why it is possible here

- VP-4: every value has exactly one source file, so there is no precedence
  chain to reconstruct.
- The walker already knows every guard pass/skip.
- Strict mode (VP-9, Round 07 for `${}`) means every read value exists, so
  the recorded reads are complete for the branches that ran.

### Design notes

- Opt-in: `planRender(cfg, hbs, { explain: true })` adds `provenance` to
  each entry; default path pays nothing (Simple over Feature-rich).
- Level 1 (this round): `template`, `guards[]`, `pruned[]` (once per run),
  `values[]` (source files whose namespaces were read).
- **Caller-supplied values**: when an embedder passes or mutates `view`
  (e.g. a2scaffold's `deepMerge` of CLI overrides), keys that are not in the
  source index are labelled `caller-supplied`, never attributed to a file.
  Provenance must never claim a source it cannot prove.
- Recording reads: reuse the **`view` Proxy from Round 07's spike** (data
  boundary). Static AST analysis rejected (approximate → can be wrong,
  which is worse than no answer).
- **Handler-supplied values**: if a public `onMissing` exists by then,
  values it returns are labelled `handler-supplied`.
- **Fallback if the spike fails**: ship `template` + `guards` + `pruned`
  only; drop `values` and record why.
- `buildView` returns a source index (namespace chain → file) internally.
- CLI `--explain` prints text; `--explain=json` only if it adds no new code
  path beyond serialising the same structure.

## Plan

- [ ] Extend the Round 07 Proxy to record reads (not only misses); confirm
      output identical and no new errors. If Round 07 took the AST path
      instead, run the Proxy spike here.
- [ ] Source index from `buildView`; `caller-supplied` labelling.
- [ ] Walker reports guard decisions when explain is on.
- [ ] `planRender` `explain` option; CLI `--explain`.
- [ ] Tests: golden explain output per example; guard pass/prune; value
      partial vs root vs env vs caller-supplied; template reading nothing.
- [ ] Docs: API.md `provenance` shape; README "Why is this file here?".

### Out of Scope

- Per-variable provenance (`{{a.b}}` → file + key).
- Writing provenance to disk (no manifest/state; stdout only).

## Do

[Progress log — update as work proceeds]

## Check

- [ ] Output byte-identical with and without `explain`.
- [ ] No false attribution: every listed source was read; caller-supplied
      keys never attributed to a file.
- [ ] Explain output deterministic across the Round 05 OS/Node matrix.

## Act

**Learnings**:

- ...

**Promotions**:

- [ ] → context/ : [topic]
- [ ] → skills/ : [topic]
