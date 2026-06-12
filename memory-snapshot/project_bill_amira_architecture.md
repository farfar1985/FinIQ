---
name: Bill's Amira Meet Desktop — actual architecture (learned 2026-04-15)
description: Bespoke Node+Python stack, NOT A2A-native today. Monolithic ToolRegistry with internal agents. Learned by read-only clone of quantumdatatechnologies/amira-b-meet-desktop; clone deleted after study.
type: project
---

## What Bill actually built

**Repo**: `github.com/quantumdatatechnologies/amira-b-meet-desktop` (QDT org)
**Read-only exploration 2026-04-15 with Farzaneh's approval. Clone deleted after study — re-clone if needed.**

### Stack (what it IS)
- **Node.js (ESM)** + **OpenAI Realtime API** (`gpt-realtime-1.5`, upgraded March 9, 2026)
- **Python** for analytics — pandas, numpy, scipy, matplotlib, **LightGBM** (ML direction/magnitude models), scikit-learn
- **Vanilla single-page HTML** dashboard (~4,450 lines, 13 views, lazy-loaded iframes for 9 of them)
- **Electron** shell for desktop packaging
- **Dual-mode**: standalone (local mic/speaker) + Recall.ai bot (autonomous meeting participant, must be us-west-2)
- **`@openai/realtime-api-beta`** package — known issue: patches itself with deprecated model name, must re-patch after npm install

### Stack (what it is NOT)
- **NO React, NO Next.js, NO Vue** — vanilla HTML
- **NO CrewAI, NO LangChain, NO ADK, NO Pydantic AI, NO AutoGen** — everything custom
- **NOT A2A-native** — monolithic app with internal multi-agent, not distributed bot fabric
- **NOT Mars-deployed** — so Anthropic is fine here (Opus 4.6 for dev/review agents, Sonnet for narration/discovery)

### Agent architecture (internal)
- Three named agents, two voices:
  - **Amira** (shimmer voice) — primary, handles user conversation, delegates to specialists
  - **Kern** (silent) — AIS Intelligence Agent v4, maritime/vessel/fleet — returns data only, Amira/Vex summarize
  - **Vex** (echo voice) — Canvas IDE code-generation specialist
- All three share one **`ToolRegistry`** (`node-server/lib/tool-registry.mjs`)
- 72 tools total: 33 Realtime-exposed to OpenAI + 28 Shipy (QuantShip oil market agent) + 11 QML (Quantum ML)
- Agent filtering via `agent:` field on each tool — `registry.schemas({ agent: 'shipy' })` etc.
- 9-step middleware pipeline for tool dispatch (dedup → parse → broadcast → TTS guard → execute → speak → broadcast → deliver → events)

### Voice pipeline (battle-tested, worth copying)
- **5-layer anti-overlap system**: `_speakLock` mutex + `isTTSActive()` guard + `amiraIsSpeaking` wait (200ms poll, 15s max) + Vex mode gate + flythrough gate
- PCM16 24kHz ring buffer, ScriptProcessorNode, echo suppression via `amiraSpeaking` flag (cleared 1.5s after audio.done)
- Server TTS: `gpt-4o-mini-tts` with voice-character steering via `VOICE_INSTRUCTIONS` in `config.mjs`
- **`ctx.VOICE` is single source of truth** for Amira's voice — never hardcode 'shimmer'
- **`audioOutputEnabled` gates everything** — false = zero TTS calls, Realtime uses `output_modalities: ["text"]`

### Self-modifying pipeline (IMPORTANT — this is basically our "build orchestrator" already shipping)
- **Dev agent** (Claude Opus 4.6 with extended thinking): reads code, writes code, commits. 8 tools: `read_file`, `edit_file`, `replace_lines`, `write_file`, `list_files`, `search_and_read`, `run_command`, `commit_changes`. 10 edit / 500 line guardrails, 20 max iterations.
- **Review agent** (Claude Opus 4.6, independent): 8-check CI — syntax (`node --check`), server starts, imports, spec compliance, secrets detection, diff size, style.
- **Pipeline orchestrator** (`lib/pipeline.mjs`): git branching + merge + revert + **hot restart via exit code 42** (wrapper scripts catch 42, relaunch after 4s). Dual-layer persistence (memory + `.pipeline-state/task-{id}.json`).
- **Three execution modes per task**: A (Spec Only, planning agent expands spec), B (Safe Edit, config files), C (full Code Change pipeline).
- **Spec quality gate**: dev agent blocked if spec has no target file paths / code blocks / <300 chars. Auto-redirects to Mode A.
- **Version system**: git-tag based (`v{major}.{patch}`), auto-tags on release, UI revert-to-version dropdown.
- **Safety**: can only edit under `node-server/` and `client/dist/`. Cannot touch `.env` or `node_modules`. Review must pass. Branch verification before commit.

### Discovery Agent (Karpathy autoresearch pattern — exactly what our "compliance loop" should be)
- Scans codebase + meetings + gaps + git log + open issues + `improvement-goals.md`
- Generates 3-5 GitHub backlog issues with full specs + priority + recommended exec mode
- **Gap detection**: planning-agent chat captures uncertainty signals ("not implemented", "can't currently") into `gap-log.json` — Discovery Agent prioritizes high-hitCount gaps
- Schedule: 1h / 4h / 12h / 24h, persisted to `.pipeline-state/discovery-schedule.json`

### Other notable engines (reference, not directly relevant to FinIQ yet)
- **Causal Reasoning Brain**: 188 structural nodes, 218 edges, 470+ live nodes with discovered. 3-layer (ontology, graph, query). Daily edge weight recalc from QDL correlations.
- **Risk/De-Risk dual pipeline**: 25 factors (13 risk + 12 de-risk), level-based activation + momentum activation, rolling-30 learning, pattern discovery.
- **Python analytics worker** on port 9077: JSON-RPC over TCP, LightGBM training/prediction, pearson_batch, cross-correlate, regime detection, combination mining. Heartbeat every 10s, 3 misses = restart. 3 failed startups = degraded mode (system never goes down).
- **Brain Output Engine**: unified 15-min pulse, narrative triggers (9 types), Claude Haiku generates 1-3 sentence analyst cards (~$0.005/card, 5-15/day).
- **IBKR live streaming** + **Yahoo Finance fallback** for real-time price bars.

### API endpoints (exposed on port 3001)
- `POST /api/tasks/*/execute` — run pipeline
- `POST /api/discover` — trigger Discovery Agent
- `POST /api/amira/ask` — Claude Haiku Q&A against causal graph context
- ~60 other endpoints covering brain cycles, risk, causal graph, price bars, IBKR, analytics
- **WS paths**: `/ws-client` (dashboard, only LAST connection gets OpenAI events — iframes MUST use postMessage, never open their own /ws-client) and `/ws-recall` (bot mode)

## Why this matters for Amira/FinIQ integration

### The big finding: Bill's platform is NOT A2A-native today
It's a **monolithic multi-agent app** — all agents (Amira, Kern, Vex) live inside the same Node process, share one ToolRegistry, internal tool calls only. There's no inter-process bot registry, no agent cards, no message routing between distributed services.

**Implication**: our earlier assumption that Amira is already an A2A fabric was wrong. If we want cross-app communication, we either:
- **Option 1 (easy, ~1 day)**: Register FinIQ as a tool (`ask_finiq`) in Bill's existing ToolRegistry — Amira can invoke FinIQ over HTTP. This is NOT A2A; it's an internal tool call reaching an external service.
- **Option 2 (weeks)**: Add actual A2A protocol support to Bill's Amira + FinIQ. Proper distributed fabric. Right direction for Phase 2+.

### Things we can borrow from Bill for FinIQ
- **`navigate_page` tool** in `node-server/lib/tools/navigation.mjs` — proven voice-nav pattern. Copy-ready if we add voice-nav to FinIQ.
- **Audio anti-overlap 5-layer pattern** — saves weeks of voice debugging.
- **Self-modifying dev/review agent pattern** — template for Spec Agent → Build Orchestrator when we get there.
- **Discovery Agent pattern** — concrete implementation of the Karpathy-style self-improvement loop we've been conceptualizing.

### Things we should NOT assume
- Don't assume Bill wants to integrate FinIQ — he hasn't asked. Need explicit alignment before touching his code.
- Don't assume his Amira will migrate to ADK / Vertex AI Agent Engine — that's our (and Cesar's) pitch for NEW mini-apps. Bill's existing stack works and isn't Mars-deployed.
- Don't assume Anthropic usage in Bill's app implies Anthropic is OK elsewhere — Mars's Azure Foundry constraint only applies to deployed-to-Mars apps.

## Integration decisions pending (need user confirmation)

| Question | Options | Notes |
|---|---|---|
| Integrate FinIQ with Amira before April 21? | Yes / No | Default: no, pitch only |
| If yes, which path? | Option 1 (tool) / Option 2 (A2A) | Option 1 only feasible in ~1 day |
| Add voice-nav to FinIQ standalone? | Yes / No | Separate from Amira integration; ~1-2 hours |
| Share write-up with Bill? | Yes / No | Good before touching his code, either way |

**Farzaneh has not approved any of the above yet. Planning mode only.**
