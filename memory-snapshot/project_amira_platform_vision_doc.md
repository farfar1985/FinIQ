---
name: AMIRA_PLATFORM_VISION.md strategy document (partially stale as of 2026-04-24)
description: ~5000-word strategy doc at project root covering FinIQ build history, Amira platform architecture, 4-stage spec process, OpenSpec mapping, and Spec Agent vision. Written 2026-04-15. Some positions superseded by the 2026-04-24 team call — OpenSpec deprioritized, 3-agent pipeline locked. Kept as historical reference; see SPEC_AGENT_DESIGN.md for current canonical architecture.
type: project
originSessionId: 38239999-13da-4c2d-958c-740f1912cf1c
---

## STATUS 2026-04-24

This doc was written 2026-04-15 before team alignment on platform architecture. Several positions are **now superseded**:

| Doc position | Current status |
|---|---|
| *"Specs go to OpenSpec format"* | **Superseded**. Team locked IEEE 830 as primary on 2026-04-24. OpenSpec dropped to adapter backlog. |
| *"Stage A (spec authoring) is what OpenSpec collapses"* | Directionally right; implementation is the Spec Agent (Component #1), not OpenSpec tooling. Design doc at `SPEC_AGENT_DESIGN.md` v0.6. |
| 3-layer / 4-stage conceptual models | Superseded by concrete **3-agent canonical pipeline** (Spec → Build → Deploy). Canvas + Deployment Agent operational on the platform. |
| Bake-off retirement | Still valid. |
| Spec Agent propose-alternatives principle | Still valid. Carried into `SPEC_AGENT_DESIGN.md` §3.3, §8.3. |

**Canonical current reference**: `D:/Amira FinIQ/SPEC_AGENT_DESIGN.md` v0.6 (shipped + scrubbed + sent to Cesar 2026-04-24) plus [project_spec_agent_design_doc.md](project_spec_agent_design_doc.md) and [project_amira_vision.md](project_amira_vision.md) (updated 2026-04-24 with 3-agent pipeline section at top).

The AMIRA_PLATFORM_VISION.md file itself is not deleted — the FinIQ build-history narrative (Part 1), the ROI framing (Part 2), and the day-by-day Mini-App walkthrough (Part 5) are still useful. The 4-stage spec process discussion (Part 3) and OpenSpec-mapping sections (Part 4) are mostly stale. If the doc gets revised, update in a future session rather than today.

---

**File**: `D:\Amira FinIQ\AMIRA_PLATFORM_VISION.md`
**Created**: 2026-04-15 (afternoon session, after the morning's c232a58 commit)
**Audience**: Internal team AND bots (names removed from this memory per scrubbing discipline — see file for originals)

## Why this matters
This is the canonical source-of-truth for how Farzaneh (and the team) sees the Amira platform end-to-end. When future conversations ask "what's the plan for new apps?" or "how does FinIQ relate to Amira?" or "should we do another bake-off?" — point at this doc.

## Key positions taken
- **Bake-off retired**: the 3-parallel-build pattern was a one-time discovery exercise. Default to single-track V1 going forward. Use `/opsx:explore` for genuinely unknown territory.
- **Specs go to OpenSpec format**: no more Word docs for new apps. Markdown in `openspec/specs/{domain}/spec.md` with RFC 2119 + Given/When/Then.
- **Spec Agent must propose alternatives, not converge**: preserves design diversity without requiring three full builds.
- **Stage A (spec authoring)** is what OpenSpec collapses; **Stage D (compliance loop)** stays.
- **OpenSpec doesn't replace human elicitation** — domain idioms (Mars 13-period FY, Title Case Unit_Alias, RBAC patterns) still have to be drawn out by a conversational agent.

## Structure
1. Why the doc exists
2. Part 1: How FinIQ was built (PES + CI gap, SRS v1→v3.1, 3 builds, merge, 9 phases, security pushback, today)
3. Part 2: FinIQ inside Amira (3-layer model, mini-app roster, ROI)
4. Part 3: The 4-stage spec process (A=author, B=build, C=harvest, D=compliance) — what each stage costs, what's automatable
5. Part 4: OpenSpec technical breakdown + mapping table + Spec Agent vision
6. Part 5: Day-by-day walkthrough of Mini-App #2 (Supply Chain for Petcare)
7. Appendix A: artifact mapping (today → OpenSpec)
8. Appendix B: canonical directives for the bots

## When to consult
- Any conversation about new mini-apps
- Any conversation about spec format / spec process
- Any conversation about A2A / MCP / inter-app communication (this doc sets up the question)
- When briefing a new team member or new bot
- When evaluating tools/frameworks against the platform vision

## What it does NOT cover
- Concrete A2A protocol decision (Cesar/Bill still evaluating A2A vs MCP)
- Cesar's runtime internals (FastAPI/Next.js details — not Farzaneh's domain)
- Specific OpenSpec adoption timeline / rollout plan (not yet decided)
