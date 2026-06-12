---
name: FinAI MVP 2.0 Planning — Mars formally green-lit deployment 2026-05-05
description: 2026-04-23 email from Rajiv. Mars accepted 2026-04-28. **DEPLOYMENT FORMALLY GO as of 2026-05-05 call.** Cesar shipped 17-area implementation plan in new repo `amira-mars`. 4-week build window starting mid-May (post-contract-sign). Each team member assigned chunks; Cesar driving assignments. Distributed-agents Track 2 discussed but Mars build proceeds on Track 1 (Cesar's locked architecture).
type: project
originSessionId: 5392bc4f-29c8-4e9d-ac1d-dc209c410846
---

## 2026-05-05 — Mars deployment formally GO

**Today's call (Cesar + Rajiv + Ale + Farzaneh)**:

- **Mars formally green-lit** the Amira platform deployment to Mars infrastructure
- **Stick with Cesar's existing architecture** (Track 1) — Track 2 distributed-agents proposal discussed but Mars build proceeds on Track 1
- **Cesar's email last night** introduced a comprehensive 17-area technical implementation plan
- **NEW repo**: `github.com/quantumdatatechnologies/amira-mars` — distinct from the older `amira` repo (which had PR #1 with 4-tab Spec/Canvas/Artifacts/Chat shell)
- **Mars expects build start mid-May** post contract signing; 4-week window to first deployable
- **Each team member takes chunks**; Cesar fills `plan/_DISPATCH.md` with assignments
- **Cesar's group chat update during session**: *"a few more mins and the plan is nearly split! then we can start working on it."*
- **STAKEHOLDER_ROADMAP.html** (saved at `C:/Users/farza/Desktop/`) is the customer-facing 7-phase tracker

**Build-time reference**: [project_mars_deployment_plan.md](project_mars_deployment_plan.md) — captures the 17-area plan, the 6-phase customer-facing roadmap, the 6-phase internal execution plan, the 7 binding engineering standards, the locked tech stack, the ~73 decision IDs, the 20 Contract Freeze IDs, the 14 Technical Checkpoints (C0–C13), the 50 Open Question Triage entries, and the major architectural simplifications since 2026-04-29.

**Standing rule**: We do not pre-pick areas. Cesar assigns. Per Farzaneh's instruction.

---



## 2026-04-29 — Architecture walkthrough call: timeline + sequencing locked

**Same-day call after Cesar shipped the architecture spec.** Cesar + Ale + Farzaneh walked through it together. Key commitments from Cesar:

| Sprint | Duration | Deliverable |
|---|---|---|
| **Sprint 1** | ~1 week | **Specification workflows** — user types idea → iterates with AI → locks spec. Highest priority. |
| **Sprint 2-4** | ~3 weeks | **Deployment piece** — currently the main missing element. Sandbox + preview + Helm-driven Argo Rollouts deploy + companion-agent registration. |
| **Total** | **~1 month** | Full working version with all intended features. |
| **Mars window** | **3-4 weeks** | Show platform as something Mars can use to build internal projects. (~2026-05-19 to 2026-05-26) |

**MVP demo target — verbally locked**: User specifies app idea (Ale's example: mini weather app) → system generates code → deploys v1.0 → sends link to deployed app. **One-click from spec to deployed.** This is the demo for Mars's 3-4 week update.

**Internal-first deployment posture**: Cesar explicit — QDT internal use deploys with **unrestricted resources + network policies first**, layer Mars's constraints later. Don't constrain ourselves while building.

**Commercial structure ambiguity persists**: Cesar's written architecture §13.3 says "no license enforcement, no feature-gating, no expiration-triggered read-only mode." Rajiv's 9:34 AM 2026-04-28 framing was "3-month trial → annual contract." These are reconcilable only via contractual / honor-system trial governance. **Surface this in the next internal call** — not a blocker for the build, but a commercial-architecture mismatch that needs explicit acknowledgment before contract drafting.

---

## 2026-04-29 — Canonical architecture LOCKED

Cesar shipped the full architecture spec (`amira-architecture_v2.html`, 15 sections, 3,038 lines + executive PNG). Saved to `D:/Amira FinIQ/Amira_Architecture/`. **Build-ready reference**: [project_amira_architecture_canonical.md](project_amira_architecture_canonical.md). When Cesar's onboarding arrives and assigns a first task on Amira, that memory is the authoritative reference for what to build, how, and against which decision IDs.

**Key architectural facts that affect MVP 2.0 planning**:
- §13 customer-environment redeploy model: Mars-Amira is "same code, different config" — IdP / LLM provider / Postgres / Blob / Key Vault / ACR / DNS all swap per deployment. Per-tenant config record (MTEN-2) loaded at session start.
- §13.3 explicitly states **NO license enforcement, feature-gating, or expiration-triggered read-only mode in v1**. This is incompatible with Rajiv's 9:34 AM "3-month trial → annual contract" framing without contractual-only governance. **Flag in next internal call.** The architecture refuses to enforce trial expiry at runtime; entitlement is governed by contract only.
- Anthropic API direct is the v1 default LLM (via Claude Agent SDK). Per-org BYOK is the release valve. Adapter shape preserves migration to Bedrock / Vertex / Foundry.
- All Mars proprietary APIs (QDL / QML / Q-Marketing) become skills at tier `deployment-proprietary` with customer-admin signing key — they are NOT part of the platform release.

## 2026-04-28 mid-morning — MARS ACCEPTED Phase 2

**Source**: FinIQ GenAI WhatsApp group, 9:33-9:37 AM, between Rajiv and Cesar (Farzaneh observing).

Headlines:

| Time | From | What |
|---|---|---|
| 9:33 AM | Rajiv | *"It looks like Mars will move ahead. But we need to instantiate Amira in our own platform as soon as possible."* — **Mars accepted (informally)** + dogfood urgency |
| 9:34 AM | Rajiv | *"I am proposing to start with a three month trial, which will extent to the yearly contract."* — **NEW commercial structure** — distinct from the $1M perpetual model in V3 §10.1 |
| 9:34 AM | Rajiv | Internal call + management call coming |
| 9:35 AM | Rajiv | *"I have given Mars, the impression that Amira is something we use actively now. So we need to get this going as soon as possible."* — sold "QDT uses Amira daily" externally; we have to make it true |
| 9:36 AM | Cesar | *"will onboard Farzaneh today"*, still working on platform component-flow design |
| 9:37 AM | Cesar | Endorses the dogfood approach |

## What this changes

1. **Phase 2 is GO** — formally pending SOW / contract; informally a green light.
2. **Commercial structure may shift** — 3-month trial → annual contract is a different shape than $1M perpetual. The doc we shipped overnight represents the maximalist position. Rajiv may revise §10 of the proposal. Three possible reads:
   - **Trial as on-ramp**: 3-month trial → if successful → annual subscription → eventually perpetual ($1M). Stepping-stone framing.
   - **Trial replaces perpetual**: lower commitment ask up front; perpetual goes away or becomes optional.
   - **Both offered**: Mars picks. Trial for cautious adopters, perpetual for committed.
   - Pending Rajiv's clarification on the internal call.
3. **Dogfood urgency surfaces a new track** — QDT must use Amira platform for its own work. Cesar onboarding Farzaneh today is step one. Once she's in, expect Cesar to assign a real task on the platform.
4. **Mars-side deployment leapfrogged by QDT-side dogfood** — internal Amira deployment is now more urgent than unblocking Mars deploy. Mars deploy still blocked by Cesar's network issues; that becomes secondary.
5. **Architecture appendix still in flight** — Cesar (8:45 AM): *"I'll work in the architecture details now and we can add that to the appendix as well. I'll also send that separately to Atif."* Another round-trip on the proposal doc likely.

## Standing by

- Cesar's onboarding of Farzaneh to the Amira platform (today)
- Cesar's first assignment on the platform
- Internal call + management call to clarify commercial structure
- Rajiv's potential update to proposal §10 reflecting the new trial structure

**No new work until Cesar drives.** Per Farzaneh's call.

## 2026-04-28 early morning — PROPOSAL FINAL FILES DELIVERED

After last night's V3 + this morning's screenshot integration:

- **Final Word narrative proposal** (Rajiv's polished format, NOT slides) at `D:/Amira FinIQ/Amira_Proposal_for_Mars_2026-04-28_FINAL_INLINE.docx` and `..._FINAL_APPENDIX.docx`. Both 6.2 MB / 32 pages.
- **Same body content, two screenshot placement strategies**: INLINE = scattered through Rajiv's prose at relevant sections; APPENDIX = clean prose + dedicated "Appendix A — Workflow Walkthrough" section at end with all 28 shots in Cesar's 15-step demo order.
- **Cesar's demo bundle integrated**: 28 PNGs + 15-step `DEMO_FLOW.md` providing captions and validation states.
- **$300K/year maintenance line** added by Rajiv to §10.1 in the polished doc — concrete annual subscription number on top of the $1M perpetual platform license.
- **TOC was painful** (Word "Unlicensed Product" mode mangled TOC fields on save); Farzaneh manually rebuilt the TOCs in Word for the final files. Lesson codified in `feedback_word_unlicensed_toc.md`.
- **Both files sent to Rajiv** for his pick — let him decide which goes to Mars or whether to ship both.

Slide-deck format (`AMIRA_PITCH_DECK.md` + `.docx`) retained as historical / generator pattern but is no longer the active deliverable. Full final-state details: [project_amira_pitch_deck.md](project_amira_pitch_deck.md).

## 2026-04-27 evening update — V3 sent to Rajiv, pricing locked, e-sign flow open

After the morning's V1 draft and afternoon V2 round-trip with Rajiv:

- **V3 of the pitch deck SENT to Rajiv** at end of day, with our terminology fixes (proprietary APIs, not skills; QDL/QML attributed to QDT not Mars)
- **$1M pricing locked** for Phase 2 commercial proposal: Platform License $1M perpetual + optional annual maintenance subscription. Skill Development tiered $25K/$50K/$100K. Application APIs custom-priced.
- **4 PM commercial call held** (no transcript). Confirmed pricing model. Surfaced governance question.
- **E-sign approval flow OPEN**: Rajiv prefers native to platform; Ale prefers link-out to existing tools (DocuSign / Adobe Sign / Mars's e-sig stack). Decision factor: where Mars's audit-of-record lives. Pending Mars input.
- **Off-the-shelf approval-tool question** raised (defined roles: PM / dev / approver). Pending Mars weigh-in.
- **Md and docx in sync** at `D:/Amira FinIQ/` as canonical pair. `.md` is source of truth; `generate_pitch_deck_docx.py` regenerates docx.
- **Reusable patch pattern** built (`patch_pitch_deck_v2.py`) for future round-trips with Rajiv where preserving his formatting matters.

Full deck lifecycle + workflow: [project_amira_pitch_deck.md](project_amira_pitch_deck.md).

## 2026-04-27 morning update — pitch deck draft sent to Cesar

The proposal work has shifted from a single-doc commercial proposal into a multi-deliverable form:

- **Pitch deck draft** (24 slides, md + docx) — **SENT TO CESAR FOR REVIEW**. Lives at `D:/Amira FinIQ/AMIRA_PITCH_DECK.{md,docx}`. Visual placeholders for Cesar's mockup + architecture diagram + deployment-options visuals. Will finalize once those land.
- **Cesar producing** in parallel: 3-agent dashboard mockup, workflow description (text), 2 deployment proposals (K8s preferred + web-app fallback) with networking specs.
- **Spec Agent design doc** v0.6 already in Cesar's hands for platform Spec-skill integration. v0.7 deltas being tracked (see `project_spec_agent_design_doc.md`).
- **Today's morning call** added: 3-tab Amira platform structure (Specifications / Development / Artifacts), commercial model details (enterprise license + subscription, MATLAB-pattern, consulting separate), human governance gates (pre-build AND pre-deploy), proprietary IP differentiation (QML / QDL skills as moat), Gemini wrapping for FinIQ + QDL + QML.
- **Cesar's chat notes** added: "Apps Become Agents" pattern — auto-generated companion agent per built app + chat-with-app-agent surface. Reflected in deck as new Slide 12 + reinforced Slides 10 + 17.
- **Knowledge-layers conversation** added: 3-layer model (per-user / per-project / per-company) with Karpathy graph approach for the company tier. Promotion-flow governance pending. **Decision: NOT in the deck** (over-promise risk; Phase 3+ feature). Tracked for v0.7 design doc.

Full breakdown: [project_amira_pitch_deck.md](project_amira_pitch_deck.md), [project_amira_platform_repo.md](project_amira_platform_repo.md), [project_knowledge_layers.md](project_knowledge_layers.md).

## 2026-04-24 update — what changed after the team call

The 2026-04-24 team call advanced several tracks:

- **Track 0 (Amira deployment)**: Canvas + Deployment Agent are **operational** on the platform. The missing deployment piece is the Spec skill (Cesar integrating from our v0.6 doc). Monday's proposal needs 2 deployment options: K8s preferred (Cesar drafting with networking specs) + web-app fallback.
- **Track 2 (Spec Agent)**: **No longer a research line item.** Design doc v0.6 shipped + scrubbed + sent to Cesar today for platform integration. 3-agent canonical architecture (Spec → Build → Deploy) locked. IEEE 830 primary. Full details: [project_spec_agent_design_doc.md](project_spec_agent_design_doc.md).
- **Commercial framing**: Ale's tagline *"Financial Replit backed by our data sources"* is the Monday proposal opener. Differentiators: custom-for-Mars + in-Mars-environment + role-based skills + data-moat.
- **Business model**: platform + incremental features + consulting. Replication targets: Hershey, Campbell Soup, PepsiCo.
- **Monday proposal content requirements** (locked in call): 3-agent dashboard snapshot (Cesar mocking up today), workflow description (Cesar), 2 deployment proposals (Cesar), business model framing, 4-week initial-phase justification, FinIQ spec as exemplar integrated into platform.
- **Gemini wrapping decision**: All our apps (FinIQ, QDL, QML) will get CLI'd + wrapped as Gemini-like agents for Mars users. Post-April-21 roadmap item.

**Farzaneh's action items updated**:
- ✅ Share FinIQ spec with Cesar — DONE (SPEC_AGENT_DESIGN v0.6 sent)
- ⏳ Draft QDT portion of Monday's proposal (Spec Agent pillar section + commercial positioning)
- ⏳ Stack-rank the 7 enhancements (action #4 from original email) — still pending

---

**Source**: Email from Rajiv forwarded 2026-04-23 by Atif (subject *"Fwd: FinAI MVP 2.0 Planning"*). Meeting recap from post-demo planning call covering next 3-4 weeks of work.

**Commercial proposal deadline**: **Monday 2026-04-27** (3 days from 2026-04-24).

## Purpose and Overall Objective

Evolve FinIQ into a more robust **FinAI MVP 2.0** while validating the **Amira platform** as a rapid product-development capability within Mars. Core objective: demonstrate that **Mars associates can specify, iterate, and enhance AI-powered analytics products themselves**, with minimal vendor support, while maintaining enterprise-grade governance, security, and fit-for-purpose design.

## Dual Validation Tracks

Two parallel evaluation tracks agreed:

| Track | What | Owner |
|---|---|---|
| **Functional correctness** | Does FinIQ interpret financial data, hierarchies, periods, business logic correctly? Requires Finance SME input. | Atif (SME sourcing) + David (tech PM) + QDT (build) |
| **Platform capability and leverage** | How effectively can Amira be used to accelerate iteration, enhance UI/UX, add new capabilities, shorten roadmap delivery time? | Rajiv + Cesar + QDT |

## Security and Access Control — NEW CRITICAL WORKSTREAM

Meeting flagged the **lack of testing under realistic row-level security (RLS) conditions** as a major concern. To date, FinIQ has effectively operated with broad access. The group agreed it is critical to validate whether the solution behaves correctly for users with **restricted access by geography, unit, or hierarchy**, consistent with existing FinIQ security models.

This is a sleeper track — non-trivial — and should be its own line item in the commercial proposal.

## Shift to Specification-Driven Development — VALIDATES SPEC AGENT

Strong Mars alignment that GenAI-driven development requires a paradigm shift:
- Outcomes, rules, and behaviors must be **explicitly specified upfront**, not assumed by engineers
- Specifications must be tested through **both automated and human governance**
- Business and technical SMEs (Finance Product Owners, Technical PMs) need a direct role in defining specs

**This directly validates the Spec Agent Farzaneh committed to build** on 2026-04-22. Mars is explicitly asking for what we already planned. Phase 2 commercial proposal should position the Spec Agent as a **deliverable**, not a research project.

## Deployment of the Amira Platform on Mars — PREREQUISITE BLOCKER

**Clarified: while FinIQ is deployed, the full Amira platform itself is NOT yet deployed on Mars infrastructure.**

Mars associates cannot independently:
- Create specifications
- Use coding agents
- Build and deploy enhancements or net-new apps

…until Amira is deployed. The deployment will require:
- Clear architecture diagrams
- Inbound/outbound API needs
- Whitelisting and security approvals — **submitted comprehensively rather than piecemeal**

Everything else in Phase 2 is gated on this. Rajiv-led, with Ale, Cesar, Farzaneh, Ashin.

## Candidate Enhancements (7 areas to stack-rank)

QDT action item: rank by feasibility × value, aligned with Atif/David:

1. **UI/UX improvements** using Mars design guidelines and Figma assets
2. **Improved charting capability**
3. **Anomaly detection** (via existing Amira features + Mars-developed models)
4. **Forecasting integration** — commodities, Nielsen-based forecasting via APIs
5. **Collibra / Master Data grounding** — Mars-specific terminology (financial periods, calendars, hierarchies)
6. **Net-new Finance use case** — led by David
7. **PowerPoint / slide generation** from analyses (optional exploration)

## Knowledge Grounding and Terminology

Mars-specific vocabulary must be grounded into Amira. Existing assets (Collibra / Master Data vocabularies) to be leveraged for consistent interpretation across Finance and other domains.

**Connection to our work**: this is where the QDL Data Guide I wrote today (`D:/Amira FinIQ/QDL_DATA_GUIDE.md`) plugs in — shared catalog service + drift detection + per-app curated vocabulary map are the platform-level primitives that enable this.

## Success Criteria

Phase 2 is successful if:
1. **Mars associates can independently enhance FinIQ using Amira**
2. **Roadmap items delivered significantly faster** than traditional analytics projects
3. **Improved UX, correctness, and relevance**
4. ⭐ **Leadership can clearly see the trade-off between platform investment and traditional development effort** — this is the whole pitch in one bullet; every enhancement in the commercial proposal should have a *"3 weeks with Amira vs 3 months traditional"* side-by-side framing.

## Action Items and Owners

| # | Action | Owner |
|---|---|---|
| 1 | Produce detailed meeting recap with actions | **Atif Ishaq** |
| 2 | Create deployment plan for Amira platform on Mars infra (architecture, APIs, security) | **Rajiv** (with Ale, Cesar, **Farzaneh** [note: spelled "Farzana" in notes], Ashin) |
| 3 | Provide realistic timeline and feasibility assessment for deployment + first enhancements | **Rajiv** |
| 4 | **Stack-rank enhancement areas** (UI/UX, anomaly detection, forecasting, new use case, agentic integrations) by feasibility × value | **QDT team** (us), aligned with Atif/David |
| 5 | Identify and engage Finance SME / Business Product Owner to co-own functional validation | **Atif** |
| 6 | Act as technical product manager — partner with Finance SME to iterate and test | **David Allen** |
| 7 | Investigate existing forecasting solutions (commodities, Nielsen) + assess API integration | **David** (with QDT) |
| 8 | Explore Collibra / Mars vocabulary assets for grounding | **David** (with Sasha / MDM contacts) |
| 9 | Establish shared backlog for enhancements, experiments, dependencies | **David** (supported by Atif) |
| 10 | Include PowerPoint / slide generation capability in feasibility roadmap | **Rajiv** |

## What Farzaneh / QDT own

1. **Co-author action #2** — Amira deployment plan for Mars (with Rajiv + team). Architecture diagrams, API surface, security requirements. Needed comprehensively, not piecemeal.
2. **Action #4 — Stack-rank of 7 enhancements** by feasibility × value. Deliverable before/alongside commercial proposal.
3. **Spec Agent** — embed in Phase 2 plan as a named deliverable under the spec-driven development track (Section 4 of Rajiv's notes). Not a research line item.
4. **Commercial proposal** — Monday 2026-04-27. Covers scope, tracks, timeline, pricing.

## Recommended Phase 2 track structure

Seven tracks, loosely mapped from Rajiv's sections:

| Track | Maps to | Approx effort |
|---|---|---|
| **0. Amira platform deployment at Mars** (prerequisite) | Section 5 | Rajiv-led, security/IT heavy, blocking |
| **1. RLS + security validation** | Section 3 | New workstream, non-trivial |
| **2. Spec Agent / spec-driven tooling** | Section 4 | QDT build, Farzaneh committed |
| **3. Functional correctness iteration with Finance SME** | Section 2 | Atif/David/SME-led, QDT supporting |
| **4. Stack-ranked enhancement delivery** | Section 6 | QDT build, 7 candidates above |
| **5. Knowledge grounding (Collibra / MDM / QDL)** | Section 7 | David-led, QDT integrates |
| **6. Forecasting integration (commodities, Nielsen APIs)** | Action #7 | David + QDT |

## Connections to existing work

- **Spec Agent plan** (`project_spec_agent_plan.md`) — Track 2 above. Section 4 of Rajiv's email is explicit Mars validation of this direction.
- **Schema drift agent** (`project_schema_drift_agent.md`, proposed 2026-04-22) — slots under Track 5 (knowledge grounding). Pairs with Collibra as the auto-update primitive.
- **Reference-data cache** (shipped `fcf8504` 2026-04-22) — existing proof we're building drift-resilient primitives. Cite in the proposal.
- **QDL Data Guide** (`D:/Amira FinIQ/QDL_DATA_GUIDE.md`, written 2026-04-23) — direct input to Track 5 (knowledge grounding). Platform-level split already identified.
- **POST_DEMO_TODO.md** — Track A (Spec Agent) matches Track 2 above. Track B (FinIQ maintenance) overlaps with Tracks 1, 4.
- **AMIRA_PLATFORM_VISION.md** — can be repurposed as the "leadership trade-off" narrative in the commercial proposal (Success Criterion #4).

## Decision made 2026-04-23 evening

Farzaneh asked whether to spend tonight/tomorrow planning + building the Spec Agent in detail to be "ready for tomorrow". **Decision: NO.**

Reasoning:
- Monday commercial proposal is the higher-leverage deliverable
- Building Spec Agent speculatively — without the interrogation session with Cesar (Amira integration contract), Rajiv (guided-workflow vision), Ashwin (OpenSpec commitment) — risks building the wrong thing
- A detailed **Spec Agent planning section within the Phase 2 plan** is the right artifact for Monday — demonstrates we've thought it through + becomes the brief for post-Monday build
- Tradeoff: if we did want a tangible artifact by Monday, a minimal walking-skeleton (elicitation → OpenSpec markdown → commit) is ~1 day, but would likely miss the Amira integration mark

Plan for the next few days:
1. **Tonight / tomorrow** — draft detailed Phase 2 plan outline + Spec Agent section within it
2. **Day after** — stack-rank the 7 enhancements (action #4)
3. **Weekend** — commercial proposal wrap (pricing, terms, delivery structure)
4. **Monday** — submit to Rajiv
5. **Post-Monday** — actually kick off Spec Agent interrogation with Cesar

## Open questions for the commercial proposal

- Pricing model — fixed-scope, T&M, or hybrid? (Not my call — Rajiv / commercial side)
- QDT team composition and hours — who's allocated, at what rates?
- Mars obligations — Finance SME hours, David's PM time, Atif convener time
- Amira deployment scope — who does IT integration work on Mars side? (Historically Cesar + Danny Woodruff's team.)
- Timeline hard-stop — 3-4 weeks from what start date? Gated on Amira deployment landing.
