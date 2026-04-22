# Promotion Log

> Append-only log of memory entries promoted to `context/` or `skills/`.
> See [PDCA.md](PDCA.md) for methodology and [AGENTS.md](../../AGENTS.md) for promotion criteria.

---

<!-- Append new entries below this line using the format:

## YYYY-MM-DD: [Topic] → [Destination]

**Source**: memory/[filename]
**Rationale**: [1-2 sentences]
**Promoted by**: [Human name]

-->

## 2026-04-06: `docs/analysis/` visibility policy → `skills/`

**Source**: memory/2026-04-06-docs-analysis-visibility.md
**Rationale**: `doc-update` previously treated all new files under `docs/` as public-facing. The skill now explicitly distinguishes internal analysis docs from user-facing documentation to prevent accidental surfacing in `docs/ToC.md` and `README.md`.
**Promoted by**: Human-confirmed via Codex

## 2026-04-22: Co-evolution Rule (expand/reflect/adjust modes) → `.agents/AGENTS.md`

**Source**: conversational co-design with human (richer-inputs planning session)
**Rationale**: Added `## 2. Co-evolution Rule` defining three explicit self-awareness modes (`expand`, `reflect`, `adjust`) and a `[co-evolution-mode=<mode>]` tag the agent opens a response with when conversation lacks info, the human appears biased, or the agent is uncertain. Formalizes the self-correction dynamic that produced the best decisions in this repo.
**Promoted by**: Human-directed
