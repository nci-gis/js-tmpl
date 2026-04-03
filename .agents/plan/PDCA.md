# PDCA Methodology — Skill Generation Lifecycle

> Plan-Do-Check-Act framework for iteratively building, deploying, and
> refining AI agent skills across this project.

---

## Purpose

PDCA (Plan-Do-Check-Act) provides a structured, repeatable cycle for
evolving this project. Each initiative (feature, refactor, investigation)
is tracked as a **round** so that decisions, outcomes, and learnings
are captured and reviewable.

---

## Cycle Template

Each round follows four phases:

### Plan

- Define the **goal** (what and why)
- List concrete **steps** to achieve the goal
- Identify **risks** and unknowns
- Status: `Planning`

### Do

- Execute the steps
- Log progress, blockers, and deviations from the plan
- Status: `In Progress`

### Check

- Verify outcomes against the goal
- Run tests, review output, gather feedback
- Document what worked and what didn't
- Status: `Review`

### Act

- Promote validated learnings to `.agents/context/` or `.agents/skills/`
- Log promotions in `promotions.md`
- Archive the round
- Status: `Complete`

---

## Naming Convention

Rounds live in `.agents/plan/cycles/` and follow this pattern:

```text
cycles/
  Round_01.md   — First initiative
  Round_02.md   — Second initiative
  Round_XX.md   — Subsequent rounds
```

Use zero-padded two-digit numbering. Each file uses the round template
below.

---

## Round Template

```markdown
# Round XX: [Title]

**Status**: Planning | In Progress | Review | Complete
**Date started**: YYYY-MM-DD
**Date completed**: YYYY-MM-DD

## Goal

[1-2 sentences: what we're building/fixing and why]

## Plan

- [ ] Step 1
- [ ] Step 2
- [ ] ...

## Do

[Progress log — update as work proceeds]

## Check

- [ ] Verification item 1
- [ ] Verification item 2

## Act

**Learnings**:

- ...

**Promotions**:

- [ ] → context/ : [topic]
- [ ] → skills/ : [topic]
```

---

## Governance

- **Rounds are append-only** — do not delete or rewrite history
- **Promotions** from Act phase are logged in [promotions.md](promotions.md)
- **Promotion criteria** are defined in [AGENTS.md](../../AGENTS.md)
- Agents may update the `Do` and `Check` sections of active rounds
- Only humans may move a round to `Complete` status
