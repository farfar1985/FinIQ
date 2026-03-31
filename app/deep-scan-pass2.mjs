/**
 * Deep Scan Pass 2 — Fill all gaps
 * 1. Full RL formula tree (all 725)
 * 2. Full dim_rl with parent arrays (all 725)
 * 3. Full rl_input (all 110)
 * 4. External Dimensions tables discovery
 * 5. View sample data with working unit filter
 * 6. finiq_financial vs finiq_financial_base relationship
 * 7. Full economic_cell (all 175)
 * 8. Full dim_unit (all 766)
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
  if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

async function runSQL(sql, label = "") {
  if (label) process.stdout.write(`  [query] ${label}...`);
  const data = await api("/api/2.0/sql/statements", "POST", {
    warehouse_id: WAREHOUSE_ID,
    statement: sql,
    catalog: CATALOG,
    schema: SCHEMA,
    wait_timeout: "50s",
    disposition: "INLINE",
    format: "JSON_ARRAY",
  });

  if (data.status?.state === "FAILED") throw new Error(data.status.error?.message || "Query failed");

  if (data.status?.state !== "SUCCEEDED") {
    let result = data;
    for (let i = 0; i < 60; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      result = await api(`/api/2.0/sql/statements/${data.statement_id}`);
      if (result.status?.state === "SUCCEEDED") { if (label) console.log(" done"); return fmt(result); }
      if (result.status?.state === "FAILED") throw new Error(result.status.error?.message);
      if (label && i % 5 === 0) process.stdout.write(".");
    }
    throw new Error("Timed out");
  }
  if (label) console.log(" done");
  return fmt(data);
}

function fmt(data) {
  const cols = (data.manifest?.schema?.columns || []).map((c) => ({ name: c.name, type: c.type_text }));
  const rows = data.result?.data_array || [];
  return { cols, rows };
}

function printRows(cols, rows, max = 999) {
  rows.slice(0, max).forEach((r) => {
    const obj = {};
    cols.forEach((c, i) => obj[c.name] = r[i]);
    console.log(`    ${JSON.stringify(obj)}`);
  });
}

async function main() {
  console.log("╔═══════════════════════════════════════════╗");
  console.log("║   DEEP SCAN PASS 2 — FILL ALL GAPS       ║");
  console.log("╚═══════════════════════════════════════════╝\n");

  // ============================================================
  // 1. FULL finiq_dim_rl (all 725 rows with parent arrays)
  // ============================================================
  console.log("━━━ 1. FULL finiq_dim_rl (all 725 rows) ━━━\n");
  try {
    const { cols, rows } = await runSQL(
      `SELECT Child_RL_ID, Child_RL, Sign_Conversion,
              Parent_RL_ID, Parent_RL, Statement
       FROM ${FQ}.finiq_dim_rl
       ORDER BY Child_RL_ID`,
      "full dim_rl"
    );
    console.log(`  Retrieved ${rows.length} reporting lines`);
    printRows(cols, rows);
  } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

  // ============================================================
  // 2. FULL finiq_rl_formula (all 725 rows)
  // ============================================================
  console.log("\n━━━ 2. FULL finiq_rl_formula (all 725 rows) ━━━\n");
  try {
    const { cols, rows } = await runSQL(
      `SELECT * FROM ${FQ}.finiq_rl_formula ORDER BY RL`,
      "full rl_formula"
    );
    console.log(`  Retrieved ${rows.length} formulas`);
    printRows(cols, rows);
  } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

  // ============================================================
  // 3. FULL finiq_rl_input (all 110 rows)
  // ============================================================
  console.log("\n━━━ 3. FULL finiq_rl_input (all 110 rows) ━━━\n");
  try {
    const { cols, rows } = await runSQL(
      `SELECT * FROM ${FQ}.finiq_rl_input ORDER BY Statement, Generation, RL_ID`,
      "full rl_input"
    );
    console.log(`  Retrieved ${rows.length} inputs`);
    printRows(cols, rows);
  } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

  // ============================================================
  // 4. FULL finiq_economic_cell (all 175 rows)
  // ============================================================
  console.log("\n━━━ 4. FULL finiq_economic_cell (all 175 rows) ━━━\n");
  try {
    const { cols, rows } = await runSQL(
      `SELECT * FROM ${FQ}.finiq_economic_cell ORDER BY Economic_Cell_ID`,
      "full economic_cell"
    );
    console.log(`  Retrieved ${rows.length} cells`);
    printRows(cols, rows);
  } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

  // ============================================================
  // 5. FULL finiq_dim_unit (all 766 rows with hierarchy)
  // ============================================================
  console.log("\n━━━ 5. FULL finiq_dim_unit (all 766 rows) ━━━\n");
  try {
    const { cols, rows } = await runSQL(
      `SELECT * FROM ${FQ}.finiq_dim_unit ORDER BY Unit_Level, Parent_Unit, Child_Unit`,
      "full dim_unit"
    );
    console.log(`  Retrieved ${rows.length} units`);
    printRows(cols, rows);
  } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

  // ============================================================
  // 6. EXTERNAL DIMENSIONS TABLES (referenced by views)
  // ============================================================
  console.log("\n━━━ 6. EXTERNAL DIMENSIONS TABLES ━━━\n");

  // 6a. Try to find what schemas/tables exist
  console.log("--- Searching for Dimensions tables ---");
  const dimTables = [
    "Dimensions_View_Date_Map",
    "Dimensions_Date",
    "Dimensions_Unit",
    "Dimensions_Reporting_Line",
    "Dimensions_Unit_Consolidation",
    "Dimensions_Account",
    "Dimensions_Entity",
  ];

  for (const t of dimTables) {
    try {
      const { cols, rows } = await runSQL(
        `DESCRIBE TABLE ${FQ}.${t}`,
        `describe ${t}`
      );
      console.log(`\n  === ${t} ===`);
      console.log(`  Columns (${rows.length}):`);
      rows.forEach((r) => {
        if (r[0] && !r[0].startsWith("#")) console.log(`    ${r[0]} (${r[1]})`);
      });

      // Get row count
      try {
        const cnt = await runSQL(`SELECT COUNT(*) as cnt FROM ${FQ}.${t}`, `count ${t}`);
        console.log(`  Rows: ${cnt.rows[0]?.[0]}`);
      } catch (e2) {}

      // Sample
      try {
        const sample = await runSQL(`SELECT * FROM ${FQ}.${t} LIMIT 5`, `sample ${t}`);
        console.log(`  Sample:`);
        printRows(sample.cols, sample.rows, 5);
      } catch (e2) {}
    } catch (e) {
      // Try in catalog root
      try {
        const { cols, rows } = await runSQL(
          `DESCRIBE TABLE ${CATALOG}.${t}`,
          `describe ${CATALOG}.${t}`
        );
        console.log(`\n  === ${CATALOG}.${t} ===`);
        rows.forEach((r) => {
          if (r[0] && !r[0].startsWith("#")) console.log(`    ${r[0]} (${r[1]})`);
        });
      } catch (e2) {
        console.log(`  ${t}: NOT FOUND in schema or catalog`);
      }
    }
  }

  // 6b. List ALL schemas in the catalog
  console.log("\n--- All schemas in catalog ---");
  try {
    const { rows } = await runSQL(
      `SHOW SCHEMAS IN ${CATALOG}`,
      "list schemas"
    );
    console.log(`  Found ${rows.length} schemas:`);
    rows.forEach((r) => console.log(`    ${r[0]}`));
  } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

  // 6c. Search for Dimensions tables across schemas
  console.log("\n--- Searching for Dimensions_ tables across schemas ---");
  try {
    const { rows: schemas } = await runSQL(`SHOW SCHEMAS IN ${CATALOG}`, "schemas");
    for (const s of schemas) {
      const schemaName = s[0];
      if (schemaName === SCHEMA || schemaName === "information_schema") continue;
      try {
        const { rows: tables } = await runSQL(
          `SHOW TABLES IN ${CATALOG}.${schemaName}`,
          `tables in ${schemaName}`
        );
        const dimMatches = tables.filter((t) => {
          const name = (t[1] || t[0] || "").toLowerCase();
          return name.includes("dimension") || name.includes("view_date_map");
        });
        if (dimMatches.length > 0) {
          console.log(`\n  Schema: ${schemaName}`);
          dimMatches.forEach((t) => console.log(`    - ${t[1] || t[0]}`));
        }
      } catch (e) {}
    }
  } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

  // ============================================================
  // 7. VIEW SAMPLE DATA (with better unit filters)
  // ============================================================
  console.log("\n\n━━━ 7. VIEW SAMPLE DATA (multiple unit levels) ━━━\n");

  // Find actual unit aliases that exist in the views
  console.log("--- Finding valid Unit_Alias values from vw_ncfo_unit ---");
  try {
    const { cols, rows } = await runSQL(
      `SELECT DISTINCT Unit_Alias FROM ${FQ}.finiq_vw_ncfo_unit LIMIT 30`,
      "distinct units in ncfo view"
    );
    console.log(`  Found ${rows.length} distinct units in NCFO view:`);
    rows.forEach((r) => console.log(`    ${r[0]}`));

    // Use the first one for samples
    if (rows.length > 0) {
      const unit = rows[0][0];
      console.log(`\n--- vw_pl_unit for "${unit}" ---`);
      try {
        const pl = await runSQL(
          `SELECT * FROM ${FQ}.finiq_vw_pl_unit WHERE Unit_Alias = '${unit}' LIMIT 30`,
          `vw_pl_unit for ${unit}`
        );
        printRows(pl.cols, pl.rows, 30);
      } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

      console.log(`\n--- vw_ncfo_unit for "${unit}" ---`);
      try {
        const ncfo = await runSQL(
          `SELECT * FROM ${FQ}.finiq_vw_ncfo_unit WHERE Unit_Alias = '${unit}' LIMIT 30`,
          `vw_ncfo_unit for ${unit}`
        );
        printRows(ncfo.cols, ncfo.rows, 30);
      } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

      console.log(`\n--- vw_pl_brand_product for "${unit}" (first 20) ---`);
      try {
        const bp = await runSQL(
          `SELECT * FROM ${FQ}.finiq_vw_pl_brand_product WHERE Unit_Alias = '${unit}' LIMIT 20`,
          `vw_pl_brand_product for ${unit}`
        );
        printRows(bp.cols, bp.rows, 20);
      } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }
    }
  } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

  // ============================================================
  // 8. DISTINCT RL_Alias values in views (what names appear)
  // ============================================================
  console.log("\n\n━━━ 8. DISTINCT RL_Alias values in views ━━━\n");

  console.log("--- Distinct RL_Alias in vw_pl_unit ---");
  try {
    const { rows } = await runSQL(
      `SELECT DISTINCT RL_Alias FROM ${FQ}.finiq_vw_ncfo_unit ORDER BY RL_Alias`,
      "distinct RL_Alias in ncfo"
    );
    console.log(`  NCFO view has ${rows.length} distinct RL_Alias values:`);
    rows.forEach((r) => console.log(`    ${r[0]}`));
  } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

  // ============================================================
  // 9. FINANCIAL BASE → FINANCIAL relationship
  // ============================================================
  console.log("\n\n━━━ 9. BASE → FINANCIAL denormalization analysis ━━━\n");

  // Compare column counts
  console.log("--- finiq_financial_base columns (normalized) ---");
  try {
    const { rows } = await runSQL(`DESCRIBE ${FQ}.finiq_financial_base`, "describe base");
    rows.forEach((r) => { if (r[0] && !r[0].startsWith("#")) console.log(`    ${r[0]} (${r[1]})`); });
  } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

  console.log("\n--- finiq_financial columns (denormalized) ---");
  try {
    const { rows } = await runSQL(`DESCRIBE ${FQ}.finiq_financial`, "describe financial");
    rows.forEach((r) => { if (r[0] && !r[0].startsWith("#")) console.log(`    ${r[0]} (${r[1]})`); });
  } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

  // Row multiplier analysis
  console.log("\n--- Row count ratio ---");
  console.log("  finiq_financial_base: 739,574,399");
  console.log("  finiq_financial:      5,758,891,376");
  console.log(`  Multiplier: ~${(5758891376 / 739574399).toFixed(1)}x`);
  console.log("  This suggests finiq_financial is base JOINed with the unit consolidation hierarchy");
  console.log("  (766 units, many parent-child rollups = ~7.8x blowup)");

  // ============================================================
  // 10. Customer full details
  // ============================================================
  console.log("\n\n━━━ 10. CUSTOMER dimension details ━━━\n");

  console.log("--- Distinct Customer_Channel values ---");
  try {
    const { rows } = await runSQL(
      `SELECT Customer_Channel, COUNT(*) as cnt FROM ${FQ}.finiq_customer GROUP BY Customer_Channel ORDER BY cnt DESC`,
      "customer channels"
    );
    rows.forEach((r) => console.log(`    ${r[0]}: ${r[1]}`));
  } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

  console.log("\n--- Distinct Customer_Format values ---");
  try {
    const { rows } = await runSQL(
      `SELECT Customer_Format, COUNT(*) as cnt FROM ${FQ}.finiq_customer GROUP BY Customer_Format ORDER BY cnt DESC`,
      "customer formats"
    );
    rows.forEach((r) => console.log(`    ${r[0]}: ${r[1]}`));
  } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

  console.log("\n--- Customer_Map hierarchy depth ---");
  try {
    const { rows } = await runSQL(
      `SELECT
        COUNT(DISTINCT Child_Unit_ID) as child_units,
        COUNT(DISTINCT Parent_Unit_ID) as parent_units,
        COUNT(DISTINCT Child_Customer_ID) as child_customers,
        COUNT(DISTINCT Parent_Customer_ID) as parent_customers
       FROM ${FQ}.finiq_customer_map`,
      "customer_map stats"
    );
    printRows([{name:"child_units"},{name:"parent_units"},{name:"child_customers"},{name:"parent_customers"}], rows);
  } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

  // ============================================================
  // 11. Composite_Item_ID structure analysis
  // ============================================================
  console.log("\n\n━━━ 11. COMPOSITE_ITEM_ID structure ━━━\n");
  console.log("--- Decoding the composite ID format ---");
  try {
    const { cols, rows } = await runSQL(
      `SELECT Composite_Item_ID, EC_Group, Brand, Segment, Business_Segment, Product_Category
       FROM ${FQ}.finiq_composite_item LIMIT 10`,
      "composite ID decode"
    );
    printRows(cols, rows, 10);
    console.log("\n  The Composite_Item_ID encodes: EC_Group_ID#Tech_ID#Segment_ID#BizSeg_ID#Mkt_ID#Brand_ID#Format_ID#...");
  } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

  // ============================================================
  // 12. finiq_financial_replan deep analysis
  // ============================================================
  console.log("\n\n━━━ 12. REPLAN analysis ━━━\n");

  console.log("--- Submission types ---");
  try {
    const { rows } = await runSQL(
      `SELECT DISTINCT Submission_Type_ID FROM ${FQ}.finiq_financial_replan ORDER BY Submission_Type_ID`,
      "submission types"
    );
    console.log(`  Submission_Type_IDs: ${rows.map(r => r[0]).join(", ")}`);
  } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

  console.log("\n--- Replan data coverage ---");
  try {
    const { rows } = await runSQL(
      `SELECT Year, Quarter, COUNT(*) as cnt,
              SUM(CASE WHEN Replan_USD_Value IS NOT NULL THEN 1 ELSE 0 END) as has_replan,
              SUM(CASE WHEN Actual_USD_Value IS NOT NULL THEN 1 ELSE 0 END) as has_actual
       FROM ${FQ}.finiq_financial_replan
       GROUP BY Year, Quarter
       ORDER BY Year, Quarter`,
      "replan coverage"
    );
    rows.forEach((r) => console.log(`    ${r[0]} ${r[1]}: ${r[2]} rows (${r[3]} with replan, ${r[4]} with actual)`));
  } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

  // ============================================================
  // 13. Full distinct RL_Alias from vw_pl_unit
  // ============================================================
  console.log("\n\n━━━ 13. ALL RL_Alias values in P&L view ━━━\n");
  try {
    // Use ncfo view since it's materialized and fast
    const { rows } = await runSQL(
      `SELECT DISTINCT RL_Alias FROM ${FQ}.finiq_vw_ncfo_unit ORDER BY RL_Alias`,
      "all RL_Alias in NCFO"
    );
    console.log(`  NCFO RL_Alias (${rows.length}):`);
    rows.forEach((r) => console.log(`    ${r[0]}`));
  } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

  // ============================================================
  // 14. Date_ID mapping table (external)
  // ============================================================
  console.log("\n\n━━━ 14. ANOMALY DETECTION deep look ━━━\n");
  try {
    const { rows } = await runSQL(
      `SELECT DISTINCT Unit, Unit_ID FROM ${FQ}.anomalydetection_vw_pbi_anomaly_detector_mw_na ORDER BY Unit`,
      "anomaly units"
    );
    console.log(`  ${rows.length} units in anomaly detection:`);
    rows.forEach((r) => console.log(`    ${r[0]} (ID: ${r[1]})`));
  } catch (e) { console.log(`  FAILED: ${e.message.slice(0, 200)}`); }

  console.log("\n\n╔═══════════════════════════════════════════╗");
  console.log("║   PASS 2 COMPLETE                         ║");
  console.log("╚═══════════════════════════════════════════╝");
}

main().catch(console.error);
