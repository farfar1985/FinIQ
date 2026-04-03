# Amira FinIQ — Claude Code Context

## What is this project?
Amira FinIQ is a **Unified Financial Analytics Hub** being proposed by Amira Technologies for Mars, Incorporated. It consolidates and augments Mars's existing AI analytics tools into a single intelligent platform with an enterprise agent job board.

**Client**: Mars, Incorporated
**Prepared By**: Amira Technologies (QDT team)
**Project Lead**: Farzaneh

## IMPORTANT: Active Work — UNIFIED APP ON MAIN
- **PRIMARY WORK**: `ale-build/` directory, branch `main` on github.com/quantumdatatechnologies/fin_iq
- **3-way merge COMPLETE** (2026-04-01) — all 8 phases + PR merged to main
- **Phase 8 committed + pushed** (2026-04-02) — commit 734426f on main
- **Team pulls main** to get the full unified app (through Phase 8)
- **v2-fresh branch**: Our completed build (80/80 compliance) — archived, was source material for merge
- **DO NOT use `master`** — that has the old Artemis v1 code (archived)

### Merge Progress — COMPLETE (2026-04-01)
| Commit | Phase | Status |
|--------|-------|--------|
| f7fd9cb | Phase 1: Schema rename (Entity→Unit, Account→RL) | ✅ Pushed |
| e214d13 | Phase 2a: Anthropic LLM query engine + schema context | ✅ Pushed |
| 9eee3c1 | Phase 3b: Job board + XLSX export + rate limiting | ✅ Pushed |
| effddab | Phase 3a: Rajiv's CI features (Alerts, ProvenanceBadge, SimpleChart, ticker) | ✅ Pushed |
| d28577f | Phase 3a-ext: Full Rajiv CI engine (10-tab page, query-engine, fmp-fetcher) | ✅ Pushed |
| c965369 | Phase 2b-partial: Voice agent WebSocket proxy server | ✅ Pushed |
| 2fb3123 | Phase 2b: Voice page UI + sidebar nav | ✅ Pushed |
| 4bc2b8b | Phase 4: Fix all FAILs + Cesar semantic layer | ✅ Pushed |
| — | Phase 4c: PR merged → main | ✅ Done |
| a83e5c6 | Phase 6: Chart Y-axis bug + warehouse keep-alive | ✅ Pushed |
| 8ea2c3f | Phase 7: Parallel queries + pre-warm cache + API key fix | ✅ Pushed |
| 734426f | Phase 8: LLM determinism, job board UX, persistence, recent queries | ✅ Pushed |
| a8e652b | Phase 9: CI NLP, M&A timeline, dynamic imports, drill-down, disclosure | ✅ Pushed |

### Phase 5: Query Engine + UX + Real Data (2026-04-01)

| Fix | Description | File(s) |
|-----|-------------|---------|
| Unit alias fuzzy matching | Expanded to ~45 aliases + Levenshtein distance (catches typos) | `src/lib/llm-query.ts` |
| Chart follow-ups | "Show as chart" re-renders existing data, 12+ patterns | `src/lib/llm-query.ts`, `src/app/api/query/route.ts` |
| Interactive chat UX | Typing indicator, follow-up chips, animations, welcome screen | `src/components/query/query-content.tsx` |
| Budget variance fixes | Period extraction, context fallback, ALL_GBUS aggregation | `src/lib/llm-query.ts` |
| SSE broadcast fix | Extracted `broadcastEvent` to lib (was breaking `next build`) | `src/lib/sse-broadcast.ts` (NEW) |
| Multi-turn context | Entity/period flows properly through follow-up queries | `src/app/api/query/route.ts` |
| **Databricks REST API** | Replaced SDK with SQL Statements REST API (SDK had 404 issues) | `src/data/databricks.ts` |
| **Dashboard real data** | All widgets fetch from Databricks: KPIs, revenue, P&L summary | `src/app/api/dashboard/route.ts` (NEW) |
| **Reports real data** | PES + variance fetch from Databricks | `src/app/api/reports/route.ts` (NEW) |
| **Query real data** | NL queries generate SQL → execute against real Databricks | `src/app/api/query/route.ts` |
| **All components updated** | Dashboard, reports, competitors, jobs fetch from APIs not simulated | `src/components/dashboard/*.tsx`, `reports/` |
| **Warehouse auto-start** | Detects STOPPED warehouse, starts it, polls until RUNNING | `src/data/databricks.ts` |
| **Response caching** | Dashboard cached 5min to avoid re-querying on refresh | `src/app/api/dashboard/route.ts` |
| **FMP field mapping** | Competitors card maps FMP API fields to display interface | `src/components/dashboard/competitors-card.tsx` |
| **Reports year selector** | FY2020-FY2026 + 13-period fiscal year (was only 2024-2025, 12 periods) | `src/components/reports/reports-content.tsx` |
| **Query case-insensitive** | LLM uses LOWER() for Unit_Alias + common unit mappings in prompt | `src/app/api/query/route.ts` |
| **RL_Alias mapping** | Maps 22 Databricks reporting line names to simulated account codes | `src/components/reports/reports-content.tsx` |
| **Budget variance Date_ID** | Fixed YYYYPP format (was wrong), year change triggers refetch | `src/components/reports/reports-content.tsx` |
| **Reports real entities** | Entity dropdown shows 500+ real Databricks Unit_Alias names | `src/components/reports/reports-content.tsx` |
| **Reports Generate btn** | Fetches real P&L from Databricks on click, shows loading state | `src/components/reports/reports-content.tsx` |
| **Custom Report Builder** | FR2.5: Select KPIs, entity, periods → query Databricks | `src/components/reports/reports-content.tsx` |
| **RBAC module** | FR7.5: 4 roles, permission matrix, header-based auth | `src/lib/auth.ts` (NEW) |
| **PES WWW/WNWW** | FR2.1: Distinct narrative tone per format (positive vs action-oriented) | `src/components/reports/reports-content.tsx` |
| **Admin RBAC + Org + Peers** | FR7.1-7.3, 7.5: Roles, org hierarchy (6 levels), peer groups (4) | `src/components/admin/admin-content.tsx` |

| **KPI Detail table** | Passes real Databricks data to detail table (was showing dashes) | `src/components/reports/reports-content.tsx` |
| **Hydration fix** | Defers LIVE/SIM badge to client mount (fixes SSR mismatch) | `src/components/header.tsx` |

**Compliance estimate: 67.5/80 (84.4%)** — rigorous re-audit on 2026-04-02 (down from optimistic 73/80 self-score, up from 61/80 baseline after Phase 9 fixes)

### Phase 6: Ale Review Fixes (2026-04-02)

| Fix | Description | File(s) |
|-----|-------------|---------|
| Chart Y-axis bug | Charts were plotting Date_ID (~202505) as Y-axis instead of actual metric values. LLM now returns `labelColumn` and `valueColumn` in its JSON response to pick the right columns. Heuristic fallback skips ID/date columns, prefers `_Value` columns. | `src/app/api/query/route.ts` |
| Warehouse keep-alive | Added `/api/health` endpoint that checks/starts warehouse + `WarehouseKeepAlive` client component that pings every 5min to prevent 10min idle auto-stop | `src/app/api/health/route.ts` (NEW), `src/components/warehouse-keepalive.tsx` (NEW), `src/app/layout.tsx` |

**Cesar confirmed**: Serverless warehouse warmup is expected behavior. In production with real multi-user traffic, warehouse stays warm. Keep-alive is a dev/demo convenience.

### Phase 7: Performance + API Key Fix (2026-04-02)

| Fix | Description | File(s) |
|-----|-------------|---------|
| Parallel dashboard queries | Dashboard was running 4 Databricks queries sequentially (~12min). Now uses `Promise.all` to run in parallel (~3min). | `src/app/api/dashboard/route.ts` |
| Pre-warm cache on boot | Dashboard cache fires queries on server startup. Frontend retries on HTTP 202 while warming. Users see instant data after ~3min boot. | `src/app/api/dashboard/route.ts`, `src/components/dashboard/*.tsx` |
| ANTHROPIC_API_KEY fix | Claude Code env overrides `ANTHROPIC_API_KEY` with empty string. Added `FINIQ_ANTHROPIC_KEY` as primary fallback. Query engine was silently broken. | `src/app/api/query/route.ts`, `src/lib/llm-query.ts`, `src/app/api/jobs/route.ts`, `.env` |

**Root cause of dashboard latency**: Databricks views (`finiq_vw_pl_unit`) scan 5.7B rows per query. ~3min per query is Databricks-side. Materialized views or pre-aggregated tables (Cesar's side) would make this instant.

**Commit**: 8ea2c3f (pushed to merged branch), then Phase 8: 734426f (pushed to main)

### Phase 8: LLM Determinism + Job Board UX + Recent Queries (2026-04-02)

| Fix | Description | File(s) |
|-----|-------------|---------|
| **Temperature 0** | All 7 LLM calls (query, jobs, PES, ad-hoc) set to `temperature: 0` — eliminates inconsistent SQL generation Ale reported | `src/app/api/query/route.ts`, `src/app/api/jobs/route.ts`, `src/lib/llm-query.ts` |
| **Job Board priority selector** | Inline priority dropdown (Critical/High/Med/Low) when submitting from query page | `src/components/query/query-content.tsx` |
| **Job Board editable** | Edit button on job detail: change title + priority on non-processing jobs, SLA recalculates | `src/components/jobs/jobs-content.tsx`, `src/app/api/jobs/[id]/route.ts` |
| **Job persistence** | Jobs saved to `data/jobs.json` on every mutation, loaded on startup — survives app restarts | `src/lib/job-persistence.ts` (NEW), `src/app/api/jobs/route.ts` |
| **Recent queries** | localStorage-based with real timestamps, `formatTimeAgo()`, max 10, deduplication, clickable | `src/components/query/query-content.tsx` |
| **Chart percentage detection** | Columns with `_Pct`/`growth`/`margin` or values between -1..1 auto-format as percentages; heuristic prefers meaningful columns over raw decimals | `src/app/api/query/route.ts` |
| **Number formatting** | Added `$K` tier for thousands (was only `$M` or raw); percentage columns multiply ×100 | `src/app/api/query/route.ts` |

**Status**: All 6 items DONE — committed and pushed to main (commit 734426f, 2026-04-02)

### Phase 9: Compliance Fixes — Safe Batch (2026-04-02)

| Fix | Description | File(s) |
|-----|-------------|---------|
| **FR1.3: 10 competitors** | Synced FMP_COMPETITORS to all 10 tickers (was 7 in constants.ts) | `src/lib/constants.ts` |
| **CI3: Earnings NLP** | TranscriptInsights component — sentiment analysis, topic extraction, key quotes from transcripts | `src/components/competitive/competitive-content.tsx` |
| **CI6: M&A Timeline** | Replaced plain table with visual timeline (deal cards, chronological dots, links) | `src/components/competitive/competitive-content.tsx` |
| **FR8.9: Dynamic imports** | next/dynamic lazy loading on 4 pages (query, reports, jobs, explorer) with loading states | `src/app/query/page.tsx`, `reports/`, `jobs/`, `explorer/` |
| **FR8.2: Drill-down** | KPI data table rows expand on click to show CY/LY detail with bps changes | `src/components/reports/reports-content.tsx` |
| **FR8.8: Progressive disclosure** | Narrative cards now collapsible (click header to expand/collapse, shows YTD in header) | `src/components/reports/reports-content.tsx` |

**Commit**: a8e652b (pushed to main)

### Cleanup: Remove Ale's 50-item compliance matrix (2026-04-02)

Deleted `compliance/compliance-matrix.json` + `compliance/score.ts` — Ale's original 50-item self-assessment (self-scored 100%). Our 80-item matrix in BUILD_PROMPT.md is a strict superset. Removed to avoid confusion.

**Commit**: a739772 (pushed to main)

### Fix: CI3/CI6 applied to correct file (2026-04-02)

Phase 9 CI fixes were applied to `competitive-content.tsx` (unused component). Moved NLP sentiment analysis and M&A timeline to the actual `competitive/page.tsx` that renders.

**Commit**: da40d28 (pushed to main)

### Fix: Query cache key normalization (2026-04-02)

Cache key included context (entity/period) from conversation history which changed between identical queries, causing false cache misses. Now keys on normalized query text only — repeated queries return instantly from cache (10min TTL).

**Commit**: 548c9d4 (pushed to main)

### Fix: Voice agent working (2026-04-02)

Voice agent was broken since initial build. Three issues fixed:
1. **Standalone .env loading** — voice-server.ts runs outside Next.js, wasn't loading .env. Added manual parser with force-override (Claude Code injects wrong env values).
2. **Audio type mismatch** — client sent `input_audio_buffer.append`, server only handled `audio`. Added both.
3. **No audio playback** — OpenAI voice responses were received but discarded. Added PCM16→Float32 decoder with sequential chunk scheduling. Mic routed through silent gain node to prevent echo.

**Voice agent now fully working**: mic capture → WebSocket proxy → OpenAI Realtime API → tool calls (query_financial_data hits Databricks) → voice response + transcript. Tested live with Petcare organic growth query returning real data.

**Known issues**: Response latency from Databricks tool calls (cold warehouse = 2-3min).

**Uncommitted voice improvements (testing):**
- **Inline chart rendering** — voice UI now renders Recharts bar/area charts from tool call `data.display` events. Auto-detects label/value columns from query response data.
- **Interruption support** — user speech stops all queued assistant audio immediately (`stopAllPlayback` on `speech.started`). Tracks active `AudioBufferSourceNode` array.
- **Tool call status** — shows "Querying: query_financial_data..." while tool calls are in progress.
- **Audio type matching** — client now handles both server-remapped types (`audio`, `transcript.agent.done`, `speech.started`) and raw OpenAI types.

**Commit**: 7fbd77c (pushed to main) — additional fixes uncommitted, pending testing

### Compliance Re-Audit (2026-04-02) — Rigorous Fresh Score

Previous self-score of 73/80 (91.3%) was optimistic. Fresh honest audit scored **61/80 (76.3%)**.
After Phase 9 safe fixes: **67.5/80 (84.4%)**

| Section | Score | Pct |
|---------|-------|-----|
| Functional (52) | 42.5/52 | 81.7% |
| Design (15) | 15/15 | 100% |
| CI/FMP (6) | 6/6 | 100% |
| Technical (7) | 5.5/7 | 78.6% |
| **TOTAL** | **67.5/80** | **84.4%** |

**Remaining gaps (12.5 points):**
- T1: SQL parameterization (0 → touches data flow)
- FR1.4: Data lineage (0 → new feature, touches data flow)
- FR2.2: Configurable KPIs (0 → touches reports)
- FR3.3: Internal-external cross-ref (0 → touches query)
- FR8.6: WCAG accessibility (0.5)
- FR4.2: Multi-turn context (0.5)
- FR8.4: Adaptive query (0.5)
- Various other partials at 0.5

### Fix: Reports page React key error (2026-04-03)

`KPITableBody` in `reports-content.tsx` had `key` on `<TableRow>` inside bare fragment (`<>...</>`). React needs key on outermost element. Fixed to `<React.Fragment key={...}>`. Added `import React` to file.

### Phase 10: Demo Polish — PROPOSED (2026-04-03, pending team approval)

**Branch**: `phase-10-demo-polish` off `main` (safe — won't touch working app)
**Goal**: Maximize demo impact for April 21 MLT meeting with Bruce Simpson

**Priority order:**
1. **Query reliability** — Curate 10-15 demo queries that work flawlessly. Fix unit name mismatches.
2. **Internal vs External cross-ref (FR3.3)** — "How does Mars OG compare to Nestle?" Databricks + FMP in one answer. The unified platform pitch.
3. **Actual vs Replan (FR6.1)** — finiq_financial_replan data exists. Finance execs care most about actual vs budget.
4. **Voice agent pre-warming** — Pre-warm warehouse + cache demo queries. Cold start kills live demo.
5. **One-click Executive Summary** — "Generate Board Report" for any entity/period on demand.
6. **Data lineage breadcrumbs (FR1.4)** — Full path: Databricks → view → filter → result. We have ProvenanceBadge but need detailed trail.
7. **SQL parameterization (T1)** — Technical reviewers would flag injection as dealbreaker.

**Potential compliance uplift**: 67.5 → ~75/80 (93.8%) if all items completed

**Skip**: Marketing Analytics API (no real API), drag-drop dashboard, multi-panel workspace

### Simulated Data Removal (2026-04-01) — PUSHED (commit 4d10871)
All simulated fallbacks removed. Single mode: real data only.
**Issue**: Dashboard took ~12min on cold start due to sequential billion-row view scans.
**Resolved**: Parallel queries + pre-warm cache (Phase 7). Cesar confirmed warmup is normal for serverless.

### Commits pushed (2026-04-02)
| Commit | Description |
|--------|-------------|
| a8e652b | Phase 9: CI NLP, M&A timeline, dynamic imports, drill-down, progressive disclosure |
| a739772 | Cleanup: Remove Ale's 50-item compliance matrix (superseded by 80-item) |
| da40d28 | Fix CI3/CI6: Apply NLP analysis + M&A timeline to actual competitive page |
| 548c9d4 | Fix query cache: key on query text only, not context |
| 7fbd77c | Fix voice agent: .env loading, audio routing, playback, echo removal |
| 734426f | Phase 8: LLM determinism, job board UX, persistence, recent queries, chart fixes |
| 8ea2c3f | Phase 7: Parallel queries + pre-warm cache + API key fix |
| a83e5c6 | Phase 6: Chart Y-axis bug + warehouse keep-alive |

### Commits pushed (2026-04-01) — 10 total
| Commit | Description |
|--------|-------------|
| 92154e1 | Phase 5: Real Databricks + interactive chat + dashboard |
| 864226f | Reports year selector FY2020-2026 + 13 periods |
| bc0c133 | Reports wired to real Databricks |
| dddc7fc | Query case-insensitive unit matching |
| e4a731c | Reports RL_Alias → account code mapping |
| c878827 | Budget Variance Date_ID fix |
| 52bd673 | Custom Report Builder, RBAC, PES formats, Admin panels |
| cab27ce | KPI Detail table uses real data |
| 34c87b1 | Hydration fix (LIVE/SIM badge) |
| 4d10871 | Remove all simulated data — real Databricks only |

### Phase 4a FAIL Fixes (2026-03-31 evening)
| FAIL | Resolution |
|------|-----------|
| FR8.11: Undo/redo | Already in Explorer; added to Query page (Ctrl+Z/Y, buttons) |
| FR8.3: Real-time SSE | Already implemented (`/api/jobs/stream` + EventSource client) |
| FR5.6: Job scheduling | Already implemented (cron parser, 60s checker, one-time support) |
| CI#71: Porter's Five Forces | Added PortersFiveForces component (5 forces, peer data, scoring) |
| FR1.2: PDF ingestion | Already implemented (`/api/upload` + `/api/ingest` routes) |

### Phase 4a+ Additional Fixes (2026-03-31 evening)
| Item | Resolution |
|------|-----------|
| Tech#74: SQL injection | Sanitized column names + values in databricks.ts queryTable() |
| Design#63: Treemap | Added RevenueTreemap component to dashboard |
| FR5.7: Collaborative review | Added approve/reject/comment actions to job [id] API |
| FR6.2: Marketing Analytics | Added `/api/marketing` route (simulated, ready for Amira API) |
| FR6.3: Recommendation engine | Added `/api/recommendations` with unified cross-source recs |
| FR8.1: Drag-drop dashboard | Added DraggableWidget with HTML5 drag-drop reordering |

**Compliance estimate: 68/80 PASS (~85%), 0 FAILs remaining** — all items PASS or PARTIAL

### Live Testing Results (2026-03-31 night)
- **App running locally** at localhost:3000 with Node 20 (Node 22 incompatible with Next.js 15 edge runtime)
- **LIVE Databricks connected** — real production data flowing (P&L, MAC, revenue queries working)
- **FMP API connected** — real competitor stock prices and financials (Mondelez $57.64, Hershey $207.90, etc.)
- **Claude Haiku LLM connected** — NL queries generating SQL against real Databricks
- **OpenAI API key configured** — voice agent ready

### Known Issues from Live Testing
- Budget variance query fails — LLM uses "ALL_GBUS" as unit name (doesn't exist). Needs alias mapping or prompt fix
- Brand-level and NCFO queries fail — LLM uses informal names ("Mars Wrigley", "Pet Nutrition") instead of exact Unit_Alias from Databricks (e.g., "MW USA Market"). Needs unit lookup or fuzzy matching
- Node 22 incompatible — must use Node 20 binary at `C:\Users\farza\.node20\node-v20.18.3-win-x64\`
- `next build` not tested yet — only dev mode confirmed working
- ~~Voice agent connects to OpenAI but browser audio capture not working~~ **FIXED** (commit 7fbd77c) — .env loading, audio type mismatch, no playback code. Now fully working.
- Voice agent: no inline chart rendering (text-only transcript), response latency from Databricks tool calls
- "Show me a chart" follow-up doesn't re-render previous data as chart — needs follow-up detection

### Query Routing Fixes (2026-04-01 12:25am — commit 475977e)
- Competitor detection: "coca cola", "pepsi", "danone" now correctly route to CI engine
- `classifyIntent()` now calls `isCIQuery()` first — competitors never fall through to PES
- Schema-context guardrails: LLM instructed to reject unknown units, flag competitors
- Job Board fallback: "Submit to Job Board" button appears on no-data responses
- Data mode: `NEXT_PUBLIC_DATA_MODE=real` respected on client + `onRehydrateStorage` override

### Source repos for merge
- **ale-build/**: Ale's repo clone (UI base, dashboard, explorer, reports, OKLCH theme)
- **rajiv-build/**: Rajiv's repo clone (CI module, header, ProvenanceBadge, SimpleChart)
- **app/**: Our v2-fresh (LLM engine, voice agent, job board, XLSX, rate limiting)

## Project status
- **SRS v3.1 CURRENT (2026-03-27)**: `FinIQ SRS v3.1 Final.docx` — Adds Section 7 (CI/FMP API integration, SWOT, Porter's Five Forces, Earnings Call Intelligence), FR4.5 (Suggested Prompt Library), FR4.6 (Prompt Variable Resolution), Appendix C (18 curated prompts). 52 functional requirements. Created by Rajiv.
- **Frontend Design Guideline v1.0 CURRENT (2026-03-27)**: `FinIQ Frontend Design Guideline v1.0.docx` — Bloomberg-inspired dark-first design system. OKLCH colors, IBM Plex Sans + JetBrains Mono, shadcn/ui components, Recharts/lightweight-charts, Tailwind CSS. Created by Alessandro (Atlas), converted to Word by Rajiv.
- **SRS v3.0 PREVIOUS (2026-03-26)**: `FinIQ SRS v3.0 Final.docx` — 50 FRs, merged base + Addendum A + dual-mode. Generated by `generate_srs_final.py`
- **SRS v2.1 ARCHIVED**: `FinIQ SRS IEEE Format v2.1 Merged.docx` — merged Claude+ChatGPT base (46 reqs)
- **SRS Addendum A ARCHIVED**: `FinIQ SRS Addendum A - Databricks Integration.docx` — folded into v3.0
- **SRS v2.0 ARCHIVED**: `FinIQ SRS IEEE Format by Claude.docx` — Claude-only IEEE 830 (41 reqs)
- **SRS v1.0 ARCHIVED**: `Amira_FinIQ_SRS_v1.0.docx` — original 10-section format
- **Databricks Schema Reference COMPLETE (2026-03-26)**: `Matt's databricks schema/FinIQ Databricks Schema Reference (claude generated).docx` — all 20 tables/views (synthetic schema)
- **Real Databricks Schema Reference COMPLETE (2026-03-31)**: `app/REAL_DATABRICKS_SCHEMA.md` + Word doc on Desktop — Deep scan of production Databricks: 21 objects, 5.7B row tables, all relationships, view SQL, 725 formulas, 766 org units. Column mapping: Entity→Unit, Account→RL
- **MVP deadline**: April 21, 2026 MLT meeting — working demo needed
- **"Purely vibe coding" approach (2026-03-26)**: Team decided no manual coding — strong spec writing, coding orchestrator (agent) builds the app from specs
- **Fresh start decision (2026-03-27)**: Next build iteration uses clean slate with combined SRS v3.1 + Frontend Guideline v1.0. Not appending to existing code.
- **Compliance matrix loop (2026-03-27)**: Coding agent + compliance matrix agent iterate until compliance score maximized (Karpathy approach automated)

## Spec evolution process
- **Original addendum process (2026-03-25)**: Rajiv directed separate addendums for incremental amendments. This was proven with Addendum A (Databricks).
- **Current process (2026-03-26)**: Since no code was built, Rajiv directed combining everything into one final unified SRS (v3.0). Future changes may resume the addendum pattern once code is written.
- **The current base is SRS v3.0** — this is what gets shared with the team and fed to the coding orchestrator.

## IMPORTANT: Language rules for Mars-facing documents
- **NEVER say "replace"** when describing what FinIQ does to Mars's current tools — use "augment", "consolidate", "evolve", "enhance"
- **NEVER say "fragmented"** to describe Mars's current analytics — use "dispersed", "separate", or just describe the systems individually
- **NO timelines** (month ranges) or **cost estimates** (dollar amounts) in the SRS — requirements only
- These rules come from Mr. Savino and Mr. Chandrasekaran and apply to ALL client-facing deliverables

## What problem does this solve?
Mars currently operates **two separate AI-powered tools**:

### System 1: Period End Summary (PES) — Current State
- **Function**: Transforms raw financial Excel data into AI-generated executive performance summaries
- **Input**: Preprocessed Excel workbooks (`preprocessed_output_{Period}_{YearShort}.xlsx`) from Azure Blob Storage, 4 sheets: P&L, Product, Brand, NCFO
- **Processing**: 10-step pipeline — upload → retrieval → preprocessing → markdown conversion → 6 parallel GPT-4.1 KPI generators → trend analysis → tagline injection → combination → caching → SSE delivery
- **6 KPIs**: Organic Growth, MAC Shape %, A&CP Shape %, CE Shape %, Controllable Overhead Shape %, NCFO
- **Derived metrics**: Total Growth Impact, Periodic vs LY %, YTD vs LY %, vs LY (bps)
- **Output**: 3 formats (Summary, What's Working Well, What's Not Working Well) with sub-unit rankings (RANK 1, TOP 3, BOTTOM 3), trend taglines, HTML KPI tables
- **Performance**: ~10-15s first generation, <1s cached, ~5-8s single KPI regen
- **Cache path**: `kpi_summaries/{Unit}/{Year}/{Period}/{Format}/{kpi_name}.json`
- **150+ organizational units** filtered (Mars Inc > GBUs > Divisions > Regions > Sub-units)
- **LLM**: Azure OpenAI GPT-4.1, temp 0.2, top_p 0.95, streaming, LangChain + LangGraph
- **Pain points**: Only generates predefined 6-KPI summaries, template changes require engineering, no ad-hoc queries, no forecast integration, single-user architecture

### System 2: Competitive Intelligence (CI) — Current State
- **Function**: Ingests competitor earnings documents and generates structured competitive analysis
- **Architecture**: 3 pipelines (File Ingest & Parser, Summary Generation, RAG Chat Pipeline)
- **Ingestion flow**: `upload_to_raw` → `preprocess_documents` (Azure Doc Intelligence, parse PDF, extract metadata) → `ingest_to_search_index` (chunk, embed, push to Azure AI Search) → `generate_and_store_summaries` (themed summaries per company-quarter) → conditional `generate_p2p` (if company belongs to segment list) → `send_notification` (Logic App webhook)
- **Themed summaries**: Organic Growth, Margins, Projections, Consumer Trends, Product Launches, Product Summary, Miscellaneous
- **P2P Benchmarking**: Quantitative tables — OG%, Price, Volume, Mix, Adj Core Operating Profit % — Quarterly and YTD views, across peer groups (e.g., Petcare: Mars, Nestle PetCare, Colgate-Palmolini, Freshpet, IDEXX, J.M. Smucker)
- **Q&A chat**: Natural language queries with [Link] source citations back to document sections
- **Infrastructure**: Azure Blob Storage, Azure Document Intelligence, Azure OpenAI, Azure AI Search, Cosmos DB, RBAC, Key Vault, App Insights, Logic Apps
- **Pain points**: Separate from PES, no connection to internal financial data, no forecast integration, no marketing analytics link, limited to competitor PDFs only

## What FinIQ proposes
A unified platform that:
1. **Consolidates PES + CI** into one hub with a single data layer and query interface
2. **On-demand reporting** — any financial report from natural language queries, not just predefined KPIs
3. **Enterprise Agent Job Board** — 100+ users submit queries, specialized AI agents pick up and process autonomously with SLAs
4. **Cross-platform intelligence** — integrates with Amira Financial Forecasting and Marketing Analytics APIs for forward-looking recommendations
5. **Self-service configuration** — business users modify templates, KPIs, data sources without code changes
6. **Dynamic UI** — configurable dashboards, real-time updates, adaptive query interface, responsive design
7. **Extensible data sources** — internal financials (target: direct Databricks/FinSight), competitor filings, acquired research, commodity market data, third-party analytics

## Key files
| File | Purpose |
|---|---|
| `CLAUDE.md` | This file — project context |
| `FinIQ SRS v3.1 Final.docx` | SRS v3.1 Word document (CURRENT — 52 FRs + CI/FMP + prompts) |
| `FinIQ Frontend Design Guideline v1.0.docx` | Frontend design spec (CURRENT — Bloomberg-inspired, Recharts, OKLCH) |
| `FinIQ SRS v3.0 Final.docx` | SRS v3.0 Word document (previous — 50 FRs) |
| `generate_srs_final.py` | Python-docx script that generates SRS v3.0 |
| `Testing Agent SRS/` | Subfolder for testing agent SRS (separate from main SRS) |
| `Testing Agent SRS/FinIQ Testing Agent SRS v1.0.docx` | Testing Agent SRS v1.0 — original (superseded by v1.1) |
| `Testing Agent SRS/FinIQ Testing Agent SRS v1.1.docx` | Testing Agent SRS v1.1 — adds Karpathy quantitative metrics, 31 binary criteria, 15 ACs |
| `Testing Agent SRS/generate_testing_agent_srs.py` | Python-docx script that generates the testing agent SRS |
| `FinIQ SRS IEEE Format v2.1 Merged.docx` | SRS v2.1 Word document (previous base, now superseded) |
| `generate_srs_merged.py` | Python-docx script that generates SRS v2.1 |
| `FinIQ SRS Addendum A - Databricks Integration.docx` | SRS Addendum A (now folded into v3.0, kept for history) |
| `generate_srs_addendum_a.py` | Python-docx script that generates Addendum A |
| `FinIQ SRS IEEE Format by Claude.docx` | SRS v2.0 Word document (archived) |
| `generate_srs.py` | Python-docx script that generates SRS v2.0 |
| `Amira_FinIQ_SRS_v1.0.docx` | SRS v1.0 Word document (archived) |
| `generate_synthetic_data_sqlite.py` | Standalone Python script: generates SQLite DB with all 20 FinSight objects (no dependencies) |
| `app/REAL_DATABRICKS_SCHEMA.md` | Comprehensive real Databricks schema reference — 21 objects, relationships, view SQL, formulas, hierarchies |
| `app/deep-scan-raw-output.txt` | Raw output from Pass 1 Databricks discovery (table sizes, columns, samples) |
| `app/deep-scan-pass2-output.txt` | Raw output from Pass 2 (full 725 RLs, 725 formulas, 766 units, 175 cells, 110 inputs) |
| `generate_schema_docx.mjs` | Generates Word doc from REAL_DATABRICKS_SCHEMA.md → Desktop |
| `generate_merge_plan.mjs` | Generates FinIQ Merge Plan Word doc → Desktop |
| `ale-build/` | Clone of Alessandro's repo (github.com/quantumdatatechnologies/fin_iq) — merge base |
| `rajiv-build/` | Clone of Rajiv's repo (github.com/rajivchandrasekaran-paintrobot/finiq) — cherry-pick CI |
| `finiq_synthetic.db` | SQLite database: 17 tables + 3 views, 165K rows, 21.4 MB — ready to share with team |
| `databricks_synthetic_data.py` | PySpark notebook: generates all 20 FinSight objects in Databricks (needs write permissions from Cesar) |
| `Matt's databricks schema/` | 46 screenshot pages of Matt's FinIQ UC Documentation (Databricks schema) |
| `Matt's databricks schema/FinIQ Databricks Schema Reference (claude generated).docx` | Comprehensive reference doc: all 20 tables/views, every column, SQL definitions, relationships, PES mapping |
| `Matt's databricks schema/generate_schema_reference.py` | Python-docx script that generates the schema reference |
| `Competitive intelligence/` | Mars's source materials for CI system |
| `Competitive intelligence/Competitors Analytics.jpg` | CI system architecture diagram (Azure components) |
| `Competitive intelligence/ingestion_pipeline.jpg` | CI ingestion pipeline flowchart (6 steps) |
| `Competitive intelligence/competitor intelligence- example outputs/` | CI example outputs (P2P tables, themed summaries, Q&A chat) |
| `Competitive intelligence/Nestle Q2 2024 _ comprehensive summary/` | Full Nestle Q2 2024 themed summary (11 pages) |
| `Competitive intelligence/example source documents - Nestle Q2 2024/` | Source PDFs (press release, prepared remarks, earnings presentation) |
| `Period End Summary/` | Mars's source materials for PES system |
| `Period End Summary/period end summary documentation/` | PES technical documentation (11 pages) |
| `Period End Summary/Scrambled Input Sample.jpg` | Sample input Excel (scrambled data, shows column structure) |
| `Period End Summary/scrambled output Mars Inc/` | Sample PES output for Mars Inc (7 pages) |
| `Period End Summary/scrambled output pet care/` | Sample PES output for Pet Care (7 pages) |

## SRS v3.1 structure (IEEE 830)
| Section | Content |
|---|---|
| 1. Introduction | Purpose, Scope (in/out + FMP API, suggested prompts), Definitions/Glossary, References (10 incl. FMP docs), Overview |
| 2. Overall Description | Product Perspective (PES + CI + FinSight current state, gap analysis), Product Functions (8 capabilities), User Characteristics (6 roles + 3 personas), Constraints, Assumptions |
| 3. Specific Requirements | 3.1 External Interfaces, 3.2 Functional (FR1-FR8, 52 reqs), 3.3 Performance, 3.4 Design Constraints, 3.5 System Attributes |
| 4. Data Model | 14 app entities with Databricks mapping table, data classification |
| 5. System Architecture | 5-layer Azure microservices, 20+ components, 3 data flows |
| 6. Databricks/FinSight Schema Reference | 20-object inventory, view-to-PES mapping, KPI-to-account codes |
| 7. **CI Module — FMP API Integration & Standard Views (NEW in v3.1)** | Competitor universe (10 companies), SWOT analysis, Porter's Five Forces, Earnings Call Intelligence, Financial Benchmarking Dashboard, Competitive Positioning Map, M&A Tracker, FMP API architecture, AI/NLP requirements |
| 8. Dual-Mode Operation | Simulated vs. real data mode, config toggle |
| 9. Deployment & Infrastructure | Infra table, deployment model, environments |
| 10. Phased Rollout | Phase 1 (Foundation), Phase 2 (Intelligence + advanced CI views), Phase 3 (Scale) |
| 11. Acceptance Criteria | Acceptance criteria with verification methods |
| Appendix A | KPI definitions from PES |
| Appendix B | Current system capabilities |
| **Appendix C (NEW in v3.1)** | **Suggested Prompt Catalog** — 18 curated prompts across 5 categories (Bridge/Waterfall, Margin, Revenue, KPI Summary, Customer/Cost), Cosmos DB schema, prompt analytics |

## Functional requirements summary (52 total — v3.1)
| Group | Count | Key items |
|---|---|---|
| FR1: Data Ingestion | 6 | Databricks-primary ingestion (Critical), competitor PDFs, third-party connectors, lineage, scheduling, Databricks connection management |
| FR2: Analytics & Reporting | 7 | PES from Databricks views (Critical), configurable KPIs (with account_formula), rankings, interactive tables, custom builder, export, budget variance reporting |
| FR3: Competitive Intelligence | 4 | Themed summaries, P2P benchmarking, internal-external cross-ref (Critical), monitoring |
| FR4: NL Query Interface | **6** | Conversational engine, multi-turn, intent classification, source attribution, **suggested prompt library (NEW)**, **prompt variable resolution engine (NEW)** |
| FR5: Job Board | 7 | Submission (Critical), agent pool, SLA routing, lifecycle, dashboard, scheduling, review |
| FR6: Integration | 5 | Three-way comparison: Actual vs Replan vs Forecast (Critical), Marketing API (Critical), recommendation engine, external gateway, data freshness monitoring |
| FR7: Admin | 6 | Templates, org hierarchy, peer groups, prompt management, RBAC, Databricks connection admin |
| FR8: Dynamic UI | 11 | Dashboard layout, dynamic reports, real-time SSE, adaptive query, branding, accessibility, context-aware rendering, progressive disclosure, dynamic component injection, multi-panel workspace, undo/redo |

## SRS v3.1 — What's new vs v3.0
- **FR4.5: Suggested Prompt Library** — 18+ curated query templates with dynamic variables ({unit}, {current_year}, {current_period}, {current_quarter}), stored in Cosmos DB, tagged, usage-tracked, shareable
- **FR4.6: Prompt Variable Resolution Engine** — Auto-resolves template variables against FinSight dimensions, <200ms, users can override
- **Section 7: CI Module with FMP API** — Full competitive intelligence overhaul:
  - **FMP API integration** — Real-time competitor financials, earnings transcripts, analyst estimates, M&A, ESG
  - **10 competitors defined**: Nestle, Mondelez, Hershey, Ferrero, Colgate-Palmolive, General Mills, Kellanova, J.M. Smucker, Freshpet, IDEXX
  - **Standard views**: SWOT Analysis (auto-generated quarterly), Porter's Five Forces (quantified), Earnings Call Intelligence (NLP on transcripts), Financial Benchmarking Dashboard, Competitive Positioning Map, M&A Tracker
  - **FMP Enterprise plan**: $499/month recommended
- **Appendix C: Suggested Prompt Catalog** — 18 prompts across 5 categories with Cosmos DB schema and analytics tracking

## Architecture (proposed)
- **Layer 1 (Presentation)**: React + TypeScript SPA, dynamic configurable dashboards, SSE for real-time updates
- **Layer 2 (API Gateway)**: Azure API Management, LangGraph orchestration
- **Layer 3 (Intelligence)**: Azure OpenAI Foundry (GPT-4.1 or latest), Embeddings, Agent Runtime (LangChain), Prompt Registry (Cosmos DB), RAG Pipeline (AI Search)
- **Layer 4 (Data)**: Databricks/FinSight (primary), Azure SQL (app data + synced dimensions), Blob Storage (documents), Redis Cache (reports + Databricks query results), Cosmos DB (metadata/lineage), Excel fallback via Blob Storage
- **Layer 5 (Integration)**: Amira Forecasting API, Amira Marketing Analytics API, Logic Apps (notifications), Export Service (PDF/DOCX/PPTX/XLSX)

## Key people
**Mars side**: Bruce Simpson (exec sponsor), Matt Hutton (data owner), Karthik Subramaniam (platform/Gemini), Danny Woodruff (infra)
**QDT/Amira side**: Rajiv Chandrasekaran (tech lead/boss, AI agent: "Asimov"), Alessandro Savino (senior reviewer, UI/stylistic guidelines, AI agent: "Atlas"), Farzaneh (project lead, specs + synthetic data, AI agent: Claude Code), Bill Dennis (Amira platform/Air workflows), Cesar Flores (architecture, cloud deployment, Databricks admin), Atif Ishaq (governance)

## Databricks / FinSight schema (Matt's data)
- **Source**: "FinIQ UC Documentation" — 46 pages, generated 2026-03-25 by dipendra.das@effem.com
- **Catalog**: `corporate_finance_analytics_dev` | **Schema**: `finsight_core_model_mvp3` | **Prefix**: `finiq`
- **Storage**: Delta Lake on Azure Blob (`abfss://output@finsightmvp31218devsa.dfs.core.windows.net/...`)
- **20 objects**: 17 tables + 3 views
- **Dimension tables (11)**: finiq_date, finiq_dim_entity (150+ org units), finiq_dim_account (with array parent IDs and Sign_Conversion), finiq_account_formula (KPI calculation logic), finiq_account_input, finiq_composite_item (12-col product master), finiq_item (15-col granular product), finiq_item_composite_item (bridge), finiq_customer (11 cols), finiq_customer_map (hierarchy), finiq_economic_cell
- **Fact tables (5)**: finiq_financial (39-col denormalized wide table), finiq_financial_base (7-col normalized), finiq_financial_cons (9-col with currency — used by views), finiq_financial_replan (18-col actual vs. replan), finiq_financial_replan_cons (6-col consolidated replan)
- **Views (3)**: finiq_vw_pl_entity (P&L by entity), finiq_vw_pl_brand_product (P&L by brand/product with 3-way UNION ALL), finiq_vw_ncfo_entity (NCFO by entity) — all output YTD_LY, YTD_CY, Periodic_LY, Periodic_CY
- **Views map directly to PES Excel sheets**: P&L → vw_pl_entity, Product/Brand → vw_pl_brand_product, NCFO → vw_ncfo_entity
- **New capability not in PES**: finiq_financial_replan provides actual-vs-budget variance analysis
- **View SQL pattern**: Date_Offset=100 for LY, 0 for CY; View_ID=1 for Periodic, 2 for YTD; growth KPIs derived via parent-child numerator/denominator pattern; account S900077 has special +200 offset treatment
- **External dependencies in views**: Dimensions_View_Date_Map, Dimensions_Date, Dimensions_Entity, Dimensions_Account (not finiq_ prefixed)
- **Schema is actively used** — tables created Jul 2025 through Mar 2026, views created Mar 2026 (very recent), RLS tracking present

## Real Databricks Schema (PRODUCTION — discovered 2026-03-31)
- **Full reference**: `app/REAL_DATABRICKS_SCHEMA.md` + Word doc on Desktop
- **Workspace**: `adb-2085958195047517.17.azuredatabricks.net`
- **Catalog**: `corporate_finance_analytics_prod` | **Schema**: `finsight_core_model`
- **Warehouse**: Serverless Starter Warehouse (`de640b2f8ef3d9b2`) | **HTTP Path**: `/sql/1.0/warehouses/de640b2f8ef3d9b2`
- **21 objects**: 17 tables + 4 views (includes anomaly detection view)
- **DANGER: 3 fact tables are BILLIONS of rows**: finiq_financial (5.7B), finiq_financial_cons (5.8B), finiq_financial_base (740M)
- **Column naming differs from synthetic**: Entity→Unit, Account→RL (Reporting Line), value cols have `_Value` suffix
- **Views use Title Case** Unit_Alias (e.g., "MW Estonia Market") vs UPPERCASE in dim_unit
- **766 org units** across 11 hierarchy levels, 725 reporting lines, 458 brands, 139 countries
- **13-period fiscal year**, data from FY2020 to FY2028, replan data FY2025-FY2026
- **View SQL extracted**: Growth KPIs = numerator RL / RL 5464 - 1, Date_Offset 0=CY 100=LY
- **External dims in `finsight_core_model_mvp3`**: 35 Dimensions_* tables (views cross-reference)
- **Data actively updated**: Last change 2026-03-31 (version 8289)
- **Next step**: Rebuild synthetic DB to match real schema (rename tables/columns), then update app queries

## Upcoming work / open items
- **Synthetic data LIVE IN DATABRICKS (2026-03-26)** — 17 tables + 3 views populated in `workspace.default`. All team members have access. Also available as SQLite (`finiq_synthetic.db`, 21.4 MB). Uploaded via `upload_sqlite_to_databricks.py`.
- **Testing agent SRS v1.1 CURRENT (2026-03-26)** — `Testing Agent SRS/FinIQ Testing Agent SRS v1.1.docx`. 31 test requirements (TR1-TR9), 15 acceptance criteria, dual-mode. **v1.1 adds Karpathy's quantitative evaluation framework**: scalar metrics per capability, immutable eval harness, binary pass/fail criteria (31 total), keep-or-revert loop, time-boxed cycles. Targets: PES ≥95%, NL Queries ≥85%, Budget Variance ≥95%, overall ≥85%. Placeholder for Rajiv's prompt/response pairs in Appendix A.
- **Rajiv reviewing Testing Agent SRS (2026-03-26 evening)** — Will make testing metrics quantitative using Karpathy's methodology ("optimize the vibe automatically"). Will fine-tune by tomorrow (2026-03-27). Has not started Asimov (his AI agent) yet; asked about Databricks ODBC connection.
- **Stylistic guidelines document** — Alessandro to create separate UI/front-end requirements doc, universally applicable, fed alongside product SRS to coding agent
- **Architecture document update** — Cesar to update architecture doc: OpenAI/Anthropic connections via Azure OpenAI Foundry (not external URLs)
- **Competition** — Team members (Bill, Rajiv, Farzaneh, Alessandro) will each take different paths to implement the requirements from the same spec
- **Farzaneh's competition strategy (2026-03-26)**: Two-stage pipeline — Artemis (OpenClaw agent) builds the app from the SRS first, pushes to GitHub. Then Claude Code reviews, finds gaps against the 50 FRs, fixes bugs, optimizes performance, and maximizes eval harness scores. Goal: win the competition.
- **Farzaneh's AI agents**: Artemis (OpenClaw, builds the app) + Claude Code (reviews, optimizes, improves). Other competitors: Rajiv=Asimov, Alessandro=Atlas, Bill=Air workflows, Cesar=architecture
- **Mars taxonomy/wiki** — Rajiv forwarded Mars's master data taxonomy; wants it incorporated for richer queries
- **Quandl/Nasdaq Data Link** — Access added; explore competitor financial statements and investor reports for CI pipeline
- **Credentials management** — All Databricks credentials and API keys stored in Excel file in shared Google Drive folder
- Gemini integration requirements — Phase 2, A2A compatible agents on Azure/GCP

## Databricks environment — LIVE (2026-03-26)
- **Workspace URL**: `dbc-af05a0e0-4ebe.cloud.databricks.com`
- **Edition**: Free (Farzaneh has admin access, granted by Cesar)
- **Catalog**: `workspace` | **Schema**: `default` | **Warehouse**: Serverless Starter Warehouse (2XS)
- **Users with access**: farzaneh@qdt.ai, alessandro@qdt.ai, bill@qdt.ai, cesar@qdt.ai, rajiv@qdt.ai
- **Synthetic data LIVE**: 17 tables + 3 views in `workspace.default`, all prefixed `finiq_`
  - 173 org units, 36 accounts, 93 products, 56 customers
  - 26,208 financial records, 43,056 budget variance records
  - 2 fiscal years (FY2024-2025), 5% growth trends, seasonal patterns
  - 3 views mimicking PES Excel input sheets
  - Alessandro also created additional tables (finiq_dim_currency, finiq_dim_product, etc.)
- **Volume**: `/Volumes/workspace/default/finiq_data/` — contains `finiq_synthetic.db` (uploaded SQLite source)
- **Upload method**: SQLite → Databricks via `upload_sqlite_to_databricks.py` notebook (PySpark permission workaround)
- **Dual-mode**: Synthetic = this workspace. Real = Mars's `corporate_finance_analytics_dev` catalog (when provisioned). App swaps connection config.
- **Scripts**: `databricks_synthetic_data.py` (PySpark), `generate_synthetic_data_sqlite.py` (SQLite), `generate_databricks_sql.py` (pure SQL), `upload_sqlite_to_databricks.py` (SQLite→Databricks transfer)
- **GitHub backup**: https://github.com/farfar1985/FinIQ (private)

## Meeting notes archive
- **2026-03-26 call transcript**: `C:\Users\farza\Downloads\FinIQ - 2026_03_26 09_13 EDT - Notes by Gemini.docx` — key decisions: combine SRS, purely vibe coding, rename Claude Code to "Coding Orchestrator", Azure OpenAI Foundry, synthetic data, competition approach
- **2026-03-27 call transcript**: `C:\Users\farza\Desktop\FinIQ - 2026_03_27 09_12 EDT - Notes by Gemini.docx` — key decisions: compliance matrix loop, SRS v3.1 coming, fresh start with combined specs, stylistic guidelines v1.0, platform convergence on Cesar's environment

## App build status (Artemis + Claude Code review loop)

### Build pipeline
- **Artemis** (OpenClaw agent) builds the app from SRS specs, pushes to GitHub
- **Claude Code** reviews, fixes critical bugs, updates CLAUDE.md + memory, suggests enhancements
- **Repeat** until competition-ready
- Both agents share context via `app/CLAUDE.md`, `app/memory/`, and git

### Artemis build — Phase 1+3 complete (2026-03-26)
- **Tech stack**: Node.js/Express backend + React/TypeScript/Vite frontend
- **~7,700 lines** across 8 backend modules + React SPA
- **35+ API endpoints** across 6 categories
- **Dual-mode data layer**: SQLite fallback ↔ Databricks (auto-switch via config)
- **NL Query pipeline**: Intent classification → SQL generation → execution → LLM summarization
- **Job Board (FR5)**: 100% complete — submission, SLA routing, lifecycle, retries, dashboard
- **PES reports (FR2)**: ~85% — queries 3 views, KPI calculations, trend indicators
- **Budget variance**: Working but missing account name JOINs (shows "Unknown")
- **CI agent**: Compares Mars vs competitor metrics (simulated data only)
- **WebSocket server**: Built but frontend still polls (client-side not wired)
- **Frontend**: Professional dark-theme SPA, 6 pages (Dashboard, Chat, Jobs, CI, Data Explorer, Admin)
- **Schema context**: Full 20-table reference embedded for LLM prompts

### Claude Code review — Pass 1 findings (2026-03-27)
**Critical bugs identified:**
1. **Anthropic model name wrong** — uses `claude-opus-4-6` (invalid), every LLM call fails
2. **SQL injection in fallback mode** — entity names interpolated directly into SQL strings in `finiq-agent.mjs:289`
3. **Config property name mismatch** — admin.mjs references `DATABRICKS_HOST` but config.mjs defines `DATABRICKS_SERVER_HOSTNAME`
4. **Frontend doesn't use WebSocket** — server ready but React client polls `/api/jobs` every 2s
5. **Variance query missing JOIN** — no `finiq_dim_account` JOIN, account descriptions show "Unknown"
6. **CI is all simulated** — hardcoded competitor data, no real PDF ingestion pipeline

**Coverage vs SRS v3.0 (50 FRs):**
| Area | Coverage | Notes |
|------|----------|-------|
| FR1: Data Ingestion | ~50% | Dual-mode works, no real Databricks tested |
| FR2: Analytics | ~60% | PES + variance working, rankings/formats pending |
| FR3: CI | ~40% | Simulated only |
| FR4: NL Query | ~40% | Architecture ready but LLM broken |
| FR5: Job Board | **100%** | Complete |
| FR6: Integration | ~30% | Replan data ready, Forecast/Marketing APIs not started |
| FR7: Admin | ~20% | Config viewer only, no RBAC/templates |
| FR8: Dynamic UI | ~50% | Tables, sorting, dark theme — no drag-drop/adaptive |
| **Overall** | **~55-65%** | |

**Key gap vs competitors: NO charting/visualization.** Alessandro's build has Recharts area charts, time series, data explorer with plots. Our app returns tables only — "plot me the sales" just shows a data table.

### BUILD_PROMPT.md created (2026-03-27)
- **File**: `app/BUILD_PROMPT.md` — Master build spec for fresh rebuild
- **80-item compliance matrix** (52 functional + 15 design + 6 CI/FMP + 7 technical), target 95+
- **8 dependency-ordered batches** from Foundation through Polish
- **Combines**: Rajiv's compliance-driven simplicity + Cesar's multi-agent structure + our lessons learned
- **Works for**: Artemis (single agent), Claude Code (multi-agent), or Cesar's platform
- **Tech stack decided**: Next.js 16 + Tailwind + shadcn/ui + Recharts + Node.js + Anthropic SDK
- **CI uses REAL data**: FMP API for all 10 competitors (no more simulated)
- Credentials stored in `.env` only (from team's shared Google Drive)

### What needs fixing (Claude Code Pass 1 — next)
1. Fix model name (`claude-opus-4-6` → correct Anthropic model)
2. Fix config property mismatch (DATABRICKS_HOST vs DATABRICKS_SERVER_HOSTNAME)
3. Fix SQL injection (parameterize queries)
4. Fix variance account JOIN
5. Wire up frontend WebSocket client
6. **Add Recharts charting** — area charts, bar charts, line charts for NL queries like "plot X"

## Team progress & competition (as of 2026-03-27)

### Cesar Flores — LEADING
- Built full Amira platform with Claude Code under the hood
- **Features**: Persistent skills layer, Kanban board for tasks, multi-tenancy (each user has own space)
- **"Brain" concept**: Platform learns from user actions, auto-creates skills from business logic
- Backend migrated to **FastAPI**, frontend to **Next.js**
- Task management: Users define where artifacts go (GitHub, Azure pipeline)
- Demo runs in Docker containers on single VM
- Rajiv said they "built all of Replit yesterday"
- **NEW (2026-03-31): `finiq-data-agent`** — semantic layer tool querying REAL Databricks production data
  - **Repo**: github.com/quantumdatatechnologies/finiq-data-agent
  - YAML files describing every table, column, relationship, metric
  - Proven working connection to `corporate_finance_analytics_prod.finsight_core_model`
  - Read-only access (can't write/create views)
  - Built from Farzaneh's schema docs, fixed column issues via Claude Code discovery
  - Alessandro: "this is the core of the prototype", "outstanding"
  - **Integration needed**: Push semantic YAMLs into fin_iq repo doc/ folder, replace our schema-context.ts

### Alessandro Savino — STRONG UI
- Built app with pure Claude ("CLAUDIO" / Atlas)
- **Standout**: Data Explorer with charts (Recharts), time series visualization, market ticker, data dictionary sidebar
- Connected to Databricks, data exploration works
- Created comprehensive **Frontend Design Spec** (`FIN_IQ_FRONTEND_SPEC.md`) — Bloomberg-inspired dark theme, OKLCH colors, full component library
- **Gap**: Missed core functionality — no report generation, no voice commands. Focus on front-end style caused bot to skip core FRs

### Rajiv Chandrasekaran — STRONG CI (Asimov)
- **Built full app deployed at**: https://finiq-app.onrender.com/
- **Repo**: https://github.com/rajivchandrasekaran-paintrobot/finiq
- **Standout**: CI module with 10 tabs (Overview, Financials, Earnings, Benchmarking, Strategy, ESG, Analysts, News, SWOT, Alerts)
- **Alerts system**: Custom price/market-cap threshold rules (localStorage-backed) — unique feature
- **CI query engine**: Intent-driven routing, fuzzy company matching ("oreo"→MDLZ), metric detection
- **ProvenanceBadge**: Shows data source on every response — nice UX touch
- **Chat-first design**: Landing page is NL query with suggested prompts
- **Clean header**: Relevant competitor tickers only (not AAPL/TSLA), "LIVE Databricks" badge
- **Self-assessed**: 94% compliance
- **Gap**: Job board is mock (setTimeout), no Data Explorer, no dark mode, no voice, regex NL parsing

### Bill Dennis — PLATFORM
- Amira platform already handles human governance workflow
- Fixed audio stuttering from previous demo
- Cesar to integrate both pieces

### Farzaneh (us) — SPEC-DRIVEN + v2 COMPLETE
- v2-fresh build: 80/80 compliance, voice agent, Anthropic LLM, WebSocket, XLSX export
- Full Databricks schema discovery (21 objects, 5.7B row tables documented)
- **Repo**: https://github.com/farfar1985/FinIQ (v2-fresh branch)

## 3-WAY MERGE PLAN (2026-03-31) — APPROVED BY ALE

**Decision**: Combine best of all three builds into one unified app.
**Target repo**: https://github.com/quantumdatatechnologies/fin_iq (Ale's)
**Branch**: `merged` (created from main)
**Plan doc**: `C:\Users\farza\Desktop\FinIQ Merge Plan.docx`

### Component sources:
| Component | Source | Notes |
|-----------|--------|-------|
| App structure / Next.js | Ale | Pure monolith, cleaner than our split architecture |
| Dashboard (6 KPIs, charts) | Ale | |
| Data Explorer (SQL builder) | Ale | His strongest feature |
| Reports / PES (narratives) | Ale | WWW/WNWW variants, rankings |
| Styling / OKLCH dark theme | Ale | Bloomberg-quality |
| Admin (connection, templates) | Ale | |
| UI components library | Ale | |
| **CI page (10 tabs + Alerts)** | **Rajiv** | Intent-driven, ESG, Analysts, Alert rules |
| **Header (clean ticker)** | **Rajiv** | Competitor tickers only, LIVE badge |
| **ProvenanceBadge** | **Rajiv** | Data source on every response |
| **SimpleChart auto-detect** | **Rajiv** | Area vs bar auto-selection |
| Voice Agent | Ours | OpenAI Realtime API |
| NL Query (Anthropic LLM) | Ours | Replace regex in both builds |
| Job Board backend | Ours | Real agent processing, SLA, WebSocket |
| XLSX export | Ours | Mars-branded |
| Rate limiting / safety | Ours | 5.7B row table protection |
| 3-layer schema index | New | Lean index for LLM, on-demand detail |
| Real Databricks schema | New | Rename simulated to match production |

### Execution phases:
1. **Foundation** — Clone Ale's repo, rename simulated data to real schema, update queries
2. **Intelligence** — Add Anthropic LLM, voice agent, schema index
3. **Enhancement** — Job backend, XLSX export, Rajiv's CI + header, safety layer
4. **Polish** — Test all pages, compliance check, target 80/80

### Ale's feedback on merge:
- Remove scrolling stock ticker, use Rajiv's cleaner header with relevant competitor tickers
- Cherry-pick Rajiv's CI Alerts tab
- Rename simulated data to match real Databricks (no mapping layer)

## 2026-03-27 call decisions

### Infrastructure
- **Resource group set up**: `EAA-CORPAIML-SANDBOX-EUS2-DEV-RG` — everyone has access
- **Unity Catalog**: `corporate_finance_analytics_prod` (production data!)
- **VM being provisioned today** — team can deploy code
- **Matt approved** Databricks access for QDT
- **Mars communicates via Teams/effem chat** — monitor those channels

### Process decisions
- **Compliance matrix loop**: Coding agent + compliance matrix agent iterate until score maximized (Karpathy approach automated)
- **Fresh start**: Next iteration builds from clean slate with combined requirements (not appending to existing code)
- **SRS v3.1 coming**: Rajiv adding competitive analysis requirements to base
- **Stylistic guidelines v1.0 coming**: Alessandro/Rajiv creating UI/design spec
- **Both docs fed together** to coding agent for next build

### Action items from call
| Person | Task |
|--------|------|
| Cesar | Construct iterative compliance matrix prompt + platform artifacts |
| Rajiv | Update SRS to v3.1 with competitive analysis; create stylistic guidelines v1.0 |
| Alessandro | Provide stylistic guidelines in required format |
| Farzaneh | Format the stylistic guidelines document |
| Cesar | Integrate Bill's audio fix + human governance workflow |
| Cesar | Notify team about platform setup status |

### Platform convergence
- Goal: Everyone uses Cesar's platform for all work once set up
- Platform handles: spec creation → human governance → coding → compliance testing → deployment
- Each user has their own space, agents access collective knowledge

## Frontend design spec (Alessandro's)
- **File**: `app/FIN_IQ_FRONTEND_SPEC.md` (copied from Alessandro's spec)
- **Design philosophy**: Bloomberg-inspired, "information density without visual clutter"
- **Tech**: Next.js + Tailwind CSS + shadcn/ui + Recharts + lightweight-charts
- **Key components**: OKLCH color system, IBM Plex Sans + JetBrains Mono fonts, collapsible sidebar, market ticker strip, 12-column grid, area/candlestick/treemap/Sankey charts, sparklines, KPI stat cards, change badges
- **This will be the stylistic guideline** fed alongside SRS to the coding agent in future builds

## IMPORTANT: This is NOT the DD harmonization project
This project is completely separate from the Data Dictionary classification work in `D:\Sean's DD\effort_a\bible_method\`. Different client need, different deliverables, different scope.
