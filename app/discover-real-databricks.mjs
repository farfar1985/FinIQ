/**
 * Real Databricks Schema Discovery — REST API only
 * No npm dependencies needed
 */

const HOST = "adb-2085958195047517.17.azuredatabricks.net";
const TOKEN = "REDACTED_SEE_ENV";
const CATALOG = "corporate_finance_analytics_prod";
const SCHEMA = "finsight_core_model";

const headers = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };

async function api(path, method = "GET", body = null) {
  const opts = { method, headers };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`https://${HOST}${path}`, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

// Execute SQL via Statement Execution API (no warehouse SDK needed)
async function runSQL(warehouseId, sql) {
  const data = await api("/api/2.0/sql/statements", "POST", {
    warehouse_id: warehouseId,
    statement: sql,
    catalog: CATALOG,
    schema: SCHEMA,
    wait_timeout: "30s",
    disposition: "INLINE",
    format: "JSON_ARRAY",
  });

  if (data.status?.state === "FAILED") {
    throw new Error(data.status.error?.message || "Query failed");
  }
  if (data.status?.state === "PENDING" || data.status?.state === "RUNNING") {
    // Poll for completion
    let result = data;
    for (let i = 0; i < 30; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      result = await api(`/api/2.0/sql/statements/${data.statement_id}`);
      if (result.status?.state === "SUCCEEDED") break;
      if (result.status?.state === "FAILED") throw new Error(result.status.error?.message);
    }
    return result;
  }
  return data;
}

function formatResult(data) {
  const cols = data.manifest?.schema?.columns || [];
  const rows = data.result?.data_array || [];
  return { cols: cols.map((c) => c.name), rows };
}

async function main() {
  // 1. Find warehouses
  console.log("=== Finding SQL Warehouses ===");
  let warehouseId;
  try {
    const wh = await api("/api/2.0/sql/warehouses");
    if (wh.warehouses?.length) {
      wh.warehouses.forEach((w) => {
        console.log(`  ${w.name} (${w.id}) — state: ${w.state}, size: ${w.cluster_size}`);
      });
      // Pick first running warehouse, or first available
      const running = wh.warehouses.find((w) => w.state === "RUNNING");
      warehouseId = running?.id || wh.warehouses[0].id;
      console.log(`\nUsing warehouse: ${warehouseId}\n`);
    } else {
      console.log("  No warehouses found!");
      return;
    }
  } catch (e) {
    console.error("Failed to list warehouses:", e.message);
    return;
  }

  // 2. List tables in schema
  console.log(`=== Tables in ${CATALOG}.${SCHEMA} ===`);
  try {
    const result = await runSQL(warehouseId, `SHOW TABLES IN ${CATALOG}.${SCHEMA}`);
    const { cols, rows } = formatResult(result);
    console.log(`Columns returned: ${cols.join(", ")}`);
    console.log(`Found ${rows.length} tables:`);
    rows.forEach((r) => console.log(`  - ${r[1] || r[0]}`));

    // 3. For each table, get row count + describe
    const tableNames = rows.map((r) => r[1] || r[0]);

    for (const name of tableNames) {
      const fullName = `${CATALOG}.${SCHEMA}.${name}`;
      console.log(`\n=== ${name} ===`);

      // Row count
      try {
        const countRes = await runSQL(warehouseId, `SELECT COUNT(*) as cnt FROM ${fullName}`);
        const { rows: countRows } = formatResult(countRes);
        console.log(`  Rows: ${countRows[0]?.[0] || "?"}`);
      } catch (e) {
        console.log(`  Count failed: ${e.message.slice(0, 100)}`);
      }

      // Describe
      try {
        const descRes = await runSQL(warehouseId, `DESCRIBE TABLE ${fullName}`);
        const { rows: descRows } = formatResult(descRes);
        console.log(`  Columns (${descRows.length}):`);
        descRows.forEach((r) => {
          // filter out partition/metadata separators
          if (r[0] && !r[0].startsWith("#")) {
            console.log(`    ${r[0]} (${r[1]})`);
          }
        });
      } catch (e) {
        console.log(`  Describe failed: ${e.message.slice(0, 100)}`);
      }
    }

    // 4. Check for views
    console.log("\n=== Views ===");
    try {
      const viewRes = await runSQL(warehouseId, `SHOW VIEWS IN ${CATALOG}.${SCHEMA}`);
      const { rows: viewRows } = formatResult(viewRes);
      console.log(`Found ${viewRows.length} views:`);

      for (const v of viewRows) {
        const viewName = v[1] || v[0];
        const fullName = `${CATALOG}.${SCHEMA}.${viewName}`;
        console.log(`\n--- VIEW: ${viewName} ---`);

        try {
          const countRes = await runSQL(warehouseId, `SELECT COUNT(*) as cnt FROM ${fullName}`);
          const { rows: cr } = formatResult(countRes);
          console.log(`  Rows: ${cr[0]?.[0] || "?"}`);
        } catch (e) {
          console.log(`  Count failed: ${e.message.slice(0, 100)}`);
        }

        try {
          const descRes = await runSQL(warehouseId, `DESCRIBE ${fullName}`);
          const { rows: dr } = formatResult(descRes);
          console.log(`  Columns (${dr.length}):`);
          dr.forEach((r) => {
            if (r[0] && !r[0].startsWith("#")) console.log(`    ${r[0]} (${r[1]})`);
          });
        } catch (e) {
          console.log(`  Describe failed: ${e.message.slice(0, 100)}`);
        }
      }
    } catch (e) {
      console.log(`  Views query failed: ${e.message.slice(0, 100)}`);
    }

    // 5. Estimate storage sizes for large tables
    console.log("\n=== Table Size Estimates ===");
    try {
      const sizeRes = await runSQL(
        warehouseId,
        `SELECT table_name,
                ROUND(data_size_in_bytes / 1024 / 1024 / 1024, 2) as size_gb,
                number_of_rows
         FROM ${CATALOG}.information_schema.tables
         WHERE table_schema = '${SCHEMA}'
         ORDER BY data_size_in_bytes DESC`
      );
      const { rows: sizeRows } = formatResult(sizeRes);
      console.log("  Table | Size (GB) | Rows");
      console.log("  ------|-----------|------");
      sizeRows.forEach((r) => console.log(`  ${r[0]} | ${r[1]} GB | ${r[2]}`));
    } catch (e) {
      console.log(`  Size query failed: ${e.message.slice(0, 100)}`);
      // Fallback: try DESCRIBE DETAIL
      console.log("  Trying DESCRIBE DETAIL on finiq_financial...");
      try {
        const detailRes = await runSQL(
          warehouseId,
          `DESCRIBE DETAIL ${CATALOG}.${SCHEMA}.finiq_financial`
        );
        const { cols, rows } = formatResult(detailRes);
        console.log(`  Columns: ${cols.join(", ")}`);
        if (rows[0]) console.log(`  Detail: ${JSON.stringify(rows[0])}`);
      } catch (e2) {
        console.log(`  Detail also failed: ${e2.message.slice(0, 100)}`);
      }
    }
  } catch (e) {
    console.error("Table listing failed:", e.message);
  }

  console.log("\n=== Discovery Complete ===");
}

main().catch(console.error);
