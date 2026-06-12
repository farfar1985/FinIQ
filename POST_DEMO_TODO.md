# FinIQ + Amira Post-Demo TODO

**Status**: Active — April 21 MLT demo complete, outcome good, next phase confirmed.

> **2026-04-23 UPDATE**: Rajiv's FinAI MVP 2.0 Planning email (forwarded by Atif 2026-04-23) re-scoped the next 3-4 weeks into **7 tracks** with commercial proposal due **Monday 2026-04-27**. This document's two-track model is still useful as backlog detail, but the authoritative Phase 2 scope lives in the [FinAI MVP 2.0 Planning memo](C:/Users/farza/.claude/projects/D--Amira-FinIQ/memory/project_finai_mvp2_plan.md). Mapping: Track A (Spec Agent) → Phase 2 Track 2; Track B (FinIQ improvements) → Phase 2 Tracks 1, 4.

**Demo outcome (2026-04-21)**: Finance team impressed, Mars version pending QDL access. Rajiv + Cesar + Atif scoping next phase. Amira platform on Mars environment = the next big build.
**Two parallel tracks**: (A) **Spec Agent for Amira** (new build, Farzaneh + Claude) and (B) **FinIQ post-demo improvements** (maintenance/hardening).
**Estimated effort**: Spec Agent 2-6 weeks. FinIQ improvements 2-3 weeks sequential.

---

## 🎯 TRACK A: Spec Agent build (NEW — highest priority, post-demo)

This is Farzaneh's committed contribution to Amira's next phase, per Cesar's and Rajiv's framing in the FinIQ GenAI group chat on 2026-04-21.

**Background**: Rajiv scoped Amira as a 3-component platform — Spec Creation Agent + Coding Agent + Deployed Apps. Cesar asked Farzaneh to merge FinIQ's spec-driven process + Ashwin's OpenSpec suggestion into the Spec Agent component. Farzaneh committed.

**What it is**: Conversational agent that takes a business ask and produces structured specs (OpenSpec format preferred) that Cesar's Coding Agent can build from directly. Automates the "Stage A" of our 4-stage process — the part we've done by hand four times across FinIQ's v1.x → v3.1 evolution.

**Why doable**: stack is mature (Pydantic AI / Claude SDK / OpenAI Agents SDK / Google ADK all support multi-turn + structured output). We have rich reference material (SRS v3.1, BUILD_PROMPT, Testing Agent SRS). We already read OpenSpec docs in full on April 15 and wrote the integration mapping.

**Effort estimates**:
- Demo-scoped MVP: **2-3 weeks**
- Working POC (conversation + OpenSpec output + basic UI): **1-2 weeks**
- Production-ready Amira component (integrated, multi-tenant, session-persistent, compliance hand-off, polish): **4-6 weeks**

### Phase 0 — Interrogation (2026-04-22, 1 day)

Farzaneh + Claude do a structured planning session. Claude asks questions across 14 categories (see [project_spec_agent_plan.md](C:/Users/farza/.claude/projects/D--Amira-FinIQ/memory/project_spec_agent_plan.md) for the full list). Farzaneh brings: Cesar's Amira repo URL, Rajiv's detailed guided-workflow vision, Ashwin's OpenSpec commitment level.

Exit criteria: all 14 question categories answered. Agent architecture sketched. Integration contract with Amira understood. Scope boundaries drawn. Tech stack decided. Timeline agreed.

### Phase 1 — Architecture + contract design (2-3 days)

After interrogation session:
- Agent architecture doc (component diagram, conversation flow, message shapes)
- Amira integration contract doc (auth, session, multi-tenant, how agent is registered/invoked)
- Output-format adapter layer (OpenSpec emitter as first impl, swappable)
- Scope boundary doc (explicit list of what the agent does NOT do)

### Phase 2 — POC build (1-2 weeks)

- Conversational layer (multi-turn, clarification, propose-alternatives behavior)
- OpenSpec folder generator (`proposal.md` / `specs/` deltas / `design.md` / `tasks.md`)
- Input model (guided + free-form hybrid; refine based on Phase 0 decisions)
- Amira integration stubbed — local test only
- Dogfood: Farzaneh writes the next FinIQ feature spec using the Spec Agent. Iterate.

### Phase 3 — Amira integration (1-2 weeks)

- Plug into Cesar's Amira platform per the contract from Phase 1
- Multi-tenant support
- Session persistence
- Auth passthrough
- UI surface (Amira-native or embedded based on Phase 0 decision)

### Phase 4 — Polish + hand-off (1 week)

- Stage D (compliance loop) hand-off design — not the agent itself, but the contract between Spec Agent output and downstream verification
- Quality evaluation harness — can we tell if a generated spec is good before building from it?
- Documentation, training material for Mars + QDT dogfooding

### Hard rules for Spec Agent

- **Narrow scope.** Writes specs. Does NOT code. Does NOT verify builds. Does NOT deploy. Those are separate agents.
- **Preserve three-perspectives value** from FinIQ's bake-off era — propose alternatives at decision points, don't silently converge.
- **OpenSpec preferred, not required.** Output-format adapter layer so team can swap later.
- **Dogfood first.** QDT team uses it for next Amira specs before Mars sees it.
- **Don't bypass Amira platform conventions** — if Cesar has auth/session/tenant patterns, adopt them.

---

## 🔧 TRACK B: FinIQ post-demo improvements (maintenance)

---

## 🚨 PREREQUISITE — Do this first

### 0. Regression test suite

**Why first**: Most items below touch prompts or routing — the center of gravity for FinIQ response quality. Without automated regression detection, every change is a manual test round and we'll miss subtle regressions. With a test suite, most items become low-risk.

**What to build**:
```
tests/regression/
├── queries.json           # 30-40 curated queries with expected structure
├── run.ts                 # fires each against /api/query
├── compare.ts             # diffs vs last snapshot
└── snapshots/             # responses over time
```

**Assertions to make per query**:
- `intent` classification is correct (macro_context / cross_reference / competitor / financial / etc.)
- `data.columns` shape matches expected
- Key narrative phrases present ("Net Sales Total", "macro backdrop", etc.)
- Row count within expected range
- No regression markers (no "0.0%" when percentages expected, no dollar-formatted percentages)

**Queries to include** (minimum set):
- "How is Mars doing overall" → dashboard intent
- "What are the macro factors affecting Mars sales" → financial + macro enrichment
- "Plot the chart of US CPI over the years" → macro_only (pure QML)
- "Compare Hershey with Nestle" → competitor_only
- "Should Mars raise chocolate bar prices considering macro factors" → cross-source
- "Show Royal Canin key metrics by region" → financial pivoted
- "How are M&Ms sales performing" → brand_product view routing
- "Show me Mars revenue trend over 6 periods as a line chart" → chart type selection
- "What's on the job board" → job_board intent

**Effort**: 1-2 days.
**Blocks**: #2, #4 below (prompt-touching changes). Should ship before anything else.

---

## From Quantum AI — improvements to adopt

### 1. ActionBroker-style voice navigation confirmation

**Risk**: 🟢 Low
**Effort**: ~1 day
**Value**: High (voice reliability)

**Problem**: FinIQ's `navigate_to_page` voice tool fires `{ type: "navigate", page }` over WebSocket and assumes success. If `router.push` fails, the agent never knows — it says "I've taken you there" even when it hasn't. We spent 6 hours on 2026-04-20 diagnosing exactly this class of bug (voice container stale, navigation silently broken).

**Quantum AI pattern**: Dashboard tools call `await ctx.deps.action_broker.request_action(session_id, action, timeout=10s)`. The tool BLOCKS until the browser POSTs back a result. Agent gets real success/failure.

**For FinIQ**:
- Add `navigate_result` event type: browser posts `{ type: "navigate_result", success: bool, page: string, error?: string }` back over voice WebSocket after `router.push` completes
- Voice-server's navigate tool await a Promise resolved by that event (or 10s timeout)
- Return real success/failure string to OpenAI Realtime
- Narration becomes honest: *"I've taken you to the job board"* only when nav actually succeeded

**What to change**:
- `src/lib/voice-server.ts` — navigate tool handler awaits Promise
- `src/components/voice-bridge.tsx` — after `router.push`, post confirmation event
- `src/hooks/use-voice-agent.ts` — new event type in union

**Risk notes**: Low. If confirmation event never arrives within 10s, fall back to current behavior (fire-and-forget + assume success). Feature flag not strictly needed.

---

### 2. Page context injection ⭐

**Risk**: 🟡 Medium
**Effort**: 1-2 days
**Value**: Very high (unlocks new query classes)

**Problem**: FinIQ's agent has zero awareness of what the user is looking at. Every query is context-free. Breaks entire classes of queries:
- "Show me more of this" — can't
- "Filter this to just Petcare" — agent doesn't know which table
- "What's the biggest row on screen" — impossible
- "Why is that number red" — no idea what "that" means

**Quantum AI pattern**: Every `/chat` request includes `<page_context>...</page_context>` with component IDs, AG Grid columnStats (column value distributions), active filters, chart IDs, dropdown values.

**For FinIQ**:
- Context collector per page (simple: current route + visible KPI filters + CI tab + report entity/period)
- Inject into `/api/query` POST body as `context.page_state`
- Prefix SQL-generation prompt with context block
- System prompt guidance on how to use it

**What to change**:
- `src/lib/page-context.ts` — NEW: collector utilities per page
- `src/stores/ui-store.ts` — track current page state
- `src/components/unified/unified-content.tsx` — inject into /api/query body
- `src/app/api/query/route.ts` — prepend `<page_context>` to LLM prompt
- `src/lib/schema-context.ts` — system prompt addition explaining how to read page context

**Risk notes**: Prompt change = can regress LLM quality. Feature flag it (`NEXT_PUBLIC_ENABLE_PAGE_CONTEXT=true`). Start minimal (just current route + active Unit/period filters). Grow context surface only after regression tests stay green. Token budget: keep context <500 tokens.

---

### 3. Better tool / intent descriptions

**Risk**: 🟢 Very low
**Effort**: Half day
**Value**: Moderate (improves LLM tool-selection accuracy)

**Problem**: FinIQ's tool schemas and intent descriptions in the LLM prompt are terse. Quantum AI's docstrings are dense and prescriptive ("Copy filter values EXACTLY from columnStats", "Returns a per-group summary — share this with the user", etc.). Richer descriptions = better tool selection.

**For FinIQ**:
- Rewrite tool descriptions in `voice-server.ts` TOOLS array — add usage hints, examples, warnings
- Expand entity-alias mappings in `schema-context.ts` with "why" explanations for each
- Example: instead of *"Petcare" → LIKE '%petcare%'*, write *"Petcare (the GBU) — filter by Unit_Alias LIKE '%petcare%'. Returns GBU-level aggregate. For specific brands like Pedigree, see brand_product view instead."*

**What to change**:
- `src/lib/schema-context.ts` — richer descriptions
- `src/lib/voice-server.ts` TOOLS array — richer tool descriptions

**Risk notes**: Text-only prompt changes. Worst case: LLM picks slightly different tool for ambiguous queries. Usually an improvement. No breaking change.

---

### 4. Skill-based system prompt composition

**Risk**: 🔴 Medium-high
**Effort**: 2-3 days
**Value**: Moderate (cleanliness, scales to more domains)

**Problem**: `schema-context.ts` is one giant system prompt covering Databricks schema, Unit_Alias mappings, brand routing, macro handling, shape metric rules, etc. As FinIQ grows, this bloats and the LLM's attention gets diluted across unrelated concerns.

**Quantum AI pattern**: `SkillsToolset` loads page-specific SKILL.md files dynamically. When user is on forecast page, `forecast-dash` skill loads with forecast-specific instructions.

**For FinIQ**:
- Break `schema-context.ts` into fragments: `skills/financial.md`, `skills/competitive.md`, `skills/reports.md`, `skills/macro.md`, `skills/brand.md`, `skills/jobs.md`
- Composition layer: query classifier decides which skills to load per-request
- System prompt becomes: base instructions + loaded skills

**What to change**:
- `src/lib/skills/` — NEW directory with per-domain context fragments
- `src/lib/skills-loader.ts` — NEW: composition logic
- `src/app/api/query/route.ts` — replace monolithic SCHEMA_CONTEXT with dynamic composition
- `src/lib/schema-context.ts` — becomes a re-export of the base layer

**Risk notes**: 🔴 DO NOT ship without regression test suite (#0). Splitting prompts risks losing cross-domain context (agent handling financial query might not see CI context when relevant). Skill selection itself can misfire. Highest-risk item on this list. Do LAST.

---

### 5. Prompt caching reorder for OpenAI prefix caching

**Risk**: 🟢 Low
**Effort**: 2-4 hours
**Value**: Moderate (latency + cost improvement)

**Problem**: FinIQ uses OpenAI gpt-5.4-mini which has automatic prefix caching for prompts >1024 tokens. But only activates when the prefix is stable. Current FinIQ prompts inject dynamic values (current date, entity context, period) near the top of the prompt, which breaks caching.

**Quantum AI equivalent**: Pydantic AI with Anthropic caching at 3 levels (`anthropic_cache_instructions=True`, `anthropic_cache_tool_definitions="1h"`, `anthropic_cache_messages=True`). Not directly portable to OpenAI, but the principle (stable prefix → cache hit) applies.

**For FinIQ**:
- Restructure the `SCHEMA_CONTEXT` template literal to put stable content first (schema, mappings, instructions), dynamic interpolation at END (current date, user context)
- Measure cached vs uncached latency/cost before and after
- Expected improvement: 20-40% latency reduction on cached queries (same session, same user)

**What to change**:
- `src/lib/schema-context.ts` — reorder template literal, move dynamic interpolation to footer
- `src/app/api/query/route.ts` — any other prompt assembly sites

**Risk notes**: Reordering might subtly change LLM attention. Worst case: no improvement, no regression. Low risk.

---

### 6. `is_dashboard_tool` / `tool_kind` flag on events

**Risk**: 🟢 Very low
**Effort**: 1-2 hours
**Value**: Low-moderate (UX polish)

**Problem**: FinIQ's voice drawer shows the same "Querying: X" UI for all tool calls — navigation, data fetch, macro enrichment, everything. Would be cleaner to distinguish "Navigating to job board..." (action) from "Looking up Mars revenue..." (data).

**Quantum AI pattern**: SSE event `tool_call_start` includes `is_dashboard_tool: bool`. Frontend can style differently.

**For FinIQ**:
- Add `tool_kind: "action" | "data" | "macro"` to voice status events
- Voice drawer renders different icons/phrasing per kind

**What to change**:
- `src/hooks/use-voice-agent.ts` — event type addition
- `src/components/voice-indicator.tsx` — conditional styling/phrasing

**Risk notes**: Purely additive. UI that doesn't read the new field falls back to current behavior.

---

### 7. Document multi-worker and scalability constraints

**Risk**: 🟢 Zero (documentation only)
**Effort**: Few hours
**Value**: Saves future ops surprise

**Quantum AI pattern**: ActionBroker has this docstring:
> *"Uses in-process asyncio.Future objects. Only works with single-worker process. For multi-worker, a Redis pub/sub broker would be needed."*

**For FinIQ**:
- Document every in-memory / in-process assumption at the source
  - `job-store.ts` — in-memory Map; doesn't scale past 1 container instance
  - `query-cache.ts` — in-memory; loses cache on restart; not shared across replicas
  - `job-persistence.ts` — file-based; doesn't scale; local filesystem only
  - Voice session state — in-memory; requires sticky WebSocket routing
- Mark which ones WILL bite us and at what scale

**Risk notes**: n/a, text-only change.

---

## From our own dev process — other post-demo residuals

### A. Fix the silent-localhost-fallback anti-pattern

**Risk**: 🟢 Low
**Effort**: Half day
**Value**: High (prevents a class of bug we've hit 3 times)

**Problem**: Pattern `process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"` has silently broken in production 3 separate times:
- Apr 14 — `/api/query` internal calls (cross-ref, CI narrative, dashboard)
- Apr 20 morning — same issue discovered in job processor (actually fine, /api/query handles it now)
- Apr 20 evening — voice-server.ts on Azure (Cesar had to set env var)

**Fix pattern** (already designed in the Quantum AI proposal):
```typescript
function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  const azureHost = process.env.WEBSITE_HOSTNAME;
  if (azureHost?.includes("-voice")) {
    return `https://${azureHost.replace("-voice", "-app")}`;
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("API base URL not configured and cannot auto-detect from WEBSITE_HOSTNAME");
  }
  return "http://localhost:3000";
}
```

**What to change**:
- `src/lib/voice-server.ts` — all tool handlers (4 locations)
- `src/app/api/query/route.ts` — internal api-to-api call sites
- `src/app/api/jobs/route.ts` — similar
- Other places: `grep -rn "http://localhost:3000" src/`

**Risk notes**: Low. Actually REDUCES risk of silent production failure.

---

### B. DB-backed chat session persistence

**Risk**: 🟡 Medium
**Effort**: 2-3 days
**Value**: High for production; low for demo

**Problem**: FinIQ uses localStorage for chat history. Survives nothing. If browser closes, crashes, or user moves devices, conversation is lost. For a Mars production tool this is unusable.

**Quantum AI pattern**: Postgres-backed sessions + messages table, with Pydantic AI `ModelMessagesTypeAdapter` for serialization.

**For FinIQ**:
- Choose storage: Postgres? Cosmos DB? Azure Storage? (Matches existing Mars infra)
- Session model: `{ session_id, user_id, created_at, updated_at, title }`
- Message model: `{ id, session_id, role, content, timestamp, intent, metadata }`
- Session list sidebar (like ChatGPT)
- Resume on page load
- Cross-device sync

**What to change**: New schema + migrations + API routes + UI changes. Non-trivial.

**Risk notes**: Large scope. Only do if post-demo scaling requires it. For Rajiv's "chat history in sidebar" request per April 14 notes, this would also satisfy that.

---

### C. Per-row formatting for all mixed-semantic columns

**Risk**: 🟢 Low
**Effort**: Half day
**Value**: Moderate (display correctness)

**Problem**: We fixed Growth % rows showing `0.0` via per-row RL_Alias-based formatting. But the same class of bug exists elsewhere:
- `Third_Party_Volume_Tonnes` rendered as `$4.1M` on Royal Canin query (tonnes, not dollars)
- Any future query that pulls mixed units into a shared Value column

**For FinIQ**:
- Generalize the per-row override to check for unit indicators in RL_Alias (`_Tonnes`, `_Kg`, `_USD`, etc.) or in column name
- Add rendering rules per unit type: tonnes as `4.1M tonnes`, KG as `4.1M kg`, etc.

**What to change**:
- `src/app/api/query/route.ts` — extend per-row formatting logic around line 763

**Risk notes**: Low, extends existing pattern.

---

### D. Azure OpenAI Foundry migration for Mars production

**Risk**: 🟡 Medium
**Effort**: 1 day
**Value**: Required for Mars production deployment

**Problem**: FinIQ uses `openai.com` direct. Mars's Azure AI Foundry policy requires Azure OpenAI Foundry for production Mars deployments. We agreed to push this until post-demo.

**What to change**:
- OpenAI client factory accepts Foundry endpoint config
- Env vars: `FOUNDRY_ENDPOINT`, `FOUNDRY_CHAT_DEPLOYMENT`, `FOUNDRY_REALTIME_DEPLOYMENT`
- Voice-server.ts already has Foundry Realtime URL support
- Test against Mars-provisioned Foundry deployment

**Risk notes**: Mars might have different available models than OpenAI direct. Test model compatibility. Check token limits, rate limits.

---

### E. Learn and use Cesar's Claude Code deployment skill

**Risk**: 🟢 Zero (operational improvement)
**Effort**: 1 hour learning
**Value**: Saves hours per deployment cycle

**Problem**: On Apr 20 we spent 6 hours on back-and-forth: push code → Cesar manually redeploys Next.js → stale voice container → diagnose → Cesar force-rebuilds → set env var → restart. Cesar mentioned he has a Claude Code skill that automates this sequence.

> *Cesar on WhatsApp: "you'll like this skill that I'll share with you Farzaneh and Ale, it's the deployment one :) you will ask now your Claude Code agent, 'I finished this, deploy it to Mars' and it will do every piece needed for you to also deploy it :D"*

**What to do**:
- Get the skill from Cesar
- Install it in Claude Code plugin / skills directory
- Document usage in CLAUDE.md so future sessions know it exists
- Use it for the Mars deployment flow post-demo

**Risk notes**: n/a, pure tooling adoption.

---

### F. Gemini Live evaluation for Mars Google preference

**Risk**: 🟡 Medium
**Effort**: 2-3 days evaluation, more if we actually migrate
**Value**: Alignment with Mars's long-term Google preference

**Context**: Mars prefers Google stack per strategy notes. FinIQ voice is OpenAI Realtime. Post-demo window is the right time to evaluate Gemini Live as a swap-in replacement.

**What to do**:
- Prototype Gemini Live in voice-server.ts alongside OpenAI Realtime
- A/B compare: latency, transcription accuracy, TTS quality, interruption handling
- Feature flag switch per user or environment
- Full migration plan if evaluation positive

**Risk notes**: Gemini Live is less mature than OpenAI Realtime. Tooling around it less documented. Evaluate before committing.

---

## 📋 Recommended execution order

Post-demo, in sequence:

1. **[Prereq] #0 Regression test suite** — 1-2 days. Must ship before any prompt-touching change.
2. **#7 Document constraints** — few hours. Free win, hygiene.
3. **A. Silent-localhost-fallback fix** — half day. Low risk, prevents recurring bug.
4. **#3 Better tool descriptions** — half day. Low risk, incremental improvement.
5. **#6 Tool kind flag** — 1-2 hours. Trivial UX polish.
6. **#1 ActionBroker voice confirmation** — 1 day. Isolated, safe, improves voice reliability.
7. **#5 Prompt caching reorder** — few hours. Latency/cost win.
8. **C. Per-row formatting generalization** — half day. Low risk.
9. **#2 Page context injection** — 2 days (feature flagged). Biggest user-visible gain. Ship after #0 is green.
10. **#4 Skill composition** — 2-3 days. Biggest refactor; do last. Must have regression suite.
11. **E. Cesar's deployment skill** — 1 hour, can do anytime.
12. **D. Azure Foundry migration** — 1 day. When Mars provides credentials.
13. **B. DB session persistence** — 2-3 days. Only if production scaling requires it.
14. **F. Gemini Live evaluation** — 2-3 days. When Mars deployment direction is clear.

**Total timeline if done sequentially**: ~3 weeks of focused work. Done in parallel by 2 engineers: ~1.5 weeks.

---

## 🚫 What NOT to do post-demo

- **Don't rewrite the frontend to assistant-ui**. FinIQ's custom chat UI works. Rewriting to match Quantum AI's stack is a 2-week project with no user-visible benefit. Skip.
- **Don't migrate FinIQ's backend to Pydantic AI / FastAPI**. Next.js serves FinIQ fine. Migration cost >> benefit. Skip.
- **Don't copy Quantum AI's Dash widget embedding pattern**. FinIQ doesn't have a separate dashboard app to embed into. Not applicable.

---

## 📌 Open questions for the team

1. **Who owns the post-demo roadmap?** Is Farzaneh still driving, or does it go to Cesar/Ale for execution?
2. **Post-demo timeline**: if Bruce approves on April 21, what's the window before Mars expects a production-ready version?
3. **Multi-customer vs Mars-only**: is FinIQ going to be Mars-specific forever, or generalized for other QDT customers (like Quantum AI is)? Changes priority of several items (session persistence, skill composition, auth).
4. **Gemini Live priority**: Mars preference is strong but not mandatory. Is this a Q3 concern or a Q2 concern?
5. **Regression test authoring**: who curates the golden query set? Farzaneh has the most demo context; Ale has the most tech context.

---

*Generated 2026-04-20 after Quantum AI architecture review. Updates welcome as demo outcomes and Mars response shape priorities.*
