/**
 * FinIQ Databricks / SQLite Connector
 * Dual-mode: SQLite fallback (simulated) or Databricks SQL (real)
 * Connects to finiq_synthetic.db or Databricks workspace
 */

import Database from 'better-sqlite3';
import { DBSQLClient } from '@databricks/sql';
import { config } from './config.mjs';
import fs from 'fs';

let db = null;
let connectionMode = null;
let databricksSession = null;

/**
 * Initialize database connection based on DATA_MODE
 */
export function initDB() {
  if (config.DATA_MODE === 'simulated') {
    return initSQLite();
  } else {
    return initDatabricks();
  }
}

/**
 * Initialize SQLite connection (simulated mode)
 */
function initSQLite() {
  try {
    if (!fs.existsSync(config.SQLITE_DB_PATH)) {
      throw new Error(`SQLite database not found at: ${config.SQLITE_DB_PATH}`);
    }
    
    db = new Database(config.SQLITE_DB_PATH, { readonly: true });
    connectionMode = 'sqlite';
    
    // Test connection
    const result = db.prepare('SELECT COUNT(*) as count FROM finiq_dim_entity').get();
    console.log(`✅ SQLite connected: ${result.count} org units found`);
    
    return { success: true, mode: 'sqlite', orgUnits: result.count };
  } catch (error) {
    console.error('❌ SQLite connection failed:', error.message);
    throw error;
  }
}

/**
 * Initialize Databricks connection (real mode)
 */
async function initDatabricks() {
  try {
    console.log('🔌 Connecting to Databricks...');

    const client = new DBSQLClient();
    const connection = await client.connect({
      host: config.DATABRICKS_SERVER_HOSTNAME,
      path: config.DATABRICKS_HTTP_PATH,
      token: config.DATABRICKS_ACCESS_TOKEN,
    });

    databricksSession = await connection.openSession();
    connectionMode = 'databricks';

    // Test connection - count org units
    const testQuery = await databricksSession.executeStatement(
      `SELECT COUNT(*) as count FROM ${config.DATABRICKS_CATALOG}.${config.DATABRICKS_SCHEMA}.finiq_dim_entity`
    );
    const result = await testQuery.fetchAll();
    await testQuery.close();

    const orgUnitsCount = result[0]?.count || 0;
    console.log(`✅ Databricks connected: ${orgUnitsCount} org units found`);
    console.log(`   Catalog: ${config.DATABRICKS_CATALOG}`);
    console.log(`   Schema: ${config.DATABRICKS_SCHEMA}`);

    return { success: true, mode: 'databricks', orgUnits: orgUnitsCount };
  } catch (error) {
    console.error('❌ Databricks connection failed:', error.message);
    console.warn('⚠️  Falling back to SQLite');
    return initSQLite();
  }
}

/**
 * Execute a query and return results
 * @param {string} sql - SQL query to execute
 * @param {Array} params - Query parameters (optional)
 * @returns {Array} - Query results
 */
export async function query(sql, params = []) {
  if (!db && !databricksSession) {
    throw new Error('Database not initialized. Call initDB() first.');
  }

  try {
    if (connectionMode === 'sqlite') {
      const stmt = db.prepare(sql);
      const results = stmt.all(...params);
      return results;
    } else if (connectionMode === 'databricks') {
      // Add catalog.schema prefix to table names
      const qualifiedSQL = sql.replace(
        /FROM\s+finiq_/gi,
        `FROM ${config.DATABRICKS_CATALOG}.${config.DATABRICKS_SCHEMA}.finiq_`
      );

      const queryOperation = await databricksSession.executeStatement(qualifiedSQL);
      const results = await queryOperation.fetchAll();
      await queryOperation.close();
      return results;
    } else {
      throw new Error('Unknown connection mode');
    }
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    throw error;
  }
}

/**
 * Execute a query and return a single row
 * @param {string} sql - SQL query to execute
 * @param {Array} params - Query parameters (optional)
 * @returns {Object|null} - Single row or null
 */
export async function queryOne(sql, params = []) {
  if (!db && !databricksSession) {
    throw new Error('Database not initialized. Call initDB() first.');
  }

  try {
    if (connectionMode === 'sqlite') {
      const stmt = db.prepare(sql);
      const result = stmt.get(...params);
      return result || null;
    } else if (connectionMode === 'databricks') {
      const results = await query(sql + ' LIMIT 1', params);
      return results.length > 0 ? results[0] : null;
    } else {
      throw new Error('Unknown connection mode');
    }
  } catch (error) {
    console.error('❌ Query failed:', error.message);
    throw error;
  }
}

/**
 * Get all org units from finiq_dim_entity
 * @returns {Array} - List of entities
 */
export function getOrgUnits() {
  const sql = `
    SELECT DISTINCT 
      Child_Entity_ID as entity_id,
      Child_Entity as entity_name,
      Entity_Level as level
    FROM finiq_dim_entity
    ORDER BY Entity_Level, Child_Entity
  `;
  return query(sql);
}

/**
 * Get P&L data for a specific entity and period
 * @param {string} entityName - Entity name (e.g., 'Mars Inc')
 * @param {string} period - Period (e.g., 'P06' for Period 6) - optional
 * @returns {Array} - P&L data rows
 */
export function getPLData(entityName, period = null) {
  let sql = `
    SELECT
      Entity,
      Account_KPI,
      Period,
      YTD_LY,
      YTD_CY,
      Periodic_LY,
      Periodic_CY
    FROM finiq_vw_pl_entity
    WHERE Entity = ?
  `;

  const params = [entityName];

  if (period) {
    sql += ` AND Period = ?`;
    params.push(period);
  }

  sql += ` ORDER BY Period DESC LIMIT 50`;

  return query(sql, params);
}

/**
 * Get NCFO data for a specific entity
 * @param {string} entityName - Entity name
 * @param {string} period - Period (optional)
 * @returns {Array} - NCFO data rows
 */
export function getNCFOData(entityName, period = null) {
  let sql = `
    SELECT
      Entity,
      Account_KPI,
      Period,
      YTD_LY,
      YTD_CY,
      Periodic_LY,
      Periodic_CY
    FROM finiq_vw_ncfo_entity
    WHERE Entity = ?
  `;

  const params = [entityName];

  if (period) {
    sql += ` AND Period = ?`;
    params.push(period);
  }

  sql += ` ORDER BY Period DESC LIMIT 50`;

  return query(sql, params);
}

/**
 * Get budget variance data (actual vs replan)
 * @param {string} entityName - Entity name
 * @param {string} period - Period (e.g., 'P06') - optional
 * @returns {Array} - Variance data rows with computed Period column
 */
export function getBudgetVariance(entityName, period = null) {
  let sql = `
    SELECT
      Date_ID,
      'P' || substr('0' || (Date_ID % 100), -2) as Period,
      Year,
      Quarter,
      Entity,
      Account_KPI,
      Actual_USD_Value,
      Replan_USD_Value,
      (Actual_USD_Value - Replan_USD_Value) as Variance_Abs,
      CASE
        WHEN Replan_USD_Value != 0
        THEN ((Actual_USD_Value - Replan_USD_Value) / ABS(Replan_USD_Value)) * 100
        ELSE 0
      END as Variance_Pct
    FROM finiq_financial_replan
    WHERE Entity = ?
  `;

  const params = [entityName];

  if (period) {
    // Convert period (e.g., 'P06') to period number (6)
    const periodNum = parseInt(period.substring(1));
    sql += ` AND (Date_ID % 100) = ?`;
    params.push(periodNum);
  }

  sql += ` ORDER BY Date_ID DESC LIMIT 50`;

  return query(sql, params);
}

/**
 * Close database connection
 */
export async function closeDB() {
  if (db) {
    if (connectionMode === 'sqlite') {
      db.close();
    } else if (connectionMode === 'databricks' && databricksSession) {
      await databricksSession.close();
      databricksSession = null;
    }
    db = null;
    connectionMode = null;
    console.log('✅ Database connection closed');
  }
}

/**
 * Get current connection mode
 * @returns {string|null} - 'sqlite', 'databricks', or null
 */
export function getConnectionMode() {
  return connectionMode;
}

export default {
  initDB,
  query,
  queryOne,
  getOrgUnits,
  getPLData,
  getNCFOData,
  getBudgetVariance,
  closeDB,
};
