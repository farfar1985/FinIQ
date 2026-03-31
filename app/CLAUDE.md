# FinIQ App — Claude Code Context (v2 Fresh Build)

## Build Status — ALL BATCHES COMPLETE
- **Branch**: `v2-fresh`
- **Build date**: 2026-03-27
- **Batch 1: Foundation** — COMPLETE
- **Batch 2: Data Layer** — COMPLETE
- **Batch 3: Core Analytics + NL Query** — COMPLETE
- **Batch 4: Intelligence Layer** — COMPLETE
- **Batch 5: Job Board + Real-time** — COMPLETE
- **Batch 6: Admin** — COMPLETE
- **Batch 7: CI/FMP Module** — COMPLETE
- **Batch 8: Polish + Final Compliance** — COMPLETE
- **Round 2 Compliance Fixes** — COMPLETE (13 gaps closed)
- **Extra Features** — Voice I/O, caching, trend taglines, XLSX export, PDF upload
- **Final Compliance Gaps Closed** — Rate limiting, dynamic loading, Mars branding
- **Automated Compliance Checker** — `server/compliance-check.mjs`
- **Final Compliance Score: 80/80 (100%)**

## Architecture
- **Frontend**: Next.js 15.5 + React 19 + TypeScript + Tailwind CSS 4 + Recharts
- **Backend**: Node.js + Express 4 (ESM)
- **LLM**: Anthropic SDK (`claude-sonnet-4-20250514`)
- **Data**: Databricks SQL connector + SQLite fallback (better-sqlite3)
- **Real-time**: WebSocket (ws) — server AND client wired
- **CI Data**: FMP API with realistic mock fallback
- **State**: Zustand
- **Design**: OKLCH color tokens, Bloomberg-inspired dark-first, IBM Plex Sans + JetBrains Mono

## Project Structure
```
app/
├── client/src/
│   ├── app/                   # 7 routes (Dashboard, Chat, Reports, CI, Explorer, Jobs, Admin)
│   ├── components/
│   │   ├── layout/            # AppShell (skip-to-content), Sidebar (aria-current), Header (role=banner), Ticker
│   │   ├── charts/            # FinAreaChart, FinBarChart, ChartRenderer (treemap), Sparkline
│   │   └── ...
│   ├── lib/                   # utils, format, api client
│   ├── stores/                # Zustand (ui-store)
│   └── types/                 # Full TypeScript interfaces
├── server/
│   ├── index.js               # Express + WebSocket + Job Board init
│   ├── lib/
│   │   ├── config.mjs         # Single source of truth
│   │   ├── databricks.mjs     # Dual-mode (Databricks + SQLite)
│   │   ├── routes.mjs         # 40+ API endpoints
│   │   ├── schema-context.mjs # LLM schema (20 tables)
│   │   ├── websocket.mjs      # WebSocket server (/ws)
│   │   ├── job-board.mjs      # Job queue, SLA, agent pool
│   │   ├── intelligence.mjs   # Three-way comparison, freshness, recommendations
│   │   ├── admin.mjs          # RBAC, templates, org tree, prompts, peer groups
│   │   └── fmp-client.mjs     # FMP API + mock fallback
│   └── agents/
│       ├── finiq-agent.mjs    # NL query, intent classification, PES engine
│       └── ci-agent.mjs       # SWOT, Porter's, benchmarking, positioning, M&A
├── .env.example
├── BUILD_PROMPT.md
└── package.json
```

## Feature Summary

### Data (Batch 2)
- 173 entities, 36 accounts, 93 products, 56 customers
- All SQL parameterized, dual-mode with auto-fallback

### Analytics (Batch 3)
- PES: 3 views, 6 KPIs, 3 formats (Summary, WWW, WNWW)
- Budget variance with proper account names
- NL query: 7 intents, charts on every response
- 18 suggested prompts with variable resolution
- Recharts: Area, Bar, Treemap, Sparkline with OKLCH gradients

### Intelligence (Batch 4)
- Three-way: Actual vs Replan vs Forecast (mock)
- Data freshness monitoring, recommendation engine

### Job Board (Batch 5)
- Full lifecycle (7 states), SLA routing, 4 agent types
- WebSocket real-time (NOT polling), dev simulation
- Collaborative review UI (approve/reject)

### Admin (Batch 6)
- Databricks connection admin with test
- RBAC: 4 roles, org hierarchy tree, prompt/template management
- Peer group config, ingestion status

### CI/FMP (Batch 7)
- FMP API + mock fallback (works without key)
- SWOT, Porter's Five Forces, Earnings Call Intelligence
- Financial Benchmarking, Positioning Map (ScatterChart), M&A, News

### Polish (Batch 8)
- WCAG 2.1 AA: skip-to-content, aria roles/labels, keyboard nav, screen reader
- Adaptive query: autocomplete dropdown with keyboard nav, recent queries
- Export: CSV + JSON client-side download
- Sparklines in KPI cards, Treemap in ChartRenderer
- Progressive disclosure in CI Overview
- Source attribution cleanup (no interpolated SQL in display strings)

### Extra Features (Post-Batch)
- Voice input (browser SpeechRecognition) + voice output (speechSynthesis)
- Result caching (in-memory with TTL, /api/cache/stats)
- Trend taglines (improving/declining/volatile/stable per KPI)
- XLSX export with Mars branding (header + confidential + timestamp)
- PDF upload for CI (pdf-parse + financial term detection)
- API rate limiting (100 RPM general, 10 RPM chat, /api/gateway/status)
- Dynamic lazy loading (next/dynamic on heavy chart components)
- FMP API live with real competitor data (key configured)

### Job Board (updated)
- Jobs now execute REAL queries (not simulations)
- Completed jobs store full results: narrative, data, chartConfig, sources, trends
- Click a completed job to see the full report with chart + data table
- Export bar: Report (.txt), Full Data (.json), Spreadsheet (.xlsx) — Mars-branded

### AI Intelligence (LIVE)
- **Anthropic Haiku** (`claude-haiku-4-5-20251001`) — generating executive narratives
- PES queries return AI-written performance summaries with trend insights
- CI queries route to FMP data with AI competitive analysis
- Forecast queries route to three-way comparison with AI commentary
- Entity not found → suggests available entities + "Assign an agent" button
- Ad-hoc SQL generation for freeform questions

### API Keys Configured
- **Anthropic**: LIVE — Haiku generating narratives (`claude-haiku-4-5-20251001`)
- **FMP**: LIVE — real competitor data for 10 companies
- **OpenAI**: LIVE — TTS sage voice (`tts-1`), planned: Realtime API for conversational agent
- **Databricks (real)**: Credentials received from Alessandro — 195GB+ tables, needs safeguards before connecting
  - Workspace: adb-2085958195047517.17.azuredatabricks.net
  - Catalog: corporate_finance_analytics_prod / Schema: finsight_core_model
  - Token: stored in local Claude Code memory only (not in git)

### Next Session Priorities
1. Connect to real Databricks (read-only schema discovery)
2. Build safeguards: LIMIT clauses, query timeout, aggregation-first, column mapping
3. Persistent storage for jobs/reports (discuss with Cesar first)
4. Team convergence: combine best of each app (Alessandro's explorer + our voice/chat)

### Voice Agent (LIVE — /voice page)
- **OpenAI Realtime API** with sage voice — full conversational experience
- Server-side WebSocket proxy (realtime-agent.mjs) → OpenAI Realtime API
- Function calling mid-conversation: queries Mars data, CI competitors, submits jobs
- Charts appear in side panel as agent pulls data
- Interrupt handling — speak while agent is talking, it stops
- Multi-turn memory — agent remembers context across the conversation
- Voice activity detection (server-side VAD)
- Separate /voice-ws endpoint (existing /ws for jobs untouched)

## Real Databricks Schema (discovered 2026-03-31)

**Warehouse**: Serverless Starter Warehouse (ID: `de640b2f8ef3d9b2`)
**HTTP Path**: `/sql/1.0/warehouses/de640b2f8ef3d9b2`
**Catalog**: `corporate_finance_analytics_prod` | **Schema**: `finsight_core_model`

### DANGER ZONE — Tables to NEVER query directly
| Table | Rows |
|-------|------|
| `finiq_financial` | 5,758,891,376 (5.7B) |
| `finiq_financial_cons` | 5,781,441,613 (5.8B) |
| `finiq_financial_base` | 739,574,399 (740M) |

### Safe tables (dimensions + views)
| Table | Rows |
|-------|------|
| `finiq_vw_ncfo_unit` | 852,836 |
| `finiq_vw_pl_unit` | ? (view over 5.7B — always filter by Unit_Alias) |
| `finiq_vw_pl_brand_product` | ? (view over 5.7B — always filter by Unit_Alias) |
| `finiq_financial_replan` | 2,740,193 |
| `finiq_dim_unit` | 766 |
| `finiq_dim_rl` | 725 |
| `finiq_rl_formula` | 725 |
| `finiq_date` | 117 |
| `finiq_customer` | 21,204 |
| `finiq_composite_item` | 9,478 |
| `finiq_item` | 381,113 |
| `finiq_economic_cell` | 175 |

### Column Name Mapping: SQLite (synthetic) → Databricks (real)
| Concept | SQLite | Databricks |
|---------|--------|------------|
| Entity table | `finiq_dim_entity` | `finiq_dim_unit` |
| Entity ID | `Child_Entity_ID` | `Child_Unit_ID` |
| Entity name | `Child_Entity` | `Child_Unit` |
| Account table | `finiq_dim_account` | `finiq_dim_rl` |
| Account ID | `Child_Account_ID` | `Child_RL_ID` |
| Account name | `Child_Account` | `Child_RL` |
| Formula table | `finiq_account_formula` | `finiq_rl_formula` |
| Input table | `finiq_account_input` | `finiq_rl_input` |
| View entity col | `Entity` | `Unit_Alias` |
| View account col | `Account_KPI` | `RL_Alias` |
| View YTD LY | `YTD_LY` | `YTD_LY_Value` |
| View YTD CY | `YTD_CY` | `YTD_CY_Value` |
| View Periodic LY | `Periodic_LY` | `Periodic_LY_Value` |
| View Periodic CY | `Periodic_CY` | `Periodic_CY_Value` |

## Anti-Patterns to Avoid
1. Use `claude-sonnet-4-20250514` — NOT `claude-opus-4-6`
2. Always parameterized SQL — NEVER interpolate
3. Config keys in config.mjs only
4. Always JOIN dimension tables for readable labels
5. WebSocket on BOTH server AND client
6. EVERY analytics response includes a chart
7. FMP API for CI (mock fallback when no key)
8. OKLCH design tokens from day 1
9. **NEVER query finiq_financial / finiq_financial_cons / finiq_financial_base** — use views only
10. **Always filter views by Unit_Alias** — unfiltered view queries scan 5.7B rows
11. **Query timeout: 30 seconds** — must be enforced on all Databricks queries

## npm Workaround
```bash
node "/c/Users/farza/.npm-install/package/bin/npm-cli.js" install
node node_modules/next/dist/bin/next dev --port 3000
```
