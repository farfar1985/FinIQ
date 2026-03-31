# Real Databricks Schema Reference

**Catalog:** `corporate_finance_analytics_prod`
**Schema:** `finsight_core_model`
**Warehouse:** Serverless Starter Warehouse (`de640b2f8ef3d9b2`)
**HTTP Path:** `/sql/1.0/warehouses/de640b2f8ef3d9b2`
**Last Change:** 2026-03-31T11:00:42.012Z (Version 8289)
**Discovered:** 2026-03-31

---

## Table Inventory (21 objects)

| Table | Type | Rows | Risk |
|-------|------|------|------|
| finiq_financial | Fact (denormalized) | 5,758,891,376 | EXTREME |
| finiq_financial_cons | Fact (consolidated) | 5,781,441,613 | EXTREME |
| finiq_financial_base | Fact (normalized) | 739,574,399 | HIGH |
| finiq_financial_replan | Fact (budget vs actual) | 2,740,193 | MEDIUM |
| finiq_financial_replan_cons | Fact (replan consolidated) | 185,574 | SAFE |
| finiq_dim_unit | Dimension (org hierarchy) | 766 | SAFE |
| finiq_dim_rl | Dimension (reporting lines) | 725 | SAFE |
| finiq_rl_formula | Reference (KPI formulas) | 725 | SAFE |
| finiq_rl_input | Reference (input lines) | 110 | SAFE |
| finiq_date | Dimension (fiscal calendar) | 117 | SAFE |
| finiq_economic_cell | Dimension (business cells) | 175 | SAFE |
| finiq_composite_item | Dimension (product master) | 9,478 | SAFE |
| finiq_item | Dimension (granular product) | 381,113 | SAFE |
| finiq_item_composite_item | Bridge (item-to-product) | 388,782 | SAFE |
| finiq_customer | Dimension (customer master) | 21,204 | SAFE |
| finiq_customer_map | Bridge (customer hierarchy) | 210,913 | SAFE |
| finiq_rls_last_change | Metadata (1 row) | 1 | SAFE |
| finiq_vw_pl_unit | View (P&L by unit) | ? (scans 5.7B) | USE WITH FILTER |
| finiq_vw_pl_brand_product | View (P&L by brand/product) | ? (scans 5.7B) | USE WITH FILTER |
| finiq_vw_ncfo_unit | View (NCFO by unit) | 852,836 | SAFE |
| anomalydetection_vw_pbi_anomaly_detector_mw_na | View (anomaly detection) | 9,811 | SAFE |

---

## Entity-Relationship Map

```
                           finiq_date (117)
                              │ Date_ID
                              │
    finiq_dim_unit (766) ─────┤ Unit_ID
         │ Parent/Child       │
         │ hierarchy          │
         │ (11 levels)        │
         │                    │
         ▼                    ▼
    ┌─────────────────────────────────────────────────┐
    │         finiq_financial_cons (5.8B)              │
    │  Date_ID, Unit_ID, RL_ID, Composite_Item_ID,    │
    │  Economic_Cell_ID, Unit_Customer_ID,             │
    │  Currency_ID, USD_Value, Local_Value             │
    ├─────────────────────────────────────────────────┤
    │         finiq_financial_base (740M)              │
    │  (same FKs, no Currency, no Local_Value)        │
    ├─────────────────────────────────────────────────┤
    │         finiq_financial (5.7B)                   │
    │  (fully denormalized — all dims pre-joined)     │
    └─────────────────────────────────────────────────┘
         │           │              │             │
         │ RL_ID     │ CI_ID        │ EC_ID       │ UC_ID
         ▼           ▼              ▼             ▼
    finiq_dim_rl  finiq_composite  finiq_ec    finiq_customer
      (725)        _item (9.5K)    (175)        (21K)
         │              │                         │
         │              │ Composite_Item_ID        │ Unit_Customer_ID
         ▼              ▼                         ▼
    finiq_rl_      finiq_item_               finiq_customer_
    formula(725)   composite_item            map (211K)
    finiq_rl_      (389K bridge)
    input (110)         │
                        │ Item_ID
                        ▼
                   finiq_item (381K)


    VIEWS (pre-aggregated from finiq_financial_cons):
    ┌─────────────────────────────────────────────┐
    │  finiq_vw_pl_unit (P&L by unit)             │
    │  finiq_vw_pl_brand_product (P&L by product) │
    │  finiq_vw_ncfo_unit (NCFO by unit)          │
    └─────────────────────────────────────────────┘
    All join: Dimensions_Unit (Unit_Alias), Dimensions_Reporting_Line (RL_Alias)
    All output: Date_ID, Unit_Alias, RL_Alias, YTD_LY_Value, YTD_CY_Value,
                Periodic_LY_Value, Periodic_CY_Value
```

---

## Join Paths (verified via cardinality analysis)

### Primary Join Keys

| Source Table | Key Column | Target Table | Key Column | Cardinality |
|-------------|-----------|-------------|-----------|-------------|
| finiq_financial* | Unit_ID | finiq_dim_unit | Child_Unit_ID | 766 units |
| finiq_financial* | RL_ID / Reporting_Line_ID | finiq_dim_rl | Child_RL_ID | 725 RLs |
| finiq_financial* | Date_ID | finiq_date | Date_ID | 117 dates |
| finiq_financial* | Composite_Item_ID | finiq_composite_item | Composite_Item_ID | 9,478 products |
| finiq_financial_base | Economic_Cell_ID | finiq_economic_cell | Economic_Cell_ID | 175 cells (123 used) |
| finiq_financial_base | Unit_Customer_ID | finiq_customer | Unit_Customer_ID | 21,204 customers |
| finiq_customer_map | Unit_Customer_ID | finiq_customer | Unit_Customer_ID | 21,204 (1:1) |
| finiq_customer_map | Child_Unit_ID | finiq_dim_unit | Child_Unit_ID | 553 of 766 units |
| finiq_item_composite_item | Composite_Item_ID | finiq_composite_item | Composite_Item_ID | 9,478 (1:1) |
| finiq_item_composite_item | Item_ID | finiq_item | Item_ID | 381K items → 389K mappings |
| finiq_dim_rl | Child_RL_ID | finiq_rl_formula | RL (by name) | 725 (1:1) |
| finiq_dim_rl | Child_RL_ID | finiq_rl_input | RL_ID | 103 of 725 are inputs |
| finiq_financial_replan | Unit_ID | finiq_dim_unit | Child_Unit_ID | 716 of 766 units |
| finiq_financial_replan | Reporting_Line_ID | finiq_dim_rl | Child_RL_ID | 642 of 725 RLs |
| finiq_financial_replan | Date_ID | finiq_date | Date_ID | 19 dates (202501-202613) |

### View Join Dependencies (external tables NOT in finiq_ schema)

The views reference these external dimension tables:
- `Dimensions_View_Date_Map` — Maps Target_Date_ID to Source_Date_ID with View_ID (1=Periodic, 2=YTD)
- `Dimensions_Date` — Fiscal date lookup
- `Dimensions_Unit` — Maps Unit_ID → Unit_Alias
- `Dimensions_Reporting_Line` — Maps RL_ID → RL_Alias
- `Dimensions_Unit_Consolidation` — Used by anomaly detection view (Parent_Unit_ID = 12128)
- `AnomalyDetection_PBI_Anomaly_Detector` — Source for anomaly detection view

---

## Hierarchy: Organization (finiq_dim_unit)

**11 levels deep, 766 total nodes**

| Level | Count | Parents | Children | Example |
|-------|-------|---------|----------|---------|
| 0 | 3 | 1 | 3 | MARS INCORPORATED (R) |
| 1 | 9 | 2 | 9 | GBU PETCARE EX RUSSIA |
| 2 | 21 | 8 | 21 | PET NUTRITION DIVISION EX RUSSIA |
| 3 | 51 | 14 | 51 | PN EUROPE REGION |
| 4 | 118 | 25 | 118 | PN NORTH AMERICA REGION |
| 5 | 144 | 39 | 144 | PN USA |
| 6 | 203 | 67 | 203 | PN USA MARKET |
| 7 | 124 | 43 | 124 | MW SWITZERLAND MARKET |
| 8 | 72 | 21 | 72 | MW EFFEM MEXICO MARKET |
| 9 | 17 | 6 | 17 | (operational units) |
| 10 | 4 | 2 | 4 | (lowest level) |

**Top-level GBUs (Level 1):**
- GBU FOOD NUTRITION & MULTISALES X RUSSIA
- GBU MARS SNACKING EX RUSSIA
- GBU PETCARE EX RUSSIA
- GBU UNASSIGNED
- GLOBAL CORPORATE
- MARS GLOBAL SERVICES
- GBU FOOD, NUTRITION & MS RUSSIA
- GBU MARS SNACKING RUSSIA
- GBU PETCARE RUSSIA

**Key unit prefixes:**
- `MW` = Mars Wrigley (Snacking)
- `PN` = Pet Nutrition
- `RC` = Royal Canin
- `AC` = Accelerator Division
- `SDX` = Science & Diagnostics
- `MVH` = Mars Vet Health
- `KN` = Kellanova
- `HC` = Hotel Chocolat
- `FOOD` = Food & Nutrition
- `WWY` = Wrigley (legacy)

---

## Hierarchy: Reporting Lines (finiq_dim_rl)

**725 reporting lines, array-based parent hierarchy**

| Depth | Count | Description |
|-------|-------|-------------|
| -1 | 62 | No parents (orphans/top-level) |
| 1 | 527 | Single parent (leaf lines) |
| 2 | 117 | Two-level (intermediate) |
| 3 | 19 | Three-level (high aggregation) |

**7 Financial Statements:**
- P&L — Profit & Loss
- BS — Balance Sheet
- BSR — Balance Sheet Reclassification
- EP — (unknown, likely Earnings/Performance)
- S&U — Sources & Uses
- Overheads — Overhead cost allocation
- Others — Miscellaneous

**Key P&L Reporting Lines:**
| RL_ID | RL Name | Sign |
|-------|---------|------|
| 856 | NET SALES TOTAL | +1 |
| 3767 | GSV 3RD PARTY | +1 |
| 918 | PRIME COSTS | -1 |
| 922 | CONVERSION COSTS | -1 |
| 1000 | MARGIN AFTER CONVERSION | +1 |
| 1666 | A&CP SHAPE % | (KPI) |
| 3803 | CE SHAPE % | (KPI) |
| 3770 | CONTROLLABLE OVERHEAD COSTS | -1 |
| 1085 | CONTROLLABLE PROFIT | +1 |

**Growth KPIs (computed in views):**
| Parent_RL_ID | Formula | Description |
|-------------|---------|-------------|
| 5723 | RL 5472 / RL 5464 - 1 | Organic Growth |
| 5727 | RL 5581 / RL 5464 | Growth via Price |
| 7451 | RL 5582 / RL 5464 | Growth via Volume |
| 7450 | RL 5583 / RL 5464 | Growth via Mix |
| 74510 | RL 5586 / RL 5464 | Growth % - 3rd P Mix |
| 74500 | RL 5587 / RL 5464 | Growth % - 3rd P Volume |

RL 5464 = denominator for all growth KPIs (Net Sales LY reference)

---

## Fiscal Calendar (finiq_date)

- **Date_ID format:** YYYYPP (e.g., 202506 = 2025, Period 06)
- **Range:** 202001 → 202813 (FY2020 through FY2028)
- **13 periods per year** (Mars fiscal calendar, Period 13 = Q4 adjustment)
- **Quarters:** Q1 (P01-03), Q2 (P04-06), Q3 (P07-09), Q4 (P10-13)
- **Replan data range:** 202501 → 202613 (FY2025-FY2026 only, 19 dates)

---

## Product Hierarchy

**3-tier:** Item → Composite_Item → (dimensions)

| Dimension | Distinct Values |
|-----------|----------------|
| EC Groups | 205 |
| Segments | 12 |
| Business Segments | 9 |
| Brands | 458 |
| Technologies | 54 |
| Product Consolidations | 23 |
| Product Categories | 75 |

**Top EC Groups:** SEASONAL (1,303), FRUITY CONF (783), MW OTHER (673), BAR (646), BITESIZE (621), GUM (560)

**Business Segments:** CHOCOLATE, PETCARE, GUM AND CONFECTIONS, FOOD, DEVELOPING BUSINESS, etc.

---

## Economic Cell Archetypes

| Archetype | Count | Purpose |
|-----------|-------|---------|
| GROWTH ENGINE | 49 | High-growth priority areas |
| SEED | 33 | Emerging/developing areas |
| FUEL FOR GROWTH | 32 | Cash generators funding growth |
| HARVEST | 31 | Mature, maximize profit |
| OTHER | 30 | Unclassified |

---

## Customer Dimension

| Dimension | Distinct Values |
|-----------|----------------|
| Countries | 139 |
| Channels | 8 |
| Formats | 24 |
| Level 1 groups | 398 |
| Level 2 groups | 1,230 |

**Unit_Customer_ID format:** `{Unit_ID}#{Customer_ID}` (e.g., `10416#S0690690011028A`)

---

## View SQL Logic (critical for understanding data)

### finiq_vw_pl_unit — P&L by Unit
- Source: `FinIQ_Financial_Cons` joined with `Dimensions_View_Date_Map` and `Dimensions_Date`
- Filters to 27 specific RL_IDs (P&L KPIs only)
- Date_Offset logic: 0 = Current Year, 100 = Last Year
- View_ID: 1 = Periodic, 2 = YTD
- Growth KPIs computed as ratios: numerator RL / denominator RL (5464) - 1
- Special handling: RL 5464 gets +100/+200 Date_Offset
- Final output joins Dimensions_Unit (Unit_Alias) and Dimensions_Reporting_Line (RL_Alias)

### finiq_vw_pl_brand_product — P&L by Brand/Product
- Same as vw_pl_unit but adds JOIN to FinIQ_Composite_Item for brand/product dimensions
- Creates 3-way UNION: by Brand, by Product_Category, by Product_Consolidation
- `Item` column contains COALESCE(Brand/Category/Consolidation, "EMPTY ...")

### finiq_vw_ncfo_unit — NCFO by Unit
- Same source pattern but filters to 16 different RL_IDs (NCFO-specific)
- No growth KPI computation (simpler)
- No special Date_Offset for RL 5464

### anomalydetection_vw_pbi_anomaly_detector_mw_na
- Simply selects from AnomalyDetection_PBI_Anomaly_Detector
- Filters to units under Parent_Unit_ID = 12128 (Mars Wrigley North America)
- 87 pivoted metric columns (wide format)

---

## Data Flow Summary

```
Raw Financial Data
    │
    ▼
finiq_financial_base (740M rows, normalized, ID-only)
    │
    ├──JOIN dims──▶ finiq_financial (5.7B rows, fully denormalized, all text labels)
    │
    ├──JOIN currency──▶ finiq_financial_cons (5.8B rows, with currency conversion)
    │                        │
    │                        ├──▶ finiq_vw_pl_unit (aggregated P&L by unit)
    │                        ├──▶ finiq_vw_pl_brand_product (aggregated P&L by product)
    │                        └──▶ finiq_vw_ncfo_unit (aggregated NCFO by unit)
    │
    └──Budget overlay──▶ finiq_financial_replan (2.7M rows, actual vs budget)
                         finiq_financial_replan_cons (186K rows, consolidated)
```

---

## Safe Query Patterns for the App

### ALWAYS use views with Unit_Alias filter:
```sql
SELECT * FROM finiq_vw_pl_unit
WHERE Unit_Alias = 'MARS INCORPORATED (R)'
AND Date_ID = 202506
```

### For dimension lookups (always safe):
```sql
SELECT Child_Unit_ID, Child_Unit, Unit_Level
FROM finiq_dim_unit
WHERE Unit_Level <= 3
ORDER BY Unit_Level, Child_Unit
```

### For budget variance (medium — use Date_ID filter):
```sql
SELECT Unit, Reporting_Line_KPI, Actual_USD_Value, Replan_USD_Value
FROM finiq_financial_replan
WHERE Unit_ID = 13000 AND Date_ID = 202506
```

### NEVER do this:
```sql
SELECT * FROM finiq_financial        -- 5.7B rows, will timeout
SELECT COUNT(*) FROM finiq_financial_cons  -- scans 5.8B rows
SELECT * FROM finiq_vw_pl_unit       -- no WHERE = full 5.7B scan
```

---

## APPENDIX A: External Dimensions Tables

The views reference external `Dimensions_*` tables that are NOT in `finsight_core_model`.
They exist in the **`finsight_core_model_mvp3`** schema (older version).

**Schemas in catalog:**
- `default`
- `finsight_core_model` (CURRENT — our schema)
- `finsight_core_model_archive_2025`
- `finsight_core_model_archive_mvp23`
- `finsight_core_model_mvp3` (contains Dimensions_* tables)
- `information_schema`

**35 Dimensions tables in `finsight_core_model_mvp3`:**
- dimensions_account, dimensions_account_category, dimensions_account_consolidation
- dimensions_country, dimensions_currency, dimensions_customer
- dimensions_date, dimensions_entity, dimensions_entity_category
- dimensions_entity_consolidation, dimensions_entity_type
- dimensions_fx_type, dimensions_item_brand, dimensions_item_local_classification
- dimensions_item_product_category, dimensions_item_taxonomy
- dimensions_node_item, dimensions_time_view, dimensions_view_date_map
- dimensions_vw_item_brand, dimensions_vw_item_product_category
- dimensions_vw_representative_material
- 13 more `dimensions_it_*` tables (brand flag, business segment, ec group, etc.)

The views resolve these via Unity Catalog cross-schema references. We don't need to query these directly — the views handle the joins.

---

## APPENDIX B: Replan (Budget vs Actual) Analysis

**2 Submission Types:** ID 1 and 2

**Data Coverage by Quarter:**
| Year | Quarter | Rows | Has Actual | Has Replan |
|------|---------|------|------------|------------|
| 2025 | Q1 | 476,180 | 476,180 | 0 |
| 2025 | Q2 | 485,561 | 485,561 | 0 |
| 2025 | Q3 | 489,756 | 489,756 | 0 |
| 2025 | Q4 | 662,634 | 662,634 | 0 |
| 2026 | Q1 | 516,641 | 479,810 | 36,831 |
| 2026 | Q2 | 36,325 | 0 | 36,325 |
| 2026 | Q3 | 36,410 | 0 | 36,410 |
| 2026 | Q4 | 36,686 | 0 | 36,686 |

**Key insight:** FY2025 has actuals only (no budget). FY2026 Q1 has both actual and replan. FY2026 Q2-Q4 have replan (budget) only — future quarters. This is the actual-vs-budget variance data for the app's budget variance feature.

---

## APPENDIX C: NCFO View — 16 KPI Lines

| RL_Alias | Category |
|----------|----------|
| Controllable Cash From P&L | Top-line cash |
| Controllable Working Capital Addition | Working capital |
| Change in A/R 3rd Party | Working capital |
| Change in Accrued Liab | Working capital |
| Change in Accts Payable | Working capital |
| Change in Fin Goods | Working capital |
| Change in Inv Raws | Working capital |
| Change in Oth CurrAssets | Working capital |
| Change in Rec/Pay Affil | Working capital |
| Change in Rec/Pay Brokers | Working capital |
| Change in Resv for Restruct | Working capital |
| Change In ROU Assets/Liabilities | Non-current |
| Change In Non-Current | Non-current |
| Fixed Asset Additions | CapEx |
| Tax Payments - Total | Tax |
| Net Cash From Operations | **Bottom line** |

---

## APPENDIX D: View Unit_Alias Values

The views use **Title Case** for Unit_Alias (e.g., "MW Estonia Market" not "MW ESTONIA MARKET"). This differs from finiq_dim_unit.Child_Unit which is UPPERCASE. The mapping happens through the external `Dimensions_Unit` table.

Sample valid Unit_Alias values from views:
MW Estonia Market, PN Austria Market, MW USA, RC Korea, MW Thailand Market, AC Romania Market, RC USA Supply, PN Mexico, Food Denmark Market, PN ANZ, RC International Division, Mars Wrigley Division Shared, PN Bulgaria Market, etc.

---

## APPENDIX E: Customer Channels & Formats

**8 Customer Channels:**
| Channel | Count |
|---------|-------|
| PET SPECIALIST | 3,972 |
| MODERN GROCERY | 3,259 |
| OTHER SPECIALIST | 1,673 |
| CONVENIENCE | 1,403 |
| TRADT'L INDEPENDENCE | 1,368 |
| DIGITAL COMMERCE | 996 |
| OUT OF HOME | 814 |
| UNMAPPED | 269 |
| (null) | 7,450 |

**24 Customer Formats:**
SPECIALIST RETAIL, SUPERMARKET, OTHER, TRADT'L INDEPENDENCE, LTDASSORTMENT RETAIL, MULTIPLE CONVENIENCE, HYPERMARKET, PROFESSIONAL, OTHER FOOD SERVICE, VETERINARY, PURE-PLAY, TRADT'L CONVENIENCE, DRUGSTORE/PHARMACY, DIRECT TO CONSUMER, QSR & CAFE, CLICK & MORTAR, MARKETPLACE, OTHER PET SPECIALIST, VENDING, ORDERDEMAND DELIVERY, EBUSINESS 2 BUSINESS, ENTERTAINMENT, SOCIAL/INTEREST COMM, UNMAPPED

**Customer Map Hierarchy:**
- 553 child units → 286 parent units
- 54,438 child customers → 14,230 parent customers

---

## APPENDIX F: Composite_Item_ID Encoding

Format: `EC_Group_ID#Tech_ID#Segment_ID#BizSeg_ID#Market_ID#Brand_ID#Format_ID#???#???`

Example: `106#200#501#1#23#442#17#35864#25099` decodes to:
- EC_Group: BAR (ID 106)
- Brand: MARATHON (ID 442)
- Segment: CHOCOLATE (ID 1→501)
- Business_Segment: CHOCOLATE
- Product_Category: PERFORMANCE SNACKS

The ID is a compound key encoding the full product taxonomy. The `finiq_item_composite_item` bridge maps 381K granular items → 9,478 composite items.

---

## APPENDIX G: Anomaly Detection View

`anomalydetection_vw_pbi_anomaly_detector_mw_na` — Mars Wrigley North America only

**6 units:** MW Canada Market, MW Ethel M Market, MW North America Region, MW North America Supply, MW USA, MW USA Market

**87 columns:** Unit_ID, Unit, Date_ID, Year, Period, Business_Segment, EC_Group, Brand_Flag, Product_Consolidation, Brand_New, CellKey, then 76 pivoted financial metric columns (e.g., `Net_Sales_Total`, `Prime_Costs`, `Controllable_Profit`, etc.)

This is a **Power BI-optimized wide table** — not for general querying. Parent_Unit_ID filter = 12128 (MW North America Region).

---

## APPENDIX H: Base → Financial Denormalization

`finiq_financial_base` (740M rows, 7 columns) → `finiq_financial` (5.7B rows, 42 columns)

**Multiplier: ~7.8x** — This blowup comes from JOINing the base with the unit consolidation hierarchy. Each financial record appears once per parent unit in the hierarchy (a market-level record rolls up to region, division, GBU, and Mars Inc levels).

**Base columns (IDs only):** Date_ID, Unit_ID, RL_ID, Composite_Item_ID, Economic_Cell_ID, Unit_Customer_ID, USD_Value

**Financial adds (denormalized labels):** Year, Period, Quarter, Parent_Unit, Unit, Unit_Level, Parent_Reporting_Line, Reporting_Line_KPI, Statement, EC_Group, Brand, Segment, Market_Segment, Technology, Supply_Tech, Product_Consolidation, Product_Category, Business_Segment, Pack_Format, Economic_Cell, Archetype, Customer_ID, Country, Customer_Name, SCM_ID, Customer_Level_1-3, Customer_Channel/Format/Subformat, Currency, Sign_Conversion, Reporting_Line_ID, Brand_ID, Local_Value

---

## Raw Scan Files
- `app/deep-scan-raw-output.txt` — Pass 1 output
- `app/deep-scan-pass2-output.txt` — Pass 2 output (includes full 725 RL dim, 725 formulas, 766 units, 175 economic cells, 110 RL inputs)
