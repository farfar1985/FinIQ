/**
 * FinIQ Databricks Schema Context
 * Complete schema definition for all 20 tables/views
 * Used by LLM for SQL generation and intent classification
 */

export const SCHEMA_CONTEXT = `
# FinIQ Databricks Schema Reference

## Overview
- **Catalog**: workspace (synthetic) or corporate_finance_analytics_dev (production)
- **Schema**: default (synthetic) or finsight_core_model_mvp3 (production)
- **Tables**: 17 dimension/fact tables + 3 views
- **All objects prefixed**: finiq_

## DIMENSION TABLES (11)

### finiq_date
Date dimension for fiscal calendar.
Columns: Date_ID (PK), Fiscal_Year, Fiscal_Quarter, Fiscal_Period, Calendar_Date, Year_Offset

### finiq_dim_entity
Organizational hierarchy with 150+ entities (Mars Inc > GBUs > Divisions > Regions > Sub-units).
Columns:
- Parent_Entity_ID, Parent_Entity (parent org unit)
- Child_Entity_ID (PK), Child_Entity (child org unit name)
- Entity_Level (1=Mars Inc, 2=GBU, 3=Division, etc.)

Common entities: 'Mars Inc', 'Petcare', 'Snacking', 'Food & Nutrition', 'Royal Canin', 'Pedigree', 'Whiskas', 'M&M\'s', 'Snickers', 'Twix'

### finiq_dim_account
Chart of accounts with KPI definitions and parent-child relationships.
Columns:
- Account_ID (PK) - unique account code (e.g., 'S900001')
- Account_Name - descriptive name
- Parent_Account_IDs - array/JSON of parent account codes
- Account_Level - hierarchy depth
- Sign_Conversion - multiplier for aggregation (+1 or -1)
- Category - grouping (Revenue, COGS, Expenses, etc.)

### finiq_account_formula
KPI calculation logic linking KPIs to account codes.
Columns:
- KPI_Name (PK) - e.g., 'Organic Growth', 'MAC Shape %'
- Numerator_Account_IDs - array of account codes for numerator
- Denominator_Account_IDs - array of account codes for denominator
- Formula_Type - calculation method
- Description

6 core KPIs: Organic Growth, MAC Shape %, A&CP Shape %, CE Shape %, Controllable Overhead Shape %, NCFO

### finiq_account_input
Maps input data fields to account codes.
Columns: Input_Field_Name, Account_ID, Mapping_Type

### finiq_composite_item
Product master (12 columns) - high-level product groupings.
Columns: Composite_Item_ID (PK), Composite_Item_Name, Brand, Category, Sub_Category, GBU, Division, Is_Active, etc.

### finiq_item
Granular product details (15 columns) - SKU-level.
Columns: Item_ID (PK), Item_Name, Item_Code, UPC, Brand, Category, Sub_Category, Pack_Size, Unit_Of_Measure, Is_Active, etc.

### finiq_item_composite_item
Bridge table linking SKUs to product groups.
Columns: Item_ID (FK), Composite_Item_ID (FK), Effective_Date, End_Date

### finiq_customer
Customer master (11 columns).
Columns: Customer_ID (PK), Customer_Name, Customer_Type, Region, Country, Channel, Is_Active, etc.

### finiq_customer_map
Customer hierarchy mapping.
Columns: Parent_Customer_ID, Child_Customer_ID, Relationship_Type

### finiq_economic_cell
Economic analysis cells.
Columns: Cell_ID (PK), Cell_Name, Description, Entity_ID, Account_ID

## FACT TABLES (5)

### finiq_financial (39 columns)
Primary denormalized fact table with all financial metrics.
Columns:
- Date_ID (FK), Entity (FK), Account_KPI (FK), Product_ID, Customer_ID
- YTD_LY, YTD_CY, Periodic_LY, Periodic_CY (core metrics)
- Additional 30+ dimensional and metric columns
- All currency in USD

### finiq_financial_base (7 columns)
Normalized base fact table.
Columns: Date_ID, Entity_ID, Account_ID, Product_ID, Customer_ID, USD_Value, Local_Currency_Value

### finiq_financial_cons (9 columns)
Consolidated financial facts with currency.
Columns: Date_ID, Entity_ID, Account_ID, Product_ID, Customer_ID, USD_Value, Local_Currency_Value, Currency_Code, Exchange_Rate

### finiq_financial_replan (18 columns)
Budget variance - Actual vs. Replan comparison.
Columns:
- Date_ID, Year, Quarter, Period (computed as 'P' || substr('0' || (Date_ID % 100), -2))
- Entity, Account_KPI, Product_ID, Customer_ID
- Actual_USD_Value, Replan_USD_Value
- Variance_Abs (Actual - Replan)
- Variance_Pct ((Actual - Replan) / |Replan| * 100)
- 8 additional dimensional columns

### finiq_financial_replan_cons (6 columns)
Consolidated replan data.
Columns: Date_ID, Entity_ID, Account_ID, Actual_USD_Value, Replan_USD_Value, Currency_Code

## VIEWS (3)
These views map directly to PES (Period End Summary) Excel input sheets.

### finiq_vw_pl_entity
P&L by entity - corresponds to P&L sheet in Excel.
Columns:
- Entity - org unit name (from dim_entity)
- Account_KPI - account/KPI name
- Period - fiscal period (P01-P12)
- YTD_LY - year-to-date last year
- YTD_CY - year-to-date current year
- Periodic_LY - periodic last year
- Periodic_CY - periodic current year

SQL Pattern:
- Date_Offset=100 for LY, 0 for CY
- View_ID=1 for Periodic, 2 for YTD
- Growth KPIs computed via parent-child numerator/denominator pattern
- Account S900077 has special +200 offset treatment

### finiq_vw_pl_brand_product
P&L by brand and product - corresponds to Product/Brand sheet in Excel.
3-way UNION ALL structure:
- Entity-level aggregates
- Brand-level aggregates
- Product-level aggregates
Columns: Same as vw_pl_entity (Entity, Account_KPI, Period, YTD_LY, YTD_CY, Periodic_LY, Periodic_CY)

### finiq_vw_ncfo_entity
Net Cash From Operations by entity - corresponds to NCFO sheet in Excel.
Columns: Same as vw_pl_entity (Entity, Account_KPI, Period, YTD_LY, YTD_CY, Periodic_LY, Periodic_CY)

## QUERY PATTERNS

### Period Format
Periods stored as integers 1-12, displayed as P01-P12.
Example: Period 6 = 'P06'

### Growth Calculations
YTD Growth % = ((YTD_CY - YTD_LY) / ABS(YTD_LY)) * 100
Periodic Growth % = ((Periodic_CY - Periodic_LY) / ABS(Periodic_LY)) * 100

### Budget Variance
Variance $ = Actual_USD_Value - Replan_USD_Value
Variance % = ((Actual - Replan) / ABS(Replan)) * 100

### Common Filters
- Latest period: ORDER BY Period DESC LIMIT 1
- YTD vs LY comparison: YTD_CY vs YTD_LY
- Specific entity: WHERE Entity = 'Mars Inc'
- Specific period: WHERE Period = 'P06'

## TYPICAL QUERIES

Q: "How did Mars Inc perform in P6?"
→ SELECT * FROM finiq_vw_pl_entity WHERE Entity = 'Mars Inc' AND Period = 'P06'

Q: "Show me NCFO for Petcare"
→ SELECT * FROM finiq_vw_ncfo_entity WHERE Entity = 'Petcare' ORDER BY Period DESC

Q: "Budget variance for Snacking in Q2"
→ SELECT * FROM finiq_financial_replan WHERE Entity = 'Snacking' AND Quarter = 'Q2'

Q: "Organic growth trend for Food & Nutrition"
→ SELECT Period, YTD_CY, YTD_LY, ((YTD_CY - YTD_LY) / ABS(YTD_LY)) * 100 as Growth_Pct
   FROM finiq_vw_pl_entity
   WHERE Entity = 'Food & Nutrition' AND Account_KPI LIKE '%Organic%'
   ORDER BY Period

Q: "Top 3 performing brands by revenue"
→ SELECT Entity, SUM(YTD_CY) as Total_Revenue
   FROM finiq_vw_pl_brand_product
   WHERE Account_KPI = 'Net Revenue'
   GROUP BY Entity
   ORDER BY Total_Revenue DESC
   LIMIT 3

## IMPORTANT NOTES
1. All tables/views prefixed with finiq_
2. All currency values in USD (millions)
3. Views return YTD_LY, YTD_CY, Periodic_LY, Periodic_CY (4 metrics)
4. Period format: P01-P12
5. Entity names case-sensitive: 'Mars Inc', 'Petcare', 'Snacking'
6. Account S900077 gets special +200 offset in view calculations
7. finiq_financial_replan has Period computed from Date_ID
`;

export default SCHEMA_CONTEXT;
