/**
 * Schema context string for LLM prompts
 * Describes all 20 finiq_ tables/views so the NL engine can generate accurate SQL
 */

const SCHEMA_CONTEXT = `
You have access to a financial analytics database with the following tables and views.
All table names are prefixed with "finiq_". Use these EXACT names in SQL queries.

=== DIMENSION TABLES ===

finiq_dim_entity — 173 organizational units (Mars > GBU > Division > Region > Sub-unit)
  Columns: Entity_ID (PK), Entity_Alias (name), Parent_Entity_ID (FK to self)
  Examples: "Mars Inc", "Mars Wrigley", "Pet Care", "Royal Canin"

finiq_dim_account — 36 financial accounts with hierarchy
  Columns: Account_ID (PK), Account_Alias (name), Parent_Account_ID, Sign_Conversion
  Examples: "Organic Growth", "MAC Shape %", "Net Revenue", "A&CP"

finiq_account_formula — KPI calculation logic
  Columns: Formula_ID, Account_ID, Numerator_Account_ID, Denominator_Account_ID
  Use: Growth % = ((CY - LY) / ABS(LY)) * 100

finiq_account_input — Account input definitions
  Columns: Input_ID, Account_ID

finiq_date — Calendar/fiscal date mapping
  Columns: Date_ID (PK), Fiscal_Year, Fiscal_Period
  Values: FY2024, FY2025; Periods 1-13

finiq_composite_item — 93 products (master level)
  Columns: Composite_Item_ID (PK), Item_Description

finiq_item — Granular product details (15 columns)
  Columns: Item_ID (PK), Item_Description, ...

finiq_item_composite_item — Bridge: item ↔ composite_item
  Columns: Item_ID, Composite_Item_ID

finiq_customer — 56 customers
  Columns: Customer_ID (PK), Customer_Name

finiq_customer_map — Customer hierarchy
  Columns: Customer_ID, Hierarchy_Level

finiq_economic_cell — Economic cell definitions
  Columns: Cell_ID

=== FACT TABLES ===

finiq_financial — Main financial facts (39 columns, denormalized wide table)
  Key columns: Entity_ID, Account_ID, Date_ID, USD_Value, Local_Value

finiq_financial_base — Normalized base financial data (7 columns)
  Key columns: Entity_ID, Account_ID, Date_ID, Value

finiq_financial_cons — Consolidated financials with currency (9 columns, used by views)
  Key columns: Entity_ID, Account_ID, Date_ID, USD_Value, Currency

finiq_financial_replan — Actual vs budget variance (18 columns)
  Key columns: Entity_ID, Entity_Alias, Account_ID, Actual_USD_Value, Replan_USD_Value
  Use: Variance = Actual - Replan; Favorable if positive for revenue, negative for cost

finiq_financial_replan_cons — Consolidated replan (6 columns)

=== PRECOMPUTED VIEWS (map to PES Excel sheets) ===

finiq_vw_pl_entity — P&L by entity
  Columns: Date_ID, Entity_Alias, Account_Alias, YTD_LY_Value, YTD_CY_Value, Periodic_LY_Value, Periodic_CY_Value
  Use: Main view for KPI calculations. Filter by Entity_Alias.

finiq_vw_pl_brand_product — P&L by brand/product
  Columns: Same as pl_entity + brand/product dimensions
  Use: Product-level analysis

finiq_vw_ncfo_entity — NCFO (Net Cash Flow from Operations) by entity
  Columns: Same structure as pl_entity but for NCFO accounts
  Use: Cash flow analysis

=== 6 KPIs (from Period End Summary) ===
1. Organic Growth — Revenue growth excluding acquisitions/divestitures
2. MAC Shape % — Margin After Controllables as % of Net Revenue
3. A&CP Shape % — Advertising & Consumer Promotion as % of Net Revenue
4. CE Shape % — Contribution to Earnings as % of Net Revenue
5. Controllable Overhead Shape % — Overhead costs as % of Net Revenue
6. NCFO — Net Cash Flow from Operations

=== QUERY RULES ===
- ALWAYS use parameterized queries (? placeholders). NEVER interpolate values.
- ALWAYS JOIN with finiq_dim_account for human-readable account names.
- ALWAYS JOIN with finiq_dim_entity for entity names when querying fact tables.
- Use finiq_vw_pl_entity for P&L questions, finiq_vw_ncfo_entity for cash flow.
- Use finiq_financial_replan for budget variance (Actual vs Replan).
- Growth calculation: ((CY_Value - LY_Value) / ABS(LY_Value)) * 100
- For "top N" or "bottom N" queries, use ORDER BY + LIMIT.
- For rankings, use window functions like RANK() OVER (ORDER BY ...).
`;

export default SCHEMA_CONTEXT;
