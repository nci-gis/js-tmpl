---
name: Reflect .agents impact
description: Check whether recent repo changes require updates under .agents/ and propose exact doc edits before commit.
argument-hint: Diff scope (staged, unstaged, or both)
agent: agent
---

# Reflect Changes into .agents/

You just made changes to this repository. Before committing, check whether any
`.agents/` documentation now needs updates.

**Preflight (required):**

- Scope the review from `git diff --name-status` (or staged diff if committing staged changes)
- Only evaluate checklist items impacted by changed files
- If no relevant files changed, return "No `.agents/` impact" with a short rationale

**Scan for impact across these areas:**

### 1. Directory structure changed?

- New top-level directories added or renamed?
- Propose update to the relevant `.agents/context/*.md` file (e.g. directory map)
- Propose update to `.agents/AGENTS.md` if `.agents/` structure itself changed

### 2. Generator context/prompt paths changed?

- `src/generator/context-loader.ts` — does `CONTEXT_DIR` still point correctly?
- `src/generator/prompt-builder.ts` — does `SYSTEM_PROMPT_PATH` still point correctly?
- Propose update to `.agents/AGENTS.md` "Separation of Concerns" table if locations changed

### 3. Runtime context/prompt files changed in `context/` or `prompts/`?

- New files added, existing files renamed, moved, or deleted?
- Document what each file is for and when to update it
- If it's Ansible reference material → belongs in `context/`
- If it's a system prompt → belongs in `prompts/`
- If it's project/agent knowledge → belongs in `.agents/context/`

### 4. Stack or toolchain changed?

- New dependency added to `package.json`?
- Python tool version changed?
- New LLM backend or adapter added?
- Propose update to the relevant `.agents/context/*.md` file (e.g. toolchain docs)

### 5. Evaluation framework changed?

- New validator, metric, or verifier added?
- Thresholds changed?
- Propose update to the relevant `.agents/context/*.md` file (e.g. evaluation docs)

### 6. Phase boundary crossed?

- Completed a phase (0–5) or started a new one?
- Propose update to the relevant `.agents/context/*.md` file (e.g. phases section)
- Consider a PDCA cycle entry in `.agents/plan/`

### 7. New architectural pattern or convention discovered?

- Recurring pattern worth preserving?
- Write to `.agents/memory/` with promotion candidate flag
- Do NOT write directly to `.agents/context/` — flag for human review

### 8. Governance gate for authoritative docs

- `.agents/context/`, `.agents/skills/`, and `.agents/plan/` are authoritative
- If updates are needed there, propose exact edits first
- Ask for explicit human confirmation before applying those edits
- Log all approved changes in `plan/promotions.md` with a brief rationale

---

## Decision Rule

| Change type                          | Action                                                             |
| ------------------------------------ | ------------------------------------------------------------------ |
| Path, directory, or structure        | Propose update to relevant `.agents/context/*.md` + `AGENTS.md`    |
| Generator layer (context/, prompts/) | Propose update to `.agents/AGENTS.md` Separation of Concerns       |
| Stack / toolchain                    | Propose update to relevant `.agents/context/*.md`                  |
| Evaluation logic                     | Propose update to relevant `.agents/context/*.md`                  |
| New pattern / learning               | Write to `memory/` with promotion candidate                        |
| No `.agents/` impact                 | No action needed — state this explicitly                           |

---

## Output format

Reply with:

1. **Impacted files** — list each `.agents/` file that needs updating (or "none")
2. **Proposed changes** — for each file, what specifically should change
3. **Evidence** — changed files/paths that justify each proposed update
4. **Promotion candidates** — any new learnings worth capturing in `memory/`
5. **Confirmation required** — "yes/no"; `yes` if any change touches `.agents/context/`, `.agents/skills/`, or `.agents/plan/`
