---
name: Amira platform first deployment + week-ahead plan
description: 2026-05-14 evening (~6:37 PM). Cesar pushed the FIRST deployed Amira platform version live at `http://13.90.38.175:3000/` (HTTPS pending — ingress integration tomorrow → `amira.qdt.ai`). Posted in FinIQ GenAI WhatsApp group with screenshot. Cesar's plan for next 10 days: spec agent dev tomorrow → tickets for Farzaneh Mon/Tue 5/18-19 ("integrating the agents with the right spec workflow") → build agent → deploy agent. Public quote: "I'll build the cask for it, **farzaneh will bring the magic**." Training Thu 5/21 + 3-day week of 5/25.
type: project
originSessionId: b3253814-675e-4c79-a58c-3184f8915019
---
## What happened (2026-05-14 evening WhatsApp updates)

### Cesar's group-chat message (6:37 PM) — verbatim

> *"Team, an update for today, foundations nearly done, right now the wiring is real for the organization, worskpaces, and user functionality. I'm starting the development in the spec agent tomorrow, that will be a chunk, and will assign some tickets to @Farzaneh for early next week mostly on integrating the agents with the right spec workflow, I'll build the cask for it, farzaneh will bring the magic, then I'll do the same with the build and then the deployment. You can find the very first early deployed version here http://13.90.38.175:3000/"*

Then a screenshot of the live home page, followed by:
- *"looks like that"*
- *"it's nt perfect but it's moving in the right direction"*
- *"will keep you updated when new things come in"*
- *"and I'll wait until haveing a more substantial workflow to give you a full walkthrough"*

Group reactions: 💪❤️ ×2

### Follow-up at 6:40-6:46 PM

- **Rajiv (6:39 PM)**: "Nice Cesar thank you"
- **Rajiv (6:40 PM)**: "The link isn't loading for me though"
- **Cesar (6:46 PM)**: "Try http not https cos this doesnt jave the ingress integrated yet. Ill do that tomorrow so this will be in **amira.qdt.ai**"

So ingress + DNS lands tomorrow (Fri 5/15). The `amira.qdt.ai` host name becomes the canonical demo URL from Friday onward.

### Training schedule announced (Rajiv, 2:10-2:17 PM)

> *Rajiv: "I'm gonna propose the first introductory training session for next Thursday. Cesar and I can work on that one."*
> *Rajiv: "For the following week, I'm gonna propose three days preferably a couple hours in the morning. I just wanna block some time for now. This is just FYI."*
> *Sean Qdt: "What's my role?"*
> *Rajiv: "We will be training Mars on how to use the platform to create applications."*
> *Rajiv: "We'll have to train ourselves first. Once Cesar has the initial deployment on our side."*
> 👍
> *Rajiv: "Don't worry, we'll all do it together"*

**Decoded**:
- **Thu 5/21**: First introductory training session — Rajiv + Cesar lead
- **Week of 5/25**: 3 days, mornings, ~2 hours each
- Audience: Mars (the client) — teaching them how to use Amira to create applications
- Prerequisite: We (QDT) train ourselves first, after Cesar's deployment hits our side
- Sean's role question wasn't directly answered for him personally — Sean = QML side, not primary Amira-deployment workstream

## What the live UI shows (screenshot @ 13.90.38.175:3000/home)

**Branding**: "Amira ENTERPRISE AI" (top-left sidebar)

**Identity**: Cesar Flores (cesar@qdt.ai) — confirms Auth0 OIDC working in QDT-side build, matches our T-M1-31 + Cesar's T-M1-21 schema landing

**Workspace selector** (top): "Finance (PW)" — workspace switching wired
- The "PW" suffix is unexplained — likely workspace short-code (cost_center? slug? icon_key?) — open question for next ticket study

**Left nav**: NEW PROJECT button + Home / Projects / Skills / Artifacts / Agents / Docs / Settings — full IA wired

**Main hero**: "SPEC AGENT - READY" badge above "What would you like to build?" — text input for spec submission

**Suggested prompts** (3 chips below input):
- "A period-end summary for our region"
- "Forecast cocoa exposure over the next 4 quarters"
- "Surface campaign performance vs P&L impact"

→ Mars-flavored content (cocoa = Mars commodity, P&L, period-end summary = PES system). **This is workspace-scoped DATA, not platform code.** Same data-vs-code distinction Cesar's PR #279 just enforced when refactoring our `seed_mars_demo` → `seed_default_org`.

**Approvals widget**: "APPROVALS AWAITING YOUR SIGNATURE - 1 PENDING"
- Sample: "Pet Diagnostic Lookup v1.0 — sub-symptom narrowing across the veterinary trial archive. Cesar is acting as Authorized Approver for this request as the IBU is shared with Pet Care R&D."
- 18d ago requested, 14d overdue (intentionally aged demo data)
- → The Authorized Approver / e-signature governance pattern is wired in as a first-class home-page CTA

**Your Projects** (3 cards with compliance scores):
| Project | State | Compliance | Owner | Domain |
|---------|-------|-----------|-------|--------|
| FinIQ v1.2 | DEVELOPMENT (CANVAS) | 87% | CF | FINANCE |
| Anomaly Detector v2.1 | DEPLOYED · PRODUCTION | 94% | JK | SUPPLY CHAIN |
| Campaign Performance v1.4 | DEPLOYED · PRODUCTION | 91% | AT | MARKETING |

→ Rajiv's compliance-matrix concept from March is LIVE as a per-project score on home page cards. State machine: DEVELOPMENT (CANVAS) → DEPLOYED. Owner-initial avatar circles. Domain badges.

**Make a new capability** (3 options below):
- Create Agent ("Wrap a built application as a reusable, conversable service")
- Start from a spec ("Describe what you want, the Spec Agent asks targeted questions, you get a builder-ready specification")
- Browse skills ("QDL, QML, Q Marketing — first-class platform primitives. Reference by name in any spec; resolved at build time per role.")

**Bottom-left**: "Help" + "1 issue" badge (issue tracker or work-queue indicator)
**Bottom-right**: "ASK AMIRA" floating CTA (chat overlay entry point, likely Companion Agent)
**Top banner**: "Relaunch to update" Chrome banner → version updating live, suggests CI/CD pipeline is wired

## Production-quality lessons captured from this update

### 1. Mars-flavored content in DATA is fine; in PLATFORM CODE it's not

The home page is FULL of Mars references — cocoa, P&L, FinIQ for Mars Finance, Pet Care R&D. ALL of it is workspace-scoped seed/demo data, NOT hardcoded in `tenancy/`, `auth/`, `persistence/`, or any other `apps/api/src/amira_api/` module.

This is the **same distinction** Cesar's PR #279 just enforced on us:
- Our T-M1-31 hardcoded `mars-demo` slug + "Mars Finance" workspace names in `tenancy/seed.py` (platform code) ❌
- Cesar's fix moved it to `_dev_fixtures/seed_default_org.py` + made it generic via `auth0_default_org_id` env var ✓

**Refresher checklist for every PR going forward**: before writing any string literal in `apps/api/src/amira_api/`, ask:
- Would a non-Mars customer running this code on a non-Mars deployment see something that mentions Mars/cocoa/petcare/etc.?
- If yes → lift it to workspace config, env var, or `_dev_fixtures/`.
- If no → ship.

### 2. Cesar's calibrated-honesty voice

> *"it's nt perfect but it's moving in the right direction"*
> *"will keep you updated when new things come in"*
> *"I'll wait until haveing a more substantial workflow to give you a full walkthrough"*

Three things to mirror in our own status reports + PR descriptions:
- **Don't oversell**. He could have said "live deployment shipped, foundations done, sign in and try it!" — instead he said "moving in the right direction."
- **Stage the reveal**. He's holding back the full walkthrough until there's a substantial workflow. Restraint.
- **Visual proof**. The screenshot was the convincing artifact, not the prose. Future status reports with UI work should include screenshots.

Anti-pattern we shipped on T-M1-31 PR description: leaned on "5 tests pass" without surfacing that 4 of 5 skip without DSN. **The honest framing was**: "schema correct, default-CI coverage limited to import-time wiring; full-DSN local run is 5/5 green." Be that specific going forward.

### 3. The "cask vs magic" split sets the architectural division of labor

> *"I'll build the cask for it, farzaneh will bring the magic"*

This is Cesar's mental model for the next 10 days:
- **Cesar = scaffolding/plumbing/infra** ("the cask") — agent runtime, workflow shape, persistence, deployment glue
- **Farzaneh = substance/behavior/content** ("the magic") — the actual logic the agents execute, prompts, spec interrogation flow, integration

Translation for our queue:
- The next tickets won't be migrations / models / Alembic plumbing (M1-shape tenancy work). That was the cask.
- They'll be M2/M3-shape work touching agent behavior, spec workflow steps, validation logic, prompt engineering — **closer to the user-facing UX layer**.

This is also a **public expectation set** in front of Rajiv, Sean, Ashwin, and others. Quality bar is now visible to non-Cesar audience. Don't undershoot.

### 4. Compliance score is a first-class output metric

Rajiv's compliance-matrix concept from March is LIVE as a per-project score (87/94/91% in the demo). When we work on Spec Agent integration tickets, the compliance score is what the agent's work feeds into. Think of "the magic" we're meant to bring as: substance that makes the compliance score climb.

### 5. Suggested-prompts pattern is a feature, not a one-off

The 3 chips on the home page ("A period-end summary…", "Forecast cocoa exposure…", "Surface campaign performance…") suggest **workspace-configured prompt libraries** are a first-class UX surface. This connects to FR4.5 (Suggested Prompt Library) in our original SRS v3.1 — the concept survived the rebuild.

When we get the Spec Agent integration tickets, this is the likely surface our work plugs into.

### 6. "Authorized Approver" governance is live on home dashboard

The Pet Diagnostic Lookup approval-pending card on the home page proves the e-signature governance pattern from `architecture/04-governance.md` is wired in as a primary CTA — not a hidden side feature. Our identity + tenancy work feeds this surface (Cesar's T-M1-21 `User` model + our `Org`/`Workspace`/`OrgMembership` provide the actor records the approval workflow references).

## Implications for next-session execution

### What our queue looks like now (revised understanding)

**Before this update**: T-M1-49 + T-M1-50 ("test usecases for Farzaneh") were the only known coming work. Both M1-shape backend tickets.

**After this update**: Cesar will assign tickets **early next week** (Mon/Tue 5/18-19) for **"integrating the agents with the right spec workflow"** — this is a different shape entirely. Likely M2/M3-area tickets.

**Open question**: Do T-M1-49 + T-M1-50 still happen, get absorbed into the new wave, or get superseded? Will know Monday.

**Posture**: Stay flexible. We were calibrated for "more tenancy/persistence work" — now also be ready for "agent behavior + spec workflow" shape. The codebase tour memory (`project_cesar_codebase_tour.md`) covers the foundations; the **plan/07-spec-agent.md** + **plan/12-companion-agent.md** + **prep_briefs_2026_05_06.md** entries cover the next shape.

### Pre-work recommended for Friday 5/15 (if Farzaneh wants to prep)

While we wait for tickets:
1. Re-read `plan/07-spec-agent.md` (Spec Agent area) — Cesar starts development tomorrow, the integration tickets land on top of his foundation
2. Re-read `plan/12-companion-agent.md` — likely the "agents" plural in "integrating the agents with the right spec workflow"
3. Skim our `project_spec_agent_design_doc.md` memory — v0.6 of the design doc we shipped to Cesar 2026-04-24 is foundational input
4. Sketch the shape of "spec workflow integration" — based on the 4-tab Spec/Canvas/Artifacts/Chat shell pattern from `project_amira_platform_repo.md`

### Public-expectation calibration

The phrase **"farzaneh will bring the magic"** was visible to:
- Rajiv (tech lead)
- Sean (QDT)
- Ashwin (Mars-side?)
- "Mr" / "Mr." / "Mr Chandrasekaran" — multiple Rajivs in the group
- All of QDT leadership reading the FinIQ GenAI WhatsApp

This means quality bar isn't just "Cesar's review" anymore — it's group-visible. The discipline gaps Cesar called out in T-M1-31 (adversarial-review + Mars naming leak) **need to not repeat** for the next batch. The 5 binding rules in `feedback_cesar_quality_bar_m1_backend.md` are now a hard floor, not aspirational.

## Open items / unknowns

- **"PW" suffix** in "Finance (PW)" workspace label — workspace short-code? cost_center? icon_key? Unknown until next read of master
- **"1 issue" badge** bottom-left — global issue tracker? user-scoped TODO? Unknown
- **"ASK AMIRA"** floating button — routes to which agent? (Companion Agent likely)
- **`amira.qdt.ai`** DNS — Cesar said "Ill do that tomorrow" — should be live Friday 5/15
- **T-M1-49 + T-M1-50 fate** — held, subsumed, or superseded by the new wave? Resolves Monday
- **Group-chat audience** — who exactly is "Mr Mr Mr" + Ashwin in the FinIQ GenAI room? (Membership not fully decoded yet)

## Files touched / cross-references

- Update appended to **`project_next_session.md`** capturing this evening's deltas
- New index entry added to **`MEMORY.md`** pointing here
- Cross-refs: `feedback_cesar_quality_bar_m1_backend.md` (5 binding rules), `project_cesar_codebase_tour.md` (master state), `project_mars_deployment_plan.md` (canonical build reference), `project_spec_agent_design_doc.md` (v0.6 design we sent Cesar 4/24)

---

## 2026-05-18 LATE — "Farzaneh will bring the magic" — first deliverables landed

The 5/14 framing ("I'll build the cask, farzaneh will bring the magic") now has concrete v1 ships:

| Ticket | What | Cesar's response |
|---|---|---|
| #299 T-M2-21 Classifier Activity | The traffic cop — Haiku call routing user instructions to edit / binding-or-schema / out-of-scope sub-paths | **MERGED** with explicit validation of Workflow-sandwich + test-shape + drift-call-out |
| #300 T-M3-39 elicit_turn Activity | The Spec Agent's brain — top-class (Opus) call producing structured `SpecTurnOutput` (prose + capability-graph delta + requirement deltas + gaps + decision points + kind hint) from `SpecContext` + user instruction | **OPEN awaiting review** |

**Cask/magic split confirmed in practice**: Cesar shipped substrate (#296 workflow shells + start-session route, #298 emit_event Activity + Build shell, #297 Temporal Server runbook, #294 test-shape rule). Farzaneh shipped the agent-content Activities that produce/route LLM output through that substrate.

Cesar's PR #299 merge comment was the validation moment: *"LGTM. Leaf-Activity + Workflow-side composition is the right call (Activity-from-Activity collapses retry boundaries). Tests are sub-second introspection + monkeypatched behavioral + one real-Haiku integration; matches the test-shape rule cleanly."*

**Pattern locked**: leaf Activity + Workflow-sandwich emit + test shape per `eab924b` (structural + behavioral monkeypatch + 1 integration) + surface design choices in PR body. Cesar publicly validated this pattern. Future agent Activities follow this template.

**Cesar's mid-day reassignment** (8:49 AM WhatsApp): pulled us off #91 (deps not ready), reassigned to #132 T-M3-39 with explicit WhatsApp directive that pre-resolved every ambiguity. Implementation followed verbatim.

---

## 2026-05-18 UPDATE — Monday morning, the assignment landed

**Cesar's "tickets for Farzaneh Mon/Tue 5/18-19 on integrating the agents with the right spec workflow" RESOLVED**:

- **#84 — T-M2-21 Classifier Activity** (foundational for Spec Agent's `classify_intent(turn) -> SpecIntent` per plan/05 §3.3)
- **#91 — T-M2-28 Wire adapter into Agent Runtime Activities** (foundational for any Spec/Build/Deploy/Companion Agent that calls an LLM via the adapter facade)

**Confirmation: "the magic" framing is M2 substrate, not M1 follow-on**:

The shape is exactly what Cesar's evening 5/14 message predicted — *"integrating the agents with the right spec workflow."* NOT T-M1-49 or T-M1-50 (those were superseded; M1 backend test usecases never got dispatched). NOT M3 Spec Agent code directly — Cesar's still building the cask (#81 SpecAgentWorkflow + #82 BuildAgentWorkflow + #83 DeployAgentWorkflow are all his lane). #84 and #91 ARE the integration layer between the LLM adapter (#86 closed) and the agent workflows (Cesar's lane).

**Public expectations from 5/14 stand**:
- Quality bar visible to Rajiv, Sean, Ashwin, Mr. Chandrasekaran, all of FinIQ GenAI group
- *"farzaneh will bring the magic"* = substance the agents execute, not plumbing
- For #84 specifically: classifier IS magic — wrong classification routes a user instruction down the wrong sub-agent path, breaking entire UX. ≥90% accuracy bar (per RUNTIME-4 6-9% misclassification budget) directly affects user-perceived quality.

**Timeline pressure confirmed today**:
- **Wed 5/20** = end-to-end test target (whole stack must work)
- **Thu 5/21** = internal demo + training (Rajiv + Cesar lead)
- **Tue 5/26** = Mars engagement begins

**Cesar status today** (per WhatsApp 5:46 AM + 6:18 AM):
- Working on issues 66 to 92 personally
- Wrapping **#68** (T-M2-05 emit_event Activity) right now — the only blocker for #84
- May go into focus mode (limited WhatsApp responsiveness)

**T-M1-49 + T-M1-50 fate (open question from 5/14)**: implicitly superseded. Never dispatched. The new M2 work is the wave.

**Detail in `project_next_session.md`** 5/18 update — deep study findings + pre-claim defaults + spec-kit pattern catalog.
