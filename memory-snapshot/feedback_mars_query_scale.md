---
name: Mars Databricks queries scan billions of rows — design for 2–5 min latency
description: Concrete data point from 2026-04-22. Mars mvp3 views sit on top of a 5.7B-row fact table. Even metadata queries (DISTINCT LIMIT 20) take 2–5 min and scan 1.85B rows. Never assume sub-minute query latency in code.
type: feedback
originSessionId: b22fb3dd-251d-4e8f-a022-7729b018094f
---
**Rule**: When writing Databricks query code paths for Mars (production) data, assume queries take **2–5 minutes** and design for that. Sub-minute responses are the exception, not the rule.

**Why (concrete 2026-04-22 data)**: Cesar ran three discovery queries in Mars's SQL editor against `corporate_finance_analytics_dev.finsight_core_model_mvp3.finiq_vw_pl_entity`:

| Query | Duration | Rows read | Bytes read | Tasks |
|---|---|---|---|---|
| `SELECT DISTINCT Entity_Alias … WHERE LOWER LIKE '%pet%' LIMIT 20` | **2 min 49 s** | 1,850,680,237 (1.85 **B**) | 31.72 GB | 1124/1124 |
| `SELECT DISTINCT Date_ID … ORDER BY DESC LIMIT 10` | still running at 58s | 361M | 2.31 GB | 139/1336 (~10%) |

The views sit atop `finiq_financial_cons` (~5.8B rows). Even innocent-looking `SELECT DISTINCT col LIMIT 20` scans billions of rows because views are pre-joined to fact tables. The LIMIT applies after the scan.

**How to apply**:

1. **Polling timeouts in code**: default to at least 10 minutes total wait for Databricks queries. `wait_timeout: 50s + maxPolls × 5s` should sum to ≥600s. Current default in `src/data/databricks.ts` is `maxPolls = 120` (650s total). Don't drop below this without explicit justification.
2. **Never return `[]` silently on timeout**: that makes the UI say "No data found" even when Databricks is still successfully running the query. Throw `QueryStillComputingError` (exported from `databricks.ts`) instead so the caller can surface a friendly *"still running, cache will fill, re-ask in N min"* message.
3. **Cache aggressively**: default cache TTL in `query-cache.ts` is 4 hours. First query is slow, second query is instant. Preserve that invariant — don't shorten TTL on expensive Databricks results.
4. **Prefer dim tables over views for metadata lookups**: `finiq_dim_entity` (766 rows) is instant vs `finiq_vw_pl_entity` (billions). When doing Entity_Alias discovery or similar, target the dim table. Our LLM prompt already prefers dim tables for some cases but should be audited whenever we see slow queries in Mars logs.
5. **Pre-warm the warehouse + cache on app boot**: `/api/dashboard` does this (see `startup.ts` / `dashboard/route.ts`). When Cesar deploys a fresh container to Mars, the first few queries are cold. Pre-warm runs a known-good set on boot so the warehouse is hot by the time users arrive.
6. **Mars-scale is not QDT-scale**: our QDT paid Databricks has ~88K rows (synthetic). Any test against QDT that passes in <10s does NOT validate Mars-scale behavior. When diagnosing Mars issues, remember that performance profile is entirely different — expect 100-1000x slower queries on equivalent SQL.

**Related incidents**:
- 2026-04-22 afternoon: Cesar reported Mars queries returning "No data found." Root cause was `maxPolls = 24` (170s total) — exactly matching his first query's 2 min 49 s. Fixed in commit `f3569a8`.
- 2026-04-08: Dashboard initial cold start took 12 min before parallel queries. Fixed with `Promise.all` + warm cache.

**Anti-pattern to avoid**: inferring "real mode" from catalog name heuristics like `catalog.includes("prod")`. Broke twice when Mars renamed (once April 8, once April 22). Always trust `DATA_MODE` env var directly.
