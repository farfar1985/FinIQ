---
name: Infrastructure decisions and environment details
description: Databricks LIVE at dbc-af05a0e0-4ebe with synthetic data, Azure OpenAI Foundry, GitHub farfar1985/FinIQ
type: project
---

## Databricks — LIVE (2026-03-26)
- **Workspace**: `dbc-af05a0e0-4ebe.cloud.databricks.com`
- **Catalog**: `workspace` | **Schema**: `default` | **Warehouse**: Serverless Starter Warehouse (2XS)
- **Synthetic data**: 17 tables + 3 views, 165K+ rows, all prefixed `finiq_`
- **Users**: farzaneh@qdt.ai (admin), alessandro@qdt.ai, bill@qdt.ai, cesar@qdt.ai, rajiv@qdt.ai
- **Upload method**: SQLite file → Volume → `upload_sqlite_to_databricks.py` notebook (PySpark `CREATE TABLE AS SELECT` via temp views)
- **Permission lessons**: Free tier Spark runtime creates tables with different ownership than SQL Editor. Fix: use SQL Editor for DDL, or use temp view + CREATE TABLE AS SELECT pattern. Cesar granted admin to Farzaneh.
- **Dual-mode**: Synthetic = this workspace. Real = Mars's `corporate_finance_analytics_dev` (when provisioned). App swaps connection config.

## Other infrastructure
1. **LLM access**: Azure OpenAI Foundry (not external URLs)
2. **GitHub**: Personal backup at https://github.com/farfar1985/FinIQ (private). Mars production uses Mars internal GitHub.
3. **QDL (Quandl/Nasdaq Data Link)**: Access added for competitor financial data.
4. **Credentials**: All stored in Excel file in shared Google Drive folder.

**How to apply:** Databricks connection is workspace URL + HTTP Path + personal access token. Architecture docs reference "Azure OpenAI Foundry". Mars real catalog is `corporate_finance_analytics_dev`.
