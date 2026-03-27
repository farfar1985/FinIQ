# FinIQ App — Claude Code Context (v2 Fresh Build)

## Build Status
- **Branch**: `v2-fresh`
- **Build start**: 2026-03-27
- **Batch 1: Foundation** — COMPLETE
- **Batch 2: Data Layer** — COMPLETE
- **Batch 3: Core Analytics + NL Query** — COMPLETE
- **Batch 4: Intelligence Layer** — COMPLETE
- **Batch 5: Job Board + Real-time** — COMPLETE
- **Batch 6: Admin** — COMPLETE
- **Batch 7: CI/FMP Module** — COMPLETE
- **Batch 8: Polish + Final Compliance** — Pending

## Architecture (v2)
- **Frontend**: Next.js 15.5 + React 19 + TypeScript + Tailwind CSS 4 + Recharts
- **Backend**: Node.js + Express 4 (ESM)
- **LLM**: Anthropic SDK (`claude-sonnet-4-20250514`)
- **Data**: Databricks SQL connector + SQLite fallback (better-sqlite3)
- **Real-time**: WebSocket (ws) — server AND client wired
- **CI Data**: FMP API with realistic mock fallback
- **State**: Zustand
- **Components**: shadcn/ui + class-variance-authority
- **Fonts**: IBM Plex Sans + JetBrains Mono
- **Design system**: OKLCH color tokens, Bloomberg-inspired dark-first

## Project Structure
```
app/
├── client/                    # Next.js frontend
│   ├── src/app/              # App Router pages (7 routes)
│   │   ├── page.tsx          # Dashboard (live KPI cards + chart)
│   │   ├── chat/page.tsx     # NL Query (chat + charts + source attribution)
│   │   ├── reports/page.tsx  # PES + Variance + Three-Way Comparison
│   │   ├── ci/page.tsx       # CI dashboard (7 tabs: Overview, SWOT, Porter's, Benchmark, Positioning, M&A, News)
│   │   ├── explorer/page.tsx # Data Explorer (entity/account browser)
│   │   ├── jobs/page.tsx     # Job Board (WebSocket real-time)
│   │   └── admin/page.tsx    # Admin (6 tabs: Connection, Org, RBAC, Prompts, Templates, Peer Groups)
│   ├── src/components/
│   │   ├── layout/           # AppShell, Sidebar, Header, Ticker
│   │   ├── charts/           # FinAreaChart, FinBarChart, ChartRenderer
│   │   ├── ui/               # shadcn/ui primitives
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
│   │   ├── routes.mjs        # All API routes (40+ endpoints)
│   │   ├── schema-context.mjs # 20-table schema for LLM prompts
│   │   ├── websocket.mjs     # WebSocket server (/ws)
│   │   ├── job-board.mjs     # Job queue, SLA routing, agent pool
│   │   ├── intelligence.mjs  # Three-way comparison, freshness, recommendations
│   │   ├── admin.mjs         # RBAC, templates, org tree, prompts, peer groups
│   │   └── fmp-client.mjs    # FMP API client with mock fallback
│   └── agents/
│       ├── finiq-agent.mjs   # NL query processor, intent classification, PES engine
│       └── ci-agent.mjs      # CI analysis: SWOT, Porter's, benchmarking, positioning
├── .env.example
├── .gitignore
├── BUILD_PROMPT.md           # Master build spec (80-item compliance matrix)
└── package.json
```

## What's Working (Batches 1-7)

### Data Layer (Batch 2)
- SQLite: 173 entities, 36 accounts, 93 products, 56 customers
- All queries parameterized (zero SQL injection)
- Dual-mode with auto-fallback

### Core Analytics (Batch 3)
- PES: 3 views, 6 KPIs, growth calculations, 3 formats
- Budget variance with proper account names
- NL query: 7 intents, charts on every response
- 18 suggested prompts with variable resolution
- Recharts: AreaChart + BarChart with OKLCH gradients

### Intelligence Layer (Batch 4)
- Three-way comparison: Actual vs Replan vs Forecast
- Data freshness monitoring, recommendation engine

### Job Board (Batch 5)
- Full lifecycle (7 states), SLA routing, 4 agent types
- WebSocket (NOT polling), dev mode simulation

### Admin Panel (Batch 6)
- Databricks connection admin with test button
- Org hierarchy tree with search/filter
- RBAC: 4 roles (Admin, Analyst, Viewer, API Consumer), 8 demo users
- Prompt management: edit, toggle, category filter
- Template management: create, edit, activate/deactivate
- Peer group configuration: 3 groups (Confectionery, Pet Care, Food)
- Ingestion status dashboard

### CI/FMP Module (Batch 7)
- FMP API client with realistic mock fallback (works without API key)
- 10 competitors with financial data
- SWOT analysis (auto-generated from ratios)
- Porter's Five Forces (HHI-based quantification)
- Earnings Call Intelligence (sentiment, topics, guidance)
- Financial Benchmarking (side-by-side charts)
- Competitive Positioning Map (ScatterChart, selectable axes)
- M&A Tracker timeline
- News feed with sentiment tags

## SQLite Column Name Mapping
- Entity: `Child_Entity` / `Child_Entity_ID` (not Entity_Alias / Entity_ID)
- Account: `Child_Account` / `Child_Account_ID`
- Views: `Entity`, `Account_KPI`, `Period`, `YTD_LY`, `YTD_CY`, `Periodic_LY`, `Periodic_CY`
- Date: `Year` / `Period` / `Quarter`
- Replan: `Entity`, `Account_KPI`, `Actual_USD_Value`, `Replan_USD_Value`

## Anti-Patterns to Avoid
1. Use `claude-sonnet-4-20250514` — NOT `claude-opus-4-6`
2. Always parameterized SQL — NEVER interpolate
3. Config keys in config.mjs only — reference everywhere
4. Always JOIN dimension tables for readable labels
5. WebSocket on BOTH server AND client
6. EVERY analytics response includes a chart
7. FMP API for real CI data (mock fallback when no key)
8. OKLCH design tokens from day 1

## npm Workaround
```bash
node "/c/Users/farza/.npm-install/package/bin/npm-cli.js" install
node node_modules/next/dist/bin/next dev --port 3000
```

## Next: Batch 8 — Polish + Final Compliance
- WCAG 2.1 AA accessibility
- Keyboard nav, focus states, screen reader
- Undo/redo, multi-panel workspace
- Dynamic component injection, progressive disclosure
- Run compliance matrix, fix all gaps, target 95+/80
