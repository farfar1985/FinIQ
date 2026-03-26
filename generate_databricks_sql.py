"""
Generates a Databricks SQL script from the finiq_synthetic.db SQLite database.
Reads all 17 tables from SQLite and outputs CREATE OR REPLACE TABLE + INSERT INTO
statements in Databricks SQL syntax. Run the output .sql file in Databricks SQL Editor.

Usage: python generate_databricks_sql.py
Output: databricks_synthetic_data_sql.sql
"""

import sqlite3
import json
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "finiq_synthetic.db")
SQL_OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "databricks_synthetic_data_sql.sql")

CATALOG = "workspace"
SCHEMA = "default"

# Map SQLite column types to Databricks types
# We detect array columns by checking if values start with '['
ARRAY_COLUMNS = {
    "Parent_Account_ID", "Parent_Account", "Statement", "Components", "Old_RL"
}

# Table definitions: (table_name, [(col_name, databricks_type), ...])
TABLE_DEFS = {
    "finiq_date": [
        ("Date_ID", "INT"), ("Year", "INT"), ("Period", "STRING"), ("Quarter", "STRING")
    ],
    "finiq_dim_entity": [
        ("Parent_Entity_ID", "STRING"), ("Parent_Entity", "STRING"),
        ("Child_Entity_ID", "STRING"), ("Child_Entity", "STRING"), ("Entity_Level", "INT")
    ],
    "finiq_dim_account": [
        ("Parent_Account_ID", "ARRAY<STRING>"), ("Parent_Account", "ARRAY<STRING>"),
        ("Child_Account_ID", "STRING"), ("Child_Account", "STRING"),
        ("Sign_Conversion", "INT"), ("Statement", "ARRAY<STRING>")
    ],
    "finiq_account_formula": [
        ("Account", "STRING"), ("Formula", "STRING"),
        ("Components", "ARRAY<STRING>"), ("Old_RL", "ARRAY<STRING>")
    ],
    "finiq_account_input": [
        ("Statement", "STRING"), ("Account_ID", "STRING"), ("Generation", "INT")
    ],
    "finiq_composite_item": [
        ("Composite_Item_ID", "STRING"), ("EC_Group", "STRING"), ("Technology", "STRING"),
        ("Supply_Tech", "STRING"), ("Segment", "STRING"), ("Business_Segment", "STRING"),
        ("Market_Segment", "STRING"), ("Brand_ID", "INT"), ("Brand", "STRING"),
        ("Consumer_Pack_Format", "STRING"), ("Product_Consolidation", "STRING"),
        ("Product_Category", "STRING")
    ],
    "finiq_item": [
        ("Item_ID", "STRING"), ("EC_Group_ID", "INT"), ("EC_Group_Alias", "STRING"),
        ("Brand_Flag_ID", "INT"), ("Brand_Flag_Alias", "STRING"),
        ("Financial_Product_Segment_ID", "INT"), ("Financial_Product_Segment_Alias", "STRING"),
        ("Market_Segment_ID", "INT"), ("Market_Segment_Alias", "STRING"),
        ("Supply_Tech_ID", "INT"), ("Supply_Tech_Alias", "STRING"),
        ("Business_Segment_ID", "STRING"), ("Business_Segment_Alias", "STRING"),
        ("Product_Category_Consolidation_ID", "STRING"),
        ("Product_Category_Consolidation_Alias", "STRING")
    ],
    "finiq_item_composite_item": [
        ("Item_ID", "STRING"), ("Composite_Item_ID", "STRING"), ("IT_EC_Group_ID", "INT")
    ],
    "finiq_customer": [
        ("Entity_Customer_ID", "STRING"), ("Customer_ID", "STRING"), ("Country", "STRING"),
        ("Customer_Name", "STRING"), ("SCM_ID", "STRING"),
        ("Customer_Level_1", "STRING"), ("Customer_Level_2", "STRING"),
        ("Customer_Level_3", "STRING"), ("Customer_Channel", "STRING"),
        ("Customer_Format", "STRING"), ("Customer_Subformat", "STRING")
    ],
    "finiq_customer_map": [
        ("Child_Entity_ID", "STRING"), ("Child_Customer_ID", "STRING"),
        ("Parent_Entity_ID", "STRING"), ("Parent_Customer_ID", "STRING"),
        ("Entity_Customer_ID", "STRING")
    ],
    "finiq_economic_cell": [
        ("Economic_Cell_ID", "INT"), ("Economic_Cell", "STRING"), ("Archetype", "STRING")
    ],
    "finiq_financial": [
        ("Date_ID", "INT"), ("Year", "INT"), ("Period", "STRING"), ("Quarter", "STRING"),
        ("Parent_Entity", "STRING"), ("Entity", "STRING"), ("Entity_Level", "INT"),
        ("Parent_Account", "ARRAY<STRING>"), ("Account_KPI", "STRING"),
        ("Statement", "ARRAY<STRING>"), ("EC_Group", "STRING"), ("Brand", "STRING"),
        ("Segment", "STRING"), ("Market_Segment", "STRING"), ("Technology", "STRING"),
        ("Supply_Tech", "STRING"), ("Product_Consolidation", "STRING"),
        ("Product_Category", "STRING"), ("Business_Segment", "STRING"),
        ("Pack_Format", "STRING"), ("Economic_Cell", "STRING"), ("Archetype", "STRING"),
        ("Customer_ID", "STRING"), ("Country", "STRING"), ("Customer_Name", "STRING"),
        ("SCM_ID", "STRING"), ("Customer_Level_1", "STRING"), ("Customer_Level_2", "STRING"),
        ("Customer_Level_3", "STRING"), ("Customer_Channel", "STRING"),
        ("Customer_Format", "STRING"), ("Customer_Subformat", "STRING"),
        ("Currency", "STRING"), ("Sign_Conversion", "INT"), ("Entity_ID", "STRING"),
        ("Account_ID", "STRING"), ("Brand_ID", "INT"), ("USD_Value", "FLOAT"),
        ("Local_Value", "FLOAT")
    ],
    "finiq_financial_base": [
        ("Date_ID", "INT"), ("Entity_ID", "STRING"), ("Account_ID", "STRING"),
        ("Composite_Item_ID", "STRING"), ("Economic_Cell_ID", "INT"),
        ("Entity_Customer_ID", "STRING"), ("USD_Value", "FLOAT")
    ],
    "finiq_financial_cons": [
        ("Date_ID", "INT"), ("Entity_ID", "STRING"), ("Account_ID", "STRING"),
        ("Composite_Item_ID", "STRING"), ("Economic_Cell_ID", "INT"),
        ("Entity_Customer_ID", "STRING"), ("Currency_ID", "STRING"),
        ("USD_Value", "FLOAT"), ("Local_Value", "FLOAT")
    ],
    "finiq_financial_replan": [
        ("Submission_Type_ID", "INT"), ("Date_ID", "INT"), ("Year", "INT"),
        ("Quarter", "STRING"), ("Parent_Entity", "STRING"), ("Entity", "STRING"),
        ("Entity_Level", "INT"), ("Parent_Account", "ARRAY<STRING>"),
        ("Account_KPI", "STRING"), ("Statement", "ARRAY<STRING>"),
        ("Currency", "STRING"), ("Sign_Conversion", "INT"), ("Entity_ID", "STRING"),
        ("Account_ID", "STRING"), ("Actual_USD_Value", "FLOAT"),
        ("Actual_Local_Value", "FLOAT"), ("Replan_USD_Value", "FLOAT"),
        ("Replan_Local_Value", "FLOAT")
    ],
    "finiq_financial_replan_cons": [
        ("Date_ID", "INT"), ("Entity_ID", "STRING"), ("Account_ID", "STRING"),
        ("Currency_ID", "STRING"), ("USD_Value", "FLOAT"), ("Local_Value", "FLOAT")
    ],
    "finiq_rls_last_change": [
        ("Last_Change", "TIMESTAMP"), ("Version", "BIGINT")
    ],
}

# Order matters for foreign key references
TABLE_ORDER = [
    "finiq_date", "finiq_dim_entity", "finiq_dim_account", "finiq_account_formula",
    "finiq_account_input", "finiq_composite_item", "finiq_item",
    "finiq_item_composite_item", "finiq_customer", "finiq_customer_map",
    "finiq_economic_cell", "finiq_financial", "finiq_financial_base",
    "finiq_financial_cons", "finiq_financial_replan", "finiq_financial_replan_cons",
    "finiq_rls_last_change"
]

BATCH_SIZE = 200  # Rows per INSERT statement


def escape_sql_string(val):
    """Escape single quotes for SQL strings."""
    if val is None:
        return "NULL"
    return str(val).replace("'", "\\'")


def json_to_databricks_array(json_str):
    """Convert JSON array string to Databricks ARRAY() syntax."""
    if json_str is None:
        return "NULL"
    try:
        arr = json.loads(json_str)
        if not arr:
            return "ARRAY()"
        elements = ", ".join(f"'{escape_sql_string(v)}'" for v in arr)
        return f"ARRAY({elements})"
    except (json.JSONDecodeError, TypeError):
        return "NULL"


def format_value(val, col_name, col_type):
    """Format a Python value for Databricks SQL."""
    if val is None:
        return "NULL"
    if col_type == "ARRAY<STRING>":
        return json_to_databricks_array(val)
    elif col_type in ("INT", "BIGINT"):
        return str(int(val)) if val is not None else "NULL"
    elif col_type == "FLOAT":
        return str(float(val)) if val is not None else "NULL"
    elif col_type == "TIMESTAMP":
        return f"TIMESTAMP '{val}'"
    else:  # STRING
        return f"'{escape_sql_string(val)}'"


def generate_sql():
    """Generate the complete Databricks SQL script."""
    if not os.path.exists(DB_PATH):
        print(f"ERROR: SQLite database not found at {DB_PATH}")
        print("Run generate_synthetic_data_sqlite.py first.")
        return

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row

    with open(SQL_OUTPUT, 'w', encoding='utf-8') as f:
        f.write("-- =============================================================================\n")
        f.write("-- Amira FinIQ — Synthetic Data for Databricks (Pure SQL)\n")
        f.write("-- Generated from finiq_synthetic.db\n")
        f.write("-- Run this in the Databricks SQL Editor\n")
        f.write("-- Catalog: workspace | Schema: default\n")
        f.write("-- =============================================================================\n\n")
        f.write(f"USE CATALOG {CATALOG};\n")
        f.write(f"USE SCHEMA {SCHEMA};\n\n")

        for table_name in TABLE_ORDER:
            cols = TABLE_DEFS[table_name]
            col_names = [c[0] for c in cols]
            col_types = {c[0]: c[1] for c in cols}

            # Get data from SQLite
            cursor = conn.execute(f"SELECT * FROM {table_name}")
            rows = cursor.fetchall()
            row_count = len(rows)

            print(f"  {table_name}: {row_count} rows")

            # CREATE OR REPLACE TABLE
            f.write(f"-- {'=' * 70}\n")
            f.write(f"-- TABLE: {table_name} ({row_count} rows)\n")
            f.write(f"-- {'=' * 70}\n\n")

            col_defs = ", ".join(f"{c[0]} {c[1]}" for c in cols)
            f.write(f"CREATE OR REPLACE TABLE {table_name} ({col_defs});\n\n")

            # INSERT in batches
            if row_count == 0:
                f.write(f"-- No data for {table_name}\n\n")
                continue

            for batch_start in range(0, row_count, BATCH_SIZE):
                batch = rows[batch_start:batch_start + BATCH_SIZE]
                f.write(f"INSERT INTO {table_name} VALUES\n")
                value_rows = []
                for row in batch:
                    values = []
                    for i, col_name in enumerate(col_names):
                        val = row[i]
                        values.append(format_value(val, col_name, col_types[col_name]))
                    value_rows.append(f"  ({', '.join(values)})")
                f.write(",\n".join(value_rows))
                f.write(";\n\n")

        # Views
        f.write("-- =============================================================================\n")
        f.write("-- VIEWS\n")
        f.write("-- =============================================================================\n\n")

        # View 1: finiq_vw_ncfo_entity
        f.write("""CREATE OR REPLACE VIEW finiq_vw_ncfo_entity AS
SELECT
    fc.Date_ID,
    de.Child_Entity AS Entity_Alias,
    da.Child_Account AS Account_Alias,
    ROUND(SUM(CASE WHEN fd_ly.Date_ID IS NOT NULL AND fc.Date_ID != fd_ly.Date_ID THEN fc.USD_Value END), 4) AS YTD_LY_Value,
    ROUND(SUM(CASE WHEN fd_cy.Date_ID IS NOT NULL THEN fc.USD_Value END), 4) AS YTD_CY_Value,
    ROUND(SUM(CASE WHEN fd_ly.Date_ID IS NOT NULL AND fc.Date_ID != fd_ly.Date_ID THEN fc.USD_Value END), 4) AS Periodic_LY_Value,
    ROUND(SUM(CASE WHEN fd_cy.Date_ID IS NOT NULL THEN fc.USD_Value END), 4) AS Periodic_CY_Value
FROM finiq_financial_cons fc
INNER JOIN finiq_dim_entity de ON fc.Entity_ID = de.Child_Entity_ID
LEFT JOIN finiq_dim_account da ON fc.Account_ID = da.Child_Account_ID
LEFT JOIN finiq_date fd_cy ON fc.Date_ID = fd_cy.Date_ID
LEFT JOIN finiq_date fd_ly ON fc.Date_ID = fd_ly.Date_ID + 100
WHERE fc.Account_ID IN ('CF8129','CF8133','MC8136','MC8149','CF8147','MC8913','S900147','MC8100','MC8902')
GROUP BY fc.Date_ID, de.Child_Entity, da.Child_Account;

""")

        # View 2: finiq_vw_pl_entity
        f.write("""CREATE OR REPLACE VIEW finiq_vw_pl_entity AS
SELECT
    fc.Date_ID,
    de.Child_Entity AS Entity_Alias,
    da.Child_Account AS Account_Alias,
    ROUND(SUM(CASE WHEN fd_ly.Date_ID IS NOT NULL AND fc.Date_ID != fd_ly.Date_ID THEN fc.USD_Value END), 4) AS YTD_LY_Value,
    ROUND(SUM(CASE WHEN fd_cy.Date_ID IS NOT NULL THEN fc.USD_Value END), 4) AS YTD_CY_Value,
    ROUND(SUM(CASE WHEN fd_ly.Date_ID IS NOT NULL AND fc.Date_ID != fd_ly.Date_ID THEN fc.USD_Value END), 4) AS Periodic_LY_Value,
    ROUND(SUM(CASE WHEN fd_cy.Date_ID IS NOT NULL THEN fc.USD_Value END), 4) AS Periodic_CY_Value
FROM finiq_financial_cons fc
INNER JOIN finiq_dim_entity de ON fc.Entity_ID = de.Child_Entity_ID
LEFT JOIN finiq_dim_account da ON fc.Account_ID = da.Child_Account_ID
LEFT JOIN finiq_date fd_cy ON fc.Date_ID = fd_cy.Date_ID
LEFT JOIN finiq_date fd_ly ON fc.Date_ID = fd_ly.Date_ID + 100
WHERE fc.Account_ID IN ('S900123','FR4100','FR4200','SR4001','FR4300','FR4000',
    'MR5200','MR5100','SR5101','SR5103','MR8005','SR6102','SR6153','MR8004',
    'MR6300','MR6359','MR8003','S900144','S900233','S900130','S900227',
    'S900077','S900067','S900070','S900069','ST9020','S900083')
GROUP BY fc.Date_ID, de.Child_Entity, da.Child_Account;

""")

        # View 3: finiq_vw_pl_brand_product
        f.write("""CREATE OR REPLACE VIEW finiq_vw_pl_brand_product AS
SELECT
    fc.Date_ID,
    de.Child_Entity AS Entity_Alias,
    da.Child_Account AS Account_Alias,
    ci.Brand AS Item,
    ROUND(SUM(CASE WHEN fd_ly.Date_ID IS NOT NULL AND fc.Date_ID != fd_ly.Date_ID THEN fc.USD_Value END), 4) AS YTD_LY_Value,
    ROUND(SUM(CASE WHEN fd_cy.Date_ID IS NOT NULL THEN fc.USD_Value END), 4) AS YTD_CY_Value,
    ROUND(SUM(CASE WHEN fd_ly.Date_ID IS NOT NULL AND fc.Date_ID != fd_ly.Date_ID THEN fc.USD_Value END), 4) AS Periodic_LY_Value,
    ROUND(SUM(CASE WHEN fd_cy.Date_ID IS NOT NULL THEN fc.USD_Value END), 4) AS Periodic_CY_Value
FROM finiq_financial_cons fc
INNER JOIN finiq_dim_entity de ON fc.Entity_ID = de.Child_Entity_ID
LEFT JOIN finiq_dim_account da ON fc.Account_ID = da.Child_Account_ID
LEFT JOIN finiq_composite_item ci ON fc.Composite_Item_ID = ci.Composite_Item_ID
LEFT JOIN finiq_date fd_cy ON fc.Date_ID = fd_cy.Date_ID
LEFT JOIN finiq_date fd_ly ON fc.Date_ID = fd_ly.Date_ID + 100
WHERE fc.Account_ID IN ('S900123','FR4100','FR4200','SR4001','FR4300','FR4000',
    'MR5200','MR5100','SR5101','SR5103','MR8005','SR6102','SR6153','MR8004',
    'MR6300','MR6359','MR8003','S900144','S900233','S900130','S900227',
    'S900077','S900067','S900070','S900069','ST9020','S900083')
GROUP BY fc.Date_ID, de.Child_Entity, da.Child_Account, ci.Brand;

""")

        f.write("-- =============================================================================\n")
        f.write("-- END OF SCRIPT\n")
        f.write("-- =============================================================================\n")

    conn.close()
    file_size_mb = os.path.getsize(SQL_OUTPUT) / (1024 * 1024)
    print(f"\nSQL script generated: {SQL_OUTPUT}")
    print(f"File size: {file_size_mb:.1f} MB")


if __name__ == "__main__":
    print("Generating Databricks SQL from finiq_synthetic.db ...")
    generate_sql()
    print("Done.")
