---
name: Real Databricks Deep Schema Discovery
description: Complete schema analysis — relationships, hierarchies, view SQL, formulas, Word doc generated
type: project
---

**Deep scan completed 2026-03-31 (2 passes).**

**Files:**
- `app/REAL_DATABRICKS_SCHEMA.md` — Full reference (markdown)
- `C:\Users\farza\Desktop\FinIQ Real Databricks Schema Reference.docx` — Word doc (professional, shared with Ale)
- `app/deep-scan-raw-output.txt` — Pass 1 raw output
- `app/deep-scan-pass2-output.txt` — Pass 2 raw output (418KB, all 725 RLs, 725 formulas, 766 units)
- `app/discover-real-databricks.mjs` — Pass 1 discovery script
- `app/deep-scan-databricks.mjs` — Pass 1 deep scan script
- `app/deep-scan-pass2.mjs` — Pass 2 gap-filling script
- `generate_schema_docx.mjs` — Word doc generator

**Key findings:**
- 21 objects: 17 tables + 4 views
- 3 monster tables: finiq_financial (5.7B), finiq_financial_cons (5.8B), finiq_financial_base (740M)
- Base→Financial multiplier: ~7.8x (unit consolidation hierarchy rollup)
- Views scan finiq_financial_cons — always filter by Unit_Alias
- 766 org units, 11 hierarchy levels, prefixes: MW/PN/RC/AC/SDX/MVH/KN/HC/FOOD/WWY
- 725 reporting lines, 7 financial statements (P&L, BS, BSR, EP, S&U, Overheads, Others)
- Growth KPIs: numerator RL / RL 5464 - 1 (Organic Growth, Price, Volume, Mix)
- 13-period fiscal year, FY2020-FY2028, replan FY2025-FY2026
- 458 brands, 205 EC groups, 75 product categories, 139 countries
- 5 economic cell archetypes: Growth Engine, Seed, Fuel for Growth, Harvest, Other
- External dims in finsight_core_model_mvp3 schema (35 Dimensions_* tables)
- View Unit_Alias is Title Case, dim_unit.Child_Unit is UPPERCASE
- Replan: FY2025 actuals only, FY2026 Q1 both, FY2026 Q2-Q4 budget only
- Data last changed: 2026-03-31 (version 8289) — actively updated

**Ale's feedback:** Liked the analysis. Wants full relationship documentation to power Data Explorer tab. Suggested rebuilding synthetic to match real schema (not mapping layer).

**Why:** Complete schema knowledge = better LLM SQL generation, better Data Explorer, fewer bugs on real data.

**How to apply:** Use REAL_DATABRICKS_SCHEMA.md as source of truth. Rebuild synthetic to match. Update LLM schema context.
