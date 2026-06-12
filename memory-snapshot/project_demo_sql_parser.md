---
name: DEMO-mode JSON SQL parser capabilities
description: What the simulated-mode SQL executor in ale-build/src/data/sqlite.ts can and cannot do, after the 2026-04-15 rewrite
type: project
originSessionId: 38239999-13da-4c2d-958c-740f1912cf1c
---
**Why it exists**: In `DATA_MODE=simulated`, all SQL the LLM generates against `corporate_finance_analytics_prod.finsight_core_model.*` and `workspace.default.*` tables is run by a tiny in-memory JSON SQL parser at `ale-build/src/data/sqlite.ts`. No native SQLite. It reads `data/finiq_synthetic.json` (88,594 rows across 7 tables) and walks the SQL with regex.

**Why this matters going forward**: Whenever the LLM (or hand-written PES queries in `src/app/api/reports/route.ts`) generates a new SQL pattern, this parser must support it. Otherwise the query silently returns null/empty in DEMO mode while looking fine in LIVE mode.

**Supported (after 2026-04-15 rewrite)**:
- `SELECT col1, col2, ...` and `SELECT *`
- `SELECT DISTINCT`
- Function-aliased columns: `ROUND(col, n) AS alias`, `COALESCE(a, b) AS alias`
- Aggregates with `GROUP BY`: `AVG`, `SUM`, `COUNT`, `MIN`, `MAX`, `COUNT(*)`
- Nested function calls: `ROUND(AVG(col), 2)`
- String functions: `UPPER`, `LOWER`, `TRIM`
- `CAST(col AS type)` (passthrough — type ignored)
- `WHERE` clauses: `=`, `!=`/`<>`, `LIKE` (with `%`), `BETWEEN x AND y`, `IN (...)`, `UPPER(col) = UPPER('val')`, `LOWER(col) LIKE`
- `ORDER BY col [ASC|DESC]`
- `LIMIT n`
- Both `corporate_finance_analytics_prod.finsight_core_model.` and `workspace.default.` prefixes stripped

**Not supported** (will silently misbehave):
- `JOIN` of any kind (single-table only)
- Subqueries / CTEs
- `HAVING` (parsed-around but not evaluated)
- Complex `CASE WHEN` with multiple conditions or `WHEN col THEN` (simple `CASE WHEN col = 'val' THEN expr [ELSE expr] END` IS supported as of 2026-04-16)
- Window functions
- Multi-column `ORDER BY`
- Arithmetic in SELECT (`col1 - col2`, `col / 100`)
- `UNION` / `INTERSECT`

**How to extend**: Add the function name to the regex in the SELECT mapping AND to the `evalSqlFn` switch. For new SQL constructs (JOIN etc.), add a new pre-processing pass before SELECT mapping. Helpers `splitTopLevel` (paren-aware comma split) and `evalSqlFn` (recursive function evaluator) are the building blocks.

**How to verify in DEMO mode**: Run the query, check the dev-server log. `[Simulated] Returned N rows` means the row count is right but say nothing about column values. If the chart is empty or the table shows null in the value column, it's almost always this parser missing a function or pattern — not the synthetic data being null.
