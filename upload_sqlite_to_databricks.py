# Databricks notebook source
"""
Upload SQLite synthetic data to Databricks tables.
Reads finiq_synthetic.db and writes each table to workspace.default.

Prerequisites: Upload finiq_synthetic.db to DBFS first:
  - In Databricks, go to Catalog > Browse DBFS (or use the CLI)
  - Upload finiq_synthetic.db to /FileStore/finiq_synthetic.db
  - Or use: dbutils.fs.cp("file:/path/to/finiq_synthetic.db", "dbfs:/FileStore/finiq_synthetic.db")
"""

# COMMAND ----------

# ============================================================================
# CELL 1: CONFIGURATION
# ============================================================================

CATALOG = "workspace"
SCHEMA = "default"

# Path where you uploaded the SQLite file in DBFS
SQLITE_PATH = "/Volumes/workspace/default/finiq_data/finiq_synthetic.db"

# Tables to transfer (in order)
TABLES = [
    "finiq_date",
    "finiq_dim_entity",
    "finiq_dim_account",
    "finiq_account_formula",
    "finiq_account_input",
    "finiq_composite_item",
    "finiq_item",
    "finiq_item_composite_item",
    "finiq_customer",
    "finiq_customer_map",
    "finiq_economic_cell",
    "finiq_financial",
    "finiq_financial_base",
    "finiq_financial_cons",
    "finiq_financial_replan",
    "finiq_financial_replan_cons",
    "finiq_rls_last_change",
]

print(f"Will transfer {len(TABLES)} tables from SQLite to {CATALOG}.{SCHEMA}")

# COMMAND ----------

# ============================================================================
# CELL 2: COPY SQLITE FILE TO LOCAL DRIVER DISK
# ============================================================================

import os
import shutil

LOCAL_PATH = "/tmp/finiq_synthetic.db"

# Copy from volume to local disk (SQLite needs direct file access, not cloud storage)
shutil.copy2(SQLITE_PATH, LOCAL_PATH)
SQLITE_PATH = LOCAL_PATH

print(f"Copied to local: {LOCAL_PATH}")
print(f"File size: {os.path.getsize(LOCAL_PATH) / (1024*1024):.1f} MB")

# COMMAND ----------

# ============================================================================
# CELL 3: TRANSFER ALL TABLES
# ============================================================================

import sqlite3
import json
from pyspark.sql import Row
from pyspark.sql.types import (
    StructType, StructField, StringType, IntegerType, FloatType,
    ArrayType, LongType, TimestampType, DoubleType
)

# Connect to SQLite
conn = sqlite3.connect(SQLITE_PATH)
conn.row_factory = sqlite3.Row

# Column type mapping: SQLite columns that should be arrays in Databricks
ARRAY_COLUMNS = {
    "Parent_Account_ID", "Parent_Account", "Statement", "Components", "Old_RL"
}

spark.sql(f"USE CATALOG {CATALOG}")
spark.sql(f"USE SCHEMA {SCHEMA}")

for table_name in TABLES:
    print(f"\n{'='*60}")
    print(f"Transferring: {table_name}")

    # Get data from SQLite
    cursor = conn.execute(f"SELECT * FROM {table_name}")
    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()

    if len(rows) == 0:
        print(f"  Skipping {table_name} — no rows")
        continue

    # Convert rows to list of dicts, handling JSON arrays
    data = []
    for row in rows:
        record = {}
        for i, col in enumerate(columns):
            val = row[i]
            if col in ARRAY_COLUMNS and val is not None:
                try:
                    val = json.loads(val)  # Convert JSON string to Python list
                except (json.JSONDecodeError, TypeError):
                    val = [val] if val else []
            record[col] = val
        data.append(record)

    # Create pandas DataFrame first (handles mixed types better)
    import pandas as pd
    pdf = pd.DataFrame(data)

    # Convert to Spark DataFrame
    df = spark.createDataFrame(pdf)

    # Drop existing table and write new one using SQL approach
    full_name = f"{CATALOG}.{SCHEMA}.{table_name}"

    # Use temp view + CREATE TABLE AS SELECT to avoid PySpark permission issues
    temp_view = f"_tmp_{table_name}"
    df.createOrReplaceTempView(temp_view)
    spark.sql(f"DROP TABLE IF EXISTS {full_name}")
    spark.sql(f"CREATE TABLE {full_name} AS SELECT * FROM {temp_view}")

    print(f"  Wrote {full_name}: {len(rows)} rows")

conn.close()
print(f"\n{'='*60}")
print(f"ALL {len(TABLES)} TABLES TRANSFERRED SUCCESSFULLY")

# COMMAND ----------

# ============================================================================
# CELL 4: CREATE VIEWS
# ============================================================================

print("Creating views...")

# View 1: NCFO by entity
spark.sql("""
CREATE OR REPLACE VIEW finiq_vw_ncfo_entity AS
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
GROUP BY fc.Date_ID, de.Child_Entity, da.Child_Account
""")
print("  Created: finiq_vw_ncfo_entity")

# View 2: P&L by entity
spark.sql("""
CREATE OR REPLACE VIEW finiq_vw_pl_entity AS
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
GROUP BY fc.Date_ID, de.Child_Entity, da.Child_Account
""")
print("  Created: finiq_vw_pl_entity")

# View 3: P&L by brand/product
spark.sql("""
CREATE OR REPLACE VIEW finiq_vw_pl_brand_product AS
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
GROUP BY fc.Date_ID, de.Child_Entity, da.Child_Account, ci.Brand
""")
print("  Created: finiq_vw_pl_brand_product")

print("\nDONE — All 17 tables + 3 views created in Databricks!")

# COMMAND ----------

# ============================================================================
# CELL 5: VERIFY
# ============================================================================

print("Verification:")
print(f"{'Table':<40} {'Rows':>10}")
print("-" * 52)

for table_name in TABLES:
    count = spark.sql(f"SELECT COUNT(*) as cnt FROM {table_name}").collect()[0].cnt
    print(f"{table_name:<40} {count:>10,}")

for view_name in ["finiq_vw_ncfo_entity", "finiq_vw_pl_entity", "finiq_vw_pl_brand_product"]:
    try:
        count = spark.sql(f"SELECT COUNT(*) as cnt FROM {view_name}").collect()[0].cnt
        print(f"{view_name:<40} {count:>10,}")
    except Exception as e:
        print(f"{view_name:<40} {'ERROR':>10}")

print("\nAll done!")
