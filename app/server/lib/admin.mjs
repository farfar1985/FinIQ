/**
 * FinIQ Admin Panel Module
 * FR7: Admin configuration and management
 *
 * MVP Implementation:
 * - Data mode configuration (simulated vs real)
 * - Connection status monitoring
 * - Org hierarchy viewer
 * - Account list management
 *
 * Future Phase 2 (not in MVP):
 * - FR7.1: Template management
 * - FR7.3: Peer group configuration
 * - FR7.4: Prompt registry management
 * - FR7.5: RBAC configuration
 */

import * as db from './databricks.mjs';
import * as config from './config.mjs';

/**
 * FR7.6: Get current system configuration
 *
 * @returns {Object} - Configuration data
 */
export function getConfig() {
  return {
    success: true,
    config: {
      dataMode: config.DATA_MODE,
      anthropicApiKey: config.ANTHROPIC_API_KEY ? '***' + config.ANTHROPIC_API_KEY.slice(-4) : null,
      databricks: {
        host: config.DATABRICKS_HOST,
        warehouse: config.DATABRICKS_WAREHOUSE_ID,
        catalog: config.DATABRICKS_CATALOG,
        schema: config.DATABRICKS_SCHEMA,
      },
      sqlite: {
        path: config.SQLITE_PATH,
      },
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * FR7.6: Update data mode configuration
 *
 * @param {string} mode - Data mode ('simulated' or 'databricks')
 * @returns {Object} - Update result
 */
export function updateDataMode(mode) {
  if (mode !== 'simulated' && mode !== 'databricks') {
    return {
      success: false,
      error: 'Invalid data mode. Must be "simulated" or "databricks"',
    };
  }

  // In MVP, we can't actually update the environment variable
  // This would require server restart or dynamic config management
  // For now, just return what it would be

  return {
    success: true,
    message: `Data mode would be set to: ${mode}`,
    note: 'MVP: Changing data mode requires server restart with updated .env',
    currentMode: config.DATA_MODE,
    requestedMode: mode,
    timestamp: new Date().toISOString(),
  };
}

/**
 * FR7.6: Get connection status
 *
 * @returns {Object} - Connection status
 */
export async function getConnectionStatus() {
  const status = {
    dataMode: config.DATA_MODE,
    connections: {},
  };

  // Test database connection
  try {
    const orgUnits = await db.getOrgUnits();
    status.connections.database = {
      status: 'connected',
      type: config.DATA_MODE,
      recordCount: orgUnits.length,
      message: `Connected to ${config.DATA_MODE} database`,
    };
  } catch (error) {
    status.connections.database = {
      status: 'error',
      type: config.DATA_MODE,
      error: error.message,
    };
  }

  // Check Anthropic API key
  status.connections.anthropic = {
    status: config.ANTHROPIC_API_KEY ? 'configured' : 'not_configured',
    message: config.ANTHROPIC_API_KEY
      ? 'API key configured (LLM features enabled)'
      : 'No API key (using fallback mode)',
  };

  return {
    success: true,
    ...status,
    timestamp: new Date().toISOString(),
  };
}

/**
 * FR7.2: Get organizational hierarchy
 *
 * @returns {Object} - Org hierarchy tree
 */
export async function getOrgHierarchy() {
  try {
    const orgUnits = await db.getOrgUnits();

    // Build hierarchy tree
    // MVP: Simple list grouped by common prefixes
    // Phase 2: Full hierarchical tree structure

    const hierarchy = {
      total: orgUnits.length,
      units: orgUnits.map(unit => ({
        entity: unit.Entity,
        entityDesc: unit.Entity_Desc || unit.Entity,
      })),
    };

    return {
      success: true,
      hierarchy,
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Error fetching org hierarchy:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get account list
 *
 * @returns {Object} - Account list
 */
export async function getAccounts() {
  try {
    const accounts = await db.getAccounts();

    return {
      success: true,
      accounts: accounts.map(acc => ({
        account: acc.Account,
        accountDesc: acc.Account_Desc || acc.Account,
        accountType: acc.Account_Type,
      })),
      count: accounts.length,
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Error fetching accounts:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get system stats (dashboard metrics)
 *
 * @returns {Object} - System stats
 */
export async function getSystemStats() {
  try {
    const [orgUnits, accounts] = await Promise.all([
      db.getOrgUnits(),
      db.getAccounts(),
    ]);

    return {
      success: true,
      stats: {
        dataMode: config.DATA_MODE,
        orgUnits: orgUnits.length,
        accounts: accounts.length,
        llmEnabled: !!config.ANTHROPIC_API_KEY,
        uptime: process.uptime(),
        nodeVersion: process.version,
        platform: process.platform,
      },
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    console.error('Error fetching system stats:', error);
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Test database connection
 *
 * @returns {Object} - Test result
 */
export async function testDatabaseConnection() {
  const startTime = Date.now();

  try {
    // Try a simple query
    const orgUnits = await db.getOrgUnits();
    const elapsed = Date.now() - startTime;

    return {
      success: true,
      message: 'Database connection successful',
      dataMode: config.DATA_MODE,
      recordCount: orgUnits.length,
      responseTime: `${elapsed}ms`,
      timestamp: new Date().toISOString(),
    };

  } catch (error) {
    const elapsed = Date.now() - startTime;

    return {
      success: false,
      error: error.message,
      dataMode: config.DATA_MODE,
      responseTime: `${elapsed}ms`,
      timestamp: new Date().toISOString(),
    };
  }
}

export default {
  getConfig,
  updateDataMode,
  getConnectionStatus,
  getOrgHierarchy,
  getAccounts,
  getSystemStats,
  testDatabaseConnection,
};
