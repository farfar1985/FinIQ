# Amira Platform — Mars Proposal Deck (Draft)

**Status**: Draft for team review. Visual placeholders marked `[VISUAL: ...]` throughout — to be filled in once the platform mockups, architecture diagram, and deployment-options visuals land.
**Audience**: Mars leadership (combined commercial + technical proposal, Phase 2)
**Length**: 24 slides

---

## Slide 1 — Cover

**Amira**
*An enterprise platform for AI-driven application development*

Backed by your data lake. Built into your environment. Governed by your policies.

> Phase 2 Proposal — Combined Commercial and Technical
> Mars, [Month] [Year]

`[VISUAL: cover background, Amira logo placeholder]`

---

## Slide 2 — The Challenge

**Today's analytics-application cycle is too slow.**

- New data-driven applications take **8–12 weeks** through a vendor cycle
- Each project re-integrates the same data sources from scratch
- Specifications are inconsistent across teams; rework is the norm
- Governance, security, and deployment are applied piecemeal at the end
- The result: a bottleneck on the velocity of Finance, Marketing, and Supply-Chain analytics

**The opportunity**: Mars associates should be able to specify, iterate, and enhance AI-powered analytics products themselves — with vendor support concentrated where it adds the most value.

---

## Slide 3 — Amira at a Glance

**Amira is an internal AI-powered application platform.**

- Mars associates **describe** what they want; the platform **builds** it
- Lives in **your** environment (not third-party SaaS)
- Pre-integrated with **your** data lake and proprietary APIs (QDL, QML, Q Marketing)
- Governed by **your** policies — row-level security, approval gates, audit
- One workspace, three guided steps: **Specify → Develop → Deploy**

> A practical analogy: an enterprise-grade workbench for AI-driven app building, with your proprietary data and analytical methods as native primitives.

---

## Slide 4 — The Three-Step Pipeline

`[VISUAL: 3-step flow diagram — pending mockup — Specifications → Development (Canvas) → Artifacts, with reversibility arrow]`

| Step | What happens | Output |
|---|---|---|
| **1. Specifications** | User iterates with an AI agent to refine requirements | Structured specification document (IEEE 830-style) |
| **2. Development (Canvas)** | An AI builder converts the spec into a working application; user iterates in a live-preview workspace | Running application + automated compliance matrix |
| **3. Artifacts** | Approved builds are tracked, versioned, deployed | Deployed app + lineage record |

The pipeline is **sequential but reversible**: at any stage, the user can return to Specifications. This creates a new spec version (never an overwrite), which retriggers an incremental build.

---

## Slide 5 — Three Agents, One Workflow

The pipeline is delivered by three specialized agents, accessed from a single workspace.

| Agent | Role | Inputs | Outputs |
|---|---|---|---|
| **Spec Agent** | Conversational elicitation of requirements | User intent, knowledge-base files, referenced skills | Structured specification |
| **Build Agent (Canvas)** | Converts spec to working application | Approved spec | Running app + compliance matrix |
| **Deployment Agent** | Ships built artifact to target environment | Approved build | Deployed app, audit-logged |

Each agent has a clean handoff contract with the next. The **specification** is the durable artifact that survives across builds and deployments — the source of truth for what the app is meant to do.

---

## Slide 6 — Specifications Phase

**Turns a vague idea into a builder-ready specification.**

- User starts with natural-language intent ("I want a dashboard that…")
- The agent asks **targeted clarifying questions** within a turn budget — Express (≤3), Full (≤8), or Generate-then-review (0)
- At architectural decision points, the agent **proposes 2–3 alternatives** with trade-offs and a recommendation, instead of silently picking one
- The user can attach **knowledge-base files** (Excel, PDF, markdown, JSON) to ground the discussion
- The user can **reference skills** from the platform's skills directory (e.g. QDL data, charting, financial indicators) — these become first-class spec inputs
- **Output**: a structured specification document, available as Word, markdown, JSON, or PDF
- **Stored versioned** — every iteration creates a new traceable version

---

## Slide 7 — Development Phase (Canvas)

**A live-preview workspace for AI-built applications.**

`[VISUAL: 3-panel Canvas screenshot or mockup — chat (left) + code editor (center) + live preview (right)]`

- Three-panel layout: AI chat, code editor, live preview iframe
- The AI builder reads the spec, generates the app, and shows the result in real time
- User iterates by chatting: *"make the chart larger,"* *"swap the data source"*
- Two viewing modes:
  - **Technical mode** — code, logs, debug view (developers, platform engineers)
  - **Business mode** — rendered application + compliance matrix + summary (SMEs, approvers)
- Every build automatically produces a **compliance matrix** showing how each requirement (FR / NFR / AC) is satisfied by the running application

---

## Slide 8 — Artifacts Phase

**Every approved application is a tracked, versioned artifact.**

- Centralized gallery of all built applications, across users and teams
- **Lineage view**: which spec version produced which build, deployed where, by whom, when
- Export options: download, share, deploy to environment
- Built-in **audit trail** for compliance and governance reviews
- Artifacts can be forked: take an existing application as a template, modify the spec, regenerate

---

## Slide 9 — Reversibility and Versioning

**The pipeline is bidirectional. Every change is traceable.**

- From Canvas or Deployment, the user can **return to Specifications** at any time
- This creates a **new spec version** — previous versions are retained, never overwritten
- Triggers a rebuild or incremental iteration of the application
- **Inter-version diffs** are queryable: what changed between v1.3 and v1.4, why, who approved
- Lineage feeds back into the platform's learning — patterns of edits inform future suggestions

> Why this matters: every Mars audit, every regulatory review, every "why does the app do this?" question has a clear, navigable answer.

---

## Slide 10 — The Differentiator: Proprietary APIs

**This is what other platforms cannot offer.**

- The platform exposes capabilities to AI agents through **skills** — reusable primitives that wrap a data source, an API, an analytical method, or a service
- **Proprietary APIs** are pre-integrated as first-class skills, accessible to Mars associates through the platform — not afterthoughts, not re-built per project:

| API | Capability (accessed through the platform) |
|---|---|
| **QDL Data** | Federated access to 100,000+ data-dictionary symbols across providers — search, time-series fetch, market data, news |
| **QML** | ML model APIs — train and deploy machine-learning models on enterprise data |
| **Q Marketing** | Marketing analytics and campaign intelligence APIs |
| **General-purpose skills** | Web search, charting (Recharts + Lightweight Charts), market hours, financial indicators, presentation generation |

- Third-party platforms (Replit, Cursor, etc.) **cannot** offer these — they don't have integrations with the proprietary APIs that power Mars's analytical workflows
- New skills are added by wrapping any API, internal tool, library, or service
- Skills are **role-restricted**: a Finance user and a Marketing user may see different available skills
- **Every app shipped on the platform becomes a reusable skill** for future apps — the skills library compounds with each application built (see next slide)

`[VISUAL: skills gallery / icons grid — pending mockup]`

---

## Slide 11 — How Skills Connect to Specifications

**Reference, don't bind.**

- During spec elicitation, the user **references** a skill by name (*"use QDL for macro data"*)
- The reference is recorded in the specification — but the specific implementation is **not**
- The Build Agent resolves bindings via a **hidden Build Plan** at build time
- Role-based access enforced at resolution: a Finance user's build picks the Finance-permissioned implementation; a Marketing user's build picks theirs
- **Result**: the same specification can be safely portable across user roles, regions, and time as skills evolve

This pattern is what allows Mars to enforce data segregation, regulatory restrictions, and BU-level access without rewriting specs.

---

## Slide 12 — Apps Become Agents

**Every application is also a callable agent. Apps are services, not just destinations.**

- When a user finishes building an app on the platform, the platform **auto-generates a companion agent** (CLI + Agent Skill) for that app
- The agent inherits the app's data access, permissions, and audit boundary — nothing is loosened
- Two interaction surfaces, same underlying agent:

| Surface | When to use |
|---|---|
| **The app's own interface** | Deep, structured workflows — dashboards, voice mode, multi-step analysis, job boards |
| **The platform's general chat** | Quick questions, ad-hoc lookups, cross-app queries — pick an agent (FinIQ, Marketing, Supply-Chain) and ask, without leaving your workflow |

- **Voice-compatible** — any app's agent can be queried hands-free
- **Full audit trail** — every agent interaction is logged identically to in-app activity

**Worked example**:
> Instead of opening FinIQ to ask *"what was Q3 net sales for Petcare?"*, a user messages the FinIQ Agent from any chat surface and gets the answer — same data, same permissions, same audit. The next analytics app can also integrate FinIQ's outputs natively, without bespoke API work.

**The compounding effect**:
- Every shipped app becomes a **reusable primitive** for the next
- The skills library grows with every build
- Replication roadmap (Slide 17) compounds: the 5th app inherits the skills, agents, and patterns of the 4 before it

`[VISUAL: dual-surface diagram — app UI on left, platform chat with agent picker on right, arrows showing the same agent backing both]`

---

## Slide 13 — Human Governance and Audit

**Two approval gates. One audit log. Zero silent decisions.**

- **Gate 1 — Specification approval** (before development begins)
  - Designated approver reviews the spec
  - Compliance matrix from any prior version is presented for context
  - Approval is recorded with identity, timestamp, optional notes
- **Gate 2 — Deployment approval** (between build and production)
  - Designated approver reviews the running application + compliance matrix
  - Approval gates the deployment step
- **Compliance matrix at every build** — automated FR/NFR/AC scoring against the spec
- **Full audit log** — every spec edit, build, deploy, approval is timestamped and attributed
- Specifications, builds, deployments, and approvals are versioned together as a single auditable lineage

---

## Slide 14 — Knowledge Base and Secret Vault

**User-controlled grounding. Secrets stay out of specs.**

**Knowledge base**:
- Users upload documents (PDF, Excel, CSV, markdown, JSON) per session
- Two scope levels: **private to user** (default) or **shared** with selected teammates / org
- Uploaded content is **not** automatically promoted to a global corpus — promotion requires explicit curation, preventing pollution
- Embedded into the relevant build via the standard MCP tool pattern

**Secret vault**:
- Sensitive values (API keys, tokens, connection strings) managed in a dedicated vault
- Referenced from specs by name only — actual values never appear in the spec text
- Rotated, revoked, audited centrally

---

## Slide 15 — Platform Features

**Comprehensive feature set across the platform's core dimensions.**

| Category | Feature | Description |
|---|---|---|
| **Core Workflow** | Specifications Agent | Conversational AI that converts user intent into structured, versioned specifications |
|  | Development Canvas | Live 3-panel workspace (chat, code, preview) for building and iterating applications |
|  | Artifacts & Lineage | Versioned applications with full traceability from spec → build → deployment |
| **AI & Agents** | Multi-Agent System | Spec, Build, and Deployment agents working in a unified workflow |
|  | App-to-Agent Conversion | Every built app becomes a reusable, callable AI agent |
|  | Voice Interaction | Voice-enabled agents for hands-free querying and workflows |
| **Data & Skills Layer** | Proprietary APIs Integration | Native access to QDL, QML, Marketing analytics, and internal tools |
|  | Skill Auto-Discovery | Dynamic detection and integration of new skills via MCP |
|  | Role-Based Skill Access | Skills restricted by user role, ensuring compliance and segmentation |
| **Governance & Compliance** | Compliance Matrix | Automatic mapping of requirements (FR/NFR/AC) to implementation |
|  | Approval Workflows | Dual-gate approvals for specification and deployment |
|  | Audit & Lineage Tracking | Full history of edits, builds, deployments, and approvals |
| **Data & Infrastructure** | Data Lake Integration | Direct connection to Mars data ecosystem (Databricks, QDL, etc.) |
|  | PostgreSQL + pgvector | Unified storage for application state, vector search, and audit logs |
|  | Multi-LLM Support | Flexible integration with OpenAI, Azure OpenAI, Gemini, etc. |
| **User Environment** | Secure Workspaces | Per-user environments with SSO integration |
|  | Knowledge Base Uploads | Session-based document grounding (PDF, Excel, JSON, etc.) |
|  | Secret Vault | Secure handling of API keys and credentials |

---

## Slide 16 — Proof Point: FinIQ

**The first application built on the platform — already in front of Mars finance leadership.**

- **What it is**: a unified financial-analytics application for Mars Finance
  - Period-end summaries (PES) generated from Databricks
  - Competitive intelligence with cross-referenced internal + external data
  - Macro-economic enrichment via QDL (CPI, consumer confidence, commodity futures, FX)
  - Conversational query interface — both typed and voice
  - Job board for asynchronous analyst tasks
- **What it integrates**:
  - Databricks (production financial data, billions of rows)
  - QDL (macroeconomic, market, news)
  - FMP (competitor financials)
- **Build velocity**: approximately **2 weeks of focused development** vs. an 8–12 week traditional vendor cycle
- **Status**: deployed; demoed to Mars MLT; in active iteration with Finance SMEs

`[VISUAL: FinIQ screenshot — KPI dashboard, chat with macro narrative, or compare-to-Nestle view]`

---

## Slide 17 — Replication Roadmap

**Same playbook, multiple verticals — and each one accelerates the next.**

**Within Mars** — the platform is designed for portfolio replication:

| Domain | Candidate first application |
|---|---|
| Finance | FinIQ (built) |
| Marketing | Campaign performance + competitive intel |
| Supply Chain | Inventory + commodity exposure dashboards |
| Pet Care (R&D) | Diagnostic and clinical-data tools |
| HR / Talent | Workforce analytics |

**Beyond Mars** — when Mars chooses to license or syndicate:
- Same architecture, different domain skills
- Replication targets in CPG / consumer goods sector

`[VISUAL: small grid of mini-app icons — anomaly detection, auth, forecasting, marketing, supply-chain — pending mockup]`

**Replication isn't repetition — it's leverage.** The 5th application inherits the skills, agents, and patterns of every app shipped before. Each new vertical is faster than the last because the platform compounds with every build, not just repeats. Cross-cutting concerns (governance, deployment, identity, skills, agents) stay solved.

---

## Slide 18 — Architecture Overview

`[VISUAL: architecture diagram — services, data layer, integration points]`

**Three-service architecture:**

| Service | Role |
|---|---|
| **Frontend** | Modern React-based web UI; SSR; live-preview Canvas |
| **Backend** | Python-based application API; agent execution; skill orchestration |
| **Audio service** | Voice-mode agent for hands-free interaction (optional surface) |

**Data and persistence**:
- PostgreSQL with pgvector — vector search for RAG, all session and audit state
- Object storage for artifacts and uploads
- Skill packs: pluggable, versioned, auto-discovered

**Integration points**:
- Mars data lake (Databricks)
- Proprietary APIs (QDL, QML, Q Marketing) — accessed via the platform's pre-wired skill layer
- Existing Mars identity provider (Auth.js v5 → enterprise SSO)
- External data services (FMP, news, etc.) via skill-layer adapters
- LLM provider — abstracted through an adapter layer; supports OpenAI, Azure OpenAI, Gemini, and other enterprise providers

---

## Slide 19 — Deployment Options

`[VISUAL: side-by-side comparison diagram — pending mockup]`

Two paths, depending on Mars infrastructure readiness:

| | **Option A — Kubernetes (preferred)** | **Option B — Web-app pipeline (fallback)** |
|---|---|---|
| **Pattern** | Docker images → Azure Container Registry → pipeline → YAML manifests → K8s cluster | Existing Mars web-app deployment workflow |
| **Iteration speed** | Continuous artifact addition; dynamic provisioning | Slower; manual handoffs between teams |
| **Operational overhead** | Managed by platform team | Shared with Mars IT |
| **Recommended for** | Production scale, multiple applications | Initial deployment if K8s slot is not yet available |

Both paths use the same application code. Switching from Option B to Option A is a deployment-layer change, not a rewrite.

---

## Slide 20 — Authentication and API Key Strategy

**Mars sets the policy. The platform supports either approach.**

**User authentication**:
- Per-user identity, integrated with Mars's existing SSO and identity provider
- Sessions and audit logs tied to verified user IDs
- Standard role-based access at the data and skills layer

**LLM API key management** — two options:

| | **Centralized pool** | **Per-user keys** |
|---|---|---|
| **Pattern** | Mars maintains an enterprise key (or AI-foundry account); cost attributed by user ID or cost center | Each user provisions their own key; billed individually |
| **Benefits** | Predictable cost, easier governance | Hard cost ceiling per user, individual accountability |
| **Best for** | Most enterprise contexts | Specialized use cases or teams with dedicated AI budgets |

The platform supports both. Mars chooses based on internal IT and finance policy.

---

## Slide 21 — Commercial Model

**Three Ways to Engage with Amira**

**1. Platform License** — Own the foundation

- **$1,000,000 — Perpetual License**
- Optional Annual Maintenance Subscription
- Ongoing updates, security, new features

*Includes:* Full Amira platform (Spec → Build → Deploy), Agent framework + Canvas workspace, Governance, audit, and infrastructure layer

*Value:* Establishes a long-term internal AI application capability

**2. Skill Development** — Build Mars-specific intelligence

Custom skills developed and integrated into Amira:

| Tier | Price | Scope |
|---|---|---|
| **Small** | $25K | Lightweight integrations, APIs, simple transformations |
| **Medium** | $50K | Multi-step workflows, domain analytics modules |
| **Large** | $100K | Advanced systems, ML models, optimization engines |

*Value:* Encodes proprietary knowledge into reusable building blocks across all applications

**3. Application APIs** — Access proven capabilities instantly

- **Custom Pricing** (based on scope & usage)
- API access to applications built on Amira (e.g., FinIQ)
- Integration into other Amira apps, external enterprise systems, and agent workflows

*Value:* Accelerates time-to-impact by reusing existing, production-tested intelligence

**Compounding Model: Platform → Skills → Applications**

Each layer reinforces the next:
- Skills enhance every build
- Applications become reusable services
- The platform grows more valuable with each investment

---

## Slide 22 — Phase 2 Scope

**Six tracks, sequenced for delivery within 4 weeks of platform deployment.**

| # | Track | Deliverable |
|---|---|---|
| **0** | Platform deployment to Mars infrastructure (prerequisite) | Amira running in Mars Azure, integrated with identity, network whitelisting complete |
| **1** | Row-level security validation | Verified behavior for users with restricted access by geography, BU, or hierarchy |
| **2** | Specification phase production-readiness | Spec Agent operational end-to-end on the platform |
| **3** | Functional correctness validation with Finance SME | FinIQ outputs verified against Finance ground truth |
| **4** | Stack-ranked enhancement delivery | Top-3 from: UI/UX, charting, anomaly detection, forecasting integration, presentation generation |
| **5** | Knowledge grounding via Collibra / Master Data | Mars-specific terminology (financial periods, hierarchies) understood natively |
| **6** | New Finance use case (SME-led) | Net-new application built on the platform by a Mars Finance team |

The first three tracks are gated by platform deployment and run sequentially-ish. Tracks 4–6 run in parallel once the platform is live.

---

## Slide 23 — Asks

**What we need from Mars to start Phase 2:**

1. **Commitment to the 4-week initial phase** — kickoff date, executive sponsor, weekly review cadence
2. **Kubernetes deployment slot** in the Mars Azure environment, with networking and security whitelisting submitted **comprehensively** (not piecemeal — this is the single biggest accelerant)
3. **Identity and SSO integration plan** — point of contact and integration window
4. **Authentication and API key policy decision** — centralized or per-user (Slide 20)
5. **License model preference** — perpetual or maintenance subscription (Slide 21)
6. **Finance / business SME engagement** — named individual, dedicated time per week, for functional validation (Track 3)
7. **Collibra / Master Data point of contact** for knowledge grounding (Track 5)

---

## Slide 24 — Closing

**Amira: build with your data, your skills, your governance.**

- Specifications that capture intent, not assumptions
- Builds that are auditable end-to-end
- Deployments that respect Mars policy
- Skills that compound across every new application

> Phase 2 turns the platform from a working demo into a production capability that Mars associates use weekly.

`[VISUAL: closing graphic / Amira logo / Phase 2 timeline summary]`
