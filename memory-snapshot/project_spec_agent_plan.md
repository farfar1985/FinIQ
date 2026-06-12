---
name: Spec Agent build plan — Amira Component #1 (SUPERSEDED reference material)
description: Original 14-question interrogation list + hard rules, written 2026-04-21 evening as prep for a kickoff session that never happened in that form. SUPERSEDED by the 2026-04-24 team call. Kept for reference to the questions we anticipated, most of which the call answered.
type: project
originSessionId: 01322f08-c136-4f72-b4ed-f930c8172fcc
---

**STATUS 2026-04-24**: This file is superseded by the 2026-04-24 team call outcomes, captured canonically in [project_spec_agent_design_doc.md](project_spec_agent_design_doc.md). The 14-question interrogation below was our pre-call plan; the call answered most of the questions collaboratively rather than through dedicated interrogation. See the top of `project_spec_agent_design_doc.md` for what was locked and what remains open.

Kept as reference: the "Hard rules for the build" section still holds (narrow scope, propose-alternatives, output-format-agnostic core with adapter discipline, reuse-before-reinvent, dogfood-first). Those survived verbatim into SPEC_AGENT_DESIGN.md §3.3 and are canonical there.

**2026-04-23 EVENING UPDATE — Design document shipped.** Comprehensive design doc at `D:/Amira FinIQ/SPEC_AGENT_DESIGN.md` + `.docx`. Now at v0.6 after 2026-04-24 call iteration. See [project_spec_agent_design_doc.md](project_spec_agent_design_doc.md) for full summary.

**2026-04-24 UPDATE — v0.6 shipped + sent.** Doc revised to reflect the team call's locked decisions (3-agent canonical architecture with Canvas operational, IEEE 830 primary, skills directory as input, compliance-matrix handoff, versioning via back-to-Spec flow). Scrubbed clean of all names/vendor/client/tool references. Sent to Cesar via chat for platform Spec-skill integration.

---
**Origin**: FinIQ demo (2026-04-21 afternoon) went well. Finance team impressed. Rajiv scoped the next phase: Amira platform with 3 components — **Spec Creation Agent**, Coding Agent, Deployed Apps. Cesar explicitly asked Farzaneh to merge FinIQ's spec-driven process + Ashwin's OpenSpec suggestion into a platform-pluggable Spec Agent. Farzaneh committed in the group chat.

**2026-04-23 UPDATE — Mars has now explicitly endorsed spec-driven development.** Rajiv's FinAI MVP 2.0 Planning email (`project_finai_mvp2_plan.md`) Section 4 reads: *"GenAI-driven development requires a paradigm shift — outcomes, rules, and behaviours must be explicitly specified upfront, rather than assumed by engineers. Specifications must be tested through both automated and human governance. Business and technical SMEs will need to play a more direct role in defining these specifications."* That's Mars validating our Spec Agent direction from the customer side. The Spec Agent goes from "our good idea" to "Mars-requested deliverable" — position accordingly in the Monday commercial proposal.

**Decision 2026-04-23 evening**: do NOT start building tonight. Monday commercial proposal is higher leverage; building without the Cesar/Rajiv/Ashwin interrogation session risks wrong direction. Write a **detailed Spec Agent section within the Phase 2 plan** — architecture, milestones, integration contract, deliverables. Demonstrates thought in the proposal AND becomes the build brief post-Monday. Full reasoning in `project_finai_mvp2_plan.md`.

## What the Spec Agent is

Conversational agent that takes a business ask ("I need an app that does X") and produces a structured, machine-readable specification the Coding Agent can build from directly. Source-agnostic on output format — OpenSpec folders (preferred, per Ashwin), or whatever format Cesar's Coding Agent prefers.

## Why this is the right next project

1. **Rajiv named it as Amira Component #1.** It's the entry point to the whole platform.
2. **Lines up with FinIQ's learned experience.** We just spent 4 weeks living through: three hand-written v1.x specs → merged v2.0/2.1 → v3.0 with Addendum A → v3.1 with CI/FMP → three parallel builds → 3-way merge → rebuild. All of that was manual. Spec Agent is the automation of the "A" stage of our 4-stage process (A=author / B=build / C=harvest / D=compliance loop). Stage D stays separate.
3. **Ashwin already suggested OpenSpec.** We already read OpenSpec docs in full on April 15 and wrote the integration mapping table in [AMIRA_PLATFORM_VISION.md](D:/Amira FinIQ/AMIRA_PLATFORM_VISION.md).
4. **Cesar already has pieces** (his FinIQ spec-driven approach, his Amira platform with multi-tenancy + kanban + skills). We plug into what exists, don't reinvent.

## Doability confirmed (not hype)

- **POC**: 1-2 weeks (conversation + OpenSpec output + basic UI).
- **Production-ready Amira component**: 4-6 weeks (platform integration, multi-tenant, session state, compliance hand-off, polish).
- **Demo-scoped MVP** (Rajiv could show Mars "here's our spec agent"): 2-3 weeks.

Stack mature. Any modern agent framework (Pydantic AI — Quantum AI's choice — / Claude Agent SDK / OpenAI Agents SDK / Google ADK) handles structured output + multi-turn + tool calling natively. Biggest unknown: Amira integration contract. Biggest risk: OpenSpec adoption commitment (team decision, not tech decision).

## What tomorrow (2026-04-22) needs to establish

Claude comes in **interrogation mode**. Farzaneh brings Cesar's repo URL (or arch sketch) + Rajiv's detailed guided-workflow vision + Ashwin's OpenSpec commitment level.

**Question categories Claude will drive through:**

1. **Vision & success criteria** — who uses it (Mars analysts? QDT team? customers?), for what spec types (app-scale? feature-scale? platform-scale?), what "good output" means at Mars and QDT.
2. **User input model** — free-form conversation, guided questionnaire, upload-and-refine existing doc, or hybrid. Rajiv said "guided IEEE workflow" — how prescriptive?
3. **Output formats** — pure OpenSpec folders? Word/PDF for stakeholders? Cesar-custom? Multi-format simultaneously?
4. **Where does the Spec Agent live** — inside Amira as a registered bot? Standalone web app Amira embeds? Terminal tool for devs? Multiple surfaces?
5. **Amira integration contract** — APIs, message shapes, auth, session persistence, multi-tenant isolation. **Biggest unknown; answered by Cesar's repo.**
6. **Conversation design** — turn budget per spec, clarification depth, "propose alternatives" behavior (preserves the bake-off value from FinIQ v1.x era), what to do when user is vague.
7. **Scope boundaries** — what the agent does NOT do. Clear lines with Build Agent, Stage D compliance agent, Deployment Agent.
8. **Compliance hand-off** — how does generated spec get verified? Stage D runs separately or called by Spec Agent?
9. **Quality evaluation** — how do we know a generated spec is usable before the (slow) coding-agent feedback loop?
10. **Team commitment to OpenSpec** — Ashwin, Rajiv, Cesar all-in, or is OpenSpec still under consideration? If not committed, agent must be output-format-agnostic from day 1.
11. **Tech stack constraints** — Mars Google preference, Azure OpenAI Foundry requirement, Cesar's chosen framework (need to confirm: Pydantic AI like Quantum AI? Or something else?). Mandatory vs. preferred.
12. **Timeline** — demo target? MVP vs. full? Rajiv said "next phase" — weeks or months?
13. **Existing building blocks** — what does Cesar have? Farzaneh's Artemis/OpenClaw experience? Previous Spec Agent attempts at QDT?
14. **Naming / positioning** — customer-facing name ("Amira Spec Assistant"?), where it sits in Amira's UX, how users discover it.

## Hard rules for the build

- **Narrow scope.** Spec Agent writes specs. Period. Does NOT code. Does NOT verify builds. Does NOT deploy. Those are separate agents in Rajiv's architecture.
- **Preserve the "three perspectives" value** from FinIQ's bake-off era by having the agent propose alternatives at architectural decision points, not converge on one answer silently.
- **OpenSpec format preferred**, but the agent must emit valid output even if the team later swaps to a different format. Decouple output format from conversation logic.
- **Reuse before reinvent.** If Cesar has pieces (conversation flow, prompt templates, integration shims), plug in don't rebuild.
- **Dogfood first.** Spec Agent's first real user is the QDT team itself, specing Amira's next components. Rajiv: *"we all need to start using it just like we're telling Mars to."* If we don't dogfood, we won't find the UX problems.

## What Claude should NOT do

- Write the proposal / code tonight. Premature.
- Commit to OpenSpec as the only output format before team alignment.
- Collapse this agent's responsibilities with adjacent agents.
- Treat Amira's integration contract as known — it's not, until Cesar's repo is read.

## Canonical references

- [AMIRA_PLATFORM_VISION.md](D:/Amira FinIQ/AMIRA_PLATFORM_VISION.md) — full 4-stage process breakdown + OpenSpec mapping table + Spec Agent vision (April 15 work).
- [QuantumAI_Voice_Integration_Proposal.md](D:/Amira FinIQ/QuantumAI_Voice_Integration_Proposal.md) — Quantum AI (Noname) architecture review. Useful shape for how an Amira component is structured externally.
- [POST_DEMO_TODO.md](D:/Amira FinIQ/POST_DEMO_TODO.md) — FinIQ-specific post-demo improvements; separate track from Spec Agent build.
- OpenSpec: github.com/Fission-AI/OpenSpec
- FinIQ SRS v3.1 Final.docx — working reference for what "good spec output" looks like at IEEE 830 level.
