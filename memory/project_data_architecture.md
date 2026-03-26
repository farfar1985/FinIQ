---
name: Data architecture decisions from Mars call
description: FinIQ should source from Databricks/FinSight directly, not Excel — Gemini integration planned as Phase 2
type: project
---

Key technical decisions from QDT x FinIQ call (2026-03-25):

1. **Data source**: FinIQ should connect directly to **Databricks / FinSight data model** for financial data, not intermediary Excel files. PES currently uses Excel extracts but the goal is to go direct.
2. **Matt Hutton shared schema** for relevant Databricks tables — **DONE: fully analyzed 2026-03-26**. See `project_databricks_schema.md` for complete details. 20 objects (17 tables, 3 views) in `corporate_finance_analytics_dev.finsight_core_model_mvp3`.
3. **Infrastructure**: R&D sandbox on Azure is primary environment. Danny coordinating VM provisioning with Kumar. Target: environment ready by end of week (2026-03-28).
4. **Gemini integration (Phase 2)**: Agents must be A2A compatible, hosted on Azure or GCP, to register and orchestrate within Mars's Gemini platform. Karthik owns this. Toolkit to be shared early.
5. **Existing QDT infra**: Kubernetes cluster with Cassandra DB, Redis cache (Cesar & Alessandro own deployment).
6. **Competitive intelligence data** available immediately for parallel development while financial data access is pending approval.
7. **Simulated data strategy (Rajiv 2026-03-25)**: Build the entire solution using simulated data for Databricks while waiting for Mars Datalake access. The schema reference doc provides all the structure needed to generate realistic fake data.
8. **Quandl/Nasdaq Data Link (Rajiv 2026-03-25)**: Explore getting competitor financial statements and investor reports from Quandl for the CI pipeline.

**Key finding from schema analysis:** The 3 precomputed views (vw_pl_entity, vw_pl_brand_product, vw_ncfo_entity) directly correspond to PES Excel input sheets. FinIQ can query these views instead of processing Excel files. The finiq_financial_replan table provides actual-vs-budget variance analysis that PES doesn't have.

**Why:** These decisions shape the SRS data ingestion requirements (FR1) and architecture (Section 5). Direct Databricks connectivity will be captured in SRS Addendum A (per Rajiv's addendum policy — see `feedback_addendum_policy.md`).

**How to apply:** When building technical specs or the addendum, reference Databricks/FinSight as the primary data source. Keep Excel ingestion as a fallback/transition path. Use the schema reference doc for exact table/column/type specifications.
