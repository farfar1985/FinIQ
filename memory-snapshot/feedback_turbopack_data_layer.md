---
name: Turbopack doesn't hot-reload data layer files
description: When editing src/data/*.ts in ale-build, restart npm run dev — turbopack ignores changes there and the in-process query cache survives across queries
type: feedback
originSessionId: 38239999-13da-4c2d-958c-740f1912cf1c
---
When editing files under `ale-build/src/data/` (sqlite.ts, databricks.ts, simulated.ts), the Next.js dev server with turbopack does NOT hot-reload them. Edits show up in the file but the running runtime keeps using the old code.

**Why**: Turbopack's HMR boundaries appear to skip non-component server modules. Plus `/api/query` keeps an in-process result cache keyed on normalized query text — even after a restart, an identical query during the same session may hit a stale cached entry from before the restart (cache lives in module memory, but if you restart it does clear).

**How to apply**: Whenever you edit something under `src/data/`, do all three:
1. Stop the dev server (`TaskStop` doesn't actually kill the node process — use PowerShell `Get-NetTCPConnection -LocalPort 3000 | Stop-Process` to free the port)
2. `npm run dev` again
3. When testing, change the query text slightly (add a word, change capitalization) to dodge the in-process cache, OR wait for cache TTL

If a SQL parser fix "doesn't work" after editing sqlite.ts, this is almost always why. Symptom: log line says `[Simulated] SQL:` but the printed SQL still has the prefix you just stripped, or `Cache HIT for: <query>` appears before the new code path can run.
