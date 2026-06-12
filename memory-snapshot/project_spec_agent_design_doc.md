---
name: Spec Agent Design Document — v0.6 shipped, v0.7 deltas being tracked
description: Comprehensive design doc for Spec Agent (Amira Component #1). v0.6 shipped 2026-04-24 + sent to Cesar. v0.7 deltas accumulating from the 2026-04-27 commercial-proposal call + Cesar's app-as-agent notes + knowledge-layers conversation. NOT yet revised — waiting for batch update once Cesar's substrate decision lands. Lives at D:/Amira FinIQ/SPEC_AGENT_DESIGN.md + .docx.
type: project
originSessionId: 5392bc4f-29c8-4e9d-ac1d-dc209c410846
---

## v0.7 deltas being tracked (as of 2026-04-29)

NOT yet applied to the doc — accumulating for a single coherent revision. **Cesar's canonical architecture (`amira-architecture_v2.html`, 2026-04-29) now backs most of the open questions** — see [project_amira_architecture_canonical.md](project_amira_architecture_canonical.md) for the build-ready reference. New deltas added below table.

When v0.7 lands, these are the additions:

| # | Source | Section affected | Change |
|---|---|---|---|
| 1 | 2026-04-27 commercial-proposal call | §12 (Phase 1 MVP) FRs | Add explicit pre-deploy approval gate FR (currently only draft→approved). Pre-build gate stays as FR-22; new FR for code→deploy gate. |
| 2 | 2026-04-27 commercial-proposal call | §11 / §12 | Clarify "compliance metrics document" referenced during Spec phase — likely the rolling matrix from prior versions feeding into the next spec elicitation. |
| 3 | 2026-04-27 commercial-proposal call | §10.5 (Skills directory) | Add: skill wrappers for common engineering / financial tools as a category (e.g., financial-indicator wrappers, charting libraries) — extends what skills directory holds beyond proprietary IP. |
| 4 | 2026-04-27 commercial-proposal call | §9 (Output Format) | Clarify: spec stored as IEEE markdown internally (Build Agent input); PDF as user-facing export. |
| 5 | Cesar's chat notes | New §10.x or §13 | "Apps Become Agents" — auto-generated companion agent (CLI + Agent Skill) per built app. Apps as callable services, not destinations. Same permissions, audit, voice-compatible. |
| 6 | Cesar's chat notes | §10 / §11 | Compounding-effect formalization — every shipped app becomes a reusable skill, the platform's skill library grows with each build, replication compounds. |
| 7 | Knowledge-layers WhatsApp convo | §10 (Knowledge Layer) | Make the **3-layer model explicit**: per-user / per-project / per-company (currently implicit via scoping). |
| 8 | Knowledge-layers WhatsApp convo | §10 / §11 | Karpathy's graph approach as the substrate for the company-wide tier (open: graph over pgvector vs separate graph store — pending Cesar) |
| 9 | Knowledge-layers WhatsApp convo | New §10.x or §13 | **Knowledge promotion flow** governance: user → project → company with approval chain, secret-scrubbing, privacy filters (Ale's requirement). |
| 10 | Repo read 2026-04-27 | §6 / §7 | Top engineering principle: "Fail loud — never fall back silently" — confirmed adopted in Cesar's platform repo. Codify as shared engineering principle. |

Most are additive (don't break v0.6 architecture). Items 7, 8, 9 are the most substantive; they require coordination with Cesar on the substrate decision before final wording.

### Additional v0.7 deltas from 2026-04-29 architecture review

| # | Source | Section affected | Change |
|---|---|---|---|
| 11 | Cesar's arch §6.1 (RUNTIME-1) | §7 Stack | Update LLM choice: v0.6 said `gpt-5.4-mini` / OpenAI primary. **Lock to Claude Agent SDK + Anthropic API direct as v1 default**, with env-var-toggle adapter for Bedrock / Vertex / Foundry / on-prem (LLM-6). OpenAI listed as out-of-v1 per arch §14.8. Adapter pattern preserves migration option without code change. |
| 12 | Cesar's arch §4.1 (PERSIST-1) | §9 Output Format + §12 Data Model | **Reframe spec as DATA, not document.** Spec lives in Postgres as `spec_version` + `spec_capability_graph` + `decision_point` + `gap` + `kb_attachment` + `spec_skill_reference`. IEEE 830 / OpenSpec / Word / PDF are render targets via adapter. The "Phase 1 MVP runs OUTSIDE the platform" framing in v0.6 §13 is superseded — Phase 1 already runs INSIDE the platform per PR #1 phase 1.2. |
| 13 | Cesar's arch §6.1 (AGENT-TOPO-1) + §14.3 | §11 Learning Stack | **Connect verifier-deferral to learning loop.** Day-one is single-agent ReAct without verifier. The verifier sub-agent will be added when compliance re-eval starves the main loop's context budget — that's the same primitive that should capture rule extraction from user edits. v0.7 §11 should explicitly note the verifier addition is double-duty (compliance + learning). |
| 14 | Cesar's arch §10.4 (AUDIT-1) | §11 Outcome Metadata | Add: outcome metadata writes go through the audit ledger (hash-chained Postgres + WORM Merkle anchor). 7-year retention enforced. Cohasset-assessed for SEC 17a-4(f) / FINRA 4511(c) / CFTC 1.31(c). Mars-grade compliance posture for the learning data, not just the spec data. |
| 15 | Cesar's arch §13 (MTEN-2) | §13 Platform Integration | **Customer-environment redeploy is config not fork.** Per-org config record loaded at session start; in single-tenant Mars-Amira deployment the config simply has one tenant. v0.7 should remove "platform integration unknowns" — they're now answered by the canonical architecture. |
| 16 | Cesar's arch §3.2 (RUNTIME-7) | §6 / §12 Data Model | Add Build Agent contract: receives ONLY the hand-off envelope (frozen spec hash + signed approval ID + `build-plan.lock` content hash). Spec Agent's job is to produce something the Build Agent can consume cold from the envelope alone. References outside the envelope are rejected. |
| 17 | Cesar's arch §8.4 (DEPLOY-6) | §11 Compliance | **AC DSL is shared with deploy infrastructure.** The spec's ACs literally execute as Argo Rollouts `prePromotionAnalysis` smoke tests via the AC-runner. v0.7 should clarify: AC writing is a deploy-quality concern, not just a spec-quality concern. Spec Agent should validate AC executability when locking. |

### Three things flagged back to Cesar (open follow-ups from 2026-04-29 review)

1. **§14.8 vs §13.1 LLM provider** — clarification footnote: per-deployment swap, not per-session selection within one deployment.
2. **§13.3 "no license enforcement / no feature-gating"** vs Rajiv's 2026-04-28 "3-month trial → annual contract" — flag in commercial discussions; trial governance is purely contractual without runtime enforcement.
3. **§14.3 verifier-deferred** — connect to v0.7 §11 learning loop. Same primitive when added; should capture rule extraction from user edits as double-duty.

## v0.6 update (2026-04-24 afternoon) — shipped + scrubbed + sent

## v0.6 update (2026-04-24 afternoon) — shipped + scrubbed + sent

**Doc state**: `SPEC_AGENT_DESIGN.md` (1,279 lines, ~85 KB) + `SPEC_AGENT_DESIGN.docx` (~70 KB). Version 0.6. Sent to Cesar via chat.

**What changed from v0.5 → v0.6**:
- §1-2 reframed as Component #1 of the canonical 3-agent pipeline (Spec → Build → Deploy). Build Agent (Canvas) and Deployment Agent acknowledged as operational.
- §3 hard rules: IEEE primary, versioning first-class, "not responsible for binding skills" as non-goal.
- §4 added Technical vs Business viewing modes (inherited from Canvas).
- §5 flow diagram: 9 steps including Canvas handoff + reversibility + compliance-matrix feedback.
- §6 architecture diagram: skills directory + user-upload knowledge base + reversible loop.
- §7 Pydantic AI + agentic-builder split validated. Deployment path K8s-preferred.
- §9 IEEE 830 locked as primary. OpenSpec dropped to backlog (adapter retained).
- §10.5 (skills directory, reference-not-bind) + §10.6 (user uploads, private/shared scoping) added.
- §11.7 "Versioning IS the feedback loop" — every Canvas-to-Spec edit is tracked version.
- §12 added FR-26 through FR-32 (skills, uploads, scoping, versioning, compliance matrix intake). Data model grew by 5 entities. API extended for versioning/skills/uploads/compliance endpoints.
- §14 rewritten as confirmed integration contract, not known unknowns.
- §17 closed OpenSpec question. Added skills-directory questions. Reframed platform questions around concrete contracts.
- §22-23 updated. Appendix B preface noting OpenSpec deprioritized.

**Scrubbing discipline applied** — grep-verified three times, 0 matches for:
- Team names (Farzaneh, Cesar, Rajiv, Ale, Alessandro, Savino, Chandrasekaran, Flores, Ashwin, Atif, Bruce, Kumar, Matt, Hutton, Danny, Woodruff, Bill, Dennis, Ishaq, David, Asimov, Atlas, Artemis, Claudio)
- Client/product names (Mars, Nestle, Hershey, Mondelez, Petcare, Wrigley, Pedigree, M&M, Snickers, Whiskas, Royal Canin, QDT, Amira, FinIQ, FIN IQ)
- Vendor/tool names (Claude, Claude Code, Replit, Cursor, Claude Agent SDK) — replaced with "Canvas", "agentic code-generation engine", "live code preview", "enterprise app-building surface", "Provider-bound agent SDKs", "other providers"
- Internal data source names (QDL, QML, Databricks, Collibra, MDM, Anthropic, Foundry, Bloomberg, FRED, Comtrade, TRAD_ECON, DTNIQ, FMP) — replaced with "macro-data access", "SQL-to-warehouse connectors", "domain-specific services"
- Chat/communication artifacts (WhatsApp, Slack, screenshot, email, forwarded, meeting notes, call notes)

**Sent to Cesar**: afternoon of 2026-04-24. Standing by for his integration questions or task assignments.

**Lesson for future doc shipments**: the scrubbing-to-portable discipline costs ~20-30 minutes per revision but saves large embarrassment if the doc circulates externally. Build a pre-flight grep check into the generator script for future docs (future work).

---
**Canonical files** (in `D:\Amira FinIQ\`):
- `SPEC_AGENT_DESIGN.md` — source of truth, ~900 lines markdown, version 0.5
- `SPEC_AGENT_DESIGN.docx` — team-facing Word version, ~60 KB
- `generate_spec_agent_docx.py` — python-docx generator script. Run `python generate_spec_agent_docx.py` to rebuild docx from md.

## What it contains (23 sections + 3 appendices)

1-10: Product scope / users / flow / architecture / framework / mechanics / output / knowledge (standard design doc structure)
**11: Learning and Continuous Improvement** — the product-moat story (6-layer learning stack, no fine-tuning, instrumentation from day 1, monthly governance)
**12: Phase 1 MVP Detailed Specification** — 25 FRs, 7 NFRs, 10 Karpathy-style acceptance criteria, 6 Given/When/Then scenarios, 9 data model entities, 10-endpoint REST API, UI + CLI surfaces. Builder-ready.
13-18: Roadmap / platform integration / success criteria / risks / open questions / dogfood
19-21: Appendices (spec iteration cost, OpenSpec mechanics, 10 eval harness seed queries)
22: Approval / Build Gate — 7-point sign-off checklist
23: Final Thesis — compounding-value pitch closer

## Key design decisions locked

| Decision | Choice | Why |
|---|---|---|
| Framework | **Pydantic AI** primary | Team experience, type-safe structured output, FastAPI-native, async-first |
| LLM | `gpt-5.4-mini` (Pass 1) + `gpt-5.4` (Pass 2) via OpenAI | Portable via adapter layer to Azure OpenAI / Gemini / Claude |
| Output format | OpenSpec folders primary, markdown/Word/JSON via adapters | Team commitment to OpenSpec not yet confirmed → adapter pattern protects |
| Data layer | Postgres + optional Redis + git for spec artifacts | Standard |
| Phase 1 deployment | Standalone (CLI + local web UI), OUTSIDE platform | Avoids blocking on platform integration contract |
| Elicitation mode | Three user-selectable modes | Express (≤3 Qs) / Full (≤8 Qs) / Generate-then-review (0 Qs upfront) |
| Synthesis | Two-pass (structure temp=0, render temp=0.2) | Pass 1 reliable extraction, Pass 2 prose quality |
| Learning | RAG + curation + feedback, NO fine-tuning | Governance + frontier drift + cost + explainability |

## Hard rules codified in §3.3

1. Narrow scope — writes specs, nothing else
2. Propose alternatives at decision points (preserves the bake-off creative yield)
3. Output-format-agnostic core (adapter layer)
4. Framework-adapter discipline (swappable)
5. Dogfood first (team before external use)

## Cleanup discipline applied

- **Zero names** — grep-verified against 20+ team/client/product names. Doc survives handoff to any fresh Claude Code instance without context confusion.
- **Zero source-attribution** — no WhatsApp / email / screenshot / forwarded-source references.
- **No "project lead" attribution** — voice is team-neutral.
- **Self-contained** — Section 12 alone is enough for Phase 1 POC.

## Key product positioning

Added Section 11 (Learning) during the session after Farzaneh drew the analogy *"just like now that you had some knowledge of the specs from finiq and you did this."* Reframed the product from "generates specs" to "compounds in value with use — the 100th spec is materially better than the 10th." Institutional memory becomes the moat.

Aligns with Section 8 Success Criterion #4 of Rajiv's FinAI MVP 2.0 Planning email: *"leadership can clearly see the trade-off between platform investment and traditional development effort."*

## Honest-opinion analysis (captured before team review)

**Strong concept, high risk of under-delivery in execution.**

Pros:
- Pain is lived and recurring (FinIQ v1-v3.1 spec cycle was 68+ human hours)
- Structural work IS automatable (not hype)
- Mars explicitly endorses spec-driven development
- Low technical risk (Pydantic AI + OpenAI is solved stack)
- Scope boundaries defensible
- Dogfood-able from day 1
- Leverage multiplier for Mars engagement (every spec Mars writes = hours QDT doesn't spend)

Cons / risks:
- Biggest: becomes generic chatbot producing bland templates (most "AI spec tools" 2024-25)
- "Propose alternatives" easy to fake, hard to do well
- False authority problem (bad spec approved via official process worse than no spec)
- Builder-integration contract unknown (value prop depends on it)
- Adoption friction (users used to Word docs)
- OpenSpec commitment shaky until team confirms
- Commercial framing risk (platform primitive, not a product clients buy directly)
- Silent LLM degradation (seen in FinIQ multi-period trio — 3 escalation tiers to fix)

Verdict: **build Phase 1 POC with explicit KILL criterion** — e.g., *"if mean dogfood satisfaction <4.0/5 after 3 sessions, stop."* Most products ship regardless of signal due to sunk-cost pressure. Kill gate must be decided now.

## Path forward

1. **Morning 2026-04-24**: Farzaneh shares `SPEC_AGENT_DESIGN.docx` with team
2. Gather team feedback (Cesar on platform integration, Rajiv on product strategy, Ashwin on OpenSpec commitment, Ale on engineering)
3. Iterate based on feedback (expected Friday-Saturday)
4. **Monday 2026-04-27**: Phase 2 commercial proposal includes 1-2 page Spec Agent summary derived from this doc
5. Post-Monday: if approved, kick off Phase 1 POC build

## Team feedback — 2026-04-24 morning

**Rajiv's initial reaction** (FinIQ GenAI WhatsApp group, ~7:24 AM):
- *"This looks good, Farzaneh. I like the flexibility of IEEE versus open spec ❤️"*
- *"Personally, I like the IEEE format because it has a lot of history"*
- *"Let's try it out"*
- *"We should try it on our version of Amira to build the next solution. 👍"*
- *"Can we connect briefly on the plan today?"*

**Signals**:
- **Doc approved in principle** — Rajiv is ready to build
- **Format preference: IEEE over OpenSpec** — worth noting. Our doc kept both options open via the adapter pattern, which was the right call. Phase 1 MVP should default to IEEE output template, with OpenSpec as secondary. Simplifies the commercial pitch (IEEE has decades of enterprise adoption; OpenSpec is emerging).
- **"Try it on our Amira"** = Mars endorsement loop. Aligns with Section 13 (Platform Integration) — Spec Agent as Amira's Component #1, dogfooded on Amira's own next build.
- Call scheduled for today — Cesar ✓, Savino ✓, awaiting Ale confirmation (Rajiv said he needs at least Ale + Cesar).

**No action yet** — waiting for Ashwin, Ale, Cesar's comments before iterating. If IEEE preference holds across the team, we flip the Section 8 "Output Format Strategy" default from OpenSpec to IEEE in the next doc revision.

## Team call outcomes — 2026-04-24 late morning

Attendees: Rajiv, Ale, Cesar, Farzaneh. Ashwin did not attend.

**Key decisions locked:**

| Decision | Outcome |
|---|---|
| Spec Agent scope | Cesar is taking our design doc and productizing it as the **Spec tab / Spec skill** inside Amira. Not standalone — lives inside the platform alongside Canvas + Artifacts. |
| Flow | User idea → Spec skill (elicitation back-and-forth per our §7 mechanics) → final IEEE spec → sent to Canvas → Canvas builds → Artifacts tab tracks + deploys |
| Output format | **IEEE locked.** Rajiv: *"I definitely prefer IEEE, and we don't wanna bound ourselves to OpenSpec."* Adapter pattern survives but OpenSpec drops to backlog. Flip §8 default in next doc revision. |
| OpenSpec commitment | Dropped. Ashwin's absence made the OpenSpec-advocacy conversation moot. |
| Canvas status | **READY.** No blocking build dependency. Biggest unknown (Canvas existence) resolved. |
| Builder technology | **Canvas is a Claude Code wrapper.** Validates our architectural split: Pydantic AI for elicitation, Claude Code for building. Explains Rajiv's "vibe for improvements" capability (= Claude Code agentic iteration). Spec output format: markdown that Claude Code ingests well. |
| Commercial framing | Ale: *"We are building a financial Replit. Backed by our data sources. That's what makes us differentiate from Replit or other similar apps."* This is the Monday proposal opener. |

**Amira platform state as demoed in the call** (3 tabs):
1. **Spec tab** — being built from our design doc
2. **Control Room with Canvas** — ready. Shows code + live preview (Replit-style). Claude Code wrapper under the hood.
3. **Artifacts tab** — built apps, progress tracking, export/deploy from here

**Implications for our design doc (§8, §13, §11):**
- §8 Output Format Strategy: flip IEEE → primary, OpenSpec → deprioritized
- §13 Platform Integration: rewrite. No longer "blocked on integration contract" — Canvas is ready, handoff is markdown to Claude Code. Much less to design.
- §11 Learning: still applies. Add: Artifacts tab is where outcome metadata (FR-25) gets captured and fed back into the Spec skill's RAG layer.
- §6 Framework: Pydantic AI choice validated by the split (different role than builder).

**Implications for Monday commercial proposal:**
- Open with Ale's line: "Financial Replit backed by our data sources."
- Shift pitch from "build platform" → "integrate Mars workstreams onto existing Amira platform." Amira is tangible, not promised.
- Spec skill is a pillar, not the headline. The headline is data-moat + enterprise delivery + Canvas speed.
- Data differentiation (Databricks/QML/FMP/Collibra-future) is the commercial moat, not the tech.

**Open questions from Farzaneh to me after the call** (unresolved):
- Who builds the Spec skill and when? Cesar's team, ours, or joint?
- Canvas-built demo artifact available for Monday?
- Monday proposal structure/owner decided?

## Full call meeting notes — 2026-04-24 (read 2026-04-24 afternoon)

**Headline summary** (from Gemini-generated notes):
- Amira platform already connected to data lake. Demoed retrieving latest US CPI.
- Canvas view works (sandbox, Replit-style, code artifacts spun up dynamically, Claude Code wrapper under the hood)
- Spec creation is THE selling point — Ale emphasized "strong differentiator"
- 3-agent workflow locked canonically
- Monday proposal needs 3-agent mockup + workflow description + 2 deployment proposals (K8s preferred, web app alternative)

**3 canonical agents (Rajiv's framing, now locked):**

| Agent | Role | Output |
|---|---|---|
| Spec Creation Agent | Interactive elicitation → standardized IEEE spec. Inputs: user data, existing skills, libraries of existing code (QDL/QML agents) | IEEE markdown spec |
| App Development Agent | Converts spec → app. Creates a **hidden developer plan** checking spec against available skills. Claude Code wrapper (Canvas). | Running app + **compliance matrix** (how well built app adheres to spec) |
| Deployment Agent | Ships to Azure repo → pipeline → YAML → Docker → K8s | Deployed app in Mars environment |

**Sequential but reversible**: Rajiv — "users should be able to go back at any point from canvas to Spec Agent to update the spec, which will create a new version and either completely rebuild or iterate on the existing code."

Cesar: "spec iteration should occur in the canvas view, where users can modify specifications, lock them in, and then proceed to the Development Agent."

**Skills directory = spec INPUT (key architecture decision):**

Rajiv: *"skills should be part of a 'Build Plan' generated by the platform, rather than being explicitly defined in the spec. The Developer Agent would look at the specifications, check available skills, and create a hidden developer plan to ensure consistency."*

Why: "supporting future role-based security constraints where specific skills may be restricted to certain user groups, such as finance or marketing."

Implication for our design doc: Section 9 (Knowledge Layer) stays, but Spec Agent presents **skills directory** to user during elicitation. User REFERENCES skills (e.g., "use QDL for macro data") — skills themselves stay out of the spec. Dev Agent does the binding.

**Compliance matrix = Dev Agent output** (not just dev convenience):

Alessandro: two debugging modes in Canvas:
- **"Geeky mode"** — logs + code debug for advanced users
- **"Business mode"** — compliance matrix showing status, requirements met, new functionality added

If code changes conflict with spec, matrix prompts user to update spec. This is OUR 67.5/80 work becoming first-class platform feature.

**User data / knowledge base:**
- Users upload own files/data → embedded in applications
- Scoped individual OR shared
- Works like Claude Code (instance spun up referencing folder containing docs)

**Secret vault** (Ale's suggestion):
- Left menu
- User-defined secrets (API keys)
- Not exposed in specs

**Gemini wrapping — platform-wide decision:**
> *"The agents should be designed to take a web app, like Fin IQ, and wrap it up to become a Gemini-like agent that Mars users can access through their Gemini platform. This requires building a command-line interface for the application so agents can easily interact with it. The team decided to adopt this approach for QDL and QML internally as well."*

ALL apps (FinIQ, QDL, QML) get CLI + Gemini-agent wrapper. Post-April-21 work.

**Deployment architecture:**
- Preferred: Kubernetes managed by QDT team → continuous artifact additions, dynamic provisioning
- Alternative: Existing web app team → 2-3 weeks longer, 2 weeks of debugging overhead
- Pipeline: Code → Azure repo → pipeline trigger → YAML → Docker image → K8s
- Rajiv wants BOTH proposals for Monday, pros/cons outlined

**Business model (Rajiv):**
- Charge Mars for: platform itself + incremental features + consulting time
- Replication targets: Hershey, Campbell Soup, PepsiCo
- Mars's 4-week initial-phase timeline: Cesar pushing for K8s route

**Platform differentiation vs Replit/Cursor** (team consensus):
- Custom-built for Mars
- Lives in Mars environment (not 3rd party cloud)
- Instant access to role-based skills + existing codebase
- "Financial Replit backed by our data sources" (Ale's tagline)

**Next steps locked (assigned):**

| Owner | Task |
|---|---|
| Alessandro | Check Super Forecast certificate with external contacts |
| Group | Talk to Mars team to identify deployment automation contacts |
| Cesar | Mock up dashboard view of 3 agents (for Monday proposal) |
| Cesar | Write workflow description in words (for Rajiv's presentation) |
| Cesar | Deploy 3-agent flow in internal env, notify group for testing |
| Cesar | Draft 2 deployment proposals (K8s + web app), include networking specs |
| **Farzaneh** | **Share final FinIQ spec doc with Cesar** — for platform Spec-skill integration |
| Cesar | Integrate FinIQ spec into platform for internal testing |

**Farzaneh's immediate task**: send the FinIQ product spec (likely SRS v3.1 + Frontend Guideline v1.0) to Cesar. NOT SPEC_AGENT_DESIGN.md — that's OUR design, not the test case. Cesar wants a real product spec to stress-test the Spec skill integration.

**Implications for SPEC_AGENT_DESIGN doc revision:**

| Section | Change |
|---|---|
| §1-2 Scope | Spec Agent = platform skill inside Amira's 3-agent pipeline, not standalone. Reframe as Component #1 of a sequential pipeline. |
| §3 Users | Add "geeky vs business" user modes (inherited from Canvas). |
| §5 Architecture | Draw the 3-agent pipeline (Spec → Dev → Deploy) with reversibility arrow (back-to-Spec from Canvas). |
| §6 Framework | Pydantic AI validated by split (elicitation vs building). Platform deployment K8s-targeted. |
| §8 Output Format | IEEE primary LOCKED. OpenSpec drops to backlog. |
| §9 Knowledge Layer | Add skills directory integration (browse, reference from spec). Add user-file upload to knowledge base with individual/shared scoping. |
| §11 Learning | Versioning via back-to-Spec flow is the instrumented feedback loop. Version tracking happens in Artifacts tab. |
| §12 Phase 1 MVP FRs | Add: FR-26 skills-directory browse, FR-27 versioning + duplicate, FR-28 knowledge-base upload, FR-29 scoping, FR-30 compliance matrix output, FR-31 "back to spec" from Canvas. |
| §13 Platform Integration | Simpler rewrite. Canvas is ready. Handoff = IEEE markdown to Claude Code. Add note on hidden Build Plan concept. |

**Implications for Monday proposal (2026-04-27):**

Contents needed (Rajiv-led, Cesar-delivering-artifacts):
1. 3-agent dashboard mockup (Cesar)
2. Workflow description (Cesar)
3. 2 deployment proposals with networking specs (Cesar)
4. Business model (platform + features + consulting)
5. Commercial differentiation angle ("Financial Replit backed by our data sources")
6. 4-week initial phase timeline justification
7. Our FinIQ spec as the exemplar + integration demonstration

**Other memories affected (future updates):**
- `project_amira_vision.md` — 4-layer platform model needs update to 3-agent pipeline
- `project_amira_platform_vision_doc.md` — strategy doc pointer; doc itself needs rewrite
- `project_finai_mvp2_plan.md` — Rajiv's email action items now refined by this call
- `project_spec_agent_plan.md` — 14-question interrogation list mostly superseded by call outcomes
- `AMIRA_PLATFORM_VISION.md` (project root doc) — needs significant rewrite to reflect 3-agent architecture + Canvas reality

## Related memories

- [project_spec_agent_plan.md](project_spec_agent_plan.md) — the 14-question interrogation list and hard rules that predate this design doc (still useful for when we actually kick off the build)
- [project_finai_mvp2_plan.md](project_finai_mvp2_plan.md) — Rajiv's FinAI MVP 2.0 Planning email context (Section 4 endorses spec-driven dev)
- [project_amira_vision.md](project_amira_vision.md) — 4-layer platform model (Spec Agent would be Layer 3 / elicitation layer)
- [project_amira_platform_vision_doc.md](project_amira_platform_vision_doc.md) — `AMIRA_PLATFORM_VISION.md` at project root
- [project_qdl_data_guide.md](project_qdl_data_guide.md) — companion strategy doc in project root, same style
