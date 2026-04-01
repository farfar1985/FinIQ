// ---------------------------------------------------------------------------
// Databricks SQL connector for Amira FinIQ
// Server-only module — do not import from client components.
// Uses @databricks/sql package for real mode; falls back to simulated data.
// ---------------------------------------------------------------------------

import {
  generateEntities,
  generateFinancialData,
  generateReplanData,
  type Entity,
  type FinancialRow,
  type ReplanRow,
} from "./simulated";

// ---- Configuration --------------------------------------------------------

export type DataMode = "simulated" | "real";

export interface DatabricksConfig {
  host: string;
  token: string;
  httpPath: string;
  catalog: string;
  schema: string;
}

// ---- Runtime mode override ------------------------------------------------
// The client-side Zustand store sets the mode via UI toggle, but server-side
// code only sees process.env.DATA_MODE. To bridge this, API routes pass the
// mode as a parameter, and we store it in a module-level variable that
// overrides the env var for the duration of that request.
let _modeOverride: DataMode | null = null;

/** Set mode override for current request. Call from API routes. */
export function setModeOverride(mode: DataMode | null): void {
  _modeOverride = mode;
}

export function getDataMode(): DataMode {
  if (_modeOverride) return _modeOverride;
  return (process.env.DATA_MODE as DataMode) || "simulated";
}

/** Get Databricks config from environment */
export function getConfig(): DatabricksConfig {
  return {
    host: process.env.DATABRICKS_HOST || "",
    token: process.env.DATABRICKS_TOKEN || "",
    httpPath: process.env.DATABRICKS_HTTP_PATH || "",
    catalog: process.env.DATABRICKS_CATALOG || "corporate_finance_analytics_prod",
    schema: process.env.DATABRICKS_SCHEMA || "finsight_core_model",
  };
}

/** Get the active config (alias for getConfig) */
export function getActiveConfig(): DatabricksConfig {
  return getConfig();
}

export function isRealMode(): boolean {
  return getDataMode() === "real";
}

export function isConfigured(): boolean {
  const cfg = getActiveConfig();
  return !!(cfg.host && cfg.token && cfg.httpPath);
}

// ---- Fully qualified name helper ------------------------------------------

function fqn(table: string): string {
  const cfg = getActiveConfig();
  return `\`${cfg.catalog}\`.\`${cfg.schema}\`.\`${table}\``;
}

// ---- Shared Databricks execution helper -----------------------------------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function executeQuery<T = Record<string, any>>(
  sql: string,
): Promise<T[]> {
  const cfg = getActiveConfig();
  const { DBSQLClient } = await import("@databricks/sql");
  const client = new DBSQLClient();
  await client.connect({
    host: cfg.host,
    path: cfg.httpPath,
    token: cfg.token,
  });
  try {
    const session = await client.openSession();
    try {
      const operation = await session.executeStatement(sql, {
        runAsync: true,
        maxRows: 10000,
      });
      const rows = (await operation.fetchAll()) as T[];
      await operation.close();
      return rows;
    } finally {
      await session.close();
    }
  } finally {
    await client.close();
  }
}

/** Execute a raw SQL query (exported for API routes). Only works in real mode. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function executeRawSql(sql: string, limit = 1000): Promise<Record<string, any>[]> {
  // Append LIMIT if not already present (safety net)
  const trimmed = sql.trim().replace(/;$/, "");
  const hasLimit = /\bLIMIT\s+\d+/i.test(trimmed);
  const safeSql = hasLimit ? trimmed : `${trimmed} LIMIT ${limit}`;
  return executeQuery(safeSql);
}

// ---- Schema introspection (real mode) -------------------------------------

export interface TableInfo {
  name: string;
  type: "TABLE" | "VIEW";
  columns: number;
  category: string;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  nullable: boolean;
  comment: string;
}

/** List all tables/views in the FinSight schema */
export async function listTables(): Promise<TableInfo[]> {
  if (isRealMode() && isConfigured()) {
    const cfg = getActiveConfig();
    // Use information_schema for accurate table_type (VIEW vs EXTERNAL/MANAGED)
    const rows = await executeQuery<{
      table_name: string;
      table_type: string;
    }>(
      `SELECT table_name, table_type FROM \`${cfg.catalog}\`.information_schema.tables WHERE table_schema = '${cfg.schema}' ORDER BY table_name`
    );
    return rows.map((r) => ({
      name: r.table_name,
      type: (r.table_type === "VIEW" ? "VIEW" : "TABLE") as "TABLE" | "VIEW",
      columns: 0,
      category: categorizeTable(r.table_name),
    }));
  }

  // Simulated: return the known 20 objects
  return FINSIGHT_OBJECTS.map((o) => ({ ...o }));
}

/** List columns for a specific table */
export async function listColumns(tableName: string): Promise<ColumnInfo[]> {
  if (isRealMode() && isConfigured()) {
    const rows = await executeQuery<{
      col_name: string;
      data_type: string;
      comment: string;
    }>(`DESCRIBE TABLE ${fqn(tableName)}`);
    // DESCRIBE TABLE can return duplicates (partition info repeats column names)
    // and metadata rows starting with # — filter both out and deduplicate by name.
    const seen = new Set<string>();
    return rows
      .filter((r) => r.col_name && !r.col_name.startsWith("#") && r.col_name !== "" && r.data_type !== "")
      .filter((r) => {
        if (seen.has(r.col_name)) return false;
        seen.add(r.col_name);
        return true;
      })
      .map((r) => ({
        name: r.col_name,
        dataType: r.data_type,
        nullable: true,
        comment: r.comment || "",
      }));
  }

  // Simulated: return known columns
  const simulated = SIMULATED_COLUMNS[tableName];
  if (simulated) return simulated;
  return [];
}

/** Preview rows from a table (first N rows) */
export async function previewTable(
  tableName: string,
  limit = 100,
): Promise<Record<string, unknown>[]> {
  if (isRealMode() && isConfigured()) {
    return executeQuery(`SELECT * FROM ${fqn(tableName)} LIMIT ${limit}`);
  }

  // Simulated: return appropriate data
  return getSimulatedPreview(tableName, limit);
}

/** Query specific columns from a table with optional filters */
export async function queryTable(
  tableName: string,
  columns: string[],
  filters?: { column: string; value: string }[],
  limit = 500,
): Promise<Record<string, unknown>[]> {
  const cols = columns.length > 0 ? columns.join(", ") : "*";

  if (isRealMode() && isConfigured()) {
    // Sanitize column names: allow only alphanumeric + underscore
    const safeCols = columns.length > 0
      ? columns.map((c) => `\`${c.replace(/[^a-zA-Z0-9_]/g, "")}\``).join(", ")
      : "*";
    let sql = `SELECT ${safeCols} FROM ${fqn(tableName)}`;
    if (filters && filters.length > 0) {
      const clauses = filters.map((f) => {
        const safeCol = f.column.replace(/[^a-zA-Z0-9_]/g, "");
        // Escape single quotes properly for SQL string literals
        const safeVal = f.value.replace(/'/g, "''").replace(/\\/g, "\\\\");
        return `\`${safeCol}\` = '${safeVal}'`;
      });
      sql += ` WHERE ${clauses.join(" AND ")}`;
    }
    const safeLimit = Math.min(Math.max(1, Math.floor(Number(limit) || 500)), 10000);
    sql += ` LIMIT ${safeLimit}`;
    return executeQuery(sql);
  }

  // Simulated fallback
  let rows = await getSimulatedPreview(tableName, limit);
  if (filters && filters.length > 0) {
    rows = rows.filter((row) =>
      filters.every((f) => String(row[f.column]) === f.value)
    );
  }
  if (columns.length > 0) {
    rows = rows.map((row) => {
      const filtered: Record<string, unknown> = {};
      for (const col of columns) {
        if (col in row) filtered[col] = row[col];
      }
      return filtered;
    });
  }
  return rows.slice(0, limit);
}

// ---- Test connection -------------------------------------------------------

export async function testConnection(): Promise<{
  success: boolean;
  message: string;
  latencyMs?: number;
  mode?: string;
}> {
  const mode = getDataMode();
  if (mode === "simulated") {
    return { success: true, message: "Simulated mode — no real connection needed", latencyMs: 0, mode };
  }
  if (!isConfigured()) {
    return { success: false, message: "Databricks credentials not configured" };
  }
  const start = Date.now();
  try {
    await executeQuery("SELECT 1 AS test");
    return { success: true, message: "Connected successfully", latencyMs: Date.now() - start };
  } catch (err) {
    return {
      success: false,
      message: err instanceof Error ? err.message : "Unknown error",
      latencyMs: Date.now() - start,
    };
  }
}

// ---- Existing domain query functions --------------------------------------

export async function queryPLByEntity(
  dateId: string,
  entityAlias?: string
): Promise<FinancialRow[]> {
  if (isRealMode() && isConfigured()) {
    let sql = `SELECT * FROM ${fqn("finiq_vw_pl_unit")} WHERE Date_ID = '${dateId}'`;
    if (entityAlias) sql += ` AND Unit_Alias = '${entityAlias.replace(/'/g, "''")}'`;
    return executeQuery<FinancialRow>(sql);
  }

  let rows = generateFinancialData().filter((r) => r.date_id === dateId);
  if (entityAlias) {
    const entities = generateEntities();
    const entity = entities.find((e) => e.alias === entityAlias);
    if (entity) rows = rows.filter((r) => r.entity_id === entity.id);
  }
  return rows;
}

export async function queryPLByBrandProduct(
  dateId: string,
  entityAlias?: string
): Promise<FinancialRow[]> {
  if (isRealMode() && isConfigured()) {
    let sql = `SELECT * FROM ${fqn("finiq_vw_pl_brand_product")} WHERE Date_ID = '${dateId}'`;
    if (entityAlias) sql += ` AND Unit_Alias = '${entityAlias.replace(/'/g, "''")}'`;
    return executeQuery<FinancialRow>(sql);
  }

  let rows = generateFinancialData().filter((r) => r.date_id === dateId);
  if (entityAlias) {
    const entities = generateEntities();
    const entity = entities.find((e) => e.alias === entityAlias);
    if (entity) rows = rows.filter((r) => r.entity_id === entity.id);
  }
  return rows;
}

export async function queryNCFOByUnit(
  dateId: string,
  entityAlias?: string
): Promise<FinancialRow[]> {
  if (isRealMode() && isConfigured()) {
    let sql = `SELECT * FROM ${fqn("finiq_vw_ncfo_unit")} WHERE Date_ID = '${dateId}'`;
    if (entityAlias) sql += ` AND Unit_Alias = '${entityAlias.replace(/'/g, "''")}'`;
    return executeQuery<FinancialRow>(sql);
  }

  const cashFlowCodes = ["S500010", "S500020", "S500030"];
  let rows = generateFinancialData().filter(
    (r) => r.date_id === dateId && cashFlowCodes.includes(r.account_code)
  );
  if (entityAlias) {
    const entities = generateEntities();
    const entity = entities.find((e) => e.alias === entityAlias);
    if (entity) rows = rows.filter((r) => r.entity_id === entity.id);
  }
  return rows;
}

export async function queryReplan(
  dateId: string,
  entityAlias?: string
): Promise<ReplanRow[]> {
  if (isRealMode() && isConfigured()) {
    let sql = `SELECT * FROM ${fqn("finiq_financial_replan")} WHERE Date_ID = '${dateId}'`;
    if (entityAlias) sql += ` AND Unit_Alias = '${entityAlias.replace(/'/g, "''")}'`;
    return executeQuery<ReplanRow>(sql);
  }

  let rows = generateReplanData().filter((r) => r.date_id === dateId);
  if (entityAlias) {
    const entities = generateEntities();
    const entity = entities.find((e) => e.alias === entityAlias);
    if (entity) rows = rows.filter((r) => r.entity_id === entity.id);
  }
  return rows;
}

export async function queryEntities(): Promise<Entity[]> {
  if (isRealMode() && isConfigured()) {
    return executeQuery<Entity>(`SELECT * FROM ${fqn("finiq_dim_unit")} ORDER BY Unit_Level, Unit_Name`);
  }
  return generateEntities();
}

// ---- FinSight schema catalog (simulated mode) -----------------------------

function categorizeTable(name: string): string {
  // Views (precomputed analytics)
  if (name.includes("vw_pl_"))    return "Views — P&L";
  if (name.includes("vw_ncfo_"))  return "Views — NCFO";
  if (name.includes("vw_"))       return "Views";

  // Fact tables (financial data)
  if (name.includes("financial_replan")) return "Facts — Budget/Replan";
  if (name.includes("financial"))        return "Facts — Financial";

  // Dimensions
  if (name.includes("dim_unit"))   return "Dimensions — Org Hierarchy";
  if (name.includes("dim_rl"))     return "Dimensions — Reporting Lines";
  if (name.includes("composite_item"))  return "Dimensions — Products";
  if (name.includes("_item"))           return "Dimensions — Products";
  if (name.includes("customer"))        return "Dimensions — Customers";
  if (name.includes("economic_cell"))   return "Dimensions — Economic Cell";
  if (name.includes("_date") || name === "finiq_date") return "Dimensions — Time";
  if (name.includes("rl_formula")) return "Dimensions — Reporting Lines";
  if (name.includes("rl_input"))  return "Dimensions — Reporting Lines";

  // System
  if (name.includes("rls"))  return "System";
  if (name.includes("anomaly")) return "Analytics";

  return "Other";
}

const FINSIGHT_OBJECTS: TableInfo[] = [
  { name: "finiq_rl_formula",            type: "TABLE", columns: 4,  category: "Dimension — Reporting Line" },
  { name: "finiq_rl_input",             type: "TABLE", columns: 3,  category: "Dimension — Reporting Line" },
  { name: "finiq_composite_item",        type: "TABLE", columns: 12, category: "Dimension — Product" },
  { name: "finiq_customer",              type: "TABLE", columns: 11, category: "Dimension — Customer" },
  { name: "finiq_customer_map",          type: "TABLE", columns: 5,  category: "Dimension — Customer" },
  { name: "finiq_date",                  type: "TABLE", columns: 4,  category: "Dimension — Time" },
  { name: "finiq_dim_rl",               type: "TABLE", columns: 6,  category: "Dimension — Reporting Line" },
  { name: "finiq_dim_unit",             type: "TABLE", columns: 5,  category: "Dimension — Org Hierarchy" },
  { name: "finiq_economic_cell",         type: "TABLE", columns: 3,  category: "Dimension — Economic Cell" },
  { name: "finiq_financial",             type: "TABLE", columns: 39, category: "Fact — Financial" },
  { name: "finiq_financial_base",        type: "TABLE", columns: 7,  category: "Fact — Financial" },
  { name: "finiq_financial_cons",        type: "TABLE", columns: 9,  category: "Fact — Financial" },
  { name: "finiq_financial_replan",      type: "TABLE", columns: 18, category: "Fact — Replan" },
  { name: "finiq_financial_replan_cons", type: "TABLE", columns: 6,  category: "Fact — Replan" },
  { name: "finiq_item",                  type: "TABLE", columns: 15, category: "Dimension — Product" },
  { name: "finiq_item_composite_item",   type: "TABLE", columns: 3,  category: "Dimension — Product" },
  { name: "finiq_rls_last_change",       type: "TABLE", columns: 2,  category: "System" },
  { name: "finiq_vw_ncfo_unit",          type: "VIEW",  columns: 7,  category: "View — NCFO" },
  { name: "finiq_vw_pl_brand_product",   type: "VIEW",  columns: 8,  category: "View — P&L by Brand/Product" },
  { name: "finiq_vw_pl_unit",           type: "VIEW",  columns: 7,  category: "View — P&L by Unit" },
];

// ---- Simulated column definitions -----------------------------------------

const SIMULATED_COLUMNS: Record<string, ColumnInfo[]> = {
  finiq_vw_pl_unit: [
    { name: "Date_ID",           dataType: "INT",            nullable: false, comment: "Fiscal period identifier" },
    { name: "Unit_Alias",        dataType: "STRING",         nullable: false, comment: "Unit short name" },
    { name: "RL_Alias",          dataType: "STRING",         nullable: false, comment: "Reporting line short name" },
    { name: "YTD_LY_Value",      dataType: "DECIMAL(18,4)",  nullable: true,  comment: "Year-to-date last year" },
    { name: "YTD_CY_Value",      dataType: "DECIMAL(18,4)",  nullable: true,  comment: "Year-to-date current year" },
    { name: "Periodic_LY_Value", dataType: "DECIMAL(18,4)",  nullable: true,  comment: "Periodic last year" },
    { name: "Periodic_CY_Value", dataType: "DECIMAL(18,4)",  nullable: true,  comment: "Periodic current year" },
  ],
  finiq_vw_pl_brand_product: [
    { name: "Date_ID",           dataType: "INT",            nullable: false, comment: "Fiscal period identifier" },
    { name: "Unit_Alias",        dataType: "STRING",         nullable: false, comment: "Unit short name" },
    { name: "RL_Alias",          dataType: "STRING",         nullable: false, comment: "Reporting line short name" },
    { name: "Item",              dataType: "STRING",          nullable: true,  comment: "Brand / product / consolidation" },
    { name: "YTD_LY_Value",      dataType: "DECIMAL(18,4)",  nullable: true,  comment: "Year-to-date last year" },
    { name: "YTD_CY_Value",      dataType: "DECIMAL(18,4)",  nullable: true,  comment: "Year-to-date current year" },
    { name: "Periodic_LY_Value", dataType: "DECIMAL(18,4)",  nullable: true,  comment: "Periodic last year" },
    { name: "Periodic_CY_Value", dataType: "DECIMAL(18,4)",  nullable: true,  comment: "Periodic current year" },
  ],
  finiq_vw_ncfo_unit: [
    { name: "Date_ID",           dataType: "INT",            nullable: false, comment: "Fiscal period identifier" },
    { name: "Unit_Alias",        dataType: "STRING",         nullable: false, comment: "Unit short name" },
    { name: "RL_Alias",          dataType: "STRING",         nullable: false, comment: "Reporting line short name" },
    { name: "YTD_LY_Value",      dataType: "DECIMAL(18,4)",  nullable: true,  comment: "Year-to-date last year" },
    { name: "YTD_CY_Value",      dataType: "DECIMAL(18,4)",  nullable: true,  comment: "Year-to-date current year" },
    { name: "Periodic_LY_Value", dataType: "DECIMAL(18,4)",  nullable: true,  comment: "Periodic last year" },
    { name: "Periodic_CY_Value", dataType: "DECIMAL(18,4)",  nullable: true,  comment: "Periodic current year" },
  ],
  finiq_dim_unit: [
    { name: "Unit_ID",      dataType: "INT",    nullable: false, comment: "Unique unit identifier" },
    { name: "Unit_Name",    dataType: "STRING", nullable: false, comment: "Full unit name" },
    { name: "Unit_Alias",   dataType: "STRING", nullable: false, comment: "Short alias" },
    { name: "Parent_ID",    dataType: "INT",    nullable: true,  comment: "Parent unit FK" },
    { name: "Unit_Level",   dataType: "STRING", nullable: false, comment: "Hierarchy level" },
  ],
  finiq_dim_rl: [
    { name: "RL_ID",          dataType: "INT",    nullable: false, comment: "Unique reporting line identifier" },
    { name: "RL_Code",        dataType: "STRING", nullable: false, comment: "Reporting line code (e.g., S900083)" },
    { name: "RL_Name",        dataType: "STRING", nullable: false, comment: "Full reporting line name" },
    { name: "RL_Alias",       dataType: "STRING", nullable: true,  comment: "Short alias" },
    { name: "RL_Type",        dataType: "STRING", nullable: false, comment: "Revenue / Expense / Cash Flow" },
    { name: "Display_Order",  dataType: "INT",    nullable: true,  comment: "Sort order for display" },
  ],
  finiq_date: [
    { name: "Date_ID",  dataType: "INT",    nullable: false, comment: "Period identifier (e.g., 62025 = P06 FY2025)" },
    { name: "Year",     dataType: "INT",    nullable: false, comment: "Fiscal year" },
    { name: "Period",   dataType: "INT",    nullable: false, comment: "Fiscal period (1-12)" },
    { name: "Quarter",  dataType: "INT",    nullable: false, comment: "Fiscal quarter (1-4)" },
  ],
  finiq_rl_formula: [
    { name: "RL_Code",       dataType: "STRING", nullable: false, comment: "Parent reporting line code" },
    { name: "Child_Code",    dataType: "STRING", nullable: false, comment: "Child reporting line code" },
    { name: "Formula_Type",  dataType: "STRING", nullable: false, comment: "Numerator / Denominator" },
    { name: "Sign",          dataType: "INT",    nullable: false, comment: "+1 or -1" },
  ],
  finiq_rl_input: [
    { name: "RL_Code",       dataType: "STRING", nullable: false, comment: "Reporting line code" },
    { name: "Input_Type",    dataType: "STRING", nullable: false, comment: "Manual / Calculated" },
    { name: "Is_Active",     dataType: "BOOLEAN", nullable: false, comment: "Active flag" },
  ],
  finiq_financial_cons: [
    { name: "Date_ID",        dataType: "INT",           nullable: false, comment: "Period identifier" },
    { name: "Unit_ID",        dataType: "INT",           nullable: false, comment: "Unit FK" },
    { name: "RL_Code",        dataType: "STRING",        nullable: false, comment: "Reporting line code" },
    { name: "Value",          dataType: "DECIMAL(18,4)", nullable: true,  comment: "Consolidated value (USD)" },
    { name: "Currency",       dataType: "STRING",        nullable: false, comment: "Currency code" },
    { name: "Date_Offset",    dataType: "INT",           nullable: false, comment: "0=CY, 100=LY" },
    { name: "View_ID",        dataType: "INT",           nullable: false, comment: "1=Periodic, 2=YTD" },
    { name: "Source_System",   dataType: "STRING",        nullable: true,  comment: "Data source" },
    { name: "Load_Timestamp",  dataType: "TIMESTAMP",     nullable: true,  comment: "ETL load time" },
  ],
  finiq_financial_base: [
    { name: "Date_ID",        dataType: "INT",           nullable: false, comment: "Period identifier" },
    { name: "Unit_ID",        dataType: "INT",           nullable: false, comment: "Unit FK" },
    { name: "RL_Code",        dataType: "STRING",        nullable: false, comment: "Reporting line code" },
    { name: "Value",          dataType: "DECIMAL(18,4)", nullable: true,  comment: "Base value" },
    { name: "Currency",       dataType: "STRING",        nullable: false, comment: "Local currency" },
    { name: "Date_Offset",    dataType: "INT",           nullable: false, comment: "0=CY, 100=LY" },
    { name: "View_ID",        dataType: "INT",           nullable: false, comment: "1=Periodic, 2=YTD" },
  ],
  finiq_financial_replan: [
    { name: "Date_ID",         dataType: "INT",           nullable: false, comment: "Period identifier" },
    { name: "Unit_ID",         dataType: "INT",           nullable: false, comment: "Unit FK" },
    { name: "Unit_Alias",      dataType: "STRING",        nullable: false, comment: "Unit short name" },
    { name: "RL_Code",         dataType: "STRING",        nullable: false, comment: "Reporting line code" },
    { name: "RL_Alias",        dataType: "STRING",        nullable: true,  comment: "Reporting line short name" },
    { name: "Actual_USD",      dataType: "DECIMAL(18,4)", nullable: true,  comment: "Actual value" },
    { name: "Replan_USD",      dataType: "DECIMAL(18,4)", nullable: true,  comment: "Replan/budget value" },
    { name: "Variance_USD",    dataType: "DECIMAL(18,4)", nullable: true,  comment: "Actual - Replan" },
    { name: "Variance_Pct",    dataType: "DECIMAL(8,4)",  nullable: true,  comment: "Variance %" },
    { name: "Prior_Year_USD",  dataType: "DECIMAL(18,4)", nullable: true,  comment: "Prior year value" },
    { name: "CY_YTD_USD",      dataType: "DECIMAL(18,4)", nullable: true,  comment: "CY year-to-date" },
    { name: "LY_YTD_USD",      dataType: "DECIMAL(18,4)", nullable: true,  comment: "LY year-to-date" },
    { name: "Replan_YTD_USD",  dataType: "DECIMAL(18,4)", nullable: true,  comment: "Replan year-to-date" },
    { name: "YTD_Var_USD",     dataType: "DECIMAL(18,4)", nullable: true,  comment: "YTD variance $" },
    { name: "YTD_Var_Pct",     dataType: "DECIMAL(8,4)",  nullable: true,  comment: "YTD variance %" },
    { name: "Currency",        dataType: "STRING",         nullable: false, comment: "Currency code" },
    { name: "View_ID",         dataType: "INT",            nullable: false, comment: "1=Periodic, 2=YTD" },
    { name: "Load_Timestamp",  dataType: "TIMESTAMP",      nullable: true,  comment: "ETL load time" },
  ],
  finiq_financial_replan_cons: [
    { name: "Date_ID",       dataType: "INT",           nullable: false, comment: "Period identifier" },
    { name: "Unit_ID",       dataType: "INT",           nullable: false, comment: "Unit FK" },
    { name: "RL_Code",       dataType: "STRING",        nullable: false, comment: "Reporting line code" },
    { name: "Actual_USD",    dataType: "DECIMAL(18,4)", nullable: true,  comment: "Actual consolidated" },
    { name: "Replan_USD",    dataType: "DECIMAL(18,4)", nullable: true,  comment: "Replan consolidated" },
    { name: "Variance_USD",  dataType: "DECIMAL(18,4)", nullable: true,  comment: "Variance consolidated" },
  ],
  finiq_composite_item: [
    { name: "Composite_Item_ID",  dataType: "INT",    nullable: false, comment: "Unique ID" },
    { name: "Item_Description",   dataType: "STRING", nullable: false, comment: "Item description" },
    { name: "Brand",              dataType: "STRING", nullable: true,  comment: "Brand name" },
    { name: "Segment",            dataType: "STRING", nullable: true,  comment: "Business segment" },
    { name: "Technology",         dataType: "STRING", nullable: true,  comment: "Product technology" },
    { name: "Category",           dataType: "STRING", nullable: true,  comment: "Product category" },
    { name: "Sub_Category",       dataType: "STRING", nullable: true,  comment: "Product sub-category" },
    { name: "Product_Line",       dataType: "STRING", nullable: true,  comment: "Product line" },
    { name: "GBU",                dataType: "STRING", nullable: true,  comment: "Global Business Unit" },
    { name: "Division",           dataType: "STRING", nullable: true,  comment: "Division" },
    { name: "Is_Active",          dataType: "BOOLEAN", nullable: false, comment: "Active flag" },
    { name: "Load_Timestamp",     dataType: "TIMESTAMP", nullable: true, comment: "ETL load time" },
  ],
  finiq_item: [
    { name: "Item_ID",            dataType: "INT",    nullable: false, comment: "Unique item ID" },
    { name: "Item_Code",          dataType: "STRING", nullable: false, comment: "Item code" },
    { name: "Item_Description",   dataType: "STRING", nullable: false, comment: "Description" },
    { name: "Brand",              dataType: "STRING", nullable: true,  comment: "Brand" },
    { name: "Segment",            dataType: "STRING", nullable: true,  comment: "Segment" },
    { name: "Technology",         dataType: "STRING", nullable: true,  comment: "Technology" },
    { name: "Category",           dataType: "STRING", nullable: true,  comment: "Category" },
    { name: "Sub_Category",       dataType: "STRING", nullable: true,  comment: "Sub-category" },
    { name: "Product_Line",       dataType: "STRING", nullable: true,  comment: "Product line" },
    { name: "Product_Type",       dataType: "STRING", nullable: true,  comment: "Product type" },
    { name: "Pack_Size",          dataType: "STRING", nullable: true,  comment: "Pack size" },
    { name: "UOM",                dataType: "STRING", nullable: true,  comment: "Unit of measure" },
    { name: "GBU",                dataType: "STRING", nullable: true,  comment: "Global Business Unit" },
    { name: "Is_Active",          dataType: "BOOLEAN", nullable: false, comment: "Active flag" },
    { name: "Load_Timestamp",     dataType: "TIMESTAMP", nullable: true, comment: "ETL load time" },
  ],
  finiq_item_composite_item: [
    { name: "Item_ID",            dataType: "INT", nullable: false, comment: "Item FK" },
    { name: "Composite_Item_ID",  dataType: "INT", nullable: false, comment: "Composite item FK" },
    { name: "Is_Primary",         dataType: "BOOLEAN", nullable: false, comment: "Primary mapping flag" },
  ],
  finiq_customer: [
    { name: "Customer_ID",      dataType: "INT",    nullable: false, comment: "Unique customer ID" },
    { name: "Customer_Code",    dataType: "STRING", nullable: false, comment: "Customer code" },
    { name: "Customer_Name",    dataType: "STRING", nullable: false, comment: "Customer name" },
    { name: "Channel",          dataType: "STRING", nullable: true,  comment: "Sales channel" },
    { name: "Format",           dataType: "STRING", nullable: true,  comment: "Customer format" },
    { name: "Region",           dataType: "STRING", nullable: true,  comment: "Geographic region" },
    { name: "Country",          dataType: "STRING", nullable: true,  comment: "Country" },
    { name: "Segment",          dataType: "STRING", nullable: true,  comment: "Customer segment" },
    { name: "Tier",             dataType: "STRING", nullable: true,  comment: "Customer tier" },
    { name: "Is_Active",        dataType: "BOOLEAN", nullable: false, comment: "Active flag" },
    { name: "Load_Timestamp",   dataType: "TIMESTAMP", nullable: true, comment: "ETL load time" },
  ],
  finiq_customer_map: [
    { name: "Customer_ID",      dataType: "INT",    nullable: false, comment: "Customer FK" },
    { name: "Parent_ID",        dataType: "INT",    nullable: true,  comment: "Parent customer FK" },
    { name: "Level",            dataType: "INT",    nullable: false, comment: "Hierarchy level (1-3)" },
    { name: "Path",             dataType: "STRING", nullable: true,  comment: "Hierarchy path" },
    { name: "Is_Leaf",          dataType: "BOOLEAN", nullable: false, comment: "Leaf node flag" },
  ],
  finiq_economic_cell: [
    { name: "Economic_Cell_ID",   dataType: "INT",    nullable: false, comment: "Unique ID" },
    { name: "Economic_Cell_Name", dataType: "STRING", nullable: false, comment: "Cell name" },
    { name: "Unit_ID",            dataType: "INT",    nullable: false, comment: "Unit FK" },
  ],
  finiq_financial: [
    { name: "Date_ID",       dataType: "INT",           nullable: false, comment: "Period identifier" },
    { name: "Unit_ID",       dataType: "INT",           nullable: false, comment: "Unit FK" },
    { name: "RL_Code",       dataType: "STRING",        nullable: false, comment: "Reporting line code" },
    ...[...Array(36)].map((_, i) => ({
      name: `Value_${String(i + 1).padStart(2, "0")}`,
      dataType: "DECIMAL(18,4)" as const,
      nullable: true,
      comment: `Denormalized value column ${i + 1}`,
    })),
  ],
  finiq_rls_last_change: [
    { name: "Unit_ID",         dataType: "INT",       nullable: false, comment: "Unit FK" },
    { name: "Last_Change",     dataType: "TIMESTAMP",  nullable: false, comment: "Last RLS update timestamp" },
  ],
};

// ---- Simulated preview data -----------------------------------------------

function getSimulatedPreview(
  tableName: string,
  limit: number,
): Record<string, unknown>[] {
  const entities = generateEntities();
  const financials = generateFinancialData();
  const replans = generateReplanData();

  switch (tableName) {
    case "finiq_dim_unit":
      return entities.slice(0, limit).map((e) => ({
        Unit_ID: parseInt(e.id.replace("ent_", ""), 10) || 1,
        Unit_Name: e.name,
        Unit_Alias: e.alias,
        Parent_ID: e.parent_id ? parseInt(e.parent_id.replace("ent_", ""), 10) : null,
        Unit_Level: e.level,
      }));

    case "finiq_vw_pl_unit":
    case "finiq_vw_ncfo_unit": {
      const entityMap = new Map(entities.map((e) => [e.id, e]));
      return financials.slice(0, limit).map((r) => {
        const ent = entityMap.get(r.entity_id);
        return {
          Date_ID: parseInt(r.date_id.replace("P", "").replace("_", ""), 10),
          Unit_Alias: ent?.alias ?? r.entity_id,
          RL_Alias: r.account_code,
          YTD_LY_Value: r.ytd_ly_value,
          YTD_CY_Value: r.ytd_cy_value,
          Periodic_LY_Value: r.periodic_ly_value,
          Periodic_CY_Value: r.periodic_cy_value,
        };
      });
    }

    case "finiq_vw_pl_brand_product": {
      const entityMap = new Map(entities.map((e) => [e.id, e]));
      const brands = ["Pedigree", "Whiskas", "Royal Canin", "M&Ms", "Snickers", "Twix", "Dove", "Uncle Bens", "Orbit", "Skittles"];
      return financials.slice(0, limit).map((r, i) => {
        const ent = entityMap.get(r.entity_id);
        return {
          Date_ID: parseInt(r.date_id.replace("P", "").replace("_", ""), 10),
          Unit_Alias: ent?.alias ?? r.entity_id,
          RL_Alias: r.account_code,
          Item: brands[i % brands.length],
          YTD_LY_Value: r.ytd_ly_value,
          YTD_CY_Value: r.ytd_cy_value,
          Periodic_LY_Value: r.periodic_ly_value,
          Periodic_CY_Value: r.periodic_cy_value,
        };
      });
    }

    case "finiq_date": {
      const rows: Record<string, unknown>[] = [];
      for (const yr of [2024, 2025]) {
        for (let p = 1; p <= 12; p++) {
          rows.push({ Date_ID: p * 10000 + yr, Year: yr, Period: p, Quarter: Math.ceil(p / 3) });
        }
      }
      return rows.slice(0, limit);
    }

    case "finiq_dim_rl": {
      const accts = [
        { id: 1, code: "S900083", name: "Organic Growth", alias: "OG", type: "Revenue", order: 1 },
        { id: 2, code: "S900227", name: "Net Revenue", alias: "NR", type: "Revenue", order: 2 },
        { id: 3, code: "FR4100",  name: "Gross Profit", alias: "GP", type: "Revenue", order: 3 },
        { id: 4, code: "FR4000",  name: "MAC", alias: "MAC", type: "Revenue", order: 4 },
        { id: 5, code: "SR5101",  name: "A&CP", alias: "ACP", type: "Expense", order: 5 },
        { id: 6, code: "SR6102",  name: "Controllable Earnings", alias: "CE", type: "Expense", order: 6 },
        { id: 7, code: "MR6300",  name: "Controllable Overhead", alias: "OH", type: "Expense", order: 7 },
        { id: 8, code: "CF8129",  name: "NCFO", alias: "NCFO", type: "Cash Flow", order: 8 },
        { id: 9, code: "S900067", name: "Price Impact", alias: "PI", type: "Revenue", order: 9 },
        { id: 10, code: "S900070", name: "Volume Impact", alias: "VOL", type: "Revenue", order: 10 },
      ];
      return accts.slice(0, limit).map((a) => ({
        RL_ID: a.id, RL_Code: a.code, RL_Name: a.name,
        RL_Alias: a.alias, RL_Type: a.type, Display_Order: a.order,
      }));
    }

    case "finiq_financial_replan": {
      const entityMap = new Map(entities.map((e) => [e.id, e]));
      return replans.slice(0, limit).map((r) => {
        const ent = entityMap.get(r.entity_id);
        return {
          Date_ID: parseInt(r.date_id.replace("P", "").replace("_", ""), 10),
          Unit_ID: parseInt(r.entity_id.replace("ent_", ""), 10) || 1,
          Unit_Alias: ent?.alias ?? r.entity_id,
          RL_Code: r.account_code,
          RL_Alias: r.account_code,
          Actual_USD: r.actual_usd,
          Replan_USD: r.replan_usd,
          Variance_USD: r.variance,
          Variance_Pct: r.variance_pct,
          Prior_Year_USD: r.actual_usd * 0.95,
          CY_YTD_USD: r.actual_usd * 6,
          LY_YTD_USD: r.actual_usd * 5.7,
          Replan_YTD_USD: r.replan_usd * 6,
          YTD_Var_USD: (r.actual_usd - r.replan_usd) * 6,
          YTD_Var_Pct: r.variance_pct,
          Currency: "USD",
          View_ID: 1,
          Load_Timestamp: "2025-06-15T08:30:00Z",
        };
      });
    }

    default:
      return [];
  }
}
