---
name: Runtime reference-data cache — drift-resilient LLM prompt enrichment
description: First production prototype of the drift-agent pattern. `src/lib/reference-data.ts` fetches actual Account_Alias/Entity_Alias/Date_ID values from Mars Databricks on boot, injects into LLM prompt via async `getSchemaContext()`. Self-heals when Mars renames.
type: reference
originSessionId: b22fb3dd-251d-4e8f-a022-7729b018094f
---
## What it is

A Node module that discovers Mars Databricks' actual data values at app boot and makes them available to the LLM prompt. Shipped 2026-04-22 in commit `fcf8504` as Phase 2 of the Account_Alias drift fix. Conceptually: a minimal viable prototype of the drift-agent pattern we proposed to Cesar that morning.

## The problem it solves

Hardcoded-value drift. When we hardcode a string like `'Growth % - 3rd Party Organic'` in `schema-context.ts`, every query using that exact filter breaks silently the moment Mars renames it (to `'Growth % - 3rd pty organic'` or anything else). Before Phase 2, the only recovery was: someone notices queries return 0 rows → runs a discovery query against Mars → updates hardcoded strings → redeploy. Slow and manual. With Phase 2, the cache refreshes and the LLM prompt picks up new values automatically on next invocation.

## Architecture

```
Mars Databricks
      │
      ▼
┌─────────────────────────────────────────┐
│ reference-data.ts                       │
│   getReferenceData() — 6hr TTL cache    │
│   fetchReferenceData() — parallel DISTINCT│
│   FALLBACK — Mars values snapshot       │
└─────────────────────────────────────────┘
      │
      ▼
schema-context.ts:getSchemaContext()
      │
      ▼  ┌── SCHEMA_CONTEXT (static base) ──┐
      ├──│                                    │
      │  └── RUNTIME-DISCOVERED section ─────┘
      │      injects actual Account_Alias,
      │      Entity_Alias, Date_IDs
      ▼
LLM prompt (query/route.ts, jobs/route.ts, llm-query.ts)
```

## What it fetches (at boot + every 6 hours)

```sql
-- Parallel: 5 queries
SELECT DISTINCT Account_Alias FROM finiq_vw_pl_entity WHERE Date_ID IN (recent 3) LIMIT 200
SELECT DISTINCT Account_Alias FROM finiq_vw_ncfo_entity WHERE Date_ID IN (recent 3) LIMIT 50
SELECT DISTINCT Account_Alias FROM finiq_vw_pl_brand_product WHERE Date_ID IN (recent 3) LIMIT 50
SELECT DISTINCT Child_Entity FROM finiq_dim_entity LIMIT 900
SELECT Date_ID FROM finiq_date ORDER BY Date_ID DESC LIMIT 50
```

Fast: dim tables + filtered view queries complete in seconds. Doesn't scan the billion-row view fully.

## Public API

| Function | Returns | Purpose |
|---|---|---|
| `getReferenceData()` | `Promise<ReferenceData>` | Main accessor. Coalesces concurrent calls, returns cache or fallback. Never throws. |
| `prefetchReferenceData()` | `void` | Fire-and-forget boot hook. Called from `dashboard/route.ts` at module load. |
| `invalidateReferenceDataCache()` | `void` | Force re-fetch on next access. For admin/testing. |

## Fallback values (when Databricks unreachable)

Hardcoded snapshot of Mars mvp3 values as of 2026-04-22:
```
accountAliases: 23 values (Net sales, Gross profit, Contribution, Operating profit,
                Adjusted EBITDA, G&A overheads, Growth % - 3rd pty organic, ...)
latestDateId: 202603
```

Ensures LLM always gets SOMETHING reasonable in its prompt even if the Databricks warehouse is cold.

## Integration points

`src/lib/schema-context.ts`:
```ts
export async function getSchemaContext(): Promise<string> {
  const ref = await getReferenceData();
  return SCHEMA_CONTEXT + `\n═════ RUNTIME-DISCOVERED MARS mvp3 VALUES ═════\n` +
         `Actual Account_Alias values (${ref.accountAliases.length}):\n` +
         ref.accountAliases.map(a => `  • '${a}'`).join("\n") +
         ... (entity list, date list, etc.);
}
```

LLM call sites that switched from static → dynamic:
- `src/app/api/query/route.ts` (main query flow)
- `src/app/api/jobs/route.ts` (job board agent processing)
- `src/lib/llm-query.ts` (older path, may be unused now)

## Why it's a drift-agent prototype

Cesar's 2026-04-22 morning proposal was for a "brain for each app" / "safety layer that runs every now and then and updates the references to the tables." This is a scoped-down first version of that:

| Cesar's full vision | This module |
|---|---|
| Periodic scheduled scan | Boot-time fetch + 6hr TTL (close enough) |
| Store snapshot + log drift events | No persistence yet (in-memory only) |
| Three-bucket auto-resolver + human review | No resolver — just picks up live values; LLM auto-adapts |
| Per-app brain with memory | Single cache per process |
| Works across all apps on Amira | FinIQ-specific for now |

So: not the full brain, but concrete proof the pattern works and value adapts end-to-end.

## Performance characteristics

- **Boot cost**: ~30-45s additional during cold start (fetches run in parallel with dashboard pre-warm, so not additive to user-facing latency)
- **Per-query cost**: 0 — cache is read synchronously from memory
- **Refresh cost**: once every 6 hours, ~30-45s background
- **Memory**: ~50KB per cache entry (string lists)

## Failure modes + resilience

- **Databricks cold on boot**: fetch retries via `getReferenceData()` on first user query. If still fails, FALLBACK serves the LLM prompt.
- **Warehouse stopped mid-fetch**: individual queries fail with `.catch(() => [])`. If accountAliases count is 0, fetch is treated as failed — FALLBACK wins.
- **Timeout on a query**: inherits from `executeQuery`'s 50s sync + 120×5s poll tolerance.
- **Cache poisoning impossible**: cache is only set from successful fetches that have non-empty accountAliases.

## What it does NOT do (intentional scope limits)

- **Doesn't update hardcoded queries in `dashboard/route.ts` or `mars-financials/route.ts`** — those still use literal strings. Phase 3 (post-demo) could refactor these to use reference data too.
- **Doesn't write to disk** — in-memory only, so survives exactly as long as the Node process. Restart = fresh fetch.
- **Doesn't alert on drift detection** — purely reactive. Logs if fetch failed but doesn't surface drift events to humans.
- **Doesn't handle semantic drift** — if Mars renames `Gross profit` to still say `Gross profit` but with different underlying formula, we see no difference. Only catches name changes.

## Extending it

Pattern to follow for any future reference-data need:

```ts
// 1. Add to ReferenceData interface
export interface ReferenceData {
  ...existing...,
  newField: string[];
}

// 2. Add to FALLBACK
const FALLBACK: ReferenceData = {
  ...existing...,
  newField: ["default-value-1", "default-value-2"],
};

// 3. Add fetch in fetchReferenceData()'s Promise.all
const [..., newRows] = await Promise.all([
  ...existing...,
  executeRawSql(`SELECT ...`, limit).catch(() => []),
]);
const newField = newRows.map(r => r.col as string).filter(s => typeof s === "string");

// 4. Add to result object
return { ...existing..., newField, ... };
```

Then inject into `getSchemaContext()` prompt where relevant.

## Follow-up items (not done)

- Extend cache to hardcoded queries in dashboard + mars-financials (Phase 3)
- Disk-backed persistence so cache survives restarts (reduces cold-start warmup time)
- Log drift events — diff each fetch against the previous one, emit structured log for "account X renamed to Y" for human visibility
- Promote to the Amira platform layer so other Amira apps can inherit (Cesar's original drift-agent vision)

## 2026-04-22 post-deploy fix — qualification bug (commit `6866a30`)

When Cesar first deployed `fcf8504` to Mars, every cache primer query failed at startup with `TABLE_OR_VIEW_NOT_FOUND`:

```
[Databricks SQL] SELECT DISTINCT Account_Alias FROM finiq_vw_pl_entity WHERE ...
[reference-data] Account_Alias fetch failed: SQL failed: [TABLE_OR_VIEW_NOT_FOUND] ...
[reference-data] Got 0 account aliases — treating fetch as failed, using fallback
```

Cause: the 5 cache queries used bare table names (`FROM finiq_vw_pl_entity`) on the assumption that the Databricks SQL connection's default catalog.schema matched the configured one. On Mars the connection default isn't set to `corporate_finance_analytics_dev.finsight_core_model_mvp3`, so every unqualified reference failed. Main-path queries in `route.ts` fully qualify already, which is why they work; cache path was the gap.

Fix: added `tablePrefix()` helper returning `${process.env.DATABRICKS_CATALOG}.${process.env.DATABRICKS_SCHEMA}.` at the top of `reference-data.ts`, prefixed all 5 cache queries. Startup log extended to show resolved prefix for ops verification:

```
[reference-data] Fetching actual Mars schema values (prefix: corporate_finance_analytics_dev.finsight_core_model_mvp3.)
```

After redeploy, Cesar confirmed the `TABLE_OR_VIEW_NOT_FOUND` spam at startup is gone. Self-healing cache is functional.

**Takeaway for future data-access modules:** always prefix table references with the configured catalog/schema env vars — never rely on the Databricks SQL connection's default catalog being set correctly on every deploy target.
