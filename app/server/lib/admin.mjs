/**
 * FinIQ Admin Module — FR7.1-7.6
 * Template management, RBAC, org hierarchy, Databricks connection admin,
 * prompt management, peer group configuration, ingestion status.
 */

import crypto from "crypto";
import config from "./config.mjs";
import dataLayer from "./databricks.mjs";
import { SUGGESTED_PROMPTS } from "../agents/finiq-agent.mjs";

// ============================================================
// FR7.6 — Databricks connection admin
// ============================================================

/**
 * Test the current Databricks connection (or a proposed one).
 * Returns latency, status, and entity count.
 */
async function testDatabricksConnection(overrideConfig = null) {
  const start = Date.now();
  try {
    if (overrideConfig) {
      // Test with a temporary connection
      const { DBSQLClient } = await import("@databricks/sql");
      const client = new DBSQLClient();
      await client.connect({
        host: overrideConfig.serverHostname,
        path: overrideConfig.httpPath,
        token: overrideConfig.token,
      });
      const session = await client.openSession({
        initialCatalog: overrideConfig.catalog || "workspace",
        initialSchema: overrideConfig.schema || "default",
      });
      const op = await session.executeStatement("SELECT 1 as ok", { runAsync: true });
      const rows = await op.fetchAll();
      await op.close();
      await session.close();
      await client.close();
      const latency = Date.now() - start;
      return {
        connected: true,
        latency,
        mode: "databricks",
        message: `Connected successfully in ${latency}ms`,
      };
    }

    // Test current connection via the data layer
    const health = await dataLayer.healthCheck();
    const latency = Date.now() - start;
    return {
      connected: health.connected,
      latency,
      mode: health.mode,
      entityCount: health.entityCount,
      message: health.connected
        ? `Connected (${health.mode}) in ${latency}ms`
        : `Connection failed: ${health.error}`,
    };
  } catch (err) {
    const latency = Date.now() - start;
    return {
      connected: false,
      latency,
      mode: "none",
      message: `Connection failed: ${err.message}`,
    };
  }
}

/**
 * Get the current data connection configuration (token masked).
 */
function getConnectionConfig() {
  const token = config.databricks.token;
  const maskedToken = token
    ? token.substring(0, 6) + "..." + token.substring(token.length - 4)
    : "not set";

  return {
    dataMode: config.dataMode,
    activeMode: dataLayer.getMode(),
    sqlitePath: config.sqlitePath,
    databricks: {
      serverHostname: config.databricks.serverHostname || "not configured",
      httpPath: config.databricks.httpPath || "not configured",
      token: maskedToken,
      catalog: config.databricks.catalog,
      schema: config.databricks.schema,
    },
    anthropicConfigured: !!config.anthropicApiKey,
    fmpConfigured: !!config.fmpApiKey,
  };
}

/**
 * Update connection configuration at runtime.
 * Note: This modifies the in-memory config only. Persisting to .env requires
 * a file write which is out of scope for the in-memory admin layer.
 */
function updateConnectionConfig(updates) {
  if (updates.dataMode) config.dataMode = updates.dataMode;
  if (updates.serverHostname) config.databricks.serverHostname = updates.serverHostname;
  if (updates.httpPath) config.databricks.httpPath = updates.httpPath;
  if (updates.token) config.databricks.token = updates.token;
  if (updates.catalog) config.databricks.catalog = updates.catalog;
  if (updates.schema) config.databricks.schema = updates.schema;

  return getConnectionConfig();
}

// ============================================================
// FR7.2 — Org hierarchy management
// ============================================================

/**
 * Build the org entity tree from the flat entity list.
 * Returns a nested tree structure: { id, name, level, children: [...] }
 */
async function getOrgTree() {
  const rows = await dataLayer.getEntityHierarchy();

  // Build lookup: Entity_ID -> node
  const nodeMap = new Map();
  for (const row of rows) {
    nodeMap.set(row.Entity_ID, {
      id: row.Entity_ID,
      name: row.Entity_Alias,
      parentId: row.Parent_Entity_ID,
      parentName: row.Parent_Alias || null,
      level: row.Entity_Level ?? 0,
      children: [],
    });
  }

  // Build tree
  const roots = [];
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId).children.push(node);
    } else {
      roots.push(node);
    }
  }

  // Sort children alphabetically at each level
  function sortChildren(node) {
    node.children.sort((a, b) => a.name.localeCompare(b.name));
    node.children.forEach(sortChildren);
  }
  roots.sort((a, b) => a.name.localeCompare(b.name));
  roots.forEach(sortChildren);

  return {
    totalEntities: rows.length,
    rootCount: roots.length,
    tree: roots,
  };
}

// ============================================================
// FR7.5 — RBAC (in-memory)
// ============================================================

const ROLES = {
  admin: {
    id: "admin",
    name: "Admin",
    description: "Full platform access, configuration, and user management",
    permissions: [
      "read:all", "write:all",
      "admin:config", "admin:users", "admin:templates", "admin:prompts",
      "admin:peer-groups", "admin:rbac",
      "query:execute", "query:adhoc",
      "jobs:submit", "jobs:manage", "jobs:review",
      "reports:create", "reports:export",
      "ci:read", "ci:configure",
    ],
  },
  analyst: {
    id: "analyst",
    name: "Analyst",
    description: "Run queries, create reports, submit jobs, view CI data",
    permissions: [
      "read:all",
      "query:execute", "query:adhoc",
      "jobs:submit",
      "reports:create", "reports:export",
      "ci:read",
    ],
  },
  viewer: {
    id: "viewer",
    name: "Viewer",
    description: "Read-only access to reports and dashboards",
    permissions: [
      "read:all",
      "reports:export",
      "ci:read",
    ],
  },
  api_consumer: {
    id: "api_consumer",
    name: "API Consumer",
    description: "Programmatic access to data and query endpoints",
    permissions: [
      "read:all",
      "query:execute",
      "jobs:submit",
    ],
  },
};

// In-memory user store (seeded with demo users)
const users = new Map([
  ["u1", { id: "u1", name: "Farzaneh", email: "farzaneh@qdt.ai", role: "admin", created_at: "2026-03-27T00:00:00Z" }],
  ["u2", { id: "u2", name: "Alessandro", email: "alessandro@qdt.ai", role: "admin", created_at: "2026-03-27T00:00:00Z" }],
  ["u3", { id: "u3", name: "Rajiv", email: "rajiv@qdt.ai", role: "admin", created_at: "2026-03-27T00:00:00Z" }],
  ["u4", { id: "u4", name: "Bill", email: "bill@qdt.ai", role: "analyst", created_at: "2026-03-27T00:00:00Z" }],
  ["u5", { id: "u5", name: "Cesar", email: "cesar@qdt.ai", role: "admin", created_at: "2026-03-27T00:00:00Z" }],
  ["u6", { id: "u6", name: "Mars Analyst", email: "analyst@effem.com", role: "analyst", created_at: "2026-03-27T00:00:00Z" }],
  ["u7", { id: "u7", name: "Mars Viewer", email: "viewer@effem.com", role: "viewer", created_at: "2026-03-27T00:00:00Z" }],
  ["u8", { id: "u8", name: "API Service", email: "api@effem.com", role: "api_consumer", created_at: "2026-03-27T00:00:00Z" }],
]);

function getUsers() {
  return Array.from(users.values());
}

function getRoles() {
  return Object.values(ROLES);
}

function assignRole(userId, role) {
  if (!ROLES[role]) {
    throw new Error(`Invalid role: "${role}". Valid roles: ${Object.keys(ROLES).join(", ")}`);
  }
  const user = users.get(userId);
  if (!user) {
    throw new Error(`User not found: ${userId}`);
  }
  user.role = role;
  return user;
}

// ============================================================
// FR7.4 — Prompt management
// ============================================================

// Deep-clone the prompts from finiq-agent so we can mutate at runtime
const promptStore = new Map(SUGGESTED_PROMPTS.map((p) => [p.id, { ...p }]));

function getPrompts(category = null) {
  let prompts = Array.from(promptStore.values());
  if (category) {
    prompts = prompts.filter((p) => p.category === category);
  }
  return prompts;
}

function updatePrompt(id, updates) {
  const prompt = promptStore.get(id);
  if (!prompt) {
    throw new Error(`Prompt not found: ${id}`);
  }

  if (updates.suggested_prompt !== undefined) prompt.suggested_prompt = updates.suggested_prompt;
  if (updates.description !== undefined) prompt.description = updates.description;
  if (updates.category !== undefined) prompt.category = updates.category;
  if (updates.tag !== undefined) prompt.tag = updates.tag;
  if (updates.is_active !== undefined) prompt.is_active = updates.is_active;
  if (updates.kpi !== undefined) prompt.kpi = updates.kpi;

  promptStore.set(id, prompt);
  return prompt;
}

function togglePrompt(id) {
  const prompt = promptStore.get(id);
  if (!prompt) {
    throw new Error(`Prompt not found: ${id}`);
  }
  prompt.is_active = !prompt.is_active;
  promptStore.set(id, prompt);
  return prompt;
}

// ============================================================
// FR7.1 — Template management
// ============================================================

const templateStore = new Map([
  [
    "t1",
    {
      id: "t1",
      name: "Standard PES Report",
      description: "Default Period End Summary with all 6 KPIs",
      type: "pes",
      config: {
        kpis: ["Organic Growth", "MAC Shape %", "A&CP Shape %", "CE Shape %", "Controllable Overhead Shape %", "NCFO"],
        formats: ["Summary", "What's Working Well", "What's Not Working Well"],
        columns: ["YTD_CY", "YTD_LY", "YTD Growth %", "Periodic_CY", "Periodic_LY", "Periodic Growth %"],
        includeRankings: true,
        includeTrendTaglines: true,
      },
      version: 1,
      is_active: true,
      created_at: "2026-03-27T00:00:00Z",
      updated_at: "2026-03-27T00:00:00Z",
    },
  ],
  [
    "t2",
    {
      id: "t2",
      name: "Executive Summary",
      description: "Top-line KPIs only for executive review",
      type: "pes",
      config: {
        kpis: ["Organic Growth", "CE Shape %", "NCFO"],
        formats: ["Summary"],
        columns: ["YTD_CY", "YTD_LY", "YTD Growth %"],
        includeRankings: false,
        includeTrendTaglines: true,
      },
      version: 1,
      is_active: true,
      created_at: "2026-03-27T00:00:00Z",
      updated_at: "2026-03-27T00:00:00Z",
    },
  ],
  [
    "t3",
    {
      id: "t3",
      name: "Budget Variance Report",
      description: "Actual vs Replan with variance analysis",
      type: "variance",
      config: {
        kpis: ["All"],
        formats: ["Summary"],
        columns: ["Actual", "Replan", "Variance", "Variance %", "Favorable"],
        includeRankings: true,
        includeTrendTaglines: false,
      },
      version: 1,
      is_active: true,
      created_at: "2026-03-27T00:00:00Z",
      updated_at: "2026-03-27T00:00:00Z",
    },
  ],
  [
    "t4",
    {
      id: "t4",
      name: "CI Peer Comparison",
      description: "Competitive benchmarking across peer groups",
      type: "ci",
      config: {
        kpis: ["OG%", "Price", "Volume", "Mix", "Adj Core Operating Profit %"],
        formats: ["Quarterly", "YTD"],
        columns: ["Company", "Quarter", "OG%", "Price", "Volume", "Mix", "Op Profit %"],
        includeRankings: true,
        includeTrendTaglines: false,
      },
      version: 1,
      is_active: true,
      created_at: "2026-03-27T00:00:00Z",
      updated_at: "2026-03-27T00:00:00Z",
    },
  ],
]);

function getTemplates() {
  return Array.from(templateStore.values());
}

function createTemplate(name, templateConfig) {
  const id = `t${Date.now()}`;
  const now = new Date().toISOString();
  const template = {
    id,
    name,
    description: templateConfig.description || "",
    type: templateConfig.type || "pes",
    config: templateConfig.config || {},
    version: 1,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
  templateStore.set(id, template);
  return template;
}

function updateTemplate(id, updates) {
  const template = templateStore.get(id);
  if (!template) {
    throw new Error(`Template not found: ${id}`);
  }

  if (updates.name !== undefined) template.name = updates.name;
  if (updates.description !== undefined) template.description = updates.description;
  if (updates.type !== undefined) template.type = updates.type;
  if (updates.config !== undefined) template.config = { ...template.config, ...updates.config };
  if (updates.is_active !== undefined) template.is_active = updates.is_active;

  template.version += 1;
  template.updated_at = new Date().toISOString();
  templateStore.set(id, template);
  return template;
}

// ============================================================
// FR7.3 — Peer group configuration
// ============================================================

const peerGroupStore = new Map([
  [
    "pg1",
    {
      id: "pg1",
      name: "Confectionery",
      description: "Confectionery and snacking competitors",
      segment: "Confectionery",
      competitors: [
        { name: "Nestle", ticker: "NSRGY", included: true },
        { name: "Mondelez", ticker: "MDLZ", included: true },
        { name: "Hershey", ticker: "HSY", included: true },
        { name: "Ferrero", ticker: "N/A", included: true },
        { name: "Kellanova", ticker: "K", included: true },
      ],
      metrics: ["OG%", "Price", "Volume", "Mix", "Adj Core Operating Profit %"],
      is_active: true,
    },
  ],
  [
    "pg2",
    {
      id: "pg2",
      name: "Pet Care",
      description: "Pet care segment competitors",
      segment: "Pet Care",
      competitors: [
        { name: "Nestle (Purina)", ticker: "NSRGY", included: true },
        { name: "Colgate-Palmolive (Hill's)", ticker: "CL", included: true },
        { name: "General Mills (Blue Buffalo)", ticker: "GIS", included: true },
        { name: "J.M. Smucker", ticker: "SJM", included: true },
        { name: "Freshpet", ticker: "FRPT", included: true },
        { name: "IDEXX", ticker: "IDXX", included: true },
      ],
      metrics: ["OG%", "Price", "Volume", "Mix", "Adj Core Operating Profit %"],
      is_active: true,
    },
  ],
  [
    "pg3",
    {
      id: "pg3",
      name: "Food & Nutrition",
      description: "Food and nutrition segment competitors",
      segment: "Food",
      competitors: [
        { name: "Nestle (Food)", ticker: "NSRGY", included: true },
        { name: "General Mills", ticker: "GIS", included: true },
        { name: "Kellanova", ticker: "K", included: true },
      ],
      metrics: ["OG%", "Price", "Volume", "Mix", "Adj Core Operating Profit %"],
      is_active: true,
    },
  ],
]);

function getPeerGroups() {
  return Array.from(peerGroupStore.values());
}

function updatePeerGroup(id, updates) {
  const group = peerGroupStore.get(id);
  if (!group) {
    throw new Error(`Peer group not found: ${id}`);
  }

  if (updates.name !== undefined) group.name = updates.name;
  if (updates.description !== undefined) group.description = updates.description;
  if (updates.segment !== undefined) group.segment = updates.segment;
  if (updates.competitors !== undefined) group.competitors = updates.competitors;
  if (updates.metrics !== undefined) group.metrics = updates.metrics;
  if (updates.is_active !== undefined) group.is_active = updates.is_active;

  peerGroupStore.set(id, group);
  return group;
}

// ============================================================
// FR1.5 — Ingestion status
// ============================================================

async function getIngestionStatus() {
  try {
    const health = await dataLayer.healthCheck();
    const mode = dataLayer.getMode();

    // Get table row counts
    const [entities, accounts, products, customers, dates] = await Promise.all([
      dataLayer.getEntities(),
      dataLayer.getAccounts(),
      dataLayer.getProducts(),
      dataLayer.getCustomers(),
      dataLayer.getDates(),
    ]);

    return {
      mode,
      connected: health.connected,
      lastRefresh: new Date().toISOString(),
      tables: [
        { name: "finiq_dim_entity", rows: entities.length, status: entities.length > 0 ? "loaded" : "empty" },
        { name: "finiq_dim_account", rows: accounts.length, status: accounts.length > 0 ? "loaded" : "empty" },
        { name: "finiq_composite_item", rows: products.length, status: products.length > 0 ? "loaded" : "empty" },
        { name: "finiq_customer", rows: customers.length, status: customers.length > 0 ? "loaded" : "empty" },
        { name: "finiq_date", rows: dates.length, status: dates.length > 0 ? "loaded" : "empty" },
        { name: "finiq_vw_pl_entity", rows: null, status: "view" },
        { name: "finiq_vw_pl_brand_product", rows: null, status: "view" },
        { name: "finiq_vw_ncfo_entity", rows: null, status: "view" },
      ],
      totalDimensionRows: entities.length + accounts.length + products.length + customers.length + dates.length,
    };
  } catch (err) {
    return {
      mode: dataLayer.getMode(),
      connected: false,
      error: err.message,
      lastRefresh: new Date().toISOString(),
      tables: [],
      totalDimensionRows: 0,
    };
  }
}

// ============================================================
// Exports
// ============================================================

export {
  // FR7.6 — Connection
  testDatabricksConnection,
  getConnectionConfig,
  updateConnectionConfig,
  // FR7.2 — Org hierarchy
  getOrgTree,
  // FR7.5 — RBAC
  getUsers,
  getRoles,
  assignRole,
  ROLES,
  // FR7.4 — Prompts
  getPrompts,
  updatePrompt,
  togglePrompt,
  // FR7.1 — Templates
  getTemplates,
  createTemplate,
  updateTemplate,
  // FR7.3 — Peer groups
  getPeerGroups,
  updatePeerGroup,
  // FR1.5 — Ingestion
  getIngestionStatus,
};
