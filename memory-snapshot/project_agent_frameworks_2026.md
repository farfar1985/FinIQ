---
name: Agent framework landscape — April 2026 snapshot
description: Current state of agent frameworks and protocols. Google-aligned recommended stack for Amira. Layered approach — don't pick one framework for everything.
type: project
originSessionId: 38239999-13da-4c2d-958c-740f1912cf1c
---
## Why this file exists

Farzaneh asked about current agent frameworks and which fit Amira best. My training is May 2025; I searched April 2026 web to verify. This snapshot records what's true now and what we recommended, so future sessions don't re-litigate the same ground.

## April 2026 snapshot (verified via web search)

### Major frameworks

| Framework | 2026 status | Strengths | Weaknesses |
|---|---|---|---|
| **OpenAI Agents SDK** | Production-grade, actively developed (release April 9 2026, 4,900+ dependents). Handoffs + guardrails + tracing + Realtime Agents with `gpt-realtime-1.5` + TypeScript. | OpenAI-locked but that matches old Mars constraint. Realtime Agents matches FinIQ's voice pattern. | OpenAI-only. |
| **Google ADK** | v1.0 production-ready (Python + Go). Fully supports Gemini 3 Pro/Flash. One-command `adk deploy` to Vertex AI Agent Engine. | **Registers into Gemini Enterprise** — Mars users invoke agents from their existing Gemini UI. Native multi-agent + handoffs. | Tilts Google/GCP. |
| **CrewAI** | 44.6k GitHub stars (largest ecosystem). Enterprise tier (CrewAI AMP) with Gmail/Slack/Salesforce triggers. Idea-to-prod in <1 week. | Role-based crews — natural fit for Spec Agent's multi-role elicitation. | "Near-zero security mechanisms" — prototype-grade, not Mars-production without hardening. |
| **LangGraph** | Lowest latency/token usage in benchmarks. Uber/Klarna/LinkedIn/JPMorgan production. | Full control, highest reliability. | Steepest learning curve; ~75% more code than Pydantic AI. |
| **Pydantic AI** | Most concise (~170 LOC for chat app). Type-safe, FastAPI-native. | **Natural fit for Cesar's FastAPI runtime.** Typed dependency injection, async-first. | Lacks role primitives + built-in handoffs. Not built for large-scale multi-agent. |
| **OpenAI Swarm** | **DEPRECATED**. No updates since March 2025. OpenAI Agents SDK is the successor. | — (learning resource only) | Don't use. |

### Protocols (not frameworks — wire formats)

| Protocol | Purpose | 2026 status |
|---|---|---|
| **A2A (Agent-to-Agent)** | Inter-agent communication | v0.3 with gRPC, signed security cards. **150+ enterprise adopters**: SAP (Joule), Zoom, all major hyperscalers. Becoming the standard. |
| **MCP (Model Context Protocol)** | Tool/data source exposure to an LLM | Anthropic-originated but framework-agnostic. Works with Gemini, OpenAI, etc. De-facto standard for tool exposure. |

### Runtime / hosting

| Option | Managed? | Key feature |
|---|---|---|
| **Vertex AI Agent Engine** | Google-managed | Sessions + Memory Bank (solves chat persistence natively) + OpenTelemetry tracing + Cloud Monitoring. Registers agents into Gemini Enterprise web app. Pricing dropped Jan 28 2026. |
| **Cesar's FastAPI runtime** | Self-hosted | Custom, multi-tenancy + skills + Kanban |
| **Docker on any cloud** | Self-hosted | Generic fallback |

## Recommended stack for Amira (post-April-21)

**Principle: stratified, not monolithic.** Different layers want different tools.

```
Inter-app communication       → A2A protocol (Google-led, enterprise standard)
Tool / data exposure          → MCP (framework-agnostic)
Within-app orchestration      → Google ADK (with Gemini) for NEW bots
                                OpenAI Agents SDK for existing OpenAI bots
Type-safe schema layer        → Pydantic AI (where types matter in FastAPI)
Spec Agent (OpenSpec)         → CrewAI for prototype, ADK for production
Hosting                       → Vertex AI Agent Engine (managed, Mars-aligned)
LLM (text)                    → Gemini 3 Pro (complex) + Flash (routine)
LLM (voice)                   → Gemini Live API
```

## If forced to pick ONE framework

**Given Mars's Google preference: Google ADK.**
- ADK + Gemini + Vertex AI Agent Engine is tightly integrated end-to-end
- Agents auto-register into Gemini Enterprise (front door Mars already uses)
- Multi-language (Python + Go + Java)
- Matches Mars's "Gemini/Google as much as possible" directive

## Migration phasing for FinIQ (if approved post-demo)

| Phase | Effort | What ships |
|---|---|---|
| A. LLM swap | ~1 week | Gemini 3 Flash in 4 files (already abstracted via env vars) |
| B. Voice swap | ~1 week | OpenAI Realtime → Gemini Live API in voice-server.ts |
| C. Wrap in ADK | ~2 weeks | Sub-agents (CI/Reports/Jobs/Voice) become ADK Agents with handoffs |
| D. Deploy to Agent Engine | ~3 days | `adk deploy`, wire Cloud Trace, configure Sessions + Memory Bank |
| E. Gemini Enterprise register | ~1 week | Mars users see FinIQ inside their Gemini UI |
| F. A2A across apps | ongoing | FinIQ addressable from Forecasting, Supply Chain, etc. |

Total ≈ 6 weeks to fully Google-native FinIQ registered in Gemini Enterprise.

## What NOT to recommend

- **LangGraph as foundation** — too heavy for a team new to agents; reserve for specific reliability needs later.
- **Pydantic AI as orchestrator** — it's great for typed tools, not multi-agent coordination.
- **Going framework-free at scale** — fine for FinIQ V1 and for single-purpose bots like `finiq-data-agent`, will not scale past ~5 bots without real coordination pain.
- **One framework for everything** — the LangChain-everywhere mistake of 2023.

## Sources verified April 2026

- OpenAI Agents SDK: https://openai.github.io/openai-agents-python/
- Google ADK: https://google.github.io/adk-docs/
- A2A upgrade blog: https://cloud.google.com/blog/products/ai-machine-learning/agent2agent-protocol-is-getting-an-upgrade
- Vertex AI Agent Engine: https://docs.cloud.google.com/agent-builder/agent-engine/overview
- Gemini Live API: https://docs.cloud.google.com/vertex-ai/generative-ai/docs/live-api
- Framework comparison: https://dev.to/linou518/the-2026-ai-agent-framework-decision-guide-langgraph-vs-crewai-vs-pydantic-ai-b2h
- Swarm status: https://github.com/openai/swarm (deprecated)
