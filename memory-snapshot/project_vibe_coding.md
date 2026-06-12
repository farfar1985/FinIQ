---
name: Vibe coding approach and competition strategy
description: Purely vibe coding, agentic engineering, Farzaneh's two-stage build strategy
type: project
---

## Purely vibe coding (2026-03-26)
- Team decided: no manual coding. Strong spec writing, coding orchestrator builds the app from specs.
- Rajiv renamed "Claude Code" to generic "Coding Orchestrator" in Mars-facing materials.
- Based on Karpathy's evolution: vibe coding → agentic engineering → AutoResearch eval loops.

## Competition
- All team members build their own version of FinIQ from the same SRS v3.0.
- Rajiv: Asimov | Alessandro: Atlas | Farzaneh: Artemis + Claude Code | Bill: Air workflows | Cesar: architecture
- Winner determined by eval harness scores (Testing Agent SRS v1.1 quantitative metrics).
- MVP deadline: April 21, 2026 MLT meeting.

## Farzaneh's strategy: two-stage pipeline
1. **Artemis (OpenClaw)** — builds the app autonomously from the SRS, pushes to GitHub
2. **Claude Code** — reviews the code, finds gaps against 50 FRs, fixes bugs, optimizes performance, maximizes eval scores
- Advantage: speed from Artemis + precision from Claude Code. Others have one agent each.

## Karpathy's quantitative methodology (applied in Testing Agent SRS v1.1)
- Single scalar metric per capability
- Immutable eval harness (agent can't modify its own scoring)
- Binary pass/fail criteria (3-6 per feature)
- Time-boxed test cycles
- Keep-or-revert loop (score up = commit, score down = revert)
- Ground truth from synthetic data (seed 42)

**Why:** Rajiv wants quantitative optimization. Karpathy's AutoResearch pattern is the framework. Eval quality determines app quality.

**How to apply:** All deliverables should be specs, not code. Artemis builds from specs. Claude Code reviews and optimizes. Focus on spec quality and eval harness rigor.
