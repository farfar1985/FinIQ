---
name: FMP Fetch Timeout (2026-04-16, local-only)
description: 8s AbortController timeout + Promise.allSettled on getCompetitiveDashboard. Prevents dev server from hanging forever when FMP is slow/down.
type: project
originSessionId: 85d817ff-6a6a-4668-8250-333e81492948
---
**Problem (observed live 2026-04-16)**: Dev server after fresh boot showed `✓ Compiled /api/fmp/dashboard in 596ms` then silence for 10+ minutes. No GET completion. Navigation clicks in the browser were unresponsive (`/competitive` / `/reports` / `/jobs`) because the pending `/api/fmp/dashboard` request held the browser's per-domain connection pool.

**Root cause**: `fmpFetch()` in `src/data/fmp.ts` used plain `fetch()` with no timeout. `getCompetitiveDashboard()` fires 11 parallel FMP calls with `Promise.all` — one hung call blocked the whole dashboard forever.

**Fix landed (local, not pushed)** in `src/data/fmp.ts`:
1. `fmpFetch<T>()` wraps `fetch()` in an `AbortController` with 8s timeout. Throws `FMP API timeout after 8s: <url>` on abort. Cleans up with `finally { clearTimeout }`.
2. `getCompetitiveDashboard()` rewritten to `Promise.allSettled` — split into two settled calls (quotes then income statements). One ticker failure doesn't fail the dashboard; it just comes back with empty arrays for that ticker.

**Risk**: Very low. Only changes failure behavior — fast-fail on slow FMP instead of hang. Happy-path unchanged.

**Known TypeScript quirk**: Initial `Promise.allSettled` over a mixed-type tuple (`[getQuotes, ...getIncomeStatements]`) collapsed to a union, breaking property access. Fixed by splitting into two separate settled calls with explicit typed locals (`StockQuote[]` / `IncomeStatement[][]`).

**Verification**: FMP calls now return within 8s or throw cleanly. Dashboard renders partial data gracefully. Dev server no longer wedges.
