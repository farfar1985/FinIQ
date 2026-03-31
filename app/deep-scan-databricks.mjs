/**
 * Deep Databricks Schema Scan
 * Extracts: view definitions, formula logic, sample values,
 * cardinality, hierarchy depths, and inferred relationships
 */

const HOST = "adb-2085958195047517.17.azuredatabricks.net";
const TOKEN = "REDACTED_SEE_ENV";
const CATALOG = "corporate_finance_analytics_prod";
const SCHEMA = "finsight_core_model";
const FQ = `${CATALOG}.${SCHEMA}`;

const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
const WAREHOUSE_ID = "de640b2f8ef3d9b2";

async function api(path, method = "GET", body = null) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://${HOST}${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

async function runSQL(sql, label = "") {
  if (label) console.log(`  [query] ${label}...`);
  const data = await api("/api/2.0/sql/statements", "POST", {
    warehouse_id: WAREHOUSE_ID,
    statement: sql,
    catalog: CATALOG,
    schema: SCHEMA,
    wait_timeout: "50s",
    disposition: "INLINE",
    format: "JSON_ARRAY",
  });

  if (data.status?.state === "FAILED") {
    throw new Error(data.status.error?.message || "Query failed");
  }

  // Poll if not done
  if (data.status?.state !== "SUCCEEDED") {
    let result = data;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      result = await api(`/api/2.0/sql/statements/${data.statement_id}`);
      if (result.status?.state === "SUCCEEDED") return format(result);
      if (result.status?.state === "FAILED") throw new Error(result.status.error?.message);
    }
    throw new Error("Query timed out after 2 minutes");
  }
  return format(data);
}

function format(data) {
  const cols = (data.manifest?.schema?.columns || []).map((c) => c.name);
  const rows = data.result?.data_array || [];
  return { cols, rows };
}

function printTable(cols, rows, maxRows = 20) {
  if (rows.length === 0) { console.log("    (empty)"); return; }
  rows.slice(0, maxRows).forEach((r) => {
    const obj = {};
    cols.forEach((c, i) => obj[c] = r[i]);
    console.log(`    ${JSON.stringify(obj)}`);
  });
  if (rows.length > maxRows) console.log(`    ... and ${rows.length - maxRows} more rows`);
}

async function main() {
  console.log("╔══════════════════════════════════════════════════════════╗");
  console.log("║   DEEP DATABRICKS SCHEMA SCAN                          ║");
  console.log("║   corporate_finance_analytics_prod.finsight_core_model  ║");
  console.log("╚══════════════════════════════════════════════════════════╝\n");

  // ============================================================
  // SECTION 1: VIEW DEFINITIONS (the most valuable part)
  // ============================================================
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("SECTION 1: VIEW SQL DEFINITIONS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const views = [
    "finiq_vw_pl_unit",
    "finiq_vw_pl_brand_product",
    "finiq_vw_ncfo_unit",
    "anomalydetection_vw_pbi_anomaly_detector_mw_na",
  ];

  for (const v of views) {
    console.log(`\n=== VIEW: ${v} ===`);
    try {
      const { rows } = await runSQL(`SHOW CREATE TABLE ${FQ}.${v}`, `Getting CREATE for ${v}`);
      if (rows[0]) {
        console.log(rows[0][0] || rows[0][1] || JSON.stringify(rows[0]));
      }
    } catch (e) {
      console.log(`  Failed: ${e.message.slice(0, 200)}`);
    }
  }

  // ============================================================
  // SECTION 2: FORMULA & CALCULATION LOGIC
  // ============================================================
  console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("SECTION 2: FORMULA & CALCULATION LOGIC");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("=== finiq_rl_formula (all 725 rows — KPI calculation definitions) ===");
  try {
    const { cols, rows } = await runSQL(`SELECT * FROM ${FQ}.finiq_rl_formula ORDER BY RL`, "RL formulas");
    printTable(cols, rows, 50);
    console.log(`  Total: ${rows.length} formulas`);
  } catch (e) {
    console.log(`  Failed: ${e.message.slice(0, 200)}`);
  }

  console.log("\n=== finiq_rl_input (all 110 rows — input reporting lines) ===");
  try {
    const { cols, rows } = await runSQL(`SELECT * FROM ${FQ}.finiq_rl_input ORDER BY Statement, Generation, RL_ID`, "RL inputs");
    printTable(cols, rows, 30);
    console.log(`  Total: ${rows.length} inputs`);
  } catch (e) {
    console.log(`  Failed: ${e.message.slice(0, 200)}`);
  }

  // ============================================================
  // SECTION 3: DIMENSION TABLES — FULL CONTENT & CARDINALITY
  // ============================================================
  console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("SECTION 3: DIMENSION TABLES — SAMPLES & CARDINALITY");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // 3a. finiq_dim_unit — org hierarchy
  console.log("=== finiq_dim_unit (766 rows — org hierarchy) ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT * FROM ${FQ}.finiq_dim_unit ORDER BY Unit_Level, Parent_Unit, Child_Unit LIMIT 30`,
      "dim_unit sample"
    );
    printTable(cols, rows, 30);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  console.log("\n  --- Unit hierarchy depth ---");
  try {
    const { cols, rows } = await runSQL(
      `SELECT Unit_Level, COUNT(*) as cnt, COUNT(DISTINCT Parent_Unit) as distinct_parents, COUNT(DISTINCT Child_Unit) as distinct_children
       FROM ${FQ}.finiq_dim_unit GROUP BY Unit_Level ORDER BY Unit_Level`,
      "unit hierarchy levels"
    );
    printTable(cols, rows);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  console.log("\n  --- Top-level units (Level 1) ---");
  try {
    const { cols, rows } = await runSQL(
      `SELECT DISTINCT Parent_Unit, Child_Unit FROM ${FQ}.finiq_dim_unit WHERE Unit_Level = 1 ORDER BY Child_Unit`,
      "top-level units"
    );
    printTable(cols, rows, 30);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  // 3b. finiq_dim_rl — reporting line hierarchy
  console.log("\n=== finiq_dim_rl (725 rows — reporting line / account hierarchy) ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT Child_RL_ID, Child_RL, Sign_Conversion,
              size(Parent_RL_ID) as parent_depth
       FROM ${FQ}.finiq_dim_rl
       ORDER BY Child_RL_ID LIMIT 30`,
      "dim_rl sample"
    );
    printTable(cols, rows, 30);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  console.log("\n  --- RL hierarchy depth distribution ---");
  try {
    const { cols, rows } = await runSQL(
      `SELECT size(Parent_RL_ID) as hierarchy_depth, COUNT(*) as cnt
       FROM ${FQ}.finiq_dim_rl GROUP BY size(Parent_RL_ID) ORDER BY hierarchy_depth`,
      "RL hierarchy depth"
    );
    printTable(cols, rows);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  console.log("\n  --- Distinct Statements ---");
  try {
    const { cols, rows } = await runSQL(
      `SELECT DISTINCT explode(Statement) as stmt FROM ${FQ}.finiq_dim_rl ORDER BY stmt`,
      "distinct statements"
    );
    printTable(cols, rows, 20);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  // 3c. finiq_date
  console.log("\n=== finiq_date (117 rows — fiscal calendar) ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT * FROM ${FQ}.finiq_date ORDER BY Date_ID`,
      "date dimension"
    );
    printTable(cols, rows, 30);
    console.log(`  Total dates: ${rows.length}`);
    console.log(`  Date_ID range: ${rows[0]?.[0]} to ${rows[rows.length - 1]?.[0]}`);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  // 3d. finiq_economic_cell
  console.log("\n=== finiq_economic_cell (175 rows) ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT * FROM ${FQ}.finiq_economic_cell ORDER BY Economic_Cell_ID LIMIT 30`,
      "economic cells"
    );
    printTable(cols, rows, 30);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  console.log("\n  --- Distinct Archetypes ---");
  try {
    const { cols, rows } = await runSQL(
      `SELECT Archetype, COUNT(*) as cnt FROM ${FQ}.finiq_economic_cell GROUP BY Archetype ORDER BY cnt DESC`,
      "archetypes"
    );
    printTable(cols, rows);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  // 3e. finiq_composite_item — product master
  console.log("\n=== finiq_composite_item (9,478 rows — product master) ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT * FROM ${FQ}.finiq_composite_item LIMIT 10`,
      "composite_item sample"
    );
    printTable(cols, rows);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  console.log("\n  --- Product cardinality ---");
  try {
    const { cols, rows } = await runSQL(
      `SELECT
        COUNT(DISTINCT EC_Group) as ec_groups,
        COUNT(DISTINCT Segment) as segments,
        COUNT(DISTINCT Business_Segment) as biz_segments,
        COUNT(DISTINCT Brand) as brands,
        COUNT(DISTINCT Technology) as technologies,
        COUNT(DISTINCT Product_Consolidation) as product_consolidations,
        COUNT(DISTINCT Product_Category) as product_categories
       FROM ${FQ}.finiq_composite_item`,
      "product cardinality"
    );
    printTable(cols, rows);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  console.log("\n  --- EC Groups ---");
  try {
    const { cols, rows } = await runSQL(
      `SELECT EC_Group, COUNT(*) as cnt FROM ${FQ}.finiq_composite_item GROUP BY EC_Group ORDER BY cnt DESC`,
      "EC groups"
    );
    printTable(cols, rows, 20);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  // 3f. finiq_customer
  console.log("\n=== finiq_customer (21,204 rows) ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT * FROM ${FQ}.finiq_customer LIMIT 10`,
      "customer sample"
    );
    printTable(cols, rows);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  console.log("\n  --- Customer cardinality ---");
  try {
    const { cols, rows } = await runSQL(
      `SELECT
        COUNT(DISTINCT Country) as countries,
        COUNT(DISTINCT Customer_Channel) as channels,
        COUNT(DISTINCT Customer_Format) as formats,
        COUNT(DISTINCT Customer_Level_1) as level1s,
        COUNT(DISTINCT Customer_Level_2) as level2s
       FROM ${FQ}.finiq_customer`,
      "customer cardinality"
    );
    printTable(cols, rows);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  // 3g. finiq_customer_map hierarchy
  console.log("\n=== finiq_customer_map (210,913 rows — customer hierarchy) ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT * FROM ${FQ}.finiq_customer_map LIMIT 10`,
      "customer_map sample"
    );
    printTable(cols, rows);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  // 3h. finiq_item
  console.log("\n=== finiq_item (381,113 rows — granular product) ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT * FROM ${FQ}.finiq_item LIMIT 10`,
      "item sample"
    );
    printTable(cols, rows);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  // 3i. finiq_item_composite_item bridge
  console.log("\n=== finiq_item_composite_item (388,782 rows — item-to-product bridge) ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT * FROM ${FQ}.finiq_item_composite_item LIMIT 10`,
      "item_composite_item bridge sample"
    );
    printTable(cols, rows);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  // ============================================================
  // SECTION 4: FACT TABLE STRUCTURE (sample only — NO full scans)
  // ============================================================
  console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("SECTION 4: FACT TABLE SAMPLES (5 rows each — safe)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  const factTables = [
    "finiq_financial",
    "finiq_financial_base",
    "finiq_financial_cons",
    "finiq_financial_replan",
    "finiq_financial_replan_cons",
  ];

  for (const t of factTables) {
    console.log(`\n=== ${t} (5-row sample) ===`);
    try {
      const { cols, rows } = await runSQL(`SELECT * FROM ${FQ}.${t} LIMIT 5`, `${t} sample`);
      console.log(`  Columns: ${cols.join(", ")}`);
      printTable(cols, rows, 5);
    } catch (e) {
      console.log(`  Failed: ${e.message.slice(0, 200)}`);
    }
  }

  // ============================================================
  // SECTION 5: CROSS-TABLE RELATIONSHIPS (FK inference)
  // ============================================================
  console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("SECTION 5: CROSS-TABLE RELATIONSHIPS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // 5a. Verify Unit_ID joins
  console.log("=== Unit_ID join verification ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT 'finiq_financial' as tbl, COUNT(DISTINCT Unit_ID) as distinct_ids FROM ${FQ}.finiq_financial LIMIT 1
       UNION ALL
       SELECT 'finiq_dim_unit', COUNT(DISTINCT Child_Unit_ID) FROM ${FQ}.finiq_dim_unit
       UNION ALL
       SELECT 'finiq_financial_replan', COUNT(DISTINCT Unit_ID) FROM ${FQ}.finiq_financial_replan
       UNION ALL
       SELECT 'finiq_customer_map', COUNT(DISTINCT Child_Unit_ID) FROM ${FQ}.finiq_customer_map`,
      "Unit_ID distinct counts across tables"
    );
    printTable(cols, rows);
  } catch (e) {
    console.log(`  Failed: ${e.message.slice(0, 200)}`);
    // Fallback — skip the big table
    console.log("  Trying without finiq_financial (too large)...");
    try {
      const { cols, rows } = await runSQL(
        `SELECT 'finiq_dim_unit' as tbl, COUNT(DISTINCT Child_Unit_ID) as distinct_ids FROM ${FQ}.finiq_dim_unit
         UNION ALL
         SELECT 'finiq_financial_replan', COUNT(DISTINCT Unit_ID) FROM ${FQ}.finiq_financial_replan
         UNION ALL
         SELECT 'finiq_customer_map', COUNT(DISTINCT Child_Unit_ID) FROM ${FQ}.finiq_customer_map`,
        "Unit_ID (without finiq_financial)"
      );
      printTable(cols, rows);
    } catch (e2) { console.log(`  Also failed: ${e2.message.slice(0, 200)}`); }
  }

  // 5b. Verify RL_ID / Reporting_Line_ID joins
  console.log("\n=== RL_ID / Reporting_Line_ID join verification ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT 'finiq_dim_rl' as tbl, COUNT(DISTINCT Child_RL_ID) as distinct_ids FROM ${FQ}.finiq_dim_rl
       UNION ALL
       SELECT 'finiq_rl_formula', COUNT(DISTINCT RL) FROM ${FQ}.finiq_rl_formula
       UNION ALL
       SELECT 'finiq_rl_input', COUNT(DISTINCT RL_ID) FROM ${FQ}.finiq_rl_input
       UNION ALL
       SELECT 'finiq_financial_replan', COUNT(DISTINCT Reporting_Line_ID) FROM ${FQ}.finiq_financial_replan`,
      "RL_ID across tables"
    );
    printTable(cols, rows);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  // 5c. Date_ID joins
  console.log("\n=== Date_ID range verification ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT 'finiq_date' as tbl, MIN(Date_ID) as min_id, MAX(Date_ID) as max_id, COUNT(*) as cnt FROM ${FQ}.finiq_date
       UNION ALL
       SELECT 'finiq_financial_replan', MIN(Date_ID), MAX(Date_ID), COUNT(DISTINCT Date_ID) FROM ${FQ}.finiq_financial_replan`,
      "Date_ID ranges"
    );
    printTable(cols, rows);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  // 5d. Composite_Item_ID bridge verification
  console.log("\n=== Composite_Item_ID bridge verification ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT 'finiq_composite_item' as tbl, COUNT(DISTINCT Composite_Item_ID) as distinct_ids FROM ${FQ}.finiq_composite_item
       UNION ALL
       SELECT 'finiq_item_composite_item', COUNT(DISTINCT Composite_Item_ID) FROM ${FQ}.finiq_item_composite_item
       UNION ALL
       SELECT 'finiq_item', COUNT(DISTINCT Item_ID) FROM ${FQ}.finiq_item
       UNION ALL
       SELECT 'finiq_item_composite_item (items)', COUNT(DISTINCT Item_ID) FROM ${FQ}.finiq_item_composite_item`,
      "product bridge cardinality"
    );
    printTable(cols, rows);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  // 5e. Economic_Cell_ID joins
  console.log("\n=== Economic_Cell_ID join verification ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT 'finiq_economic_cell' as tbl, COUNT(DISTINCT Economic_Cell_ID) as distinct_ids FROM ${FQ}.finiq_economic_cell
       UNION ALL
       SELECT 'finiq_financial_base', COUNT(DISTINCT Economic_Cell_ID) FROM (SELECT DISTINCT Economic_Cell_ID FROM ${FQ}.finiq_financial_base LIMIT 10000)`,
      "economic cell join"
    );
    printTable(cols, rows);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  // 5f. Customer joins
  console.log("\n=== Customer join verification ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT 'finiq_customer' as tbl, COUNT(DISTINCT Unit_Customer_ID) as distinct_ids FROM ${FQ}.finiq_customer
       UNION ALL
       SELECT 'finiq_customer_map', COUNT(DISTINCT Unit_Customer_ID) FROM ${FQ}.finiq_customer_map`,
      "customer join cardinality"
    );
    printTable(cols, rows);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  // ============================================================
  // SECTION 6: VIEW SAMPLE DATA (filtered — safe)
  // ============================================================
  console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("SECTION 6: VIEW SAMPLE DATA (filtered, safe)");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Get a real unit name first
  let sampleUnit = "Mars Inc";
  try {
    const { rows } = await runSQL(
      `SELECT DISTINCT Child_Unit FROM ${FQ}.finiq_dim_unit WHERE Unit_Level = 1 LIMIT 1`,
      "getting sample unit"
    );
    if (rows[0]) sampleUnit = rows[0][0];
  } catch (e) {}

  console.log(`Using sample unit: "${sampleUnit}"\n`);

  console.log("=== finiq_vw_pl_unit (filtered) ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT * FROM ${FQ}.finiq_vw_pl_unit WHERE Unit_Alias = '${sampleUnit}' LIMIT 20`,
      "vw_pl_unit filtered sample"
    );
    printTable(cols, rows, 20);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  console.log("\n=== finiq_vw_ncfo_unit (filtered) ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT * FROM ${FQ}.finiq_vw_ncfo_unit WHERE Unit_Alias = '${sampleUnit}' LIMIT 20`,
      "vw_ncfo_unit filtered sample"
    );
    printTable(cols, rows, 20);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  console.log("\n=== finiq_vw_pl_brand_product (filtered) ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT * FROM ${FQ}.finiq_vw_pl_brand_product WHERE Unit_Alias = '${sampleUnit}' LIMIT 20`,
      "vw_pl_brand_product filtered sample"
    );
    printTable(cols, rows, 20);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  // ============================================================
  // SECTION 7: DISTINCT VALUES FOR FILTERS / DROPDOWNS
  // ============================================================
  console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("SECTION 7: DISTINCT VALUES FOR FILTERS/DROPDOWNS");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  console.log("=== All distinct Unit names (from dim_unit) ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT DISTINCT Child_Unit FROM ${FQ}.finiq_dim_unit ORDER BY Child_Unit`,
      "all unit names"
    );
    console.log(`  ${rows.length} distinct units:`);
    rows.forEach((r) => console.log(`    ${r[0]}`));
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  console.log("\n=== All distinct RL names (top 50) ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT DISTINCT Child_RL FROM ${FQ}.finiq_dim_rl ORDER BY Child_RL LIMIT 50`,
      "RL names sample"
    );
    console.log(`  Showing 50 of 725:`);
    rows.forEach((r) => console.log(`    ${r[0]}`));
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  console.log("\n=== All Years and Periods ===");
  try {
    const { cols, rows } = await runSQL(
      `SELECT Year, Period, Quarter, Date_ID FROM ${FQ}.finiq_date ORDER BY Date_ID`,
      "all periods"
    );
    printTable(cols, rows, 120);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  console.log("\n=== finiq_rls_last_change ===");
  try {
    const { cols, rows } = await runSQL(`SELECT * FROM ${FQ}.finiq_rls_last_change`, "last change");
    printTable(cols, rows);
  } catch (e) { console.log(`  Failed: ${e.message.slice(0, 200)}`); }

  // ============================================================
  // SECTION 8: TABLE SIZE ESTIMATES
  // ============================================================
  console.log("\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("SECTION 8: TABLE SIZE ESTIMATES");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  try {
    const { cols, rows } = await runSQL(
      `SELECT table_name,
              ROUND(data_size_in_bytes / 1024.0 / 1024.0 / 1024.0, 2) as size_gb,
              number_of_rows
       FROM ${CATALOG}.information_schema.tables
       WHERE table_schema = '${SCHEMA}'
       ORDER BY COALESCE(data_size_in_bytes, 0) DESC`,
      "information_schema sizes"
    );
    console.log("  Table | Size (GB) | Rows");
    console.log("  ------|-----------|------");
    rows.forEach((r) => console.log(`  ${r[0]} | ${r[1] || '?'} GB | ${r[2] || '?'}`));
  } catch (e) {
    console.log(`  Failed: ${e.message.slice(0, 200)}`);
  }

  console.log("\n\n╔══════════════════════════════════════════════════════════╗");
  console.log("║   DEEP SCAN COMPLETE                                     ║");
  console.log("╚══════════════════════════════════════════════════════════╝");
}

main().catch(console.error);
