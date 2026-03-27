/**
 * FinIQ Configuration — SINGLE SOURCE OF TRUTH
 * All config keys are defined here. Reference this module everywhere.
 */

import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";

// Load .env from app root (try both possible locations)
import { existsSync } from "fs";
const envPaths = [
  resolve(import.meta.dirname, "../.env"),    // app/.env (when run from server/)
  resolve(import.meta.dirname, "../../.env"),  // project root .env
];
const envPath = envPaths.find(p => existsSync(p));
if (envPath) dotenvConfig({ path: envPath, override: true });

const config = {
  // Server
  port: parseInt(process.env.PORT || "3001", 10),
  nodeEnv: process.env.NODE_ENV || "development",

  // Data mode: "simulated" (SQLite) or "databricks"
  dataMode: process.env.DATA_MODE || "simulated",

  // SQLite fallback
  sqlitePath: resolve(
    import.meta.dirname,
    process.env.SQLITE_PATH || "../../../finiq_synthetic.db"
  ),

  // Databricks connection
  databricks: {
    serverHostname: process.env.DATABRICKS_SERVER_HOSTNAME || "",
    httpPath: process.env.DATABRICKS_HTTP_PATH || "",
    token: process.env.DATABRICKS_TOKEN || "",
    catalog: process.env.DATABRICKS_CATALOG || "workspace",
    schema: process.env.DATABRICKS_SCHEMA || "default",
  },

  // Anthropic
  anthropicApiKey: process.env.ANTHROPIC_API_KEY || "",

  // FMP (Competitive Intelligence)
  fmpApiKey: process.env.FMP_API_KEY || "",
};

export default config;
