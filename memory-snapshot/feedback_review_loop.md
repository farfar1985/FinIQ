---
name: Claude-Artemis review loop
description: Workflow for iterating between Claude Code (reviewer/fixer) and Artemis (OpenClaw builder) — update CLAUDE.md and memory after each pass
type: feedback
---

Farzaneh wants a back-and-forth loop between Claude Code and Artemis (OpenClaw agent):

1. **Artemis builds** from the SRS specs
2. **Claude Code reviews**, fixes critical bugs, and updates `app/CLAUDE.md` + `app/memory/` so Artemis knows what was fixed
3. **Claude Code suggests enhancements** for the next Artemis pass
4. **Farzaneh switches to Artemis**, who picks up the suggestions and builds more
5. **Repeat** until the app is competition-ready

**Why:** Farzaneh is running a competition (Bill, Rajiv, Alessandro each have their own agents). The two-agent pipeline (Artemis builds, Claude optimizes) is her competitive strategy.

**How to apply:** After every fix/review pass, always update `app/CLAUDE.md` and write a new `app/memory/` file documenting what Claude Code changed and what Artemis should do next. Keep the handoff clear and actionable.
