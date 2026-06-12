# Spec Agent — Rajiv Demo (amira.qdt.ai)

**1 — Kickoff (full spec + sub-reqs):**
> Build a unified financial analytics platform for an enterprise finance team that consolidates period-end performance summaries and competitive-intelligence reporting into one hub. It should support natural-language querying over the financial data warehouse with row-level access by business unit, an analyst job board with SLAs, configurable executive dashboards, single sign-on, and an immutable audit trail. Decompose each functional requirement into numbered sub-requirements (FR-1.1, FR-1.2, …) with measurable acceptance criteria.

**2 — Gap resolution (Databricks):**
> Resolve the warehouse-source gap only: the warehouse is Databricks Unity Catalog (`corporate_finance_analytics_prod.finsight_core_model`). The corporate GL/ERP loads the FinSight fact + dimension tables daily; competitive-intel comes from a licensed vendor feed; ingestion authenticates via Azure managed identity (no PATs). Resolve that gap only — don't change anything else.

**3 — Extend (optional):**
> Add a commodity-price forecasting capability: analysts project the P&L impact of commodity-price moves (cocoa, sugar) over the next four quarters, with confidence bands and the macro drivers. Decompose it into sub-requirements with acceptance criteria.

---
*Reminders: pre-build Prompt 1 ~20 min before (it's ~8 min) — don't run it live. Refresh after each turn. If a turn errors, re-type it (Retry doesn't work). Keep turns scoped.*
