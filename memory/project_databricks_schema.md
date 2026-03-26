---
name: Databricks/FinSight schema — fully analyzed
description: Matt's FinIQ UC Documentation analyzed 2026-03-26. 20 objects (17 tables, 3 views) in finsight_core_model_mvp3. Maps directly to PES Excel sheets.
type: project
---

## Schema identity
- **Catalog**: corporate_finance_analytics_dev
- **Schema**: finsight_core_model_mvp3
- **Prefix**: finiq
- **Storage**: Delta Lake on Azure Blob (abfss://output@finsightmvp31218devsa.dfs.core.windows.net/)
- **Owner**: Finsight-Group-Mvp3
- **Source doc**: FinIQ UC Documentation, 46 pages, generated 2026-03-25 by dipendra.das@effem.com

## 20 objects
**Dimensions (11):** finiq_date (4 cols), finiq_dim_entity (5 cols, 150+ org units), finiq_dim_account (6 cols, array parent IDs), finiq_account_formula (4 cols, KPI calc logic), finiq_account_input (3 cols), finiq_composite_item (12 cols, product master), finiq_item (15 cols, granular product), finiq_item_composite_item (3 cols, bridge), finiq_customer (11 cols), finiq_customer_map (5 cols, hierarchy), finiq_economic_cell (3 cols)

**Facts (5):** finiq_financial (39 cols, denormalized wide), finiq_financial_base (7 cols, normalized), finiq_financial_cons (9 cols, with currency — primary for views), finiq_financial_replan (18 cols, actual vs replan), finiq_financial_replan_cons (6 cols)

**Views (3):** finiq_vw_pl_entity (P&L by entity, 7 output cols), finiq_vw_pl_brand_product (P&L by brand/product, 8 output cols with Item), finiq_vw_ncfo_entity (NCFO by entity, 7 output cols)

**System (1):** finiq_rls_last_change (2 cols, RLS tracking)

## Critical mapping to PES
| PES Excel Sheet | Databricks View |
|---|---|
| P&L (entity) | finiq_vw_pl_entity |
| Product / Brand | finiq_vw_pl_brand_product |
| NCFO | finiq_vw_ncfo_entity |

## New capabilities beyond PES
- Actual vs. Replan variance (finiq_financial_replan)
- 11-attribute customer dimension with 3-level hierarchy
- Multi-currency native (USD + Local)
- Full 27-attribute product taxonomy
- Programmatic KPI formulas (finiq_account_formula)
- Row-level security tracking

## View SQL patterns
- Date_Offset: 100 = Last Year, 0 = Current Year
- View_ID: 1 = Periodic, 2 = YTD
- Account S900077 gets special treatment (+200 offset for LY)
- Growth KPIs derived via parent-child numerator/denominator, not stored
- All values ROUND'd to 4 decimal places
- GROUP BY ALL (Databricks SQL extension)

## Reference document
Full details in: `Matt's databricks schema/FinIQ Databricks Schema Reference (claude generated).docx`
Generator: `Matt's databricks schema/generate_schema_reference.py`

**Why:** This schema is THE target data layer for FinIQ. Understanding it is critical for the Databricks addendum, simulated data generation, and MVP development.

**How to apply:** Use this schema as the basis for SRS Addendum A (Databricks Integration). The 3 views can skip PES's Excel pipeline entirely. The replan table enables new forecast variance features (FR6.1).
