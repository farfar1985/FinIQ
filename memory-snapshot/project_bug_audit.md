---
name: Bug Audit — two waves
description: Wave 1 (2026-04-14, 14 fixes pushed to main). Wave 2 (2026-04-20, 4 fixes LOCAL — routing + badges + formatting + job processor).
type: project
originSessionId: 01322f08-c136-4f72-b4ed-f930c8172fcc
---
## Wave 1 — 2026-04-14 (PUSHED, on main)

Pushed in 3 commits: c8c6e38, 17a377d, b7fe208

14 bug fixes:
1. Date_ID formatting
2. MAC_Shape formatting (pctByName/pctByValue)
3. pctColumns reference error
4. CI query routing + classifier keywords
5. localhost:3000 → dynamic apiBase
6. Competitors widget JSON shape
7. MAC Shape SQL (pre-built self-join)
8. Unit_Alias matching (curated list in schema context)
9. CI response formatting (block.data.rows extraction)
10. Follow-up drill-down (actual entity name)
11. Reports page Shape % KPIs (divide by Net Sales)
12. Markdown rendering in chat
13. Dashboard/reports simulated early-return
14. Dynamic catalog prefix (getActiveConfig instead of hardcoded)

Plus 4 features: auto-macro in first response, sub-agent UI, DEMO/LIVE toggle, synthetic on Databricks (88,594 rows).

## Wave 2 — 2026-04-20 (LOCAL, NOT PUSHED)

4 bug fixes found during pre-demo voice testing:

1. **Pure-macro routing missing** — "Plot US CPI" hit Databricks, returned Mars revenue aliased as CPI_Value, YearPeriod as $202.4K, percentage changes as 34-billion %. Fix: `isMacroOnlyQuery()` in llm-query.ts + new route branch in query/route.ts that calls `enrichWithMacroContext` directly. Databricks bypassed for pure-macro.

2. **Voice narration badges always "LIVE Databricks"** — `intent: "voice"` hard-coded in voice-bridge.tsx, getProvenanceSource mapped to "Databricks" regardless of data source. Fix: lastDataIntentRef in voice-bridge inherits recent non-voice intent (60s window) for narration bubbles. `getProvenanceSource("voice")` returns empty string; render guarded so preamble bubbles with no data show no badge instead of a wrong one.

3. **Defensive number formatting** — `skipDollarFormat` refactored from regex to function. Now catches `YearPeriod`, `Fiscal_Period`, anything ending in `_Period/_Year/_Date/_Code`, plus index-like columns (CPI, sentiment, confidence, unemployment, gdp). Protects against future LLM-generated SQL aliases.

4. **Job processor Databricks-only** — `/api/jobs/route.ts` processJob() had no source routing. Every job, regardless of `agent_type`, hit the Databricks SQL path. CI jobs ("Compare Hershey with Nestle") silently failed with "Could not retrieve real data from Databricks". Fix: job processor now calls `/api/query` internally as primary path, inheriting all source routing (competitor_only, cross_reference, macro, dashboard, financial). Databricks SQL kept as fallback.

**Verified live**: Pure CPI via voice, CI comparison + SWOT jobs, cross-source strategic query. All working.

**PUSHED as `5284745`** (2026-04-20 morning). Cesar needed manual redeploy of BOTH Next.js and voice containers.

## Wave 3 — 2026-04-20 afternoon (PUSHED)

3 more fixes pushed after live testing:

5. **pctByName magnitude guard** (`b92f631`) — `Margin_After_Conversion` column (raw $1.75B values) was being rendered as `1753801915.2%` because the regex `/margin/` matched pctByName. Added `Math.abs(val) <= 1000` guard so name-based % formatting only fires in plausible range. Dollar values fall through to $M formatting.

6. **Per-row % formatting + brand-to-view routing** (`90e7cbd`) — mixed-metric long-format results (RL_Alias as column, Periodic_CY_Value shared across $ and decimal rows) broke column-wide pctByValue. Added per-row override keyed on RL_Alias for "%", "shape", "growth" keywords. Also LLM summary now gets FORMATTED tableRows instead of raw decimals, so it reads "1.1%" not 0.0112. Schema context split chocolate mapping: generic → MW/Snacking units, specific brands (M&Ms, Snickers, Pedigree, etc.) → brand_product view.

7. **Line chart as third chart type** (`c7cfd72`) — users asking for "line chart" used to fall back to bar. Added LineChart branch to InlineChart + MiniChart, widened chartType union everywhere to "area" | "bar" | "line", updated LLM prompt, follow-up chip cycles bar → line → area.

## Azure deploy debugging (2026-04-20 afternoon)

After Cesar's initial redeploy, two issues:

- **NEXT_PUBLIC_API_URL unset on voice container**: voice-server.ts fell back to localhost:3000 which doesn't exist in the separate voice web app. Fix: Cesar set env var.
- **Stale voice container**: Azure logs showed `get_competitor_analysis` calls (tool removed April 10, `ab86488`) and zero `navigate_to_page` calls (tool added April 16, `c279c87`). Voice image was pre-April-10. Cesar rebuilt fresh. Verified via DevTools: after rebuild, voice nav works.

Demo April 21 — everything verified end-to-end on finiq-app.azurewebsites.net.

## Cesar's follow-up commits (2026-04-20 EOD)

- `1c4c81d` — Dockerfile.voice base image switched from Docker Hub (`node:22-alpine`) to public ECR mirror (`public.ecr.aws/docker/library/node:22-alpine`). Root cause of the stale-image rebuild issue we diagnosed earlier today — Docker Hub pulls were silently cached or rate-limited in CI, producing stale voice builds. ECR public is more reliable.
- `f3b4412` — Made the Admin page "Data Connection" card title dynamic. Was hardcoded to `corporate_finance_analytics_prod.finsight_core_model` since our April 8 SIM-mode removal. Now reads `DATABRICKS_CATALOG` / `DATABRICKS_SCHEMA` env vars via props. Two-line fix. Traces back to our April 8 hardcoding.

## Rajiv's scope triage (2026-04-20 late evening, PUSHED as `2347fbe`)

Rajiv asked for agent triage ("grounding to Mars financial questions"). Farzaneh's live testing on deployed also surfaced meta-commentary behavior ("I understand, long days can be exhausting" in response to "I'm tired") — also unwanted. Multi-round prompt iteration with Rajiv and Cesar input. Cesar flagged that strict scope could accidentally block voice navigation commands. Final prompt (drafted by Rajiv, refined with Cesar/Farzaneh feedback) explicitly includes:
- Scope list (brands: Pedigree, Royal Canin, M&Ms, etc.; competitors: Nestle, Mondelez, etc.; commodities: cocoa, sugar, dairy, grains; job board)
- Multi-part query handling (answer in-scope parts, note out-of-scope politely)
- Explicit "Always invoke navigate_to_page tool rather than refusing" to protect voice nav
- Ban on commenting on user's emotional state, tone, physical cues (yawning, sighing)
- Exact off-topic refusal phrase: *"This is out of my area of expertise. I'm focused on Mars financial analysis. Try asking about revenue, competitors, or market data on Mars or its competitors."*

Applied to both `src/lib/schema-context.ts` (typed path, without the nav bullet since typed has no such tool) and `src/lib/voice-server.ts` SYSTEM_INSTRUCTIONS (voice, full prompt + merged operational rules). 10-test matrix verified locally including multi-part ("compare Mars to Nestle and recommend a Milan restaurant" → answered fully + politely declined). Needs Cesar's next redeploy on BOTH containers to take effect on finiq-app.azurewebsites.net.

Local pulled FF through `2347fbe`. Local === origin/main. Deployed will catch up on next Cesar deploy.
