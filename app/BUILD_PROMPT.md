# FinIQ Build Specification
## Amira FinIQ — Unified Financial Analytics Hub for Mars, Incorporated

---

## 1. INSTRUCTIONS

Read the two specification documents in this directory:
1. **`FinIQ SRS v3.1 Final.docx`** — 52 functional requirements (FR1-FR8), CI/FMP module (Section 7), suggested prompts (Appendix C)
2. **`FinIQ Frontend Design Guideline v1.0.docx`** — Bloomberg-inspired dark-first design system, component library, chart specifications

Then:
1. **Construct a compliance matrix** mapping all 52 FRs + design guideline checklist items to testable criteria. Score 1-100.
2. **Build the complete application** following the tech stack, data layer, and feature batches below.
3. **Test against the compliance matrix** after each batch.
4. **Iterate until all bugs are resolved and compliance score is maximized.**

---

## 2. EXECUTION MODEL

### Single Agent Mode
Build features sequentially following the batch order in Section 8.

### Multi-Agent Mode (preferred)
If you can spawn specialized agents, use these roles:

| Role | Scope |
|------|-------|
| **Architect** | Technical design, module boundaries, dependency order, database schema |
| **UI Architect** | Component specs, design system compliance, responsive layout, accessibility |
| **Backend Coder** | Node.js API routes, Databricks connector, LLM integration, job queue |
| **Frontend Coder** | Next.js pages, React components, Recharts charts, Zustand stores, WebSocket client |
| **Integration Engineer** | Cross-service wiring: Forecasting API, Marketing API, FMP API, export service |
| **Reviewer** | Code review for correctness, security (SQL injection, secrets), performance, spec compliance |

Workflow per batch: **Plan → Implement (parallel tracks) → Review → Fix → Approve → Next batch**

---

## 3. TECH STACK

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js (App Router) | 16.x | Framework |
| React | 19.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Styling |
| shadcn/ui | 4.x | Component primitives |
| Recharts | 3.x | Area charts, bar charts, treemaps, composed charts |
| lightweight-charts | 5.x | TradingView-style candlestick/OHLC charts |
| lucide-react | 0.577+ | Icon system |
| Zustand | 5.x | Global UI state (sidebar, theme) |
| @tanstack/react-table | 8.x | Table state, sorting, pagination |
| class-variance-authority | 0.7+ | Variant management |
| clsx + tailwind-merge | Latest | Class composition |
| date-fns | 4.x | Date formatting |

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20+ | Runtime |
| Express | 4.x | HTTP server |
| @anthropic-ai/sdk | Latest | Claude LLM (NL queries, summarization) |
| @databricks/sql | 1.x | Databricks SQL connector |
| better-sqlite3 | 11.x | SQLite fallback |
| ws | 8.x | WebSocket real-time updates |
| pdf-parse | 1.x | PDF text extraction for CI |

### Fonts
- Primary: `IBM Plex Sans` (weights: 400, 500, 600, 700)
- Monospace: `JetBrains Mono` (tabular numerics for financial data)

---

## 4. DESIGN SYSTEM (condensed from Frontend Guideline v1.0)

### Color Tokens (OKLCH — Dark Mode Primary)
```css
:root.dark {
  --background: oklch(0.12 0.005 250);      /* Deep navy-black */
  --foreground: oklch(0.93 0 0);            /* Near-white text */
  --card: oklch(0.16 0.005 250);            /* Elevated surface */
  --primary: oklch(0.55 0.15 250);          /* Muted blue */
  --secondary: oklch(0.20 0.005 250);
  --muted-foreground: oklch(0.55 0 0);      /* Gray text */
  --border: oklch(0.25 0.005 250);          /* Subtle dividers */
  --positive: oklch(0.70 0.17 160);         /* Green — gains */
  --negative: oklch(0.65 0.20 25);          /* Red — losses */
  --chart-1: oklch(0.55 0.15 250);          /* Blue */
  --chart-2: oklch(0.70 0.17 160);          /* Green */
  --chart-3: oklch(0.65 0.20 25);           /* Red */
  --chart-4: oklch(0.70 0.15 80);           /* Amber */
  --chart-5: oklch(0.65 0.18 300);          /* Purple */
  --sidebar: oklch(0.10 0.005 250);
}
```

### Layout
```
┌──────────────────────────────────────────────────────────┐
│ [Sidebar]  │ [Top Header with Search + Notifications]    │
│  48px/192px │ h-12 (48px)                                │
├────────────┼─────────────────────────────────────────────┤
│            │ [Market Ticker Strip] h-8 (32px)            │
│  Collapsible├─────────────────────────────────────────────┤
│  Nav       │          [Main Content Area]                │
│  Items     │          12-column grid, p-4                │
│            │                                             │
│ [Theme]    │                                             │
│ [Collapse] │                                             │
└────────────┴─────────────────────────────────────────────┘
```

### Key Components
- **KPI Stat Card**: Label (10px uppercase), value (lg semibold tabular-nums), change badge (+/- colored)
- **Change Badge**: Green for positive, red for negative, gray for zero. Format: `+5.23%`
- **Financial Table**: 11px uppercase headers, mono font for numbers, right-aligned numerics, sortable
- **Area Chart**: Recharts with gradient fill, OKLCH colors, `var(--border)` grid lines
- **Sparkline**: Custom SVG, auto-color based on trend direction
- **Every analytics response MUST include a chart** — default to area chart for time series, bar chart for comparisons

### Typography
- Page titles: `text-base font-medium` (16px)
- Table headers: `text-[11px] font-semibold uppercase tracking-wider`
- Data cells: `text-xs font-mono tabular-nums`
- Body: `text-sm` (14px)

---

## 5. DATA LAYER

### Databricks / FinSight Schema
- **Catalog**: `workspace` | **Schema**: `default` | **Prefix**: `finiq_`
- **20 objects**: 17 tables + 3 views

#### Dimension Tables (11)
| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `finiq_date` | Date_ID, Fiscal_Year, Fiscal_Period | Calendar/fiscal mapping |
| `finiq_dim_entity` | Entity_ID, Entity_Alias, Parent_Entity_ID | 173 org units (Mars > GBU > Division > Region > Sub-unit) |
| `finiq_dim_account` | Account_ID, Account_Alias, Sign_Conversion, Parent_Account_ID | 36 accounts with hierarchy |
| `finiq_account_formula` | Formula_ID, Account_ID, Numerator_Account_ID, Denominator_Account_ID | KPI calculation logic |
| `finiq_account_input` | Input_ID, Account_ID | Account input definitions |
| `finiq_composite_item` | Composite_Item_ID, Item_Description | 12-col product master (93 products) |
| `finiq_item` | Item_ID, Item_Description | 15-col granular product |
| `finiq_item_composite_item` | Item_ID, Composite_Item_ID | Bridge table |
| `finiq_customer` | Customer_ID, Customer_Name | 56 customers |
| `finiq_customer_map` | Customer_ID, Hierarchy_Level | Customer hierarchy |
| `finiq_economic_cell` | Cell_ID | Economic cell definitions |

#### Fact Tables (5)
| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `finiq_financial` | 39 columns (denormalized wide) | Main financial facts |
| `finiq_financial_base` | 7 columns (normalized) | Base financial data |
| `finiq_financial_cons` | 9 columns with currency | Consolidated financials (used by views) |
| `finiq_financial_replan` | 18 columns: Actual_USD_Value, Replan_USD_Value | **Actual vs budget variance** |
| `finiq_financial_replan_cons` | 6 columns | Consolidated replan |

#### Precomputed Views (3) — Map directly to PES Excel sheets
| View | Maps To | Output Columns |
|------|---------|----------------|
| `finiq_vw_pl_entity` | P&L sheet | Date_ID, Entity_Alias, Account_Alias, YTD_LY_Value, YTD_CY_Value, Periodic_LY_Value, Periodic_CY_Value |
| `finiq_vw_pl_brand_product` | Product/Brand sheets | Same columns + brand/product dimension |
| `finiq_vw_ncfo_entity` | NCFO sheet | Same columns for NCFO accounts |

#### 6 KPIs (from PES)
1. Organic Growth
2. MAC Shape %
3. A&CP Shape %
4. CE Shape %
5. Controllable Overhead Shape %
6. NCFO

#### KPI Calculation Pattern
```
Growth % = ((CY_Value - LY_Value) / ABS(LY_Value)) * 100
```
For each KPI, query the relevant view with Entity_Alias filter, compute YTD Growth and Periodic Growth.

### Dual-Mode Configuration
```env
# Simulated mode (default — uses SQLite)
DATA_MODE=simulated
SQLITE_PATH=../finiq_synthetic.db

# Databricks mode (real data)
DATA_MODE=databricks
DATABRICKS_SERVER_HOSTNAME=dbc-af05a0e0-4ebe.cloud.databricks.com
DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/<warehouse_id>
DATABRICKS_TOKEN=<token>
DATABRICKS_CATALOG=workspace
DATABRICKS_SCHEMA=default
```

The app MUST work in simulated mode with zero external dependencies. Auto-fallback to SQLite if Databricks connection fails.

---

## 6. COMPETITIVE INTELLIGENCE — FMP API (REAL DATA)

### DO NOT USE SIMULATED/HARDCODED COMPETITOR DATA.

Use the Financial Modeling Prep (FMP) API for real competitor financials.

### Competitor Universe (10 companies)
| Company | Ticker | Segment Overlap |
|---------|--------|-----------------|
| Nestle | NSRGY | Confectionery, Pet Care, Food |
| Mondelez | MDLZ | Confectionery, Snacking |
| Hershey | HSY | Confectionery |
| Ferrero | Private | Confectionery |
| Colgate-Palmolive | CL | Pet Care (Hill's) |
| General Mills | GIS | Pet Care (Blue Buffalo), Food |
| Kellanova | K | Snacking |
| J.M. Smucker | SJM | Pet Care (Meow Mix, Milk-Bone) |
| Freshpet | FRPT | Pet Care (fresh/refrigerated) |
| IDEXX | IDXX | Veterinary diagnostics |

### Key FMP API Endpoints
| Endpoint | Use Case |
|----------|----------|
| `/api/v3/income-statement/{ticker}` | Revenue, margins, profitability |
| `/api/v3/balance-sheet-statement/{ticker}` | Assets, liabilities |
| `/api/v3/ratios/{ticker}` | Financial ratios for benchmarking |
| `/api/v3/earning_call_transcript/{ticker}` | Earnings call transcripts for NLP |
| `/api/v3/analyst-estimates/{ticker}` | Analyst consensus estimates |
| `/api/v3/key-metrics/{ticker}` | Market cap, PE, EV/EBITDA |
| `/api/v4/mergers-acquisitions-rss-feed` | M&A activity tracker |
| `/api/v3/stock-news` | Company news feed |
| `/api/v3/market-capitalization/{ticker}` | Market cap for HHI calculation |

### CI Standard Views (from SRS Section 7)
1. **SWOT Analysis** — Auto-generated quarterly from FMP ratios + earnings sentiment
2. **Porter's Five Forces** — Quantified via HHI from market cap, supplier/buyer power metrics
3. **Earnings Call Intelligence** — NLP on transcripts: sentiment scoring, strategic keywords, management tone
4. **Financial Benchmarking Dashboard** — Side-by-side comparison across competitor universe
5. **Competitive Positioning Map** — 2D scatter plot (e.g., X=revenue growth, Y=operating margin)
6. **M&A Tracker** — Timeline of competitor transactions from FMP M&A feed

---

## 7. SUGGESTED PROMPT CATALOG (from Appendix C)

### 18 Pre-configured Query Templates
Stored in database with this schema:
```json
{
  "suggested_prompt": "<template with {variables}>",
  "description": "<human-readable description>",
  "kpi": ["<associated KPIs>"],
  "tag": "<classification>",
  "unit": "<default org unit scope>",
  "runs": 0,
  "is_active": true,
  "category": "<bridge|margin|revenue|narrative|customer|cost>"
}
```

### Variable Resolution
- `{unit}` → Resolved from user's active org unit or RBAC default
- `{current_year}` → Current fiscal year from finiq_date
- `{current_period}` → Most recent closed period
- `{current_quarter}` → Current fiscal quarter

### Categories
1. **Bridge / Waterfall Analysis** — Revenue bridges, margin walks
2. **Margin & Profitability** — MAC Shape, CE Shape, overhead analysis
3. **Revenue & Growth** — Organic growth drivers, price/volume/mix
4. **Performance Narrative & KPI Summary** — Period end summaries, WWW/WNWW
5. **Customer & Cost** — Customer profitability, cost structure analysis

Display prompts contextually in the query interface based on user's org unit and role.

---

## 8. FEATURE BATCHES (dependency order)

### Batch 1: Foundation (no dependencies)
**Agents**: Frontend Coder + Backend Coder
- Next.js 16 project scaffold with Tailwind CSS 4 + shadcn/ui
- App shell: collapsible sidebar (48px/192px), top header (48px), market ticker strip (32px), main content area with 12-col grid
- Express backend with `/api/health` endpoint
- Environment config (`.env`) with dual-mode toggle
- Dark mode default + light mode toggle
- IBM Plex Sans + JetBrains Mono fonts loaded
- OKLCH CSS variables in globals.css
- Basic routing: Dashboard, Chat, Financial Reports, CI, Data Explorer, Jobs, Admin

### Batch 2: Data Layer (depends on Batch 1)
**Agents**: Backend Coder + Architect
- FR1.1: Databricks SQL connector with automatic SQLite fallback
- FR1.6: Connection management (health check, 3 retries with exponential backoff, 10 max sessions, 60s timeout)
- Dimension table queries: entity hierarchy, account tree, products, customers
- Schema context string for LLM prompts (all 20 tables/views described)
- FR1.4: Data catalog basics (source, timestamp, freshness)
- **IMPORTANT**: Always JOIN with `finiq_dim_account` for human-readable account names. Never show "Unknown".

### Batch 3: Core Analytics + NL Query (depends on Batch 2)
**Agents**: Backend Coder + Frontend Coder + UI Architect
- FR2.1: PES generation — query 3 views, compute 6 KPIs, generate narratives in 3 formats (Summary, WWW, WNWW)
- FR2.7: Budget variance — query `finiq_financial_replan`, show Actual vs Replan with variance % and favorable/unfavorable
- FR2.2: Configurable KPI framework using `finiq_account_formula`
- FR2.3: Sub-unit rankings (RANK 1, TOP 3, BOTTOM 3) for each KPI
- FR2.4: Interactive KPI tables with sorting, filtering, drill-down
- FR2.5: Custom report builder (select KPIs, units, periods, comparison bases)
- FR2.6: Export to PDF, DOCX, PPTX, XLSX, CSV
- FR4.1: NL conversational query engine using Anthropic Claude (`claude-sonnet-4-20250514`)
- FR4.2: Multi-turn conversations with session context
- FR4.3: Intent classification → routing (pes, ncfo, variance, product, adhoc, ci, job)
- FR4.4: Source attribution (table name, query, row count)
- FR4.5: Suggested prompt library (18 prompts displayed contextually)
- FR4.6: Variable resolution engine ({unit}, {current_year}, {current_period}, {current_quarter})
- **EVERY analytics response MUST include a Recharts chart** — area chart for time series, bar chart for comparisons, treemap for hierarchical data

### Batch 4: Intelligence Layer (depends on Batch 2)
**Agents**: Integration Engineer + Backend Coder
- FR6.1: Three-way comparison: Actual (finiq_financial_cons) vs Replan (finiq_financial_replan) vs Forecast (Forecasting API — stub with realistic mock if API unavailable)
- FR6.2: Marketing Analytics API integration (stub with mock if unavailable)
- FR6.3: Unified recommendation engine (combines forecast + marketing + actuals)
- FR6.5: Data freshness monitoring (track latest Date_ID, row counts, staleness alerts)
- FR3.3: Internal-external cross-reference (join Mars data with FMP competitor data)

### Batch 5: Job Board + Real-time (depends on Batch 1)
**Agents**: Backend Coder + Frontend Coder
- FR5.1: Job submission (query interface auto-route, dedicated form, API)
- FR5.2: Agent pool (PES Agent, CI Agent, Forecasting Agent, Ad-Hoc Agent)
- FR5.3: Priority routing with SLA targets (Critical <2min, High <10min, Medium <30min, Low <2hr)
- FR5.4: Job lifecycle (Submitted → Queued → Assigned → Processing → Review → Completed/Failed)
- FR5.5: Enterprise job dashboard with filters (dept, priority, agent type, date)
- FR5.6: Scheduled & recurring jobs (cron-like with timezone)
- FR5.7: Collaborative review & approval workflow
- FR8.1: Configurable dashboard layout (drag-and-drop widgets)
- FR8.3: WebSocket real-time updates — **BOTH server AND client must be wired**

### Batch 6: Admin (depends on Batch 2)
**Agents**: Backend Coder + Frontend Coder
- FR7.1: Template management (visual editor, versionable with rollback)
- FR7.2: Org hierarchy management (add/modify/reorganize units)
- FR7.3: Peer group configuration for CI benchmarking
- FR7.4: Prompt management (configurable, not hardcoded, immediate effect)
- FR7.5: RBAC (Admin, Analyst, Viewer, API Consumer) with org unit scoping
- FR7.6: Databricks connection admin (URL, credentials, catalog/schema, test button, fallback toggle)
- FR1.5: Incremental & scheduled ingestion with status dashboard

### Batch 7: CI/FMP Module (depends on Batches 2 + 4)
**Agents**: Integration Engineer + Backend Coder + Frontend Coder
- FR3.1: Themed competitor summaries from FMP earnings transcripts + financial data (7 themes)
- FR3.2: P2P benchmarking tables from FMP ratios (OG%, margins, revenue growth)
- FR3.4: Competitor monitoring & alerts (scheduled FMP polling, threshold-based notifications)
- FR1.2: Competitor data ingestion via FMP API (replaces manual PDF upload for public companies)
- FR1.3: FMP API as third-party connector for all 10 competitors
- SWOT Analysis: Auto-generate from FMP financial ratios + earnings transcript sentiment
- Porter's Five Forces: Quantify via HHI from FMP market cap data
- Earnings Call Intelligence: NLP on FMP transcripts (sentiment, keywords, tone, forward guidance)
- Financial Benchmarking Dashboard: Side-by-side Recharts comparison across competitors
- Competitive Positioning Map: 2D Recharts scatter plot on user-selectable dimensions
- M&A Tracker: Timeline visualization from FMP M&A Search API

### Batch 8: Polish + Final Compliance (depends on all)
**Agents**: All
- FR8.2: Dynamic report viewer (zoom, hover tooltips, click-to-drill-down, side-by-side comparisons)
- FR8.4: Adaptive query interface (auto-complete, recent queries, follow-up suggestions)
- FR8.5: Theme & branding (Mars logo, GBU color schemes, branded exports)
- FR8.6: WCAG 2.1 AA accessibility (keyboard nav, screen reader, focus states)
- FR8.7: Context-aware UI rendering (auto-expand relevant panels based on intent)
- FR8.8: Progressive disclosure (show essentials first, details on demand)
- FR8.9: Dynamic component injection
- FR8.10: Multi-panel workspace
- FR8.11: UI state management & undo/redo
- FR6.4: External API gateway (RESTful endpoints for third-party integrations)
- **Run full compliance matrix. Fix ALL gaps. Target: 95+ score.**

---

## 9. ANTI-PATTERNS (lessons from Build 1 — DO NOT REPEAT)

| Issue | What Happened | What To Do Instead |
|-------|---------------|-------------------|
| Wrong model name | Used `claude-opus-4-6` (invalid) | Use `claude-sonnet-4-20250514` from Anthropic SDK |
| SQL injection | Entity names interpolated into SQL strings | Always use parameterized queries |
| Config mismatch | `admin.mjs` used `DATABRICKS_HOST`, `config.mjs` used `DATABRICKS_SERVER_HOSTNAME` | Define config keys ONCE, reference everywhere |
| Missing JOINs | Variance query didn't JOIN `finiq_dim_account` — showed "Unknown" | Always JOIN dimension tables for human-readable labels |
| WebSocket not wired | Server-side WebSocket built, but React client polled `/api/jobs` every 2s | Implement BOTH server AND client WebSocket |
| No charting | User asked "plot me sales" and got a data table | EVERY analytics response includes a Recharts chart |
| Simulated CI data | Hardcoded competitor data (Nestle=fake numbers) | Use FMP API for REAL competitor financials |
| No design system | Vanilla CSS, inconsistent styling | Use Tailwind + shadcn/ui + OKLCH tokens from day 1 |

---

## 10. CREDENTIALS

Create a `.env` file from the template below. **NEVER commit real credentials to git.**

```env
# Anthropic (for NL queries)
ANTHROPIC_API_KEY=<your_anthropic_api_key>

# Financial Modeling Prep (for CI module — get key from team's shared credentials)
FMP_API_KEY=<your_fmp_api_key>

# Databricks (synthetic workspace)
DATABRICKS_TOKEN=<your_databricks_token>
DATABRICKS_SERVER_HOSTNAME=dbc-af05a0e0-4ebe.cloud.databricks.com
DATABRICKS_HTTP_PATH=/sql/1.0/warehouses/<warehouse_id>
DATABRICKS_CATALOG=workspace
DATABRICKS_SCHEMA=default

# Data mode toggle
DATA_MODE=simulated
SQLITE_PATH=../finiq_synthetic.db
```

**Credential sources** (stored in team's shared Google Drive — NOT in git):
- FMP API key: provided by Rajiv
- Databricks token: provided by Rajiv/Cesar
- Anthropic key: provided by Farzaneh

**IMPORTANT**: Add `.env` to `.gitignore`. Store credentials in `.env` file ONLY.

---

## 11. COMPLIANCE MATRIX TEMPLATE

Score each item 0 (not done), 0.5 (partial), or 1 (complete). Total score = sum / total items * 100.

### Functional Compliance (52 items)
- [ ] FR1.1: Databricks ingestion with SQLite fallback works
- [ ] FR1.2: Competitor document ingestion (FMP transcripts)
- [ ] FR1.3: FMP API connector operational for all 10 competitors
- [ ] FR1.4: Data catalog with lineage metadata
- [ ] FR1.5: Scheduled ingestion with status dashboard
- [ ] FR1.6: Connection management (retry, pooling, health check)
- [ ] FR2.1: PES generation from 3 views, 6 KPIs, 3 formats
- [ ] FR2.2: Configurable KPI framework (account_formula)
- [ ] FR2.3: Sub-unit rankings (RANK 1, TOP 3, BOTTOM 3)
- [ ] FR2.4: Interactive KPI tables (sort, filter, drill-down)
- [ ] FR2.5: Custom report builder
- [ ] FR2.6: Export to PDF, DOCX, PPTX, XLSX, CSV
- [ ] FR2.7: Budget variance with account names (not "Unknown")
- [ ] FR3.1: Themed competitor summaries from real FMP data
- [ ] FR3.2: P2P benchmarking tables with real financial ratios
- [ ] FR3.3: Internal-external cross-reference queries work
- [ ] FR3.4: Competitor monitoring with alerts
- [ ] FR4.1: NL query returns structured answers with charts
- [ ] FR4.2: Multi-turn conversations maintain context
- [ ] FR4.3: Intent classification routes correctly
- [ ] FR4.4: Source attribution on every answer
- [ ] FR4.5: Suggested prompt library (18 prompts displayed)
- [ ] FR4.6: Variable resolution ({unit}, {year}, {period}, {quarter})
- [ ] FR5.1: Job submission via query interface + form + API
- [ ] FR5.2: Agent pool with specialization
- [ ] FR5.3: Priority routing with SLA targets
- [ ] FR5.4: Job lifecycle tracking (full state machine)
- [ ] FR5.5: Job dashboard with filters
- [ ] FR5.6: Scheduled/recurring jobs
- [ ] FR5.7: Collaborative review workflow
- [ ] FR6.1: Three-way comparison (Actual vs Replan vs Forecast)
- [ ] FR6.2: Marketing Analytics integration
- [ ] FR6.3: Unified recommendation engine
- [ ] FR6.4: External API gateway
- [ ] FR6.5: Data freshness monitoring
- [ ] FR7.1: Template management
- [ ] FR7.2: Org hierarchy management
- [ ] FR7.3: Peer group configuration
- [ ] FR7.4: Prompt management (configurable, not hardcoded)
- [ ] FR7.5: RBAC with org unit scoping
- [ ] FR7.6: Databricks connection admin panel
- [ ] FR8.1: Configurable dashboard (drag-drop)
- [ ] FR8.2: Dynamic report viewer (zoom, drill-down)
- [ ] FR8.3: Real-time WebSocket updates (server + client)
- [ ] FR8.4: Adaptive query interface
- [ ] FR8.5: Theme & branding
- [ ] FR8.6: WCAG 2.1 AA accessibility
- [ ] FR8.7: Context-aware UI rendering
- [ ] FR8.8: Progressive disclosure
- [ ] FR8.9: Dynamic component injection
- [ ] FR8.10: Multi-panel workspace
- [ ] FR8.11: UI state management & undo/redo

### Design Compliance (15 items)
- [ ] OKLCH color tokens implemented (dark + light mode)
- [ ] IBM Plex Sans + JetBrains Mono fonts loaded
- [ ] Collapsible sidebar (48px ↔ 192px) with smooth transition
- [ ] Top header with global search + notifications + user menu
- [ ] Market ticker strip with scrolling data
- [ ] 12-column responsive grid layout
- [ ] KPI stat cards with change badges
- [ ] Financial tables with mono font, tabular-nums, sortable
- [ ] Recharts area charts with gradient fills
- [ ] Sparklines (SVG, auto-color by trend)
- [ ] Treemap visualization
- [ ] Consistent tooltip styling across all charts
- [ ] shadcn/ui component patterns (Button, Card, Badge, Input, Select, Tabs)
- [ ] Responsive design (mobile: stacked, tablet: 2-3 col, desktop: full grid)
- [ ] Scrollbar styling (thin, themed)

### CI/FMP Compliance (6 items)
- [ ] SWOT analysis view with real FMP data
- [ ] Porter's Five Forces with quantified metrics
- [ ] Earnings Call Intelligence with NLP analysis
- [ ] Financial Benchmarking Dashboard (side-by-side charts)
- [ ] Competitive Positioning Map (scatter plot)
- [ ] M&A Tracker timeline

### Technical Compliance (7 items)
- [ ] All SQL queries parameterized (zero string interpolation)
- [ ] Credentials in .env only (not hardcoded)
- [ ] Dual-mode works (SQLite fallback when no Databricks)
- [ ] App starts with `npm run dev` without errors
- [ ] WebSocket connected (not polling)
- [ ] LLM calls use correct model name
- [ ] Error handling with graceful fallbacks throughout

**TOTAL: 80 items. Target score: 95+ (76/80 items complete)**

---

## 12. PROJECT STRUCTURE

```
app/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── globals.css               # OKLCH design tokens
│   │   ├── layout.tsx                # Root layout, fonts
│   │   ├── page.tsx                  # Dashboard home
│   │   ├── chat/page.tsx             # NL query interface
│   │   ├── reports/page.tsx          # Financial reports
│   │   ├── ci/page.tsx               # Competitive intelligence
│   │   ├── explorer/page.tsx         # Data explorer
│   │   ├── jobs/page.tsx             # Job board
│   │   └── admin/page.tsx            # Admin panel
│   ├── components/
│   │   ├── ui/                       # shadcn/ui primitives
│   │   ├── layout/                   # AppShell, Sidebar, Header, Ticker
│   │   ├── charts/                   # Recharts wrappers
│   │   ├── shared/                   # KPI cards, badges, formatters
│   │   └── features/                 # Feature-specific components
│   ├── lib/
│   │   ├── utils.ts                  # cn() helper
│   │   ├── format.ts                 # Number formatters
│   │   └── api.ts                    # API client
│   ├── stores/
│   │   └── ui-store.ts              # Zustand (sidebar, theme)
│   └── types/                        # TypeScript interfaces
├── server/
│   ├── index.js                      # Express entry point
│   ├── lib/
│   │   ├── config.mjs               # Environment config (SINGLE SOURCE OF TRUTH)
│   │   ├── databricks.mjs           # Dual-mode connector
│   │   ├── routes.mjs               # API routes
│   │   ├── schema-context.mjs       # 20-table schema for LLM
│   │   ├── websocket.mjs            # WebSocket server
│   │   ├── job-board.mjs            # Job queue + SLA
│   │   ├── ci-pipeline.mjs          # CI ingestion + FMP
│   │   ├── fmp-client.mjs           # FMP API client
│   │   └── admin.mjs                # Admin functions
│   └── agents/
│       ├── finiq-agent.mjs          # NL query processor
│       └── ci-agent.mjs             # CI analysis agent
├── .env.example                      # Credentials template
├── .gitignore                        # Must include .env
├── BUILD_PROMPT.md                   # This file
├── CLAUDE.md                         # Agent context
├── package.json
└── README.md
```

---

## 13. LANGUAGE RULES (Mars-facing text in UI)

- **NEVER** say "replace" → use "augment", "consolidate", "evolve", "enhance"
- **NEVER** say "fragmented" → use "dispersed" or "separate"
- **NO** timelines or cost estimates in any UI text
- All AI-generated content must be labeled as such
- Forecasts must be labeled as "projections"
- Mars branding in exports (logo, color scheme)

---

*Built from: SRS v3.1 (52 FRs) + Frontend Design Guideline v1.0 + Lessons from Build 1*
*Prepared by: Claude Code (reviewer/optimizer) for Farzaneh's agent pipeline*
*Date: 2026-03-27*
