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
// CI (Batch 7 — competitor list is static for now)
// ============================================================

router.get("/ci/competitors", (req, res) => {
  res.json({
    competitors: [
      { name: "Nestle", ticker: "NSRGY", segment_overlap: "Confectionery, Pet Care, Food" },
      { name: "Mondelez", ticker: "MDLZ", segment_overlap: "Confectionery, Snacking" },
      { name: "Hershey", ticker: "HSY", segment_overlap: "Confectionery" },
      { name: "Ferrero", ticker: "N/A", segment_overlap: "Confectionery" },
      { name: "Colgate-Palmolive", ticker: "CL", segment_overlap: "Pet Care (Hill's)" },
      { name: "General Mills", ticker: "GIS", segment_overlap: "Pet Care (Blue Buffalo), Food" },
      { name: "Kellanova", ticker: "K", segment_overlap: "Snacking" },
      { name: "J.M. Smucker", ticker: "SJM", segment_overlap: "Pet Care (Meow Mix, Milk-Bone)" },
      { name: "Freshpet", ticker: "FRPT", segment_overlap: "Pet Care (fresh/refrigerated)" },
      { name: "IDEXX", ticker: "IDXX", segment_overlap: "Veterinary diagnostics" },
    ],
  });
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
// Admin (Batch 6)
// ============================================================

router.get("/admin/config", async (req, res) => {
  try {
    const dbHealth = await dataLayer.healthCheck();
    res.json({
      dataMode: dataLayer.getMode(),
      database: dbHealth,
      sqlitePath: config.sqlitePath,
      databricksHost: config.databricks.serverHostname || "not configured",
    });
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
