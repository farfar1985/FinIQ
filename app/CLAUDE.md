# FinIQ App — Claude Code Context

## What is this?
You are building **FinIQ** — a Unified Financial Analytics Hub for Mars, Incorporated. This is a web application where Mars business users ask financial and competitive questions in natural language (typed or spoken), and an AI agent processes them against Mars's Databricks data and returns interactive reports, summaries, and analytics.

## Architecture
This app is based on the **Amira Meet Desktop** codebase (`~/qdt-repos/amira-b-meet-desktop/`). You should reference that repo for patterns but NEVER modify it. Copy what you need into this app directory.

### What to reuse from Amira Meet Desktop:
- Node.js modular server architecture (lib/ + agents/ pattern)
- Agent framework (standalone agents with tool-use loops, LLM connections)
- Brain/knowledge system (BM25 search, brain loading)
- Canvas/dashboard session management
- WebSocket infrastructure for real-time comms
- Voice input/output pipeline (OpenAI Realtime API for speech-to-text and text-to-speech)

### What to strip/NOT include:
- All named AI personalities (Amira, Kern, Nyx, Vex, Shipy) — there is ONE agent: "Coding Agent"
- All oil/maritime/commodity-specific agents and data (AIS, QuantShip, QML, Weaviate news)
- Electron app wrapper — this is a web app
- Recall.ai meeting bot integration
- All references to Bill, QDT-brain, commodity data lake

### What to build NEW:
- **Databricks connector** — connects to finiq_ tables/views (17 tables + 3 views)
- **PES report engine** — generate 6-KPI performance summaries from Databricks views
- **Budget variance** — actual vs replan analysis from finiq_financial_replan tables
- **CI pipeline** — document ingestion, themed summaries, P2P benchmarking
- **NL query interface** — intent classification → route to right handler → query Databricks → return result
- **Job board** — users submit queries, single agent processes them with SLAs
- **Admin panel** — templates, org hierarchy, RBAC, Databricks connection config
- **Dynamic UI** — React + TypeScript SPA with configurable dashboards, SSE, export

## The ONLY data source is Databricks
No other data connections. Everything comes from the `finiq_` tables in Databricks.

### Databricks Connection (Synthetic — current):
- **Workspace**: `dbc-af05a0e0-4ebe.cloud.databricks.com`
- **Catalog**: `workspace` | **Schema**: `default`
- **Warehouse**: Serverless Starter Warehouse (2XS)
- **All tables prefixed**: `finiq_`
- **17 tables + 3 views**, 165K+ rows

### Also available as SQLite fallback:
- `~/qdt-repos/FinIQ/finiq_synthetic.db` (21.4 MB) — same schema, local file

### Dual-mode:
The app MUST support a config toggle between:
1. **Simulated mode** — connects to synthetic Databricks (above) or SQLite fallback
2. **Real mode** — connects to Mars production Databricks (`corporate_finance_analytics_dev.finsight_core_model_mvp3`)

### Key Databricks objects:
- **Views (map to PES Excel)**: `finiq_vw_pl_entity` (P&L), `finiq_vw_pl_brand_product` (Product/Brand), `finiq_vw_ncfo_entity` (NCFO)
- **Fact tables**: `finiq_financial` (39-col denormalized), `finiq_financial_base`, `finiq_financial_cons`, `finiq_financial_replan`
- **Dimensions**: `finiq_dim_entity` (150+ org units), `finiq_dim_account`, `finiq_account_formula` (KPI calc logic), `finiq_composite_item`, `finiq_customer`
- **6 KPIs**: Organic Growth, MAC Shape %, A&CP Shape %, CE Shape %, Controllable Overhead Shape %, NCFO

## Voice capability
Users can SPEAK their queries. Keep the voice input/output pipeline. Use OpenAI Realtime API or similar for:
- Speech-to-text (user speaks a question)
- Text-to-speech (app reads back the answer)

## Specs (READ THESE — they are in the parent directory):
- `../FinIQ SRS v3.0 Final.docx` — 50 functional requirements, full architecture
- `../Testing Agent SRS/FinIQ Testing Agent SRS v1.1.docx` — 31 test requirements, quantitative eval
- `../Matt's databricks schema/FinIQ Databricks Schema Reference (claude generated).docx` — all 20 tables/views

## Language rules (Mars-facing text):
- NEVER say "replace" → use "augment", "consolidate", "evolve", "enhance"
- NEVER say "fragmented" → use "dispersed" or "separate"
- No timelines or cost estimates in any UI text

## Tech stack:
- **Frontend**: React + TypeScript SPA, Vite
- **Backend**: Node.js, Express or plain HTTP
- **LLM**: Azure OpenAI (GPT-4.1 or latest) via LangChain
- **Data**: Databricks SQL connector + SQLite fallback
- **Real-time**: WebSocket + SSE
- **Voice**: OpenAI Realtime API

## MVP Deadline: April 21, 2026

## Session tracking
Create and maintain:
- `memory/` folder with session files (`YYYY-MM-DD-N.md`) tracking what you build each session
- `TODO.md` — step-by-step checklist of all work items mapped to SRS FRs
- Update these after every major chunk of work
