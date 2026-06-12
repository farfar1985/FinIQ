# Assessment Deep Study Workflow

**Banked 2026-05-21 evening.** When Cesar (or any project lead) delegates a "should we overhaul X" or "is component Y competitive" strategic assessment — apply this 5-phase workflow. NEVER skip to direction-pick before completing all 5.

## When to use

- Any "do a full study of X" request
- Any "compare our X to industry references Y, Z" request
- Any decision that touches multiple locked architectural decisions
- Any "make X as good as Y or better" framing

## The 5 phases

**Phase 1 — Framing (before reading any code).** State the decision criterion explicitly; list scope guardrails (NO code edits / NO touching X / file the PR docs-only); list 6 honesty checks I'll apply mid-study (file:line citations required, write case-FOR each direction before picking, resist bias toward "obvious" choice, surface to user at each phase boundary, name what I MIGHT have missed, distinguish "Cesar must decide" from "I'll pick"). Write a working hypothesis but EXPLICITLY resist locking it in. Defaults: branch name, master sha, refs clone location.

**Phase 2 — Lock reading.** Read in parallel via agents: all team-locks, CLAUDE.md, plan/00 standards, architecture/04-decisions.md (all relevant decision IDs verbatim), architecture/05-architecture.md (relevant sections), architecture/CHANGELOG.md (recent tagged entries), plan area docs for X and consumers of X. Surface a phase-2 brief naming the hard floor (10 non-negotiables) any redesign must respect. Identify which locks are flexible vs which would require re-litigation.

**Phase 3 — Code mapping (parallel).** Map runtime + domain + frontend code for X. Get file:line citations on workflow shape, signals, queries, Activities, audit kinds, Pydantic boundaries, tool surfaces, prompt files (read literally), classifier behavior (actual vs intended), compaction/checkpointing/permission logic. Surface a phase-3 brief: "today's code does Y; intended-per-locks is Z; the gap is W."

**Phase 4 — Reference patterns (parallel).** Clone reference repos OUTSIDE working tree to `D:/refs/<repo>` with `git clone --depth 1`. Study each ref for: core loop pseudocode, tool surface, compaction, state persistence, streaming, permission gates, mental model. Then survey production tools in the same space (Cursor / Aider / Cline / Continue / Copilot Workspace / Devin / SWE-agent / Replit / o1) for UX patterns. Pull Anthropic-published agent design patterns. Each agent returns a focused synthesis, not file dumps.

**Phase 5 — Gap matrix + direction recommendation.** Build a 4-column table (Concern | Current | Reference A | Reference B | Recommendation). Cite file:line for current; cite URL/snippet for refs. Frame 3-4 directions with case-FOR + risks for each. Surface BEFORE writing the thesis: gap matrix + direction recommendation + 4-5 questions for the project lead + the picks I'll make myself.

## Honesty checks to bake in

1. File:line citations on BOTH the code-being-studied AND the reference patterns. Never claim a pattern without a citation.
2. Write the case-FOR each direction BEFORE picking. Resist bias toward whichever direction matches the working hypothesis.
3. After picking, write a 7-point case-FOR using locks as anchors. If the case requires "we'll re-litigate X lock," that's a red flag.
4. Surface to user at each phase boundary so they can interject if the work is drifting.
5. Name what I might have missed — adjacent surfaces I touched lightly or skipped. Don't claim exhaustiveness without doing the audit.
6. Distinguish "Cesar must decide" (strategic / cross-cutting / re-litigates a lock) from "I'll pick" (defaults I can pick with reasonable confidence). Cap Cesar questions at 4-5.

## Empirical: 2026-05-21 Spec Agent assessment

- Used this workflow for Cesar's Spec Agent overhaul delegation
- Phase 1 framing → Phase 2 lock reading via 3 parallel agents → Phase 3 code mapping via 2 parallel agents → Phase 4 reference patterns via 5 parallel agents (Build Agent map + Spec frontend + PydanticAI + Anthropic best practices + production tool survey) → Phase 5 gap matrix + Direction D pick + 4 Cesar questions
- Cesar answered all 4 questions same day; 2 went default, 1 flipped (PydanticAI), 1 dropped (cross-spec learning), 1 confirmed default (replan signal)
- Direction D pick (synthesis: keep workflow + classifier + domain locked; move tool-use loop INSIDE elicit_turn Activity) was robust to all 4 answers — only minor edits needed
- Time spent: ~3 hours wall-clock + ~2 hours of parallel-agent work running in the background. Output: a publishable assessment ready for thesis writeup.

## Trigger words for activating this workflow

- "do a full study"
- "is X as good as Y"
- "should we overhaul X"
- "can we make X better"
- "compare our X to claw-code / spec-kit / [any reference]"

NEVER skip to direction-pick. Phase 5's gap matrix is what makes the recommendation defensible.
