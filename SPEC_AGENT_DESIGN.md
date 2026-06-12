# Spec Agent — Design Document

**Version**: 0.6 draft
**Status**: FOR TEAM REVIEW — not approved for build
**Audience**: Internal engineering team / platform owners / decision-makers
**Approval gate**: No code until team signs off on scope, architecture, and Phase 1 MVP requirements

**Change log**:
- **v0.6** — Integrates platform decisions from team review. Spec Agent is now framed as **Component #1 of the platform's canonical 3-agent pipeline** (Spec → Build → Deploy). The Build Agent (Canvas) and the Deployment Agent are already built and operational on the platform. IEEE 830 is locked as the primary output format; OpenSpec is deprioritized to backlog. Added requirements for skills-directory integration, user knowledge-base upload, versioning via back-to-Spec flow from Canvas, and compliance-matrix handoff to the Build Agent. Platform Integration section (§14) substantially simplified — the integration contract is now concrete, not a set of known unknowns.
- **v0.5** — Initial draft for team review.

---

## 1. Executive Summary

### 1.1 What this document proposes
A **Spec Agent** whose single responsibility is to take a user's vague description of an app idea and produce a structured, builder-ready specification document. The specification is comprehensive enough that a downstream builder agent can begin implementation without further human clarification.

### 1.2 Why now
Spec-driven development is a practical requirement for GenAI-driven software delivery. When outcomes, rules, and behaviours are not specified upfront, builder agents drift. When they are specified — explicitly and testably — implementation becomes reliable, auditable, and repeatable.

The Spec Agent is the primitive that closes the gap between a vague product idea and an implementation-ready specification. It is **Component #1 of the platform's canonical 3-agent pipeline** (Spec → Build → Deploy). Components #2 (Build Agent / Canvas) and #3 (Deployment Agent) are already built and operational on the platform. This document covers only Component #1. Its output — a structured IEEE 830 specification — is consumed directly by the Build Agent.

### 1.3 What this document is
A comprehensive design for team review. It covers:
- Scope, non-goals, user roles
- Architecture (conceptual + Phase 1 concrete)
- Framework and stack decisions with alternatives considered
- Core mechanics (adaptive elicitation, propose-alternatives at decision points, two-pass synthesis)
- Output format strategy (adapter layer)
- Knowledge and continuous-learning architecture (how the agent compounds in value over time)
- Phase 1 MVP requirements at the detail level a builder needs
- Phased roadmap (MVP → RAG → platform integration → compliance handoff)
- Open questions requiring team input
- Quantitative success criteria
- Risks and mitigations

### 1.4 What this document is NOT
- A commercial proposal
- A formal IEEE 830 SRS or OpenSpec deliverable (Section 12 details the Phase 1 MVP, but this document itself is a design narrative)
- Approval to start building

### 1.5 Effort estimate
- **POC** (conversation + OpenSpec emitter + local testing): 1–2 weeks
- **Demo-scoped MVP** (working end-to-end demonstration): 2–3 weeks
- **Production-ready platform component** (integrated, multi-tenant, session-persistent, compliance handoff, polish): 4–6 weeks
- Dogfood iteration: continuous thereafter

---

## 2. Motivation

### 2.1 The problem

Users describe software in vague, goal-oriented language. Builder agents require much more precision: actors, scope, workflows, functional and non-functional requirements, edge cases, data and integration requirements, and explicit boundaries.

Today, the gap between idea and implementation is filled by:
- Ad-hoc prompting
- Inconsistent requirements
- Guesswork
- Missing edge cases
- Undocumented assumptions

This produces several failure modes:
- Wrong product gets built
- Partially correct but incomplete product
- Silent assumptions that surface as defects
- Review is harder because intent is unclear

### 2.2 What structured spec authoring delivers

- Explicit functional and non-functional requirements
- Testable scenarios
- Explicit non-goals and scope boundaries
- Architecture decisions with alternatives considered
- Open questions surfaced rather than hidden
- Reusability across similar products
- Auditable change history as the specification evolves

### 2.3 Relationship to the platform: the canonical 3-agent pipeline

The platform organises product delivery around three sequential agents:

1. **Spec Agent** (this document) — turns user intent into a structured IEEE 830 specification
2. **Build Agent (Canvas)** — reads the specification and builds the app inside a sandboxed canvas view with live code preview. Exposes both a code-visible "technical mode" and a compliance-matrix-visible "business mode" for different reviewer types.
3. **Deployment Agent** — ships the built artifact (Azure repo → pipeline → Docker → Kubernetes preferred, or web-app fallback). Targets the customer's managed environment.

The pipeline is **sequential but reversible**: at any point during build or deploy, the user can return to the Spec Agent to revise the specification, which creates a new version and triggers a rebuild or incremental iteration. Versions are tracked in the platform's Artifacts tab.

Components #2 and #3 are already built and operational. This document scopes only Component #1 — the Spec Agent — and the handoff contracts on either side of it.

### 2.4 Output format: IEEE 830 primary

IEEE 830 is the **primary output format** for the Spec Agent. It is the most broadly understood enterprise specification standard, has decades of history in stakeholder review and compliance contexts, and is readily parseable by the Build Agent (which consumes markdown).

The internal representation remains format-agnostic, and the output adapter layer (Section 9) retains support for alternative formats (markdown, JSON). [OpenSpec](https://github.com/Fission-AI/OpenSpec) is recorded as a candidate secondary format in the adapter backlog but is not part of Phase 1 MVP — the team has prioritised IEEE for the near term and does not want the product bound to OpenSpec.

---

## 3. Product Scope

### 3.1 What the Spec Agent IS

- **Component #1** of the platform's 3-agent pipeline (Spec → Build → Deploy)
- A **conversational elicitation agent** that takes vague product ideas and produces structured specifications
- A **product-structuring tool** that identifies actors, workflows, data needs, integrations, constraints, non-goals, and open questions
- A **spec-authoring engine** that emits specs in IEEE 830 format by default, with secondary adapters for single-doc markdown, JSON schema, and (backlog) OpenSpec folders
- A **skills-directory-aware agent** that presents the user with the platform's available skills (e.g. macro-data access, presentation generation, visualisation libraries) during elicitation so the spec references capabilities rather than restating them
- A **handoff layer** between human intent and the Build Agent (Canvas)

### 3.2 What the Spec Agent is NOT

- **Not the builder.** It emits specifications, not code. Canvas (Component #2) builds.
- **Not the deployer.** The Deployment Agent (Component #3) deploys.
- **Not a product owner.** It helps articulate what the user wants; it does not decide what the user should want.
- **Not an autonomous approver.** Every specification requires human approval before Build Agent handoff.
- **Not a generic chatbot.** It is specialized in spec authoring. It does not answer trivia, write marketing copy, or draft emails.
- **Not a compliance verifier.** Verifying that the built product matches the specification is the Build Agent's compliance-matrix output, not a Spec Agent responsibility.
- **Not the runtime / host infrastructure.** Multi-tenancy, auth, bot registration, and the Control Center task queue are platform-level concerns; the Spec Agent inherits them.
- **Not responsible for binding skills to the build.** The user *references* skills during elicitation; the Build Agent produces a hidden developer "Build Plan" that binds specific skill implementations.

### 3.3 Hard rules for the build

1. **Narrow scope.** The agent writes specifications. It does not code, deploy, verify, or advise on product strategy.
2. **Preserve alternatives at decision points.** At architectural decision points, propose 2–3 alternatives with trade-offs. Do not silently converge on one answer.
3. **IEEE 830 primary; adapter-pluggable for the rest.** The internal representation is format-agnostic. IEEE is the default emitter; markdown and JSON are adapter-level additions; OpenSpec remains in the adapter backlog.
4. **Framework-adapter discipline.** Conversation logic is decoupled from the underlying agent framework. A framework swap must be adapter-level, not a rewrite.
5. **Dogfood first.** The team uses the Spec Agent to specify its own next components before external-facing use.
6. **Versioning is first-class.** Every edit triggered from Canvas (Build Agent) back into the Spec Agent creates a new, tracked version — not a destructive overwrite. Versions are retained in the Artifacts tab for audit and rollback.

---

## 4. Users and Roles

| Role | Permissions | Primary actions |
|---|---|---|
| **Requester** | Submit an app idea, answer clarifying questions | Starts a session with a natural-language description |
| **Spec Author** | Iterate on the generated specification with the agent | Reviews draft, requests edits, adds context, refines scope |
| **Reviewer** | Comment on a specification in review state | Inline comments, approve/reject a section |
| **Approver** | Approve a specification for Build Agent handoff | Sign-off action; triggers handoff state |
| **Admin** | Configure templates, patterns, thresholds, output formats, integrations | Manages knowledge layer and output adapter configuration |

In Phase 1 MVP, a single user can play all five roles. Multi-user workflows land in Phase 2+.

### 4.1 User-viewing modes (inherited from the Build Agent / Canvas)

Within the platform, Canvas surfaces two visibility modes that also apply to the Spec Agent's review surfaces. These are display modes, not roles — any role can switch between them.

| Mode | Audience | What is shown |
|---|---|---|
| **Technical mode** | Developers, platform engineers | Raw specification markdown, agent reasoning traces, token/cost telemetry, internal representation debug view, adapter-layer output previews |
| **Business mode** | SMEs, approvers, stakeholders | Rendered IEEE 830 document view, side-by-side compliance matrix once the Build Agent has run, summary of requirements met / new functionality added, versions history |

Business mode is the default for Approvers. Technical mode is the default for Admins and for dogfood sessions.

---

## 5. Core User Flow

```
┌─────────────────────┐
│ 1. User provides    │  "I want a dashboard that tracks X across Y and alerts on Z."
│    initial idea     │  (optionally attaches knowledge-base files; selects scope)
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 2. Agent classifies │  Intent type: dashboard | pipeline | agent | report-generator |
│    + probes gaps    │  net-new-workflow. Select template. Identify top gaps.
│    + surfaces skills│  Presents the platform's skills directory (e.g. macro-data,
│                     │  presentation-gen, visualisation) for user reference.
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 3. Clarification    │  ≤ N targeted questions (N = turn budget per mode).
│    loop             │  At decision points: propose alternatives, not one answer.
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 4. Intent structure │  Internal representation: actors, workflows, data,
│    (internal)       │  integrations, NFRs, scope, non-goals, open questions,
│                     │  referenced-skills list.
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 5. Spec synthesis   │  Two-pass LLM:
│                     │    a) Structure → internal spec object
│                     │    b) Render → IEEE 830 (default) + optional formats
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 6. Review           │  User reads draft. Agent flags weak/under-specified sections
│                     │  explicitly. User requests edits. Agent preserves structure.
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 7. Approval         │  Human approver signs off. Spec transitions: draft → approved.
└──────────┬──────────┘
           ▼
┌─────────────────────┐
│ 8. Handoff to Build │  Export build-ready package (IEEE 830 spec + referenced
│    Agent (Canvas)   │  skills list + metadata + open-questions audit) to Canvas.
└──────────┬──────────┘
           │
           │  ◄── Reverse arrow: from Canvas or Deployment Agent, the user may return
           │      to Step 2/6 at any time. Revisiting creates a new SPEC VERSION
           │      (not an overwrite) and triggers rebuild or incremental iteration.
           ▼
┌─────────────────────┐
│ 9. Build + compliance│ Build Agent runs. Emits a compliance matrix: how well the
│    matrix            │ built app satisfies each FR / NFR / AC. Matrix feeds back
│                      │ into Spec Agent's learning layer (§11) as outcome metadata.
└─────────────────────┘
```

**Key principles**:
1. The agent reduces ambiguity *before* implementation begins. It does not start building. It does not pick the best idea for the user.
2. The pipeline is **reversible** — edits from Canvas always re-enter via the Spec Agent, never by in-place mutation of a locked spec. This preserves lineage and powers the learning loop.

---

## 6. Architecture Overview

### 6.1 Conceptual layers

```
┌───────────────────────────────────────────────────────────────────┐
│                      USER INTERFACE LAYER                          │
│  CLI (Phase 1) | Web UI (Phase 2) | Platform Spec tab (Phase 3+) │
└───────────────────────────┬───────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│                   CONVERSATION / SESSION LAYER                     │
│  Multi-turn chat, turn budget, mode selection, version history     │
│  Skills-directory browsing • Knowledge-base file upload            │
└───────────────────────────┬───────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│                    SPEC ENGINE (CORE LOGIC)                        │
│  ┌────────────────┐ ┌───────────────┐ ┌────────────────────────┐  │
│  │ Intent         │ │ Gap           │ │ Alternative-proposer   │  │
│  │ Classifier     │ │ Detector      │ │ (at decision points)   │  │
│  └────────────────┘ └───────────────┘ └────────────────────────┘  │
│  ┌────────────────┐ ┌───────────────────────────────────────────┐ │
│  │ Skills         │ │ Spec Synthesizer (two-pass LLM)            │ │
│  │ Reference      │ │  Pass 1: structure → internal repr         │ │
│  │ Resolver       │ │  Pass 2: render → output format(s)         │ │
│  └────────────────┘ └───────────────────────────────────────────┘ │
└───────────────────────────┬───────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│                     KNOWLEDGE LAYER                                │
│  Platform-wide: skills directory (macro data, charting, etc.)      │
│  User-scoped: uploaded files (individual or shared knowledge base) │
│  Phase 1: hand-curated seed specs + pattern templates              │
│  Phase 2: RAG-indexed vector store of past approved specs          │
│  Phase 3: learning loop from compliance matrices (Canvas output)   │
└───────────────────────────┬───────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│                   OUTPUT ADAPTER LAYER                             │
│  IEEE 830 Word/MD (primary) | single-doc MD | JSON schema         │
│  OpenSpec folders (adapter backlog)                                │
│  (One internal representation → N emitters)                        │
└───────────────────────────┬───────────────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────────┐
│                    HANDOFF / EXPORT LAYER                          │
│  Build-ready package: IEEE spec + referenced-skills list +         │
│  knowledge-base pointers + open-questions audit + version id       │
└───────────────────────────┬───────────────────────────────────────┘
                            │
                            ▼   (handoff to Build Agent / Canvas)
                   ═══════════════════════════
                    BUILD AGENT (Component #2)
                     Agentic code-generation
                     engine; emits code +
                     compliance matrix
                   ═══════════════════════════
                            │
                            ▼   (feedback path)
               Compliance matrix + user edits from Canvas
               re-enter the Spec Agent as a new SPEC VERSION
```

### 6.2 Data flow

1. User input (+ optional file uploads, + optional skills references) → Conversation Layer persists as session state
2. Session state → Spec Engine reads current intent + conversation history + skills references
3. Spec Engine ↔ Knowledge Layer for template selection, skills resolution, and RAG retrieval (Phase 2+)
4. Spec Engine produces internal structured representation of the specification
5. Output Adapter Layer renders internal representation → chosen format(s), IEEE 830 by default
6. Handoff Layer packages the specification + referenced-skills list + knowledge-base pointers + metadata for the Build Agent
7. Build Agent (Canvas) consumes the package, generates the app, and emits a compliance matrix
8. Compliance matrix + any user edits requested from Canvas re-enter the Spec Agent, creating a new spec version (§11)

### 6.3 Separation of concerns

| Layer | Knows about | Does NOT know about |
|---|---|---|
| UI | User input events | LLM providers, output format internals, spec engine types |
| Conversation | Session state, turn budget, versions | How specs are generated |
| Spec Engine | Intent extraction, spec synthesis, skills resolution | UI, output file formats, Build Agent internals |
| Knowledge | Past specs, patterns, skills directory, user uploads | Current session |
| Output Adapter | Target format mechanics (IEEE / MD / JSON) | LLM, conversation |
| Handoff | Package structure for the Build Agent | Build Agent internals (Canvas is a black box) |

This separation is what makes the framework-adapter and output-format-adapter disciplines enforceable. The Spec Agent treats Canvas as a black box: it produces a spec and a handoff package, and receives a compliance matrix + optional edit requests back. It does not reach into Canvas.

---

## 7. Framework and Stack Decisions

### 7.1 Primary framework: **Pydantic AI**

Recommended for the Spec Engine and agent orchestration.

**Reasons**:
1. **Production experience in the organization.** Existing agent systems use it, so debugging experience is available.
2. **Type-safe structured output is the core value.** The Spec Agent emits structured specifications, not prose. Pydantic models for internal representation + Pydantic AI for type-safe LLM calls matches the product's nature.
3. **FastAPI-native.** The platform runtime is FastAPI. Framework alignment at integration time.
4. **Async-first.** Fits multi-user session handling at scale.
5. **Split-of-concerns with the Build Agent is clean.** The Build Agent (Canvas) is built on an agentic code-generation engine, which is the right tool for iterative build work. Pydantic AI is the right tool for structured, deterministic elicitation. Two different jobs, two appropriate frameworks, cleanly separated by the handoff contract. The Spec Agent does not need to know how the Build Agent is implemented, and vice versa.

### 7.2 Alternatives considered

| Framework | Verdict | Rationale |
|---|---|---|
| **OpenAI Agents SDK** | Strong fallback | Production-grade, but no production experience yet internally |
| Provider-bound agent SDKs | Not viable as primary | Limit cross-provider portability for enterprise targets |
| **Google ADK v1.0** | Good Phase 3+ option | Matches clients with Google preference, but zero team experience; learning curve too expensive for initial phases |
| **LangGraph** | Overkill | Most powerful for complex graphs; Spec Agent's flow is linear enough that the complexity is not justified |
| **CrewAI** | Wrong shape | Role-based multi-agent framework; Spec Agent is one agent with a clarification loop |

### 7.3 LLM choice

| Pass | Model (primary) | Why |
|---|---|---|
| Pass 1 — Clarification / intent extraction | `gpt-5.4-mini` via OpenAI | Cheap, fast, disciplined with structured output prompts |
| Pass 2 — Spec synthesis | `gpt-5.4` via OpenAI | Higher-quality long-form structured generation |

Both routed through an **LLM adapter layer** so that provider swaps (Azure OpenAI for enterprise deployments, Gemini for Google-preferring clients, other providers as needed) are configuration changes, not code rewrites.

### 7.4 Data layer

- **Postgres** — session state, spec versions, approvals, audit log
- **Redis** (optional) — clarification-in-progress ephemeral state, LLM response caching, hot template lookups
- **Filesystem / git** — specification artifacts themselves (markdown / OpenSpec folders) version-controlled in git, mirroring OpenSpec's native storage model

### 7.5 Interface layers (phased)

| Phase | Interface |
|---|---|
| **Phase 1 MVP** | CLI with interactive prompt, or simple single-page web UI (React + Vite) |
| **Phase 2** | Polished web UI with revision history and inline editing |
| **Phase 3** | Platform-embedded surface (registered component, multi-tenant, shared auth) |

### 7.6 Deployment

- **Phase 1 MVP**: runs locally (for internal dogfood), or as a standalone container
- **Phase 2+**: deploys onto the platform as the Spec tab / skill. Target infrastructure follows the platform's **Kubernetes-preferred** deployment convention (Docker image → Azure repo → pipeline → YAML manifests → K8s cluster). A web-app fallback deployment path exists for environments where K8s is not yet available, at the cost of additional build/debug overhead.

---

## 8. Core Mechanics

This section describes the non-obvious logic that separates a good Spec Agent from a template filler.

### 8.1 Adaptive elicitation

Not every idea requires the same depth of questioning. The agent operates in one of three **modes**, user-selectable at session start:

| Mode | Turn budget | Behavior |
|---|---|---|
| **Express** | ≤ 3 clarifying questions | Agent asks only the top-3 critical gaps, generates a draft, flags remaining open questions rather than asking them. Fast path for experienced users. |
| **Full** | ≤ 8 clarifying questions | Agent asks through architectural decision points, surfaces alternatives, produces a specification with fewer open questions but higher upfront time. Default for external-facing work. |
| **Generate-then-review** | 0 questions upfront | Agent generates a best-guess draft based solely on initial input, heavily annotated with assumptions. User edits the draft directly. |

Mode is declared on session start; user may switch mid-session at the cost of regenerating.

### 8.2 Gap detection

Before asking clarifying questions, the agent runs a **gap detector** over the user's initial input:

- **Actor gaps** — who uses it? Single-user? Multi-user? Role-differentiated?
- **Scope gaps** — what is in vs out? (The single biggest source of drift.)
- **Data gaps** — what data does it consume and produce?
- **Integration gaps** — what external systems?
- **Scale gaps** — how many users, records, events?
- **Security gaps** — authentication? Authorization? Sensitivity classification?
- **Success gaps** — how do we know it works?

Each gap is scored for criticality. The agent asks clarifying questions ranked by criticality × mode budget. Unasked gaps appear verbatim in the "Open Questions" section of the final specification — explicit, not hidden.

### 8.3 Propose-alternatives at decision points

When the conversation reaches an architectural decision point, the agent does NOT silently pick one path. It surfaces 2–3 alternatives with trade-offs:

> **Example decision point**: "Do you want real-time updates or batch refreshes?"
>
> **Agent proposes**:
> - **A) Real-time (WebSocket/SSE)** — pro: always current; con: infrastructure cost, connection management
> - **B) Polling (every 30s)** — pro: simple; con: stale data up to 30s
> - **C) Batch (hourly)** — pro: cheapest; con: stale data up to 1 hr, not suitable for alerting use cases
>
> **Agent recommends**: B for MVP, with an upgrade path to A if real-time becomes critical.

The user makes the call. The agent records the choice AND the alternatives considered in the specification's "Architecture Decisions" section so the builder sees both the decision and the rationale.

### 8.4 Two-pass synthesis

| Pass | Input | Output | Temperature |
|---|---|---|---|
| **Pass 1 — Structure** | Full conversation history + template | Internal spec object (Pydantic model) | 0 (deterministic) |
| **Pass 2 — Render** | Internal spec object + format target | Final spec in OpenSpec / markdown / Word / JSON | 0.2 (slight variation for prose quality) |

Rationale: Pass 1 is structured extraction — must be reliable and repeatable. Pass 2 is prose rendering — gets a small temperature for natural language quality.

This separation enables **regeneration of Pass 2 output without re-running Pass 1**: swap output format, re-render from the same internal spec object.

### 8.5 Anti-fatigue logic

Users quit if asked too many questions. Three safeguards:

1. **Turn budget per mode** — hard cap; the agent never exceeds it.
2. **Progress signaling** — each question shows "Question N of ≤ M" so the user knows the conversation has an end.
3. **"Good enough" stop criterion** — if the agent's self-check (8.7) scores the current draft above threshold, it stops asking and produces the draft.

### 8.6 Alternative-aware spec sections

The final specification includes sections that ensure the builder receives a complete picture:

- **Architecture Decisions (log)** — for each decision, the chosen path + alternatives considered + rationale
- **Open Questions (audit)** — every gap the agent did not resolve, with severity
- **Assumptions** — anything the agent inferred rather than asked about, flagged explicitly
- **Risks** — things that could go wrong during build or operation, with mitigations where known

These are what make a specification "builder-ready" vs "decorative".

### 8.7 Quality self-check

Before presenting the draft to the user, the agent runs a self-check:

- Does every functional requirement have a Given/When/Then scenario?
- Does every actor have at least one workflow?
- Is there an explicit non-goals section?
- Is there quantitative acceptance criteria (not "fast enough" → "p95 < 2s")?
- Are open questions flagged?
- Are assumptions marked?

Weak sections are flagged to the user before review: *"Section 9.3 has three functional requirements but only one scenario. Should I generate more scenarios, or is this fine?"*

---

## 9. Output Format Strategy

### 9.1 Adapter pattern

One internal specification representation → N emitters. Adding a new format is a new adapter, not a core rewrite.

```
Internal Spec (Pydantic) ──┬──► IEEE 830 (primary: Word .docx + mirror .md)
                           ├──► Single-doc markdown
                           ├──► JSON schema (machine-readable)
                           └──► OpenSpec folders (adapter backlog)
```

### 9.2 Primary format: IEEE 830

IEEE 830 is the primary output format, locked in by team decision.

**Why**:
- **Enterprise familiarity.** Decades of history in stakeholder review, audit, and compliance contexts. No training overhead for reviewers.
- **Stakeholder-neutral.** Works in technical and business contexts alike — appropriate for client-facing deliverables, internal review, and regulator conversations.
- **Structured enough for Build Agent consumption.** Canvas ingests markdown cleanly; IEEE 830 rendered as markdown gives both human readability and machine parseability.
- **Not bound to an emerging convention.** The team explicitly does not want the product coupled to OpenSpec commitment.

**Emit**: IEEE 830 is emitted as both Word (`.docx`) for stakeholder review AND markdown (`.md`) as the canonical form that Canvas consumes. The two are generated from the same internal spec object in a single Pass 2 render.

### 9.3 Secondary formats

| Format | Use case | Status |
|---|---|---|
| Single-doc markdown | Fast review; sharing in chat tools; short specs | Phase 1 |
| JSON schema | Machine-readable handoff to automated downstream tooling | Phase 2 |
| OpenSpec folders | Git-native delta workflow for teams that prefer it | Backlog (adapter layer retained but not shipped in Phase 1–2) |

### 9.4 Default behavior

- **MVP default**: IEEE 830 (Word + markdown, co-generated)
- **Build Agent handoff**: markdown mirror of the IEEE spec
- User can request additional formats at export time (JSON, OpenSpec — once the adapter is built)

### 9.5 Why retain the adapter even with IEEE locked

The adapter pattern is cheap insurance: if a client in a future engagement mandates a different format (e.g. a pharmaceutical client's regulatory template), adding that emitter is an adapter-level addition, not a rewrite. The adapter also keeps OpenSpec available as a future option without forcing a decision now.

---

## 10. Knowledge Layer

The knowledge layer has three sources: **platform-wide skills** (available to every Spec session), **user-scoped uploads** (files and data the user attaches to a specific session), and **spec corpus memory** (past approved specifications, growing over time). Each is scoped and governed differently.

### 10.1 Phase 1 MVP — Hand-curated seeds

Prompt-injected into Pass 2 synthesis for few-shot learning:

| Seed type | What it teaches |
|---|---|
| Representative high-quality SRS | Comprehensive IEEE 830 structure; functional requirements with scenarios; quantitative NFRs |
| Testing-oriented SRS with quantitative evaluation | Binary criteria; compliance framing |
| Build prompt template with compliance matrix | Dependency-ordered batches; compliance-checklist thinking |
| Counterexample (under-specified draft) | Teaches the agent what NOT to do when grounding is missing |

Small template library by intent type:
- Dashboard template
- Data pipeline template
- Agent template
- Report generator template
- Net-new-workflow template

Templates are skeletons, not filled specs — they shape the internal representation structure per intent type.

### 10.2 Phase 2 — RAG-indexed vector store

Once 10+ approved specifications accumulate, vectorize them and retrieve similar past specs at generation time. Adds:
- Better few-shot examples (retrieved per user query, not fixed)
- Cross-spec pattern detection ("three past specs for similar apps used X; here it is as a default")
- Reuse accelerator

### 10.3 Phase 3 — Learning loop

Approved and built specifications feed back into the knowledge layer with outcome metadata ("this spec produced a builder-successful app / required rework / caused a production bug"). Over time, the agent weights patterns by outcome, not just by similarity.

### 10.4 What the knowledge layer does NOT do

- Does not decide the user's product for them
- Does not auto-populate the current specification with retrieved content (retrieval only inspires / suggests)
- Does not leak cross-tenant specifications (multi-tenancy boundary enforced at retrieval time in Phase 3+)

See Section 11 for the full learning mechanism built on top of this knowledge architecture.

### 10.5 Skills directory integration (platform-wide)

The platform maintains a directory of registered skills — reusable capabilities such as macro-data access, presentation generation, charting libraries, SQL-to-warehouse connectors, and domain-specific services. The Spec Agent treats this directory as first-class **input** to the specification:

| Behaviour | Detail |
|---|---|
| **Browse during elicitation** | When the agent detects intent that could be served by existing skills (e.g. *"I want a dashboard with market data"*), it surfaces matching skills: *"Skill `macro_data_lookup` is available and could provide this — do you want to reference it?"* |
| **User references, agent records** | The user *references* a skill by name in the specification (e.g. FR-7: *"The system SHALL use the `macro_data_lookup` skill to retrieve CPI, unemployment, and interest rate data"*). The agent records the reference in the internal spec. |
| **Skill binding is NOT in the spec** | Which implementation of the skill runs, and how, is decided by the Build Agent's hidden developer plan — NOT by the Spec Agent. This separation matters for role-based security: if a finance user is restricted from a marketing skill, the Build Agent's plan resolution enforces the restriction. The spec remains portable across user-role contexts. |
| **Skills directory is admin-curated** | An Admin adds, deprecates, or updates skill descriptions in a central registry. Users see only skills their role can reference. |

This pattern ("reference, not bind") is what allows the same specification to be safely portable across user roles and across time as skills evolve.

### 10.6 User knowledge-base uploads (session-scoped)

Users may attach files and data to a session — example prompts, existing documents, reference data, Excel exports, PDFs, prior specifications. The Spec Agent embeds these into the session context for grounding.

| Scope | Visibility |
|---|---|
| **Private** | Uploaded files are visible only to the user's own sessions. Default. |
| **Shared** | Uploaded files are explicitly promoted by the owner to a shared namespace visible to selected teammates or to the whole organisation. Requires an explicit action. |

Uploaded files are NOT automatically added to the cross-session RAG corpus (§10.2). They are session-local grounding material. Moving upload content into the permanent corpus is a curation step, not automatic, to prevent corpus pollution (Risk R9, §16).

**Reference implementation**: uploaded files live in a session-scoped folder that the agent reads at context-assembly time. This mirrors the pattern Canvas uses for the same feature, keeping the platform consistent.

---

## 11. Learning and Continuous Improvement

A spec generation agent that produces the same quality of output on its first run as on its five-hundredth is a template filler. A good Spec Agent **compounds in value with use** — the 100th specification should be materially better than the 10th.

This section describes how learning is achieved **without model fine-tuning**. All mechanisms use retrieval, curation, and feedback loops — cheaper to operate, safer for enterprise governance, and explainable.

### 11.1 Why this matters strategically

- **Institutional memory is the moat.** A Spec Agent that has seen 100 real-world specifications will generate better specifications than one that has seen 10, regardless of the underlying LLM.
- **Compounding value.** Each specification authored adds to the retrieval corpus and (potentially) the curated patterns library. Quality improves without proportional engineering effort.
- **Defensibility.** A new competitor starting from scratch cannot replicate accumulated organizational knowledge in a short timeframe.

### 11.2 The six-layer learning stack

| # | Layer | Time horizon | Mechanism | Phase |
|---|---|---|---|---|
| **1** | Session memory | seconds–hours | Agent remembers conversation + partial specification across turns within one session | Phase 1 |
| **2** | Cross-session RAG | days–weeks | Vector-indexed past approved specifications retrieved by similarity at synthesis time | Phase 2 |
| **3** | Curated pattern library | weeks–months | Humans promote exceptionally good decisions, alternatives, and scenarios into a canonical pattern set, prompt-injected as few-shot examples | Phase 2 |
| **4** | Outcome-weighted retrieval | months | Each approved specification is tagged with outcome data (did the builder build it cleanly? did the user edit heavily? did the built product work?). Good-outcome specs weight higher in retrieval; bad-outcome specs flag for review | Phase 3+ |
| **5** | Explicit rule extraction | months | User edits to agent-generated specifications are diffed; recurring edit patterns become explicit system-prompt rules | Phase 3+ |
| **6** | Evaluation harness regression | continuous | Canonical seed queries (Appendix C) run on schedule; pass-rate drops trigger alerts; new failure modes added to the harness | Phase 2 onward |

### 11.3 Why fine-tuning is NOT used

1. **Governance** — training on client-specific data introduces IP and data-residency risk; most enterprise clients restrict weight-level customization.
2. **Frontier drift** — fine-tuned models fall behind as base models improve; each provider upgrade requires re-training or getting stuck on an older generation.
3. **Cost and latency** — RAG at inference time is cheaper to operate than training pipelines and faster to iterate when patterns change.
4. **Explainability** — RAG retrievals are inspectable (*"this past specification informed this generation"*); weight updates are opaque.

Everything the product needs is achievable with retrieval, curation, and prompt engineering. That is good news — it is cheaper, safer, and faster to improve.

### 11.4 Required instrumentation

Learning mechanisms 4–6 require outcome data to be captured continuously. This infrastructure must be designed from Phase 1 even if the feedback loops do not engage until Phase 3.

**Platform-native signals** — captured automatically once the Build Agent runs:

- **Build Agent feedback** — did the Build Agent complete the spec cleanly, or did it request clarification / raise compliance conflicts? Binary signal per specification.
- **Compliance matrix pass rate** — from Canvas's own output. Each FR/NFR/AC in the spec is scored against the built product by the Build Agent; the aggregated pass rate is persisted to the spec's outcome record.
- **Post-build stability** — did the built product operate without bugs over N days (captured via the Deployment Agent's telemetry, Phase 3+).

**Spec-Agent-native signals** — captured by this component directly:

- **User edit count** — how much did the human approver modify the draft before approval?
- **User satisfaction** — 1–5 rating collected at session end.
- **Version lineage** — how many versions did the spec go through before reaching "built and stable"? Each round-trip through the Build Agent and back creates a version; a spec that stabilises in 1 version is a stronger learning signal than one that requires 5.
- **Inter-version edit diff** — what specifically changed between version N and version N+1? Diffs are mined for Layer 5 rule extraction (§11.2).

The outcome metadata schema must be part of the Phase 1 MVP data model (Section 12.5), even if scoring and retention are Phase 2–3 concerns. Retrofitting instrumentation is significantly more expensive than designing it in from the start.

### 11.5 Governance requirements

Learning does not happen automatically — it requires lightweight ongoing human review:

- **Monthly pattern review** (≈ 30 minutes) — promote good decisions, alternatives, and scenarios into the curated library; flag bad patterns for removal.
- **Quarterly seed-spec refresh** — rotate or expand the curated seed set based on what the agent is being asked to produce.
- **Drift monitoring** — if the evaluation harness shows declining pass rates, investigate whether pollution (Risk R9 in Section 16) has entered the corpus.

This is approximately one engineer-day per month of ongoing investment. Skipping it means the agent stagnates — or worse, degrades.

### 11.6 Caveats and risks

- **Cold-start problem.** The first 10–20 specifications are generated by an agent that has not yet learned anything. Seed library quality dictates the early-use experience. Section 10.1 addresses this with hand-curated Phase 1 seeds.
- **Pattern drift and pollution.** If one poorly-structured specification enters the retrieval corpus, it can degrade future generations. Curation discipline is the mitigation; governance is the enforcement mechanism.
- **Tenant isolation in learning.** If the Spec Agent becomes multi-tenant, learning from one client's specifications must not bleed into another's. Tenant-scoped retrieval indices and per-tenant curated libraries are required from Phase 3 onward.
- **Instrumentation retrofit cost.** Capturing outcome metadata from Phase 1 is significantly cheaper than adding it later. Phase 1 data model (Section 12.5) therefore includes outcome fields even though they go unused in Phase 1.

### 11.7 Versioning IS the feedback loop

The "back to Spec" flow from Canvas is not a minor convenience — it is the main feedback loop, and it is why the pipeline is designed as reversible (§2.3, §5).

| Event | Spec Agent response |
|---|---|
| Build Agent emits a compliance matrix showing some FRs not met | Matrix is persisted to the spec's outcome record. If the user initiates a revision, the agent creates **Version N+1** of the spec, carrying the matrix as context: *"The prior build failed FR-3.2. What should change in the spec?"* |
| User, while reviewing the built app in Canvas, decides a feature is wrong | User triggers "edit spec" from Canvas. Agent creates **Version N+1** of the spec with the specific edit request captured. |
| Deployment fails because a non-functional requirement is under-specified | Deployment Agent records the failure mode. If the user revisits, the agent creates **Version N+1** and flags the previously-under-specified NFR. |

**Every Canvas-to-Spec edit is a new version, never an overwrite.** This makes lineage auditable (you can trace why a spec looks the way it does) and makes the inter-version diff available for rule extraction (Layer 5, §11.2).

Versions are stored in the platform's Artifacts tab alongside the built app versions, so a user inspecting an app can always see the chain of specs that produced it.

### 11.8 Success signal

The Spec Agent is learning successfully if:

- Mean user satisfaction (AC-8 in Section 12.3) trends upward over time, not flat or downward.
- Mean turn count required to reach an approved specification decreases as the corpus grows.
- Builder-confidence (AC-9) improves on specifications authored after Month 3 vs. Month 1.
- Evaluation harness pass rate remains at or above target thresholds as new seed queries are added.

If these signals flatten or decline, learning discipline has eroded somewhere — curation, governance, instrumentation, or corpus hygiene — and the team must intervene.

---

## 12. Phase 1 MVP — Detailed Specification

This section is detailed enough that a builder agent could start from it if the team approves.

### 12.1 Functional Requirements

**Intake**
- **FR-1**: The system SHALL accept a natural-language description of an app idea as free text input (plain text, up to 4000 characters).
- **FR-2**: The system SHALL classify the input into one of: `dashboard`, `data_pipeline`, `agent`, `report_generator`, `net_new_workflow`. Unclassifiable input triggers a clarifying question about product category.
- **FR-3**: The system SHALL allow the user to declare a session mode (`express` / `full` / `generate_then_review`) at session start.

**Clarification**
- **FR-4**: The system SHALL run a gap detector over the initial input and produce a ranked list of gaps (actor, scope, data, integration, scale, security, success).
- **FR-5**: The system SHALL ask clarifying questions bounded by the turn budget of the declared mode.
- **FR-6**: The system SHALL signal progress to the user (e.g., "Question 3 of ≤ 8").
- **FR-7**: At architectural decision points, the system SHALL propose 2–3 alternatives with trade-offs AND a recommendation, rather than picking one silently.
- **FR-8**: The system SHALL record the chosen decision AND the alternatives considered in the internal spec representation.

**Structuring**
- **FR-9**: The system SHALL maintain an internal Pydantic representation of the specification across turns, including: actors, workflows, functional requirements, non-functional requirements, data requirements, integrations, scope, non-goals, architecture decisions, assumptions, open questions, risks.
- **FR-10**: The system SHALL persist the internal representation after each turn to enable resume.

**Synthesis**
- **FR-11**: The system SHALL use a two-pass LLM synthesis (Pass 1 = structure, temperature 0; Pass 2 = render, temperature 0.2).
- **FR-12**: The system SHALL perform a quality self-check before presenting the draft to the user.
- **FR-13**: The system SHALL flag weak or under-specified sections to the user before review.

**Review**
- **FR-14**: The system SHALL allow the user to request edits to the draft, preserving the overall structure.
- **FR-15**: The system SHALL preserve revision history across edits within a session.

**Output**
- **FR-16**: The system SHALL emit the final specification in the user's chosen format: `ieee_docx` (default for stakeholder review), `ieee_markdown` (default for Build Agent handoff; co-generated with `ieee_docx`), `markdown` (single-doc), or `json`. `openspec_folders` is an adapter-backlog format and is not part of Phase 1 MVP.
- **FR-17**: The system SHALL produce a build-ready package containing: the specification document(s) + referenced-skills list + knowledge-base pointers + spec version identifier + metadata (intent type, mode, LLM models used, token counts, timestamps) + open-questions audit + assumptions list.

**Session management**
- **FR-18**: The system SHALL persist sessions so users can resume incomplete specifications.
- **FR-19**: The system SHALL support session expiry (default: 30 days; configurable).

**Approval**
- **FR-20**: The system SHALL support a single-approver sign-off flow for Phase 1 MVP (multi-approver deferred to Phase 2).
- **FR-21**: The system SHALL record approver identity, timestamp, and optional notes.
- **FR-22**: The system SHALL transition the specification state: `draft → under_review → approved` (or `rejected` with notes).

**Handoff**
- **FR-23**: The system SHALL expose an export endpoint that emits the build-ready package in a form the Build Agent (Canvas) can directly consume.
- **FR-24**: The system SHALL support both manual handoff (user downloads and hands to Build Agent) and, once platform integration is complete (Phase 3), direct handoff through the Control Center task queue.

**Learning-layer instrumentation**
- **FR-25**: The system SHALL capture outcome metadata fields (Build Agent feedback, compliance matrix pass rate, user edit count, user satisfaction rating, version lineage) on every approved specification, even if those fields are not yet actively consumed in Phase 1.

**Skills and knowledge base**
- **FR-26**: The system SHALL maintain integration with the platform's skills directory. During elicitation, when the agent detects intent that could be served by a registered skill, it SHALL surface the candidate skills and let the user reference them by name in the specification. The specification stores references; the Build Agent performs binding.
- **FR-27**: The system SHALL allow users to upload files and data to a session (plain text, markdown, PDF, Excel, CSV, JSON, up to platform-configured size limits). Uploaded files are embedded in the session's context for grounding.
- **FR-28**: The system SHALL enforce upload scoping. Uploads are **private to the uploading user's sessions** by default. The user may explicitly promote an upload to **shared** scope (visible to selected teammates or to the organization).
- **FR-29**: The system SHALL NOT automatically add uploaded content to the cross-session RAG corpus. Promotion of user content to the permanent corpus is a curation step, not automatic.

**Versioning**
- **FR-30**: The system SHALL create a new, tracked specification version whenever a user initiates an edit from the Build Agent's Canvas view or the Deployment Agent's view. Previous versions are retained and visible in the Artifacts tab.
- **FR-31**: The system SHALL preserve inter-version diffs in a form that is queryable for Layer 5 rule extraction (§11.2). Diffs SHALL include which FRs/NFRs/ACs changed, what the user's edit trigger was, and the compliance matrix associated with the prior version (when available).

**Compliance matrix intake**
- **FR-32**: The system SHALL accept a compliance matrix (structured JSON) from the Build Agent on every build completion. The matrix SHALL be persisted to the spec's outcome record and made available as context when the user next edits the specification.

### 12.2 Non-Functional Requirements

- **NFR-1**: Session creation → first clarifying question latency: ≤ 3 seconds (p95).
- **NFR-2**: Pass 2 synthesis latency for a typical MVP-scale spec (~30 FRs): ≤ 45 seconds (p95).
- **NFR-3**: Session state persistence: survives process restart (Postgres).
- **NFR-4**: LLM cost per completed spec session: ≤ $0.50 for express mode, ≤ $2.00 for full mode.
- **NFR-5**: System SHALL handle concurrent sessions (tested target: 10 concurrent; production target: 100).
- **NFR-6**: System SHALL NOT leak one user's session content into another user's context.
- **NFR-7**: All state-changing actions (spec creation, edits, approvals) SHALL be logged with user identity and timestamp.

### 12.3 Acceptance Criteria (quantitative)

Binary pass/fail criteria:

| # | Criterion | Pass threshold |
|---|---|---|
| AC-1 | Generated specification contains all required sections | 100% (binary) |
| AC-2 | Every functional requirement has a Given/When/Then scenario | ≥ 90% |
| AC-3 | Every actor has at least one workflow | 100% (binary) |
| AC-4 | Explicit non-goals section present | 100% (binary) |
| AC-5 | Quantitative NFRs (not "fast enough" — actual numbers) | ≥ 80% of NFRs |
| AC-6 | Open questions flagged, not hidden | 100% of unresolved gaps |
| AC-7 | Assumptions marked (not silent) | 100% of inferences |
| AC-8 | User satisfaction on review (1–5 scale) | ≥ 4.0 mean |
| AC-9 | Builder-can-start confidence (self-reported by builder) | ≥ 4.0 / 5 mean |
| AC-10 | Turn count within declared budget | 100% (never exceeded) |

### 12.4 Scenarios (sample)

**Scenario 1 — Express mode, dashboard intent**
> **Given** the user declares express mode and provides *"I want a dashboard to track supply chain metrics across regions"*
> **When** the Spec Agent runs its gap detector
> **Then** the system shall ask at most 3 clarifying questions (actors, data source, alert triggers) and produce a markdown spec draft within 90 seconds.

**Scenario 2 — Full mode, architecture decision**
> **Given** the user is in full mode discussing a data pipeline
> **When** the conversation reaches the batch-vs-streaming decision
> **Then** the system shall propose 2–3 alternatives with trade-offs, recommend one, and record all alternatives in the Architecture Decisions section.

**Scenario 3 — Gap flagged but not resolved**
> **Given** the user's request has 5 gaps and the mode budget allows 3 questions
> **When** the agent finishes the clarification loop
> **Then** the 2 unasked gaps shall appear verbatim in the Open Questions section of the final specification.

**Scenario 4 — Review and revise**
> **Given** a generated draft
> **When** the user requests "add a section about handling PII"
> **Then** the agent shall insert or enrich a non-functional requirement for PII handling AND add related scenarios, preserving other sections.

**Scenario 5 — Approval and handoff**
> **Given** an approved specification in state `approved`
> **When** the user requests export as an OpenSpec folder
> **Then** the system shall produce an `openspec/` directory containing the canonical specification + `changes/` proposal folder + metadata package.

**Scenario 6 — Resume an interrupted session**
> **Given** a session was abandoned mid-clarification 3 days ago
> **When** the user resumes the session
> **Then** the agent shall restore the conversation history, the partial internal specification, and ask the next question in the sequence.

### 12.5 Data Model (key entities)

```
Session
  - id, user_id, created_at, updated_at, mode, status
  - initial_input, intent_type, turn_count, mode_budget
  - current_phase (intake | clarification | synthesis | review | approved | exported)
  - active_spec_version_id  (current spec version being edited)

InternalSpec  (one per SpecVersion)
  - session_id, spec_version_id
  - product_summary, actors[], workflows[], functional_requirements[]
  - non_functional_requirements[], data_requirements, integrations[]
  - scope, non_goals[], architecture_decisions[], assumptions[]
  - open_questions[], risks[]
  - referenced_skills[]          (names of skills the user referenced)
  - knowledge_base_pointers[]    (refs to uploaded files and shared KB items)
  - last_modified_at

SpecVersion                     (NEW — tracks lineage across Canvas round-trips)
  - id, spec_id, version_number
  - parent_version_id           (null for v1; prior version otherwise)
  - trigger                     (enum: initial | canvas_edit | deploy_failure | manual_revision)
  - trigger_context             (free text describing what triggered the version)
  - created_at

ConversationTurn
  - session_id, turn_number, role (user | agent), content
  - gap_category (if agent question), decision_point (if alternatives proposed)
  - timestamp

ArchitectureDecision
  - spec_id, decision_point, chosen_option
  - alternatives_considered[], rationale

OpenQuestion
  - spec_id, question_text, gap_category, severity

Approval
  - spec_version_id, approver_id, approved_at, notes
  - status (approved | rejected)

ExportArtifact
  - spec_version_id, format, created_at, checksum, file_path_or_blob_ref

Skill                            (NEW — platform registry, admin-curated)
  - id, name, description, category
  - role_visibility[]            (which user roles can reference this skill)
  - deprecated (bool)

SkillReference                   (NEW — per-spec-version, resolved by Build Agent)
  - spec_version_id, skill_id
  - reference_context            (which FR/NFR in the spec references this skill)

UserUpload                       (NEW — session knowledge-base attachments)
  - id, uploaded_by_user_id, created_at
  - filename, content_type, size_bytes, storage_ref
  - scope                        (enum: private | shared)
  - shared_with_user_ids[]       (populated if scope = shared and targeted)

SessionUpload                    (NEW — join table linking uploads to sessions)
  - session_id, upload_id, added_at

ComplianceMatrix                 (NEW — received from Build Agent after each build)
  - spec_version_id, received_at
  - overall_pass_rate (0.0 - 1.0)
  - entries[]                    (per FR/NFR/AC: status, notes, evidence)
  - build_agent_feedback         (clean_build | clarification_requested | failed)

OutcomeMetadata  (Phase 1 captures; Phase 3+ consumes for outcome-weighted retrieval)
  - spec_id                      (not version-scoped — rolled up across versions)
  - final_spec_version_id        (the version that was actually built and kept)
  - build_agent_feedback_final   (clean_build | clarification_requested | failed)
  - compliance_pass_rate_final   (0.0 - 1.0 — from the final ComplianceMatrix)
  - user_edit_count (int)
  - version_count (int)          (how many versions the spec went through)
  - post_build_stability_days (int)
  - user_satisfaction_rating (1 - 5)
  - captured_at
```

### 12.6 API Surface (Phase 1, minimal REST)

```
# Session + conversation
POST   /api/sessions                       → create session (mode, initial input, uploads[])
GET    /api/sessions/:id                   → get session state
POST   /api/sessions/:id/turn              → user turn (answer, edit, mode change)
GET    /api/sessions/:id/draft             → current spec draft (active version)

# Approval + export
POST   /api/sessions/:id/approve           → approve draft
POST   /api/sessions/:id/reject            → reject draft with notes
POST   /api/sessions/:id/export            → export in specified format (ieee_docx | ieee_markdown | markdown | json)
GET    /api/sessions/:id/history           → version history (all SpecVersions for this session)

# Versioning (back-to-Spec flow from Canvas)
POST   /api/specs/:spec_id/versions        → create new version (triggered by Canvas edit, deploy failure, or manual)
GET    /api/specs/:spec_id/versions        → list versions
GET    /api/specs/:spec_id/versions/:vid   → get a specific version
GET    /api/specs/:spec_id/diff?from=&to=  → inter-version diff

# Skills directory
GET    /api/skills                         → list available skills (filtered by user role)
GET    /api/skills/:id                     → get skill detail
POST   /api/sessions/:id/skill-references  → attach a skill reference to the current spec

# Knowledge base uploads
POST   /api/uploads                        → upload a file (returns upload_id)
GET    /api/uploads                        → list user's uploads (private + shared-visible)
POST   /api/uploads/:id/promote            → promote an upload to shared scope
POST   /api/sessions/:id/uploads           → attach an upload to a session

# Compliance matrix intake (from Build Agent)
POST   /api/specs/:spec_id/versions/:vid/compliance-matrix
                                           → Build Agent posts a matrix after a build

# Outcome + admin
POST   /api/sessions/:id/outcome           → submit outcome metadata (user satisfaction, edit count)
GET    /api/templates                      → list intent-type templates
GET    /api/admin/sessions                 → list sessions (admin only)
GET    /api/admin/skills                   → manage skills registry (admin only)
```

### 12.7 UI surface (Phase 1 minimum)

- **Home / new session** — input textarea + mode selector + submit
- **Conversation view** — chat-style with progress indicator ("Question 3 of ≤ 8") + decision-point cards showing alternatives
- **Draft view** — rendered spec in chosen format, editable sections, weakness flags visible
- **Export view** — format selector + download / copy-to-clipboard
- **Session list** — resume in-progress sessions

CLI variant (also Phase 1) — same flow, interactive REPL, text output.

---

## 13. Phased Roadmap

| Phase | Scope | Effort | Gate |
|---|---|---|---|
| **Phase 0 — Design approval** | This document + team review session | 1–2 days | Team approval (this doc) |
| **Phase 1 — POC** | Conversation + two-pass synthesis + IEEE 830 output (Word + markdown) + CLI + Postgres persistence + outcome-metadata schema + skills-directory read-only + user upload (private scope) | 1–2 weeks | Internal dogfood |
| **Phase 2 — Demo MVP** | + web UI + multi-format adapters (JSON) + evaluation harness + cross-session RAG + curated pattern library + shared-upload scope | 2–3 weeks | Approval for external-facing demo |
| **Phase 3 — Platform integration** | Integrate into the platform as the Spec tab: inherit auth/tenancy; wire handoff to the Build Agent (Canvas) via Control Center; tenant-scoped learning indices; versioning on back-to-Spec flow wired end-to-end | 1–2 weeks | Platform integration sign-off |
| **Phase 4 — Outcome-weighted learning** | Feedback-loop activation: compliance-matrix intake live; outcome-weighted retrieval (Layer 4); rule extraction from inter-version diffs (Layer 5) | 1–2 weeks | Quality bump validated via evaluation harness |
| **Phase 5 — Compliance handoff** | Compliance matrix schema aligned with Build Agent's output format; spec-to-matrix traceability enforced | 1–2 weeks | Build Agent team confirms schema |
| **Phase 6 — Multi-framework / multi-provider** | LLM-adapter-layer swap validated; Azure OpenAI / Gemini paths ready for client-specific deployments; OpenSpec adapter shipped if demand appears | 1–2 weeks | Client-deploy readiness |

**Total to production-ready platform component**: 4–6 weeks from Phase 1 start (Phases 1–3 + 5).

Phase 4 (learning feedback loops) can run in parallel with Phase 3 (platform integration). Phase 5 is cheaper now than it was at v0.5 of this document — the Build Agent team has already defined the compliance-matrix output, so this is a schema-alignment pass, not a design pass.

---

## 14. Platform Integration

The Spec Agent ships as **the Spec tab** in a 3-tab platform UI (Spec / Canvas / Artifacts), plus corresponding Control Center surfaces. The integration contract with the other two components is now concrete.

### 14.1 Integration points (confirmed)

| Point | Contract |
|---|---|
| **Identity and auth** | Inherited from the platform. The Spec Agent does not own login; it sees an authenticated `user_id` and `tenant_id` on every request. |
| **Control Center** | Platform-provided task queue. Spec sessions appear here alongside Canvas builds and Deployment Agent jobs. Handoff to the Build Agent is a Control Center task creation. |
| **Skills directory** | Platform-provided read API. Spec Agent queries `/platform/skills?user_id=...` for skills the current user's role can reference. Admin-curation happens in platform settings, not in the Spec Agent. |
| **Knowledge base** | Platform-provided upload + storage. Spec Agent reads files via a session-scoped pointer; it does not own upload storage. Scope enforcement (private / shared / org-wide) is platform-level. |
| **Artifacts tab** | Platform-provided. Every approved spec version, Canvas build, and Deployment Agent run is tracked as an artifact with lineage. Spec Agent POSTs version metadata to the Artifacts API. |
| **Handoff to Build Agent (Canvas)** | Direct. After approval, the Spec Agent publishes the build-ready package (IEEE markdown + referenced-skills + knowledge-base pointers + version id) to a well-known location the Build Agent picks up. |
| **Feedback from Build Agent** | Direct. Canvas POSTs a compliance matrix to the Spec Agent after every build completion (see FR-32). |
| **Back-to-Spec trigger** | User action in Canvas invokes `POST /api/specs/:spec_id/versions` with an edit-trigger reason. A new SpecVersion is created, and the user resumes the Spec session at the clarification/review step. |
| **Deployment** | Kubernetes-preferred (Docker → Azure repo → pipeline → YAML → K8s), web-app fallback available. The Spec Agent is a FastAPI service in the platform's standard shape. |

### 14.2 Architectural discipline retained for portability

Even with the platform contract concrete, the Spec Agent's internals keep their adapter discipline so that individual clients who want self-hosted variants can plug in their own infrastructure:

- **LLM adapter** — OpenAI default; Azure OpenAI, Gemini, and other providers are configuration-level swaps
- **Session store adapter** — Postgres by default; swappable to the platform's native store if/when offered
- **Skills directory adapter** — platform skills registry by default; swappable to a client-specific registry
- **Output adapter** — IEEE primary; markdown, JSON, OpenSpec are adapter-level

### 14.3 Phase 1 MVP still runs outside the platform

For early dogfood, the Phase 1 MVP runs as a standalone container (CLI + local web UI) with stubs for the platform integration points. This lets the team use the agent end-to-end before the platform surfaces exist for integration testing. Phase 3 flips the stubs to real platform calls — nothing in the internal architecture changes.

---

## 15. Success Criteria

### 15.1 Phase 1 MVP exit criteria

1. Team can use the Spec Agent to author a specification for a real candidate next platform feature.
2. Generated specification passes all 10 acceptance criteria in Section 12.3 (AC-1 through AC-10).
3. A builder (human or agent) can start implementing from the generated specification without requesting further clarification from the user.
4. Mean user satisfaction across 5 test sessions: ≥ 4.0 / 5.
5. Mean generation cost: ≤ $2.00 / spec in full mode, ≤ $0.50 / spec in express mode.
6. Outcome-metadata schema captures data for every approved specification (even if not yet consumed).

### 15.2 Dogfood success

- At least 3 internal specifications authored via the agent before any external-facing demo
- At least 1 of those 3 progresses to a buildable state that a builder agent consumes successfully

### 15.3 External-readiness success

- Platform-integrated Spec Agent handles: (a) user logs in via SSO, (b) starts a session, (c) completes a specification in one working session, (d) exports in an approved format, (e) hands off to the builder.

### 15.4 Long-term success (learning signals)

- ≥ 80% of new app ideas go through the Spec Agent before reaching engineering
- Measurable reduction in spec-to-build rework time vs. traditional analytics project delivery
- **User satisfaction trends upward over time, not flat** (the learning signal from Section 11.7)
- Mean turn count per completed spec trends downward as the corpus grows
- Evaluation harness pass rate remains at or above target thresholds as new seed queries are added

---

## 16. Risks and Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| R1 | **Over-questioning** — user quits before finishing | High if not mitigated | High | Turn budget per mode (Section 8.1); progress signaling; "generate-then-review" fast path |
| R2 | **Under-specifying** — generated spec too vague for builder | Medium | High | Quality self-check (Section 8.7); explicit open-questions section; builder-confidence eval criterion |
| R3 | **False confidence** — agent states assumptions as facts | Medium | High | Every inference marked as assumption in specification; quality self-check flags un-marked inferences |
| R4 | **Framework lock-in** — Pydantic AI becomes wrong choice | Medium | Medium | Framework-adapter boundary; conversation logic decoupled from Pydantic AI |
| R5 | **Output-format mandate changes late** (e.g. regulator requires a new template) | Low (IEEE now locked) | Low (adapter protects) | IEEE primary is team-confirmed; adapter layer retained so new formats are additive, not rewrites |
| R6 | **Platform integration contract shifts** before Phase 3 | Medium (platform now concrete but still iterating) | Medium | Stubs for each integration point in Phase 1; Phase 3 re-verifies contracts before wiring them in |
| R7 | **LLM cost spikes** on complex sessions | Low | Medium | Turn budget; two-pass structure bounds Pass 2 token use; prompt caching at session level |
| R8 | **Multi-user concurrency bugs** | Low in Phase 1 (single-user) | Medium | Tenant-isolation tested from Phase 3 onward |
| R9 | **Knowledge layer pollution** — one bad seed spec ruins generations | Low in Phase 1; rises with use | Medium | Curated seeds in Phase 1; Phase 2 RAG only retrieves from approved-and-built specs; monthly governance review |
| R10 | **Scope creep into builder territory** | Medium | High | Hard-rule section (Section 3.3); no code-generation features in any phase |
| R11 | **Demo pressure pushes Phase 1 too wide** | High | High | Phase 1 is POC only; demo quality is Phase 2 |
| R12 | **Team does not dogfood** | Medium | High | Phase 1 exit criterion is internal dogfood; block Phase 2 on dogfood success |
| R13 | **Learning stagnates** — instrumentation skipped, governance not run | Medium | High | Instrumentation mandatory from Phase 1 (FR-25); monthly pattern review required; Section 11.5 governance rules are non-optional |
| R14 | **Cross-tenant learning leakage** (Phase 3+) | Low if designed; High if retrofitted | High | Tenant-scoped retrieval indices designed from Phase 3 start; per-tenant curated libraries |

---

## 17. Open Questions for the Team

### 17.1 Platform integration

1. What is the exact task-queue contract for Control Center hand-offs (JSON schema, webhook vs poll, retry semantics)?
2. What is the compliance-matrix schema the Build Agent emits? (Needed for FR-32 / ComplianceMatrix entity.)
3. How is the "edit from Canvas" trigger exposed — deep link, webhook, Control Center event?
4. Where do tenant boundaries get enforced on the platform side — at the auth proxy, at Control Center, or per-service?
5. Is versioning metadata stored in the Artifacts tab, in the Spec Agent's own Postgres, or replicated?

### 17.2 Product strategy

1. How prescriptive should the guided workflow be? (Form-based? Conversational? Hybrid?)
2. Who is the primary Phase 1 user — external SMEs, internal team, or both?
3. What does "approved" mean in our approval flow — one reviewer or tier?
4. Should IEEE 830 Word and IEEE markdown always co-generate, or is the Word version opt-in to save cost?

### 17.3 Output format and adapter backlog

*(OpenSpec-commitment question closed in v0.6: team decision is IEEE primary, OpenSpec dropped to adapter backlog.)*

1. What is the trigger for building the OpenSpec adapter — a client request, or scheduled after Phase 6?
2. Should the Spec Agent export to SharePoint / Confluence / Notion as secondary adapters, or leave those to the platform?
3. For IEEE outputs: which IEEE revision — 830-1998 (the most commonly referenced) or the newer ISO/IEC/IEEE 29148?

### 17.4 Learning and governance

1. Who owns the monthly pattern-review session (Section 11.5)?
2. What is the escalation if evaluation harness pass rates drop?
3. How are tenant boundaries drawn for the learning indices — per-client, per-project, per-team?

### 17.5 Skills directory

1. Who curates the skills registry — a single Admin role, or per-domain owners?
2. Do deprecated skills remain referenceable in existing specs (for audit) but not selectable in new ones?
3. How are skills versioned — does a skill version bump invalidate the Spec Agent's reference, or does the Build Agent's Build Plan handle the resolution?

### 17.6 Governance

1. Dogfood-first — agreed?
2. Approval gate — what is the minimum bar for team sign-off before Phase 1 starts?
3. Change-control — once Phase 1 code starts, how do we handle scope changes?

---

## 18. Dogfood Plan

The Spec Agent's first real use is the team authoring specifications for the platform's next components.

### 18.1 First three dogfood specs

| Order | Spec | Why this one |
|---|---|---|
| 1 | A small, concrete next platform component chosen by the team | Tests basic flow on a real need |
| 2 | Re-specification of an existing vague or under-specified draft | Tests agent on a genuinely fuzzy starting point |
| 3 | A feature request from the current enhancement backlog | Tests agent on domain-specific vocabulary + constraints |

### 18.2 Feedback loop

Each dogfood session produces:
- The generated specification (artifact)
- Author satisfaction (1–5)
- Unresolved gaps (what the agent missed)
- Suggested questions the agent should have asked
- Format-specific issues (markdown / OpenSpec / JSON)

Feedback is fed back into template tuning, gap-detector improvements, and (Phase 2+) the RAG knowledge layer. This IS the Layer 3 curation loop from Section 11.2 operating on real specs.

### 18.3 Success signal

Dogfood-ready if: (a) 3 specifications authored without major friction, (b) at least 1 of them becomes a buildable input for a downstream builder, (c) mean author satisfaction ≥ 4.0 / 5.

---

## 19. Appendix A — Spec iteration cost (pattern illustration)

Typical hand-authored specification lifecycles incur substantial human time in structuring and formalization work — separate from genuine creative product decisions:

| Phase | Typical activity | Approx share of total time |
|---|---|---|
| Initial drafting | Section structure, formatting, requirement IDs | ~15% |
| Revisions and merges | Consolidating conflicting drafts | ~20% |
| Gap-filling | Identifying missing scenarios, NFRs | ~15% |
| Cross-reference | Ensuring requirements, scenarios, and data entities align | ~10% |
| Creative product decisions | What the product should do | ~35% |
| Stakeholder review cycles | Clarification, iteration | ~5% |

Rough split of replaceable vs. non-replaceable activity:

- ~45% structuring and formalization — **Spec Agent replaces this**
- ~35% creative product decisions — **humans still make these; Spec Agent surfaces alternatives**
- ~20% cross-reference and integration — **Spec Agent handles via structured internal representation**

Approximate savings: a typical multi-week hand-authored spec cycle collapses to days or hours, with the remaining time focused on human judgment rather than document mechanics. And with the learning mechanism in Section 11 engaged, per-spec time continues to decrease as the corpus grows.

---

## 20. Appendix B — OpenSpec mechanics reference

> **Note**: Following the v0.6 team decision to lock IEEE 830 as the primary output format (§9.2), OpenSpec is retained as a secondary adapter in the backlog but is NOT part of Phase 1–2 scope. This appendix is kept for reference in case a future client or phase reprioritises it.

### 20.1 Two-folder anatomy

```
openspec/
├── specs/           # Source of truth — current state of every domain
│   ├── auth/
│   │   └── spec.md
│   ├── data-pipeline/
│   │   └── spec.md
│   └── ...
│
└── changes/         # Proposals (pending or archived)
    └── add-rls-support/
        ├── proposal.md      # The change description
        ├── design.md        # Design decisions + rationale
        ├── tasks.md         # Implementation task list
        └── specs/           # Delta files per domain touched
            ├── auth/
            │   └── spec.md  # ADDED/MODIFIED/REMOVED sections
            └── data-pipeline/
                └── spec.md
```

When a change is archived, its delta files merge into `openspec/specs/`.

### 20.2 Delta types

- **ADDED** — new requirements / sections
- **MODIFIED** — existing sections edited (with diff)
- **REMOVED** — sections retired

### 20.3 Slash commands

- `/opsx:propose` — start a new change proposal
- `/opsx:apply` — dry-run apply the change to see the merged state
- `/opsx:archive` — finalize the change and merge deltas into `specs/`

### 20.4 Language conventions

- **RFC 2119** for normative statements (SHALL, SHOULD, MAY)
- **Given/When/Then** for scenarios
- **Explicit requirement IDs** per domain

### 20.5 Why OpenSpec remains a defensible future adapter

1. Git-native (deltas are just commits; review is just pull requests)
2. Multi-domain support (one spec per domain, not one monolithic doc)
3. Change management built in (not chaotic rewrites)
4. Builder-friendly (structured, parseable)
5. Human-reviewable (markdown throughout)

These properties remain attractive for clients who prefer a git-native workflow. The adapter can be built in Phase 6+ if a client requests it.

### 20.6 Why IEEE was chosen over OpenSpec for Phase 1

Team preference (captured in v0.6) was for IEEE because:

- Enterprise familiarity and decades of adoption in stakeholder review and audit contexts
- Works equally well in technical and business discussions (Word + markdown co-generation)
- No commitment risk to an emerging convention
- Already parseable by the Build Agent (ingests markdown natively)

The internal spec representation is still format-agnostic, so switching primaries in the future is an adapter-level change, not a core rewrite.

---

## 21. Appendix C — Evaluation harness seed queries

Ten canonical test inputs the Spec Agent should handle. Used as the Phase 1 acceptance test suite and the ongoing regression harness (Section 11.2 Layer 6).

### 21.1 Vague / broad

1. *"I want a dashboard that tracks commodity prices across regions."*
2. *"Build me something that analyzes customer feedback and highlights issues."*
3. *"I need an app for my team to share knowledge."*

### 21.2 Semi-specific

4. *"A dashboard for supply chain — procurement KPIs per region with alerts when inventory drops below thresholds."*
5. *"Automated report generator: monthly briefing combining actuals + forecasts + competitor highlights."*

### 21.3 Technical / integration-heavy

6. *"Agent that consumes experiment outcomes and recommends next hyperparameter configurations with human-in-the-loop approval."*
7. *"A micro-service that subscribes to time-series events and emits drift alerts."*

### 21.4 Constrained / compliance-sensitive

8. *"A PII-handling intake form with row-level access control."*
9. *"A financial insights agent that NEVER fetches from external data sources outside approved internal systems."*

### 21.5 Meta / platform

10. *"An agent that watches our git repo and auto-updates the knowledge base when new commits land."*

Each seed has expected properties (intent type, gap count, minimum questions asked, output structure). The agent passes if all 10 produce specifications meeting the AC-1 → AC-10 thresholds in Section 12.3.

---

## 22. Approval / Build Gate

### 22.1 This document is not approval to build

This design document aligns the team on scope, architecture, and Phase 1 MVP requirements. Nothing gets coded until:

1. Team reviews this document
2. Open Questions in Section 17 are answered
3. Scope, framework, and output-format decisions are confirmed
4. Effort estimates are accepted (or adjusted)
5. Dogfood plan (Section 18) is agreed
6. Governance commitment for the learning loop (Section 11.5) is confirmed
7. A named approver signs off

### 22.2 What "approved" means

Approval should cover:

- Product scope and phase plan
- Platform integration contract (now concrete — see §14) and framework choice
- Output format confirmation (IEEE 830 primary, per team decision captured in v0.6)
- Engineering feasibility and stack choice
- Governance and external positioning
- Ownership and dogfood plan
- Commitment to the ongoing learning-loop governance (monthly pattern review)

Written confirmation from the approving decision-maker = green light for Phase 1 POC.

### 22.3 Change control after Phase 1 starts

- Scope changes require another round-trip through this review process
- Framework changes require platform-team sign-off plus engineering review
- New output formats require only admin approval (adapter-level)
- LLM model changes require admin approval (adapter-level, cost-relevant)
- Learning-layer schema changes require data-model review (affects retention and retrieval)

---

## 23. Final Thesis

The Spec Agent turns vague product intent into builder-ready specifications, preserving creative judgment where humans excel and automating the structuring work where they do not. It compounds in value with use — the 100th specification is materially better than the 10th — without any model fine-tuning required.

It is Component #1 of a platform whose Components #2 (Build Agent / Canvas) and #3 (Deployment Agent) are already operational. Its job is to be the cleanest possible doorway into that pipeline — the first tool a user touches when they have an idea, and the last stop before the Build Agent takes over. Its institutional memory, accumulated through the reversible Spec ↔ Canvas loop and the compliance-matrix feedback, becomes a defensive moat.

Built well, this makes the platform a **data-grounded enterprise app-building surface** — different from consumer no-code tools in four concrete ways: lives in the customer's environment, integrates natively with the customer's role-based skills and data sources, produces specifications that survive audit, and compounds in quality across every build.

Built poorly, it becomes another chatbot that asks annoying questions and produces documents no one reads — and it stagnates because no one maintains the curation and feedback loops.

The difference is discipline: narrow scope, adaptive elicitation, explicit gap-flagging, structured output, dogfood-first, learning-loop governance, and a hard rule against silent assumptions.

**Recommended decision**: approve Phase 1 POC (1–2 weeks, Pydantic AI + OpenAI, CLI + IEEE markdown output, local-only with stubs for platform integration, outcome-metadata instrumentation from day one) contingent on answers to the Section 17 open questions.

---

*End of design document.*
