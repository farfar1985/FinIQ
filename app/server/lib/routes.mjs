/**
 * FinIQ API Routes
 */

import { Router } from "express";
import config from "./config.mjs";
import dataLayer from "./databricks.mjs";
import jobBoard from "./job-board.mjs";
import { getStats as getWsStats } from "./websocket.mjs";
import { processQuery, resolveVariables, SUGGESTED_PROMPTS } from "../agents/finiq-agent.mjs";
import { getThreeWayComparison, getDataFreshness, getRecommendations } from "./intelligence.mjs";
import ciAgent from "../agents/ci-agent.mjs";
import {
  testDatabricksConnection,
  getConnectionConfig,
  updateConnectionConfig,
  getOrgTree,
  getUsers,
  getRoles,
  assignRole,
  getPrompts,
  updatePrompt,
  togglePrompt,
  getTemplates,
  createTemplate,
  updateTemplate,
  getPeerGroups,
  updatePeerGroup,
  getIngestionStatus,
} from "./admin.mjs";

const router = Router();

// ============================================================
// Health check
// ============================================================

router.get("/health", async (req, res) => {
  try {
    const dbHealth = await dataLayer.healthCheck();
    res.json({
      status: "ok",
      version: "2.0.0",
      mode: dataLayer.getMode(),
      database: dbHealth,
      websocket: getWsStats(),
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.json({ status: "degraded", error: err.message });
  }
});

// ============================================================
// Dimension endpoints (Batch 2)
// ============================================================

router.get("/entities", async (req, res) => {
  try {
    const entities = await dataLayer.getEntities();
    res.json({ entities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/entities/hierarchy", async (req, res) => {
  try {
    const entities = await dataLayer.getEntityHierarchy();
    res.json({ entities });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/accounts", async (req, res) => {
  try {
    const accounts = await dataLayer.getAccounts();
    res.json({ accounts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/accounts/formulas", async (req, res) => {
  try {
    const formulas = await dataLayer.getAccountFormulas();
    res.json({ formulas });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/products", async (req, res) => {
  try {
    const products = await dataLayer.getProducts();
    res.json({ products });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/customers", async (req, res) => {
  try {
    const customers = await dataLayer.getCustomers();
    res.json({ customers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/dates", async (req, res) => {
  try {
    const dates = await dataLayer.getDates();
    res.json({ dates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PES Reports (Batch 3)
// ============================================================

router.get("/reports/pes/:entity", async (req, res) => {
  try {
    const entity = req.params.entity;
    const [pl, brand, ncfo] = await Promise.all([
      dataLayer.getPLByEntity(entity),
      dataLayer.getPLByBrandProduct(entity),
      dataLayer.getNCFOByEntity(entity),
    ]);
    res.json({ entity, pl, brand, ncfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Budget Variance (Batch 3)
router.get("/reports/variance/:entity", async (req, res) => {
  try {
    const entity = req.params.entity;
    const rows = await dataLayer.getVariance(entity);
    const variance = rows.map((r) => ({
      entity: r.Entity,
      account: r.Account_KPI,
      actual: r.Actual_USD_Value,
      replan: r.Replan_USD_Value,
      variance: r.Variance,
      variance_pct: r.Variance_Pct,
      favorable: r.Variance >= 0,
    }));
    res.json({ entity, variance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Chat / NL Query (FR4.1-4.4)
// ============================================================

const sessions = new Map(); // Simple in-memory session store

router.post("/chat", async (req, res) => {
  try {
    const { message, sessionId } = req.body;
    if (!message) return res.status(400).json({ error: "message is required" });

    // Session context for multi-turn (FR4.2)
    const session = sessions.get(sessionId) || { history: [], entity: null };
    session.history.push({ role: "user", content: message });

    const result = await processQuery(message, { entity: session.entity });

    // Update session context
    if (result.data?.[0]?.entity) session.entity = result.data[0].entity;
    session.history.push({ role: "assistant", content: result.response });
    const sid = sessionId || crypto.randomUUID();
    sessions.set(sid, session);

    res.json({ ...result, sessionId: sid });
  } catch (err) {
    console.error("[chat] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Jobs — FR5.1-5.7 (Enterprise Agent Job Board)
// ============================================================

/**
 * GET /api/jobs — List jobs with optional filters
 * Query params: status, priority, agent_type, limit, offset
 */
router.get("/jobs", (req, res) => {
  try {
    const { status, priority, agent_type, limit, offset } = req.query;
    const result = jobBoard.getJobs({ status, priority, agent_type, limit, offset });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/jobs — Submit a new job
 * Body: { query, priority?, agent_type?, schedule?, submitter? }
 */
router.post("/jobs", (req, res) => {
  try {
    const { query, priority, agent_type, schedule, submitter } = req.body;
    if (!query) {
      return res.status(400).json({ error: "query is required" });
    }

    const job = jobBoard.submitJob(query, priority || "medium", agent_type || null, {
      schedule: schedule || null,
      submitter: submitter || "user",
    });

    // Simulate processing in development mode
    if (config.nodeEnv !== "production") {
      const duration = { critical: 2000, high: 3000, medium: 5000, low: 8000 };
      jobBoard.simulateJobCompletion(job.id, duration[job.priority] || 5000);
    }

    res.status(201).json({ job });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/jobs/agents — Get agent pool status
 */
router.get("/jobs/agents", (req, res) => {
  try {
    const agents = jobBoard.getAgentPool();
    res.json({ agents });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/jobs/:id — Get a single job by ID
 */
router.get("/jobs/:id", (req, res) => {
  try {
    const job = jobBoard.getJob(req.params.id);
    if (!job) {
      return res.status(404).json({ error: `Job not found: ${req.params.id}` });
    }
    res.json({ job });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/jobs/:id — Update job status
 * Body: { status, result?, error? }
 */
router.patch("/jobs/:id", (req, res) => {
  try {
    const { status, result, error } = req.body;
    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    const job = jobBoard.updateJobStatus(req.params.id, status, { result, error });
    res.json({ job });
  } catch (err) {
    if (err.message.includes("not found")) {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/jobs/:id/retry — Retry a failed job
 */
router.post("/jobs/:id/retry", (req, res) => {
  try {
    const job = jobBoard.retryJob(req.params.id);

    // Simulate processing again in dev
    if (config.nodeEnv !== "production") {
      jobBoard.simulateJobCompletion(job.id, 3000);
    }

    res.json({ job });
  } catch (err) {
    if (err.message.includes("not found")) {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});

// ============================================================
// CI — Competitive Intelligence (Batch 7 — FR3 + Section 7)
// ============================================================

/** GET /api/ci/competitors — Competitor universe with financial data */
router.get("/ci/competitors", async (req, res) => {
  try {
    const result = await ciAgent.getCompetitorUniverse();
    res.json(result);
  } catch (err) {
    console.error("[ci] Competitors error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/ci/swot/:ticker — SWOT analysis for a competitor */
router.get("/ci/swot/:ticker", async (req, res) => {
  try {
    const result = await ciAgent.getSWOT(req.params.ticker);
    res.json(result);
  } catch (err) {
    console.error("[ci] SWOT error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/ci/porters — Porter's Five Forces analysis */
router.get("/ci/porters", async (req, res) => {
  try {
    const result = await ciAgent.getPortersFiveForces();
    res.json(result);
  } catch (err) {
    console.error("[ci] Porter's error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/ci/earnings/:ticker/:year/:quarter — Earnings call intelligence */
router.get("/ci/earnings/:ticker/:year/:quarter", async (req, res) => {
  try {
    const { ticker, year, quarter } = req.params;
    const result = await ciAgent.analyzeEarningsCall(ticker, year, quarter);
    res.json(result);
  } catch (err) {
    console.error("[ci] Earnings error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/ci/benchmark — Financial benchmarking across all competitors */
router.get("/ci/benchmark", async (req, res) => {
  try {
    const tickers = req.query.tickers ? req.query.tickers.split(",") : undefined;
    const result = await ciAgent.getBenchmarkComparison(tickers);
    res.json(result);
  } catch (err) {
    console.error("[ci] Benchmark error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/ci/positioning — Competitive positioning scatter map */
router.get("/ci/positioning", async (req, res) => {
  try {
    const { x, y } = req.query;
    const result = await ciAgent.getPositioningMap(x || "revenueGrowth", y || "operatingMargin");
    res.json(result);
  } catch (err) {
    console.error("[ci] Positioning error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/ci/ma — M&A activity tracker */
router.get("/ci/ma", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const result = await ciAgent.getMAActivity(limit);
    res.json(result);
  } catch (err) {
    console.error("[ci] M&A error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/ci/news — Competitor news feed */
router.get("/ci/news", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 15;
    const result = await ciAgent.getCompetitorNews(limit);
    res.json(result);
  } catch (err) {
    console.error("[ci] News error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Suggested prompts (Batch 3 — placeholder)
// ============================================================

router.get("/prompts/suggested", async (req, res) => {
  try {
    const category = req.query.category;
    let prompts = SUGGESTED_PROMPTS;
    if (category) {
      prompts = prompts.filter((p) => p.category === category);
    }
    // Resolve variables in each prompt
    const resolved = await Promise.all(
      prompts.map(async (p) => ({
        ...p,
        resolved_prompt: await resolveVariables(p.suggested_prompt),
      }))
    );
    res.json({ prompts: resolved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Admin (Batch 6 — FR7.1-7.6)
// ============================================================

// FR7.6 — Connection admin
router.get("/admin/config", async (req, res) => {
  try {
    const cfg = getConnectionConfig();
    res.json(cfg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/config/test", async (req, res) => {
  try {
    const overrideConfig = req.body.serverHostname ? req.body : null;
    const result = await testDatabricksConnection(overrideConfig);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/admin/config", async (req, res) => {
  try {
    const updated = updateConnectionConfig(req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// FR7.2 — Org hierarchy
router.get("/admin/org-tree", async (req, res) => {
  try {
    const tree = await getOrgTree();
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// FR7.5 — RBAC
router.get("/admin/roles", (req, res) => {
  try {
    const roles = getRoles();
    res.json({ roles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/admin/users", (req, res) => {
  try {
    const userList = getUsers();
    res.json({ users: userList });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/users/:id/role", (req, res) => {
  try {
    const { role } = req.body;
    if (!role) return res.status(400).json({ error: "role is required" });
    const user = assignRole(req.params.id, role);
    res.json({ user });
  } catch (err) {
    if (err.message.includes("not found") || err.message.includes("Invalid role")) {
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({ error: err.message });
  }
});

// FR7.4 — Prompt management
router.get("/admin/prompts", (req, res) => {
  try {
    const category = req.query.category || null;
    const prompts = getPrompts(category);
    res.json({ prompts });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/admin/prompts/:id", (req, res) => {
  try {
    const prompt = updatePrompt(req.params.id, req.body);
    res.json({ prompt });
  } catch (err) {
    if (err.message.includes("not found")) {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});

router.post("/admin/prompts/:id/toggle", (req, res) => {
  try {
    const prompt = togglePrompt(req.params.id);
    res.json({ prompt });
  } catch (err) {
    if (err.message.includes("not found")) {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});

// FR7.1 — Template management
router.get("/admin/templates", (req, res) => {
  try {
    const templates = getTemplates();
    res.json({ templates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/admin/templates", (req, res) => {
  try {
    const { name, ...config } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const template = createTemplate(name, config);
    res.status(201).json({ template });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/admin/templates/:id", (req, res) => {
  try {
    const template = updateTemplate(req.params.id, req.body);
    res.json({ template });
  } catch (err) {
    if (err.message.includes("not found")) {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});

// FR7.3 — Peer group configuration
router.get("/admin/peer-groups", (req, res) => {
  try {
    const groups = getPeerGroups();
    res.json({ peerGroups: groups });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/admin/peer-groups/:id", (req, res) => {
  try {
    const group = updatePeerGroup(req.params.id, req.body);
    res.json({ peerGroup: group });
  } catch (err) {
    if (err.message.includes("not found")) {
      return res.status(404).json({ error: err.message });
    }
    res.status(400).json({ error: err.message });
  }
});

// FR1.5 — Ingestion status
router.get("/admin/ingestion/status", async (req, res) => {
  try {
    const status = await getIngestionStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Intelligence Layer (FR6.1, FR6.5)
// ============================================================

router.get("/intelligence/comparison/:entity", async (req, res) => {
  try {
    const entity = req.params.entity;
    const result = await getThreeWayComparison(entity);
    res.json(result);
  } catch (err) {
    console.error("[intelligence] Comparison error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/intelligence/freshness", async (req, res) => {
  try {
    const result = await getDataFreshness();
    res.json(result);
  } catch (err) {
    console.error("[intelligence] Freshness error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get("/intelligence/recommendations/:entity", async (req, res) => {
  try {
    const entity = req.params.entity;
    const result = await getRecommendations(entity);
    res.json(result);
  } catch (err) {
    console.error("[intelligence] Recommendations error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Data catalog (FR1.4)
// ============================================================

router.get("/catalog", async (req, res) => {
  try {
    const [entities, accounts, products, customers, dates] = await Promise.all([
      dataLayer.getEntities(),
      dataLayer.getAccounts(),
      dataLayer.getProducts(),
      dataLayer.getCustomers(),
      dataLayer.getDates(),
    ]);
    res.json({
      mode: dataLayer.getMode(),
      tables: {
        entities: { count: entities.length, source: "finiq_dim_entity" },
        accounts: { count: accounts.length, source: "finiq_dim_account" },
        products: { count: products.length, source: "finiq_composite_item" },
        customers: { count: customers.length, source: "finiq_customer" },
        fiscal_periods: { count: dates.length, source: "finiq_date" },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
