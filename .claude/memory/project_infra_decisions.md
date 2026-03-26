---
name: Infrastructure decisions and environment details
description: Azure OpenAI Foundry for LLM, GitHub within Mars, QDL access, Databricks workspace at dbc-af05a0e0-4ebe with workspace catalog
type: project
---

Decisions from 2026-03-26 team call + setup session:

1. **LLM access**: All OpenAI and Anthropic connections go through **Azure OpenAI Foundry** (not external URLs). This is how Mars gets access — not a proprietary Mars LLM, but Azure OpenAI Foundry as the gateway.
2. **GitHub**: Code repository lives within Mars's internal GitHub. CI/CD pipelines run on Mars infrastructure. Personal backup at https://github.com/farfar1985/FinIQ (private).
3. **QDL (Quandl/Nasdaq Data Link)**: Access added. Will be used for competitor financial data for CI pipeline.
4. **Databricks workspace**: `dbc-af05a0e0-4ebe.cloud.databricks.com`, Free edition, Serverless Starter Warehouse (2XS), catalog = `workspace`.
5. **Databricks schemas**: `finiq_synthetic` (populated with synthetic data) + `finiq_production` (empty, for Mars real data later). Switchable via config toggle.
6. **Credentials**: All Databricks credentials and API keys stored in an Excel file in the shared Google Drive folder.
7. **Synthetic data script**: `databricks_synthetic_data.py` — 27-cell PySpark notebook matching Matt's exact 20-object schema. Seeded random (42) for reproducibility.

**Why:** Mars requires all connections within their Azure tenant. Synthetic data unblocks development while real Databricks access is provisioned.

**How to apply:** Architecture docs reference "Azure OpenAI Foundry". GitHub references say "Mars internal GitHub repository". Databricks catalog is `workspace` not `corporate_finance_analytics_dev` (that's Mars's real catalog).
