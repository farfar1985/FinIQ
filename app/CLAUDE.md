# FinIQ App — Claude Code Context (v2 Fresh Build)

## Build Status
- **Branch**: `v2-fresh`
- **Build start**: 2026-03-27
- **Batch 1: Foundation** — COMPLETE
- **Batch 2: Data Layer** — COMPLETE
- **Batch 3: Core Analytics + NL Query** — COMPLETE
- **Batch 4: Intelligence Layer** — COMPLETE
- **Batch 5: Job Board + Real-time** — COMPLETE
- **Batch 6: Admin** — Pending
- **Batch 7: CI/FMP Module** — Pending
- **Batch 8: Polish + Final Compliance** — Pending

## Architecture (v2)
- **Frontend**: Next.js 15.5 + React 19 + TypeScript + Tailwind CSS 4 + Recharts
- **Backend**: Node.js + Express 4 (ESM)
- **LLM**: Anthropic SDK (`claude-sonnet-4-20250514`)
- **Data**: Databricks SQL connector + SQLite fallback (better-sqlite3)
- **Real-time**: WebSocket (ws) — server AND client wired
- **State**: Zustand
- **Components**: shadcn/ui + class-variance-authority
- **Fonts**: IBM Plex Sans + JetBrains Mono (Google Fonts via next/font)
- **Design system**: OKLCH color tokens, Bloomberg-inspired dark-first

## Project Structure
```
app/
├── client/                    # Next.js frontend
│   ├── src/app/              # App Router pages (7 routes)
│   │   ├── page.tsx          # Dashboard (live KPI cards + chart)
│   │   ├── chat/page.tsx     # NL Query (chat + charts + source attribution)
│   │   ├── reports/page.tsx  # PES + Variance + Three-Way Comparison
│   │   ├── ci/page.tsx       # Competitive Intelligence (placeholder)
│   │   ├── explorer/page.tsx # Data Explorer (entity/account browser)
│   │   ├── jobs/page.tsx     # Job Board (WebSocket real-time)
│   │   └── admin/page.tsx    # Admin Panel (placeholder)
│   ├── src/components/
│   │   ├── layout/           # AppShell, Sidebar, Header, Ticker
│   │   ├── charts/           # FinAreaChart, FinBarChart, ChartRenderer
│   │   ├── ui/               # shadcn/ui primitives (to be added)
│   │   ├── shared/           # KPI cards, badges, formatters
│   │   └── features/         # Feature-specific components
│   ├── src/lib/              # utils.ts, format.ts, api.ts
│   ├── src/stores/           # Zustand (ui-store.ts)
│   └── src/types/            # TypeScript interfaces
├── server/                    # Express backend
│   ├── index.js              # Entry point (port 3001, WebSocket, Job Board)
│   ├── lib/
│   │   ├── config.mjs        # SINGLE SOURCE OF TRUTH for config
│   │   ├── databricks.mjs    # Dual-mode data layer (Databricks + SQLite)
│   │   ├── routes.mjs        # All API routes
│   │   ├── schema-context.mjs # 20-table schema for LLM prompts
│   │   ├── websocket.mjs     # WebSocket server (/ws)
│   │   ├── job-board.mjs     # Job queue, SLA routing, agent pool
│   │   └── intelligence.mjs  # Three-way comparison, freshness, recommendations
│   └── agents/
│       └── finiq-agent.mjs   # NL query processor, intent classification, PES engine
├── .env.example              # Credentials template
├── .gitignore
├── BUILD_PROMPT.md           # Master build spec (80-item compliance matrix)
└── package.json
```

## What's Working (Batches 1-5)

### Data Layer (Batch 2)
- SQLite connected: 173 entities, 36 accounts, 93 products, 56 customers
- All queries parameterized (zero SQL injection)
- Dual-mode: auto-fallback from Databricks to SQLite
- Dimension queries with normalized column names
- Data catalog endpoint with row counts

### Core Analytics (Batch 3)
- PES generation: queries 3 views, computes growth for all KPIs
- Budget variance: Actual vs Replan with account names (not "Unknown")
- NL query engine: intent classification → route → execute → chart
- Intents: pes, variance, ranking, trend, product, ci, adhoc
- 18 suggested prompts with variable resolution ({unit}, {year}, {period})
- Recharts: FinAreaChart + FinBarChart with OKLCH colors and gradient fills
- Every analytics response includes a chart
- Source attribution on every answer (table name, query, row count)

### Intelligence Layer (Batch 4)
- Three-way comparison: Actual vs Replan vs Forecast (mock forecast = 1.03-1.08x actuals)
- Data freshness monitoring with staleness warnings
- Rule-based recommendation engine (severity-ranked)
- Reports page: PES + Variance + Three-Way Comparison tabs

### Job Board + Real-time (Batch 5)
- Full job lifecycle: submitted → queued → assigned → processing → review → completed/failed
- Priority routing: critical (<2min), high (<10min), medium (<30min), low (<2hr)
- Agent pool: PES Agent, CI Agent, Forecasting Agent, Ad-Hoc Agent
- WebSocket server AND client wired (NOT polling)
- Dev mode: auto-simulates job completion for testing
- Job detail panel with result, error, SLA deadline, retries
- Scheduled/recurring job support

### Dashboard
- Live KPI cards pulling real data from SQLite
- Bar chart showing YTD vs Periodic growth
- Quick action links to chat queries

### Data Explorer
- Entity hierarchy browser (173 entities with parent/level)
- Account structure browser (36 accounts with sign conversion)
- Data catalog summary cards

## SQLite Column Name Mapping
The SQLite schema uses different column names than BUILD_PROMPT.md expected:
- Entity: `Child_Entity` (not `Entity_Alias`), `Child_Entity_ID` (not `Entity_ID`)
- Account: `Child_Account` (not `Account_Alias`), `Child_Account_ID` (not `Account_ID`)
- Views: `Entity` (not `Entity_Alias`), `Account_KPI` (not `Account_Alias`), `Period` (not `Date_ID`)
- Date: `Year`/`Period`/`Quarter` (not `Fiscal_Year`/`Fiscal_Period`)
- Replan: `Entity` (not `Entity_Alias`), `Account_KPI`

The data layer normalizes these to consistent output shapes.

## Anti-Patterns to Avoid (carried from Build 1)
1. Use `claude-sonnet-4-20250514` — NOT `claude-opus-4-6`
2. Always use parameterized SQL queries — NEVER interpolate strings
3. Config keys defined ONCE in config.mjs — reference everywhere
4. Always JOIN dimension tables for human-readable labels
5. Wire WebSocket on BOTH server AND client
6. EVERY analytics response includes a Recharts chart
7. Use FMP API for real competitor data — no hardcoded/simulated CI
8. Tailwind + shadcn/ui + OKLCH tokens from day 1

## npm Workaround
System npm is broken (NVM issue). Use this to run npm:
```bash
node "/c/Users/farza/.npm-install/package/bin/npm-cli.js" install
```
For Next.js dev:
```bash
node node_modules/next/dist/bin/next dev --port 3000
```

## Next: Batch 6 — Admin
- Template management, RBAC, org hierarchy, Databricks connection admin
- Prompt management, peer group configuration
