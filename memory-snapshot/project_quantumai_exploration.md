---
name: Quantum AI / Noname architecture exploration
description: Read-only review 2026-04-20 of GenAI tool repo. Pydantic AI (not Claude SDK), 20+ tools, ActionBroker, page context. Voice integration proposal written.
type: project
originSessionId: 01322f08-c136-4f72-b4ed-f930c8172fcc
---
**Quantum AI exploration (2026-04-20 evening) — context for post-demo voice integration**

Repo: `github.com/quantumdatatechnologies/quantum-ai`, cloned read-only to `D:/QuantumAI/`. Kept local per user's request (don't delete).

**Stack (verified by code imports, not README):**
- Backend: `src/noname/` — FastAPI + **Pydantic AI** (`pydantic-ai-slim` 1.79.0 + `pydantic-ai-skills` 0.6.0), NOT Claude Agent SDK. README is outdated.
- LLM: Anthropic Claude via `AnthropicModelSettings`, with 3-level caching (instructions / tool defs 1h / messages).
- Legacy: `src/fortuna/` — LlamaIndex agents, being replaced, port 8000.
- Widget: `packages/q-ui-sdk/` (name: `dash-agent-widget`) — React + `@assistant-ui/react` + `useLocalRuntime`. Embedded INTO a Plotly Dash app (external repo) via `window.DASH_AGENT_CONFIG`.
- Other: `frontend-v2/` standalone React + Vite chat app (testbed / secondary). `frontend/` older, being replaced.
- Deploy: port 8001 (Noname), separate service. Uses Postgres + Weaviate + Redis.

**Tools in Noname** (20+ — all Pydantic AI `@agent.tool` decorated):
- Navigation: `navigate_to_page` with 20+ page enum + optional `project_id`/`model_id`
- Dashboard: `select_dropdown`, `click_button`, `set_input`, `set_date_range`, `set_slider`, `set_checklist`, `toggle_switch`, `set_tab`
- AG Grid: `grid_set_filter`, `grid_clear_filters`, `grid_sort`, `grid_select_all`, `grid_multi_select`, `grid_click_row_button`
- Widgets: `create_widget` (bar/line/forecast/timeseries), `fetch_chart_context`
- Data: `search_data_catalog`, `fetch_timeseries`, `get_entity_mappings`, `get_feature_intelligence`, `generate_forecast`
- Plus `tavily_search_tool` + `SkillsToolset` loading SKILL.md files from `src/noname/.claude/skills/`

**ActionBroker pattern (critical, FinIQ has no equivalent):**
- Dashboard tools: `await ctx.deps.action_broker.request_action(session_id, action, timeout=10s)` — BLOCKS on asyncio.Future
- SSE emits `tool_call_start` with `is_dashboard_tool: true`
- Widget executes action, POSTs result to `/api/v1/chat/action-result`
- `action_broker.resolve(session_id, result)` sets Future, tool returns
- Agent knows action success/failure, can retry or recover
- Constraint: in-process only (single-worker); would need Redis pub/sub for multi-worker

**SSE protocol (`src/noname/app/api/routes/chat.py`):**
```
{"type":"text","content":"..."}
{"type":"tool_call_start","tool_name":"...","tool_call_id":"...","args":{...},"is_dashboard_tool":bool}
{"type":"tool_call_end","tool_call_id":"..."}
{"type":"done","widget_specs":[...]}
{"type":"error","content":"..."}
```

**Page context injection** (another FinIQ gap): every `/chat` request includes `<page_context>...</page_context>` with component IDs, AG Grid columnStats, active filters, chart IDs. This is why the agent can answer "filter this table" or "what's on screen."

**Deliverable: `D:/Amira FinIQ/QuantumAI_Voice_Integration_Proposal.md`** — 5000-word technical proposal for adding voice to Noname. Core pattern: voice is audio I/O only (OpenAI Realtime or Gemini Live for STT+TTS), transcribed text flows through the SAME `/api/v1/chat` endpoint as typed messages. No parallel agent. ~1-week senior effort. Covers Azure Foundry path, Gemini Live migration, and explicit callouts of FinIQ bugs NOT to repeat (silent-localhost-fallback pattern especially).

**Post-demo FinIQ improvements identified:** see `D:/Amira FinIQ/POST_DEMO_TODO.md` for the full list with risk + effort. Top candidates from Quantum AI patterns: page context injection (biggest UX gain), ActionBroker-style voice confirmation (fixes the class of bug we spent 6 hours diagnosing today), richer tool descriptions, skill-based prompt composition.

**Correction for future reference**: Farzaneh's memory "team shifted to Pydantic" was correct. My initial push-back was wrong — the README and root CLAUDE.md of quantum-ai say "Claude Agent SDK" but all Python code imports `from pydantic_ai import ...`. Docs are outdated. Always trust code over docs (the repo's own rule).

**Ground rules for future sessions on this repo:**
- Read-only. No modifications. No pushes. No commits.
- No CLAUDE.md or memory files inside the quantum-ai repo.
- Separate directory from FinIQ (`D:/QuantumAI/` vs `D:/Amira FinIQ/`) — don't confuse the two.
- Keep clone local (not deleted).
