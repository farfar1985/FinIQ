---
name: Real Mars Databricks Schema Discovery
description: Production Databricks schema — 5.7B row tables, column name mappings, warehouse ID, safeguard requirements
type: reference
---

**Real Mars Databricks (production data)**

- Workspace URL: https://adb-2085958195047517.17.azuredatabricks.net
- Catalog: corporate_finance_analytics_prod
- Schema: finsight_core_model
- Token: (stored in .env — do not commit to git)
- Warehouse: Serverless Starter Warehouse (ID: de640b2f8ef3d9b2)
- HTTP Path: /sql/1.0/warehouses/de640b2f8ef3d9b2

**Table Sizes (discovered 2026-03-31):**

| Table | Rows | Risk |
|-------|------|------|
| finiq_financial | 5,758,891,376 (5.7B) | EXTREME |
| finiq_financial_cons | 5,781,441,613 (5.8B) | EXTREME |
| finiq_financial_base | 739,574,399 (740M) | HIGH |
| finiq_vw_ncfo_unit | 852,836 | SAFE |
| finiq_item | 381,113 | SAFE |
| finiq_item_composite_item | 388,782 | SAFE |
| finiq_customer_map | 210,913 | SAFE |
| finiq_customer | 21,204 | SAFE |
| finiq_composite_item | 9,478 | SAFE |
| finiq_financial_replan | 2,740,193 | MEDIUM |
| finiq_financial_replan_cons | 185,574 | SAFE |
| finiq_dim_unit | 766 | SAFE |
| finiq_dim_rl | 725 | SAFE |
| finiq_economic_cell | 175 | SAFE |
| finiq_date | 117 | SAFE |
| finiq_rl_formula | 725 | SAFE |
| finiq_rl_input | 110 | SAFE |
| finiq_rls_last_change | 1 | SAFE |
| anomalydetection_vw_pbi_anomaly_detector_mw_na | 9,811 | SAFE (bonus) |
| finiq_vw_pl_brand_product | ? (COUNT too slow — scans 5.7B) | DANGEROUS |
| finiq_vw_pl_unit | ? (COUNT too slow — scans 5.7B) | DANGEROUS |

**Column Name Mapping (Synthetic → Real):**

| Concept | Synthetic (SQLite) | Real (Databricks) |
|---------|-------------------|-------------------|
| Entity table | finiq_dim_entity | finiq_dim_unit |
| Entity ID col | Child_Entity_ID | Child_Unit_ID |
| Entity name col | Child_Entity | Child_Unit |
| Account table | finiq_dim_account | finiq_dim_rl |
| Account ID col | Child_Account_ID | Child_RL_ID |
| Account name col | Child_Account | Child_RL |
| Account formula | finiq_account_formula | finiq_rl_formula |
| Account input | finiq_account_input | finiq_rl_input |
| View entity col | Entity | Unit_Alias |
| View account col | Account_KPI | RL_Alias |
| View value cols | YTD_LY, YTD_CY, Periodic_LY, Periodic_CY | YTD_LY_Value, YTD_CY_Value, Periodic_LY_Value, Periodic_CY_Value |

**Safeguard Rules:**
- NEVER query finiq_financial, finiq_financial_cons, finiq_financial_base directly
- Always query views (finiq_vw_pl_unit, finiq_vw_pl_brand_product, finiq_vw_ncfo_unit)
- Always include WHERE clause with Unit_Alias filter
- Hard query timeout: 30 seconds
- maxRows: 10,000 (already in code)
- Block LLM from generating SQL against base fact tables

**Why:** Three tables are 5.7B+ rows each. Unfiltered queries will spin the warehouse for minutes and cost money on serverless.

**How to apply:** Build whitelist of allowed tables. Add column mapping layer in databricks.mjs. Add query timeout. Update schema-context.mjs to only show views + dimensions to LLM.
