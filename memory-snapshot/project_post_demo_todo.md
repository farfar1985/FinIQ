---
name: FinIQ + Amira post-demo TODO roadmap
description: Two tracks post-2026-04-21. Track A = Spec Agent build. Track B = FinIQ improvements. SUPERSEDED 2026-04-23 by Rajiv's FinAI MVP 2.0 Planning email — see project_finai_mvp2_plan.md for the current 7-track Phase 2 scope. This file still useful as backlog detail.
type: project
originSessionId: 01322f08-c136-4f72-b4ed-f930c8172fcc
---
**Canonical file: [POST_DEMO_TODO.md](D:/Amira FinIQ/POST_DEMO_TODO.md)**

**2026-04-23 UPDATE**: Rajiv's FinAI MVP 2.0 Planning email re-scoped next 3-4 weeks into 7 tracks with commercial proposal due Monday 2026-04-27. See [project_finai_mvp2_plan.md](project_finai_mvp2_plan.md) for the current authoritative scope. This file's Track A (Spec Agent) survives as Phase 2 Track 2; Track B (FinIQ improvements) maps to Phase 2 Tracks 1, 4. Treat the two-track model here as backlog detail that feeds into the 7-track Phase 2 structure.

Post-demo work originally split into two parallel tracks after the 2026-04-21 MLT demo went well:

## Track A — Spec Agent build (NEW, highest priority)

Rajiv scoped Amira's next phase as 3 components: Spec Creation Agent, Coding Agent, Deployed Apps. Farzaneh committed to building the Spec Agent (merging FinIQ spec-driven process + Ashwin's OpenSpec suggestion) as Amira's Component #1. Plugs into Cesar's Amira platform.

**Effort**: 2-3 weeks demo-scoped MVP / 1-2 weeks POC / 4-6 weeks production-ready.

**Phases**:
- Phase 0 (1 day, 2026-04-22): Interrogation session with Claude — 14 question categories covering vision, inputs, outputs, Amira contract, conversation design, scope, compliance handoff, quality eval, team commitment to OpenSpec, tech stack, timeline, existing building blocks, naming.
- Phase 1 (2-3 days): Architecture + contract design.
- Phase 2 (1-2 weeks): POC build — conversational layer + OpenSpec emitter + local test.
- Phase 3 (1-2 weeks): Amira integration.
- Phase 4 (1 week): Polish + Stage D hand-off + quality eval harness.

See [project_spec_agent_plan.md](project_spec_agent_plan.md) for the full 14-question interrogation categories + hard rules + canonical references.

## Track B — FinIQ post-demo improvements (maintenance)

13 items across Quantum AI patterns to adopt + own dev residuals to close. Prerequisite: build regression test suite first (1-2 days, unblocks prompt-touching changes safely).

Top items:
1. Page context injection (biggest capability win — unlocks "filter this", "more of that" queries)
2. ActionBroker-style voice confirmation (fixes the nav-fire-and-forget problem)
3. Silent-localhost-fallback fix (bitten 3 times; Apr 14, Apr 20 morning, Apr 20 evening)
4. Skill-based prompt composition (highest risk — needs regression suite first)
5. Azure OpenAI Foundry migration for Mars production
6. DB-backed chat session persistence
7. Gemini Live evaluation per Mars Google preference

Full list with execution order + risk + effort in canonical POST_DEMO_TODO.md.

## Rationale for order

Track A is the **revenue-generating next-phase work** Rajiv committed to. Track B is **cleanup from FinIQ's demo-driven dev** — valuable but lower-priority vs. building the next Amira component.

Farzaneh's time should prioritize Track A. Track B items are opportunistic or picked up by others on the team.
