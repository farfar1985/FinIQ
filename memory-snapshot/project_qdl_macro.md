---
name: QML Macroeconomic Context Feature
description: QML macro enrichment live since 2026-04-14. Pure-macro routing added 2026-04-20 (CPI queries skip Databricks entirely). Three-mode operation.
type: project
originSessionId: 01322f08-c136-4f72-b4ed-f930c8172fcc
---
**QML macro enrichment — current state (2026-04-20)**

Three operating modes for macro queries:

1. **Auto-enrichment on financial queries** (since 2026-04-14, pushed) — Financial query hits Databricks → LLM summary → macro enrichment runs in parallel → appended as "💡 Wondering why?" section. Sets `intent: "macro_context"`. Per Rajiv's ask.

2. **"Why" follow-up chip** (original pattern) — When macro auto-enrichment doesn't fire (or for declining/growing signals), "Why is this happening?" chip appears. User clicks → full macro enrichment.

3. **Pure-macro routing** (2026-04-20, LOCAL NOT PUSHED) — Queries with ONLY macro keywords and no Mars/competitor reference skip Databricks entirely. New `isMacroOnlyQuery()` in `src/lib/llm-query.ts`. Triggers on: CPI, inflation, consumer confidence/sentiment, unemployment, GDP, interest rate, EUR/USD, cocoa/sugar/corn/coffee/palm oil, commodity. Routes directly to `enrichWithMacroContext` with empty `internalSummary`.

**Why mode 3 was added**: Before 2026-04-20, "Plot US CPI" fell through to `classifyQuerySource = "financial"` → Databricks LLM wrote SQL that returned Mars revenue rows aliased as `CPI_Value`. Garbage numbers + duplicate period rows + $-formatted index values. Pure-macro routing sidesteps the issue entirely.

**API Details (CONFIDENTIAL — do not share doc or key):**
- Base URL: `https://quantumcloud.ai`
- Auth: `key=` query param (stored as `QML_API_KEY` in `.env`)
- 122K+ datasources: TRAD_ECON, FRED, DTNIQ providers
- API doc: `C:\Users\farza\Downloads\Quantum ML_API Documentation_Mars_March, 2026.pdf`

**Key files:**
- `src/lib/qml-client.ts` — QML API client
- `src/lib/macro-indicators.ts` — 9 Mars-relevant indicators
- `src/lib/macro-enrichment.ts` — Orchestrator
- `src/app/api/query/route.ts` — three integration points (auto-enrich, "why" handler, pure-macro route)
- `src/lib/llm-query.ts` — `isMacroOnlyQuery` detection

**Known cosmetic issue**: Pure-macro responses still tagged `intent: "macro_context"` → badge reads "QML + Databricks" even when only QML was hit. Not worth fixing before demo.
