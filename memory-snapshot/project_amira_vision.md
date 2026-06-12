---
name: Amira platform vision — 3-agent pipeline (canonical as of 2026-04-24)
description: The 2026-04-24 team call locked Amira's canonical architecture as a 3-agent sequential-but-reversible pipeline (Spec → Build → Deploy). Canvas (Build Agent) is operational. The earlier "4-layer model" was an organizational mental model and is superseded by this concrete product architecture. 4-layer framing kept at the bottom for historical reference.
type: project
originSessionId: 38239999-13da-4c2d-958c-740f1912cf1c
---

## Canonical architecture LOCKED (2026-04-29)

Cesar shipped the full architecture spec on 2026-04-29 (`amira-architecture_v2.html`, 15 sections, 3,038 lines + executive PNG). The 3-agent pipeline framing in this memory is now backed by a complete component inventory + decision-ID-traceable architecture.

**Full build-ready reference**: [project_amira_architecture_canonical.md](project_amira_architecture_canonical.md). When implementing platform components, that memory is the operational reference; this memory remains the strategic / vision framing.

**What the architecture spec confirms about the 3-agent pipeline**:
- Sequential-but-reversible verbatim — user can return from Canvas to Spec; new spec version triggers rebuild.
- Each phase is its own DBOS workflow (ORCH-2). Hand-off via durable signal with envelope binding (RUNTIME-7): frozen spec hash + signed approval ID + lockfile hash.
- Companion driver is the 4th runtime — synthesized from spec FRs (NL tool descriptions) + ACs (smoke tests), registered at tier `deployment-proprietary`, locked one-to-one with build version (AGENT-1).
- Deployment uses Helm + Argo Rollouts BlueGreen with `prePromotionAnalysis` running AC-runner literally executing the spec's ACs as smoke tests against the new ReplicaSet (DEPLOY-6).

The substrate question for the 3-layer knowledge model (per-user / per-project / per-company) — see below — is NOT addressed in v1 of the arch spec. pgvector is the v1 substrate inside the same Postgres family; graph topology / separate KB store is open and lands in batch 4+.

---

## 3-layer knowledge model (added 2026-04-27)

Cesar's framing during the 2026-04-27 architecture conversation, accepted by the team:

| Layer | Scope | Reference analogue |
|---|---|---|
| **Per-user** | Your sessions, your indices, your private brain | Cursor (all local) |
| **Per-project** | Knowledge shared within one project's context, multi-collaborator | Replit (project sharing) |
| **Per-company** | Centralized, organization-wide knowledge that grows as everyone builds. Karpathy graph approach. | The new layer Cesar wants to add |

**Governance requirement** (Ale, 2026-04-27): the layers connect via an explicit promotion flow with approval chains, secret-scrubbing, and privacy filters. *"Otherwise the platform will become a nightmare to manage."*

**Substrate decision OPEN**: graph topology layer over the existing pgvector store, OR a separate knowledge-graph store layered alongside. Pending Cesar's call.

Full conversation context: [project_knowledge_layers.md](project_knowledge_layers.md).

This 3-layer knowledge model is **complementary** to the 3-agent pipeline below (which is about the build pipeline structure). Together they form the platform's two organizing dimensions:
- **Agents (workflow dimension)**: Spec → Build → Deploy
- **Knowledge (data dimension)**: User → Project → Company

## Canonical architecture as of 2026-04-24 — 3-agent pipeline

The 2026-04-24 team call locked this as Amira's product architecture. Everything in this memory below it remains useful historical context, but the 3-agent pipeline is the shape Cesar is building and the shape Monday's commercial proposal pitches.

### The three agents (sequential but reversible)

| # | Agent | Role | Implementation state (as of 2026-04-27 evening) |
|---|---|---|---|
| **1** | **Spec Creation Agent** | Elicitation → structured IEEE 830 specification | **BUILT (phases 1.0–1.5 of batch 1).** `feat/batch1-foundation-spec-agent` PR #1. ClaudeSDKClient + `spec_mcp.py` with 12 MCP-wired tools, SSE turn endpoint, IEEE markdown renderer, self-check evaluator, Spec/Canvas/Artifacts/Chat 4-tab UI, right-edge dock for Tracker/Skills/KB. Direct verbatim implementation of v0.6 doc. **Phase 1.6 (Lock + handoff Artifact contract) in progress.** |
| **2** | **Build Agent (Canvas)** | Consumes spec → builds the app in a sandboxed canvas view with live code preview. Emits a compliance matrix showing how well the build adheres to the spec. | **Pre-pivot Canvas demo'd 2026-04-24.** That Canvas is being rebuilt as the full Replit-style IDE in **batch 2** alongside E2B sandbox + multi-file projects. Phase 1.6's handoff Artifact contract is what batch 2's new Canvas consumes. |
| **3** | **Deployment Agent** | Ships built artifact → Azure repo → pipeline → YAML → Docker → Kubernetes (preferred) or web-app fallback | **Batch 3.** K8s preview infra (`kubernetes-sigs/agent-sandbox` CRD + Gateway API + Helm-chart-per-app). Promotes locked artifact to `*.preview.amira.ai`. Two deployment proposals (K8s + web fallback) drafted for Monday's commercial pitch. |

### Reversibility — the key architectural insight

At any point during build or deploy, the user can return to the Spec Agent to revise the specification. This creates a **new spec version** (not a destructive overwrite) and triggers a rebuild or incremental iteration. Versions are tracked in the platform's Artifacts tab alongside built app versions.

This reversibility powers the Spec Agent's learning loop:
- Compliance matrix from Canvas → becomes outcome metadata for Spec Agent
- Inter-version diffs on spec edits → mined for Layer 5 rule extraction (§11.2 in design doc)
- Every Canvas-to-Spec edit is a tracked version, never overwrite

### User-viewing modes inherited from Canvas

- **Technical mode** — logs, code, internal representation debug view (for developers, platform engineers)
- **Business mode** — rendered spec, compliance matrix, requirements-met summary (for SMEs, approvers)

Any role can switch between them. Business mode is default for approvers.

### Platform tabs (3-tab UI)

- **Spec tab** — Spec Agent's surface
- **Canvas** — Build Agent's surface (sandboxed live-preview)
- **Artifacts** — versions, lineage, export/deploy

### Skills directory as spec INPUT (Rajiv's framing)

Registered skills (macro-data access, charting, presentation-gen, SQL-to-warehouse connectors, domain services) are browseable during elicitation. User **references** skills by name in the spec. Build Agent creates a hidden developer "Build Plan" that binds specific implementations. Matters for role-based security (finance user vs marketing user may see different skills).

### Output format: IEEE 830 primary

Locked by team decision 2026-04-24. OpenSpec dropped to adapter backlog. Rationale: decades of enterprise familiarity, stakeholder-neutral, parseable by Build Agent.

### Commercial framing

Ale's tagline (locked for Monday proposal): *"Financial Replit backed by our data sources."* Differentiation = custom-for-Mars + in-Mars-environment + role-based skills + data-moat. Replication targets: Hershey, Campbell Soup, PepsiCo.

### Canonical reference

Full details: [project_spec_agent_design_doc.md](project_spec_agent_design_doc.md) and the shipped `D:/Amira FinIQ/SPEC_AGENT_DESIGN.md` + `.docx` (v0.6).

---

## Historical framing (2026-04-15 — pre-3-agent-lock)

The text below describes the 4-layer conceptual model used before the 2026-04-24 call locked the product architecture. Still useful for understanding where each layer sits (L0 comms, L1 runtime, L2 bot internals, L3 elicitation), but the 3-agent pipeline above is the current canonical frame.

## Amira — origins and current shape (revised 2026-04-15)

**Bill built Amira originally** as a desktop app — a communication fabric where bots could come and talk to the user. First version was literally just "Amira" (Bill's bot) answering based on her knowledge. That's the heart of the platform: **bot-to-bot and bot-to-user communication**.

**Cesar has been extending it** with a modern runtime: FastAPI backend + Next.js frontend + multi-tenancy + persistent skills layer + Kanban-style task management + Docker. Possibly using Claude Code under the hood for Amira's own reasoning. Framework choices at Cesar's runtime layer are not yet confirmed — need to see his repo.

**Bill's current Amira Meet Desktop** (learned 2026-04-15 via read-only clone): bespoke Node.js (ESM) + OpenAI Realtime + Python + vanilla HTML + Electron. NO agent framework (no CrewAI, no LangChain, no ADK). Monolithic multi-agent via custom `ToolRegistry` — **NOT A2A-native yet**. See `project_bill_amira_architecture.md` for full details.

## Rajiv's framing

*"What we are building for Mars is two things: 1) a machine (FinIQ app) and 2) a machine that builds this machine — Amira."*

## Four-layer model (revised with Bill's origin)

| Layer | Concern | Owner |
|---|---|---|
| **L0 — Communication fabric** | Bot registry, capability discovery, message routing, protocol choice | **Bill** |
| **L1 — Runtime / hosting** | Where bots run, multi-tenancy, observability, UI | **Cesar** |
| **L2 — Bot / agent internals** | Framework, LLM, orchestration pattern inside each bot | Bot author (e.g., Farzaneh for FinIQ) |
| **L3 — Elicitation / spec** | Talk to user, produce OpenSpec-format specs, hand to build orchestrator | **Farzaneh + team (proposed)** |

**Key principle**: L0 must be standardized (A2A protocol at the edge — non-negotiable). L2 is bot-author's choice (framework-agnostic). L1 supports multiple options (Cesar's runtime + Vertex AI Agent Engine).

## A2A — the protocol, not a framework

A2A is the Google-led wire protocol for agent-to-agent communication. v0.3 shipped with gRPC, signed security cards. **150+ enterprises have adopted** including SAP (built into Joule), Zoom, all major hyperscalers. It's becoming the standard.

Every Amira bot must:
1. Expose an **agent card** (JSON capability description)
2. Have a **receive endpoint**
3. Declare a **capability schema**

Then it's A2A-addressable. "Bot" and "agent" are interchangeable here — the protocol doesn't care about the label. Bill's original "bots" = what A2A calls "agents."

## Mini-apps (current + future)

- **FinIQ** — financial analytics. BUILT, MLT demo April 21.
- Supply chain — logistics, inventory (future)
- Health data — pet care scans, dental (Martin's prototype exists)
- Marketing analytics — campaign performance (future)
- Forecasting — budget projections (future)

Inter-app example: *"How is Petcare doing this quarter?"* → platform fans out to FinIQ (financials) + Forecasting (Q3 projection) + Supply Chain (cocoa risk) + Marketing (campaign perf) + QML (macro). Composes one narrative. This is the A2A payoff — no single app could produce that answer alone.

## ROI story for April 21

- Previous internal builds took ~12 weeks
- FinIQ built in under 2 weeks (manually orchestrated)
- Platform replicates the pattern; with OpenSpec Agent + A2A, the factory scales
- Pitch: *"We didn't just build an app — we built a platform that builds apps."*
- Google-alignment angle: *"Built on your stack. Gemini for new bots, A2A for comms, Vertex AI Agent Engine for hosting, registered into Gemini Enterprise as the front door."*

## What's still unknown

- Cesar's Amira platform repo and current framework choices at L1 (need repo URL from Cesar or Bill)
- Bill's original comms protocol — is it custom or already A2A-adjacent?
- A2A vs MCP formal decision — both apply at different scopes (A2A = inter-agent, MCP = tool exposure)

## Why this matters

Every future conversation about Amira should use the four-layer model and the Bill-vs-Cesar ownership split. Don't conflate "Amira the platform" with "Amira (Bill's original bot)" or with "FinIQ (one app inside Amira)." Terminology discipline helps when talking to Mars.
