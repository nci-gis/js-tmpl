# AGENTS.md – Pair Programming Guide for AI Agents

> Practical guide for AI agents collaborating on this repository.

---

## Agent Base Directory (`.agents/`)

The `.agents/` directory is the **shared knowledge base** for all AI agents.

It separates stable human-curated knowledge from evolving agent learnings.

```text
.agents/
  context/        # Canonical knowledge (human-curated, authoritative)
  memory/         # Agent-generated learnings (draft insights)
  prompts/        # Scanning & generation prompts (human-curated)
  skills/         # Reusable procedures (human-approved, Agent Skills spec)
    <skill-name>/
      SKILL.md        # Required: frontmatter + instructions
      scripts/        # Optional: executable code
      references/     # Optional: additional docs
      assets/         # Optional: templates, data files
  plan/
    PDCA.md           # PDCA methodology and templates
    promotions.md     # Append-only promotion log
    cycles/           # Individual PDCA rounds
      Round_01.md
      Round_02.md
      Round_XX.md
```

---

### Load Order (Mandatory)

At the start of every session, an agent MUST:

1. Read **all files recursively** in `.agents/context/`
2. Read **relevant files** in `.agents/skills/` (based on task)
3. **Prompt auto-loading**: All `.agents/prompts/*.prompt.md` files are automatically loaded as runtime instructions by supported agent tooling.
4. Optionally review recent or task-relevant files in `.agents/memory/`

**Conflict resolution**: If any conflict exists between directories, `context/` is authoritative.

---

### Authority Rules

| Directory  | Authority                   | Agent Permissions                     |
| ---------- | --------------------------- | ------------------------------------- |
| `context/` | Human-maintained, canonical | ❌ READ-ONLY (No edits, no deletions) |
| `prompts/` | Human-curated prompts       | ❌ READ-ONLY (No edits, no deletions) |
| `skills/`  | Human-approved procedures   | ❌ READ-ONLY (No edits, no deletions) |
| `memory/`  | Agent learnings, drafts     | ✅ READ + WRITE                       |
| `plan/`    | Promotion logs, decisions   | ⚠️ APPEND-ONLY to promotions.md       |

**If a discovery contradicts `context/`:**

1. Do NOT edit `context/`
2. Write the finding to `memory/`
3. Flag for human review in the memory file

**If `memory/` contains information that appears outdated or incorrect:**

1. Agents MUST NOT delete it
2. Instead, update the file header to include `**Status**: Needs Review`

---

### Agent Write Policy

#### Agents MAY

- ✅ Capture reusable insights in `.agents/memory/`
- ✅ Suggest promotions to `context/` or `skills/` (in memory files)

#### Agents MUST NOT

- ❌ Store secrets, credentials, or personal data
- ❌ Delete or modify existing files in `context/` or `skills/`
- ❌ Write to `context/` or `skills/` without explicit human instruction
- ❌ Generate speculative "rules" without concrete evidence

#### Memory File Format (Recommended)

**Filename**: `memory/YYYY-MM-DD-short-topic.md` or `memory/agent-name-topic.md`

```markdown
# [Short Descriptive Title]

**Date**: YYYY-MM-DD
**Agent**: [tool name]
**Confidence**: High | Medium | Low
**Status**: New | Needs Review | Promoted | Archived

## Problem

Brief description of issue or question

## Finding

What you discovered (concise)

## Evidence

- Files: `src/path/to/file.py`
- Commits, tests, or links

## Recommendation

**Do**: Bullet list of actionable patterns
**Don't**: Bullet list of anti-patterns

## Promotion Candidate?

[ ] context/ – Stable pattern, broadly applicable
[ ] skills/ – Reusable procedure/checklist
[ ] Not yet – Needs more validation
```

**Status lifecycle:**

- `New` → Agent just created this
- `Needs Review` → Outdated, conflicting, or requires validation
- `Promoted` → Moved to context/ or skills/
- `Archived` → Historical reference only

---

### Evolution Model

```text
1. Agent captures insight → memory/
2. Human reviews periodically
3. Valid insights promoted → context/ or skills/
4. Promotion logged in plan/promotions.md
```

**Human feedback loop**: See `plan/PDCA.md` for systematic review methodology.

**Promotion criteria:**

- **To `context/`**: Stable pattern, validated 3+ times, broadly applicable
- **To `skills/`**: Reusable procedure with clear triggers and steps

#### Skills Format ([Agent Skills spec](https://agentskills.io/specification))

Each skill is a directory under `skills/` containing a `SKILL.md` file
with YAML frontmatter:

```text
skills/<skill-name>/
  SKILL.md          # Required: frontmatter + instructions
  scripts/          # Optional: executable code
  references/       # Optional: additional docs
  assets/           # Optional: templates, data files
```

`SKILL.md` must include:

```markdown
---
name: <skill-name>
description: What this skill does and when to use it.
---

## Trigger

This skill activates whenever...

## Procedure

1. Step one
2. Step two
```

The `name` field must match the directory name (kebab-case, lowercase).

**Promotion log format** (in `plan/promotions.md`):

```markdown
## YYYY-MM-DD: [Topic] → [Destination]

**Source**: memory/[filename]
**Rationale**: [1-2 sentences]
**Promoted by**: [Human name]
```

**Principle**: Stability > Speed. Promotion requires validation.

---

### Quick Reference

**Before coding**: Load context/ → Load relevant skills/
**During work**: If you learn something useful → Write to memory/
**After session**: Suggest promotion if high confidence

**For humans**: Review memory/ weekly → Promote valid learnings → Log in plan/

---

### External Knowledge Base (`docs/agents/`)

The `docs/agents/` directory is a **shared KB between humans and AI agents**
for durable, reference-grade documentation that lives alongside the code.

Unlike `.agents/` (which is agent-operational — context, memory, skills,
plans), `docs/agents/` is **human-facing reading material that agents also
consume** when context is needed beyond `.agents/`.

```text
docs/agents/
  workflows/                       # End-to-end workflows this repo supports
    <name>.workflow.md             # One file per supported workflow
  plan/                            # Co-planning docs (human + AI brainstorm)
    <yyyyMMdd>-<name>.plan.md      # Master plans, dated & named
```

**Planning docs — two locations, different roles:**

| Location               | Role                                                | Lifecycle                       |
| ---------------------- | --------------------------------------------------- | ------------------------------- |
| `docs/agents/plan/`    | Co-planning (brainstorm, strategy, open questions)  | Long-lived; revised in place    |
| `.agents/plan/cycles/` | Per-phase implementation verification (PDCA rounds) | Append-only; one file per round |

When a plan in `docs/agents/plan/` kicks off work, each executed phase
records a verification cycle in `.agents/plan/cycles/Round_XX.md`.

**Load policy:**

- Agents SHOULD read files in `docs/agents/` that are relevant to the task
  (e.g. read `docs/agents/workflows/skill.workflow.md` before modifying
  skill-related code).
- Not auto-loaded — consult on demand.
- Authority order: `.agents/context/` > `docs/agents/` > `.agents/memory/`.
  If a conflict arises, canonical context wins; flag the mismatch in
  `.agents/memory/`.

**Write policy:**

- Humans own `docs/agents/`. Agents MAY propose new files or edits, but
  must confirm with the human before writing (same rule as `.agents/context/`).
- Workflow files describe _what the repo supports_, not internal agent
  guidance — keep prose readable for human contributors.

---

#### Exception: Explicit Human Instructions

When a human **explicitly instructs** an agent to modify, create, or delete files under `.agents/`: [`context/`, `skills`, `plan/`],
the agent MAY proceed BUT MUST:

1. ⚠️ **Warn the human first** that authoritative or governance knowledge will be modified
2. ✅ **Wait for explicit confirmation**
3. 📝 **Log the change** in `plan/promotions.md` (or appropriate governance log) with a brief rationale

**Example warning**:

> ⚠️ **Warning**: You’ve asked me to modify authoritative knowledge under `.agents/`.
> This may affect future agent behavior and project governance.
> Please confirm you want to proceed. [Yes/No]

This ensures intentional updates are allowed while preventing accidental governance drift.

---

## 1. Role & Mindset

You are a **pair programmer**, not a solo developer. Your human partner knows
the project intent better than you do. Follow these principles:

- **Ask before assuming.** If a change could affect public API behavior,
  confirm the intent before writing code.
- **Think out loud.** Explain your reasoning before making changes, especially
  for chain-key parsing or protected-key logic.
- **Small steps, frequent checks.** Prefer incremental edits with test runs
  over large rewrites.
- **Preserve what works.** This library has zero dependencies and a stable
  API. Never introduce external packages or break existing contracts.
- **Ensure AI Transparency** section (`## Transparency`) in `README.md` always be at the end of file (if present).

---
