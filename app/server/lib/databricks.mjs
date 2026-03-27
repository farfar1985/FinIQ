/**
 * FinIQ Data Layer — Dual-mode connector
 * Databricks SQL connector with automatic SQLite fallback
 * FR1.1, FR1.6
 */

import config from "./config.mjs";
import { existsSync } from "fs";

let db = null;
let mode = config.dataMode;

// ============================================================
// Initialization
// ============================================================

async function initDatabricks() {
  try {
    const { DBSQLClient } = await import("@databricks/sql");
    const client = new DBSQLClient();
    await client.connect({
      host: config.databricks.serverHostname,
      path: config.databricks.httpPath,
      token: config.databricks.token,
    });
    console.log("[data] Connected to Databricks");
    return { type: "databricks", client };
  } catch (err) {
    console.error("[data] Databricks connection failed:", err.message);
    return null;
  }
}

async function initSQLite() {
  try {
    const { default: Database } = await import("better-sqlite3");
    const dbPath = config.sqlitePath;
    if (!existsSync(dbPath)) {
      console.error(`[data] SQLite file not found: ${dbPath}`);
      return null;
    }
    const sqliteDb = new Database(dbPath, { readonly: true });
    sqliteDb.pragma("journal_mode = WAL");
    console.log(`[data] Connected to SQLite: ${dbPath}`);
    return { type: "sqlite", client: sqliteDb };
  } catch (err) {
    console.error("[data] SQLite connection failed:", err.message);
    return null;
  }
}

// Lazy init with retry
let initPromise = null;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getConnection() {
  if (db) return db;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    if (mode === "databricks") {
      for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        const conn = await initDatabricks();
        if (conn) {
          db = conn;
          return db;
        }
        if (attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          console.log(`[data] Retry ${attempt}/${MAX_RETRIES} in ${delay}ms...`);
          await sleep(delay);
        }
      }
      console.log("[data] Databricks failed after retries, falling back to SQLite");
    }

    db = await initSQLite();
    if (db) {
      mode = "simulated";
    }
    return db;
  })();

  return initPromise;
}

// ============================================================
// Query execution
// ============================================================

async function query(sql, params = []) {
  const conn = await getConnection();
  if (!conn) throw new Error("No database connection available");

  if (conn.type === "sqlite") {
    return querySQLite(conn.client, sql, params);
  } else {
    return queryDatabricks(conn.client, sql, params);
  }
}

function querySQLite(client, sql, params) {
  const stmt = client.prepare(sql);
  return stmt.all(...params);
}

async function queryDatabricks(client, sql, params) {
  let session = null;
  let operation = null;
  try {
    session = await client.openSession({
      initialCatalog: config.databricks.catalog,
      initialSchema: config.databricks.schema,
    });

    let parameterizedSql = sql;
    const namedParams = [];
    let paramIdx = 0;
    parameterizedSql = sql.replace(/\?/g, () => {
      const name = `p${paramIdx}`;
      namedParams.push({ name, value: String(params[paramIdx]), type: "STRING" });
      paramIdx++;
      return `:${name}`;
    });

    operation = await session.executeStatement(parameterizedSql, {
      namedParameters: namedParams.length > 0 ? namedParams : undefined,
      runAsync: true,
      maxRows: 10000,
    });

    return await operation.fetchAll();
  } finally {
    if (operation) await operation.close().catch(() => {});
    if (session) await session.close().catch(() => {});
  }
}

// ============================================================
// Health check
// ============================================================

async function healthCheck() {
  try {
    const conn = await getConnection();
    if (!conn) return { connected: false, mode: "none", error: "No connection" };

    if (conn.type === "sqlite") {
      const result = querySQLite(conn.client, "SELECT COUNT(*) as cnt FROM finiq_dim_entity", []);
      return { connected: true, mode: "simulated", entityCount: result[0]?.cnt };
    } else {
      const result = await queryDatabricks(conn.client, "SELECT 1 as ok", []);
      return { connected: true, mode: "databricks", ok: result.length > 0 };
    }
  } catch (err) {
    return { connected: false, mode, error: err.message };
  }
}

// ============================================================
// Dimension queries
// Column mapping:
//   SQLite: Child_Entity_ID, Child_Entity, Parent_Entity_ID, Parent_Entity
//   Databricks: Entity_ID, Entity_Alias, Parent_Entity_ID
// We normalize output to a consistent shape.
// ============================================================

async function getEntities() {
  const rows = await query(
    "SELECT Child_Entity_ID as Entity_ID, Child_Entity as Entity_Alias, Parent_Entity_ID, Parent_Entity, Entity_Level FROM finiq_dim_entity ORDER BY Child_Entity"
  );
  return rows;
}

async function getEntityHierarchy() {
  const rows = await query(`
    SELECT Child_Entity_ID as Entity_ID, Child_Entity as Entity_Alias,
           Parent_Entity_ID, Parent_Entity as Parent_Alias, Entity_Level
    FROM finiq_dim_entity
    ORDER BY Entity_Level, Child_Entity
  `);
  return rows;
}

async function getAccounts() {
  return query(
    "SELECT Child_Account_ID as Account_ID, Child_Account as Account_Alias, Parent_Account_ID, Parent_Account, Sign_Conversion, Statement FROM finiq_dim_account ORDER BY Child_Account"
  );
}

async function getAccountFormulas() {
  return query(
    "SELECT * FROM finiq_account_formula"
  );
}

async function getProducts() {
  return query(
    "SELECT Composite_Item_ID, Brand, Segment, Business_Segment, Product_Category FROM finiq_composite_item ORDER BY Brand"
  );
}

async function getCustomers() {
  return query(
    "SELECT Customer_ID, Customer_Name, Country, Customer_Channel FROM finiq_customer ORDER BY Customer_Name"
  );
}

async function getDates() {
  return query(
    "SELECT DISTINCT Year, Period, Quarter FROM finiq_date ORDER BY Year DESC, Period DESC"
  );
}

// ============================================================
// PES view queries (parameterized entity filter)
// SQLite views use: Entity, Account_KPI, Period, YTD_LY, YTD_CY, Periodic_LY, Periodic_CY
// ============================================================

async function getPLByEntity(entityAlias) {
  return query(
    "SELECT Entity, Account_KPI, Period, YTD_LY, YTD_CY, Periodic_LY, Periodic_CY FROM finiq_vw_pl_entity WHERE Entity = ?",
    [entityAlias]
  );
}

async function getPLByBrandProduct(entityAlias) {
  return query(
    "SELECT * FROM finiq_vw_pl_brand_product WHERE Entity = ?",
    [entityAlias]
  );
}

async function getNCFOByEntity(entityAlias) {
  return query(
    "SELECT Entity, Account_KPI, Period, YTD_LY, YTD_CY, Periodic_LY, Periodic_CY FROM finiq_vw_ncfo_entity WHERE Entity = ?",
    [entityAlias]
  );
}

// ============================================================
// Budget variance (with account name JOIN — fixes Build 1 bug)
// ============================================================

async function getVariance(entityAlias) {
  return query(`
    SELECT r.Entity, r.Account_KPI,
           r.Actual_USD_Value, r.Replan_USD_Value,
           (r.Actual_USD_Value - r.Replan_USD_Value) as Variance,
           CASE WHEN r.Replan_USD_Value != 0
                THEN ((r.Actual_USD_Value - r.Replan_USD_Value) / ABS(r.Replan_USD_Value)) * 100
                ELSE 0 END as Variance_Pct
    FROM finiq_financial_replan r
    WHERE r.Entity = ?
    ORDER BY r.Account_KPI
  `, [entityAlias]);
}

// ============================================================
// Ad-hoc query (for NL engine)
// ============================================================

async function executeAdHoc(sql, params = []) {
  const trimmed = sql.trim().toUpperCase();
  if (!trimmed.startsWith("SELECT")) {
    throw new Error("Only SELECT queries are allowed");
  }
  return query(sql, params);
}

// ============================================================
// Exports
// ============================================================

function getMode() {
  return mode;
}

export default {
  query,
  healthCheck,
  getMode,
  getEntities,
  getEntityHierarchy,
  getAccounts,
  getAccountFormulas,
  getProducts,
  getCustomers,
  getDates,
  getPLByEntity,
  getPLByBrandProduct,
  getNCFOByEntity,
  getVariance,
  executeAdHoc,
};
