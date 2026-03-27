/**
 * FinIQ Configuration Module
 * Loads environment variables and provides typed config object
 * Adapted from Amira Meet Desktop architecture
 */

import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file
dotenv.config({ path: path.join(__dirname, '../../.env') });

export const config = {
  // Server
  PORT: parseInt(process.env.PORT) || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  
  // Data Mode
  DATA_MODE: process.env.DATA_MODE || 'simulated', // 'simulated' | 'databricks'
  
  // SQLite (Simulated Mode)
  SQLITE_DB_PATH: process.env.SQLITE_DB_PATH || path.join(__dirname, '../../../finiq_synthetic.db'),
  
  // Databricks (Real Mode)
  DATABRICKS_SERVER_HOSTNAME: process.env.DATABRICKS_SERVER_HOSTNAME || 'dbc-af05a0e0-4ebe.cloud.databricks.com',
  DATABRICKS_HTTP_PATH: process.env.DATABRICKS_HTTP_PATH || '/sql/1.0/warehouses/your-warehouse-id',
  DATABRICKS_ACCESS_TOKEN: process.env.DATABRICKS_ACCESS_TOKEN || '',
  DATABRICKS_CATALOG: process.env.DATABRICKS_CATALOG || 'workspace',
  DATABRICKS_SCHEMA: process.env.DATABRICKS_SCHEMA || 'default',
  DATABRICKS_CATALOG_PROD: process.env.DATABRICKS_CATALOG_PROD || 'corporate_finance_analytics_dev',
  DATABRICKS_SCHEMA_PROD: process.env.DATABRICKS_SCHEMA_PROD || 'finsight_core_model_mvp3',
  
  // Anthropic Claude API
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',

  // Azure OpenAI (alternative)
  AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY || '',
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT || '',
  AZURE_OPENAI_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4',
  AZURE_OPENAI_API_VERSION: process.env.AZURE_OPENAI_API_VERSION || '2024-02-15-preview',
  
  // Authentication
  AUTH_ENABLED: process.env.AUTH_ENABLED === 'true',
  AUTH_TOKEN: process.env.AUTH_TOKEN || 'dev-secret-token',
  
  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL || 'info',
};

// Validation
if (config.DATA_MODE === 'databricks' && !config.DATABRICKS_ACCESS_TOKEN) {
  console.warn('⚠️  Databricks mode requires DATABRICKS_ACCESS_TOKEN');
}

if (!config.ANTHROPIC_API_KEY && !config.AZURE_OPENAI_API_KEY) {
  console.warn('⚠️  No LLM API key set — LLM features will not work');
}

console.log(`✅ Config loaded: DATA_MODE=${config.DATA_MODE}, PORT=${config.PORT}`);

export default config;
