---
name: claude-md-management-skill
description: "Cesar uses the `claude-md-management` plugin's `claude-md-improver` skill. Farzaneh's preferences locked 2026-05-20: (a) **weekly cadence is the default** (NOT per-session — too noisy); (b) **ALWAYS surface the quality report + proposed diffs to Farzaneh BEFORE editing any CLAUDE.md** (shared, personal, anywhere — no exceptions). The skill is installed locally at C:\\Users\\farza\\.claude\\plugins\\marketplaces\\claude-plugins-official\\plugins\\claude-md-management\\ but NOT auto-loaded as a callable Skill — apply the 5-phase workflow manually."
metadata:
  node_type: memory
  type: feedback
  originSessionId: 0973fe7c-3e3a-47eb-a295-6a31f61d994f
---

# Rule

Apply the `claude-md-improver` skill's 5-phase workflow whenever the user asks to revise / clean up / audit a `CLAUDE.md` file. The skill is installed locally but **NOT auto-loaded as a callable Skill** in our sessions — invoking `Skill(skill="claude-md-improver")` returns `Unknown skill`. Apply the workflow manually by reading the SKILL.md and following its phases.

## Two hard rules from Farzaneh (locked 2026-05-20)

1. **Weekly cadence is the default — NOT per-session.** Don't candidate-list CLAUDE.md additions after every PR. CLAUDE.md churn between sessions is noise; let learnings accumulate, then audit at ~weekly cadence (or when Farzaneh asks).
2. **ALWAYS surface the quality report + proposed diff to Farzaneh BEFORE editing any CLAUDE.md.** No exceptions — shared `/d/amira-mars/CLAUDE.md`, personal worktree CLAUDE.md, sub-directory CLAUDE.mds. All of them. Show the diff, wait for explicit go-ahead, then Edit.

## Where the skill lives

- `C:\Users\farza\.claude\plugins\marketplaces\claude-plugins-official\plugins\claude-md-management\skills\claude-md-improver\SKILL.md`
- The SKILL.md is short and instructive — re-read it any time you're about to apply this workflow.

## Cesar's two-cadence pattern (verbatim from WhatsApp 2026-05-20 ~10:30 AM)

1. **Per-session cadence:**
   > *"Use the claude-md skill to revise the claude.md file and add anything that is relevant (only if strictly necesary and recommended) into the file from the learnings of this session"*

2. **Every-few-iterations cadence:**
   > *"and every now and then after some few iterations I run something like 'Revise the quality of the claude.md file and improve, strip out anything that is noise or leak errors in this project'"*

## The 5-phase workflow (apply manually)

### Phase 1 — Discovery

Find all CLAUDE.md files in scope:

```bash
find /d/amira-mars -name "CLAUDE.md" 2>/dev/null
find "/d/Amira FinIQ/.claude" -name "CLAUDE.md" 2>/dev/null
ls "C:/Users/farza/.claude/CLAUDE.md" 2>/dev/null  # global user defaults
```

**Distinguish two scopes:**
- **Shared** (`/d/amira-mars/CLAUDE.md`) — team-visible, checked into git. Cesar's domain; touch only when he asks or when an addition is unambiguously useful to all agents working in the repo.
- **Personal** (`/d/Amira FinIQ/.claude/worktrees/<worktree>/CLAUDE.md`) — our worktree's project context. Free to update.

### Phase 2 — Quality assessment

Score against six criteria (max 100):
- Commands/workflows (20): copy-pasteable, current
- Architecture clarity (20): agent can orient in <5 min
- Non-obvious patterns (15): gotchas that save hours
- Conciseness (15): no verbose noise, no restating obvious
- Currency (15): matches current codebase state
- Actionability (15): every "do X" has a concrete command

Grade: A 90-100, B 70-89, C 50-69, D 30-49, F <30.

### Phase 3 — Quality report (OUTPUT BEFORE EDITING)

Always present the quality report to Farzaneh **before** making any changes. Format:

```
## CLAUDE.md Quality Report — <path>

### Score: XX/100 (Grade: X)

| Criterion | Score | Notes |
| ... |

### Issues found
- [Specific problems]

### Recommended additions
- [Only the strictly necessary + recommended ones]

### Recommended strip-outs
- [Noise / leak errors / outdated content]

### Recommendation
[Don't edit / Edit with diff X / Defer to Cesar]
```

### Phase 4 — Targeted updates (WITH USER APPROVAL)

Show the proposed diff. Stick to the strict filter:

**Add when:**
- Commands or workflows that were missing
- Real codebase gotchas discovered this session (e.g., the `domain/project/db.py` ⇄ `tenancy.models` FK-resolution bug pattern)
- Package relationships that weren't clear
- Configuration quirks

**Don't add:**
- Restating what's obvious from the code
- One-off fixes unlikely to recur
- Verbose explanations when a one-liner suffices
- Per-ticket workflow disciplines (those belong in `docs/team-locks/`, not CLAUDE.md)

### Phase 5 — Apply updates

After approval, Edit tool. Preserve existing structure. Don't rewrite sections that are already good.

## What goes in CLAUDE.md vs `docs/team-locks/` vs memory

Common confusion — here's the rule:

| Content type | Home |
|---|---|
| Codebase pattern / gotcha / file layout / commands | `CLAUDE.md` (per-repo) |
| Process discipline / per-ticket workflow / banned-words / quality bar | `docs/team-locks/<feedback-*.md>` |
| Per-session learning / Farzaneh's per-project preferences | `~/.claude/projects/.../memory/<feedback-*.md>` |

When in doubt, ask: "would a fresh agent loading the repo for the first time benefit from knowing this AT BOOT?" If yes → CLAUDE.md. If it's "discipline to apply when claiming a ticket" → team-locks. If it's "Farzaneh prefers this workflow" → personal memory.

## My personal rule of thumb

**Default to NO changes.** CLAUDE.md should churn slowly. The honest answer when nothing clears the strict filter is *"the file is in good shape; no edits this iteration."*

**Never edit CLAUDE.md without first showing Farzaneh the diff and getting an explicit go-ahead.** This rule is absolute — applies even to one-character fixes. The cost of an unwanted edit is higher than the cost of one extra round-trip.

## When to invoke this skill in our sessions

**Default = weekly cadence.** Don't trigger per-PR or per-session — that's noise.

- **Weekly audit** — full quality assessment + strip-out pass for noise / leak errors / stale content. Surface the quality report + proposed diffs; wait for Farzaneh's go-ahead before editing.
- **When Farzaneh asks directly** — explicit "audit / revise / clean CLAUDE.md" request. Same workflow: report → diff → approval → edit.
- **When CLAUDE.md is obviously breaking** — agent loads context and several things are flat-out wrong (commands that don't work, paths that don't exist). Even then: surface the diff before editing.

**Explicitly NOT a trigger:**
- ❌ Finishing a PR (let learnings accumulate; they'll either matter at weekly cadence or they won't)
- ❌ "Interesting session insight" (most insights don't earn a CLAUDE.md line — let weekly audit filter)
- ❌ Banking a memory file (memory files live in `~/.claude/projects/.../memory/`, not CLAUDE.md)

## Aphorism

*"CLAUDE.md is the contract between past sessions and future agents. Add nothing that doesn't earn its line."*

## Cross-reference

Related locks:
- `feedback_fix_foundation_dont_defer.md` — fix codebase drift in same PR (different from CLAUDE.md hygiene)
- `feedback_cesar_quality_bar_m1_backend.md` — Cesar's 8 binding engineering rules
- `feedback_avoid_jargon_amira_mars.md` — banned trigger words (relevant to "strip out noise" pass)
