/**
 * FinIQ API Routes
 */

import { Router } from "express";
import multer from "multer";
import pdfParse from "pdf-parse/lib/pdf-parse.js";
import config from "./config.mjs";
import dataLayer from "./databricks.mjs";
import cache from "./cache.mjs";
import jobBoard from "./job-board.mjs";
import { getStats as getWsStats } from "./websocket.mjs";
import { processQuery, resolveVariables, SUGGESTED_PROMPTS } from "../agents/finiq-agent.mjs";
import { getThreeWayComparison, getDataFreshness, getRecommendations, getMarketingInsights } from "./intelligence.mjs";
import ciAgent from "../agents/ci-agent.mjs";

// Wire the real query engine into the job board
jobBoard.setProcessQueryFn(processQuery);

import { monitorCompetitors, getCompetitorAlerts } from "./fmp-client.mjs";
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
import { requireRole } from "./auth.mjs";
import { chatLimiter, getRateLimitStatus } from "./rate-limit.mjs";

const router = Router();

// ============================================================
// TTS — OpenAI Text-to-Speech (sage voice)
// ============================================================

router.post("/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ error: "text is required" });
    if (!config.openaiApiKey) return res.status(503).json({ error: "OpenAI TTS not configured" });

    const truncated = text.length > 4000 ? text.substring(0, 4000) + "..." : text;

    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${config.openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: truncated,
        voice: config.openaiTtsVoice,
        response_format: "mp3",
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    res.set("Content-Type", "audio/mpeg");
    const arrayBuffer = await response.arrayBuffer();
    res.send(Buffer.from(arrayBuffer));
  } catch (err) {
    console.error("[tts] Error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

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
    const cached = cache.get("entities");
    if (cached) return res.json(cached);

    const entities = await dataLayer.getEntities();
    const result = { entities };
    cache.set("entities", result, 600_000); // 10 min TTL
    res.json(result);
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
    const cacheKey = `pes:${entity}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

    const [pl, brand, ncfo] = await Promise.all([
      dataLayer.getPLByEntity(entity),
      dataLayer.getPLByBrandProduct(entity),
      dataLayer.getNCFOByEntity(entity),
    ]);
    const result = { entity, pl, brand, ncfo };
    cache.set(cacheKey, result, 300_000); // 5 min TTL
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Budget Variance (Batch 3)
router.get("/reports/variance/:entity", async (req, res) => {
  try {
    const entity = req.params.entity;
    const cacheKey = `variance:${entity}`;
    const cached = cache.get(cacheKey);
    if (cached) return res.json(cached);

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
    const result = { entity, variance };
    cache.set(cacheKey, result, 300_000); // 5 min TTL
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Chat / NL Query (FR4.1-4.4)
// ============================================================

const sessions = new Map(); // Simple in-memory session store

router.post("/chat", chatLimiter, async (req, res) => {
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
router.post("/jobs", requireRole("admin", "analyst"), (req, res) => {
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
      jobBoard.executeJob(job.id, duration[job.priority] || 5000);
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
router.patch("/jobs/:id", requireRole("admin"), (req, res) => {
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
router.post("/jobs/:id/retry", requireRole("admin", "analyst"), (req, res) => {
  try {
    const job = jobBoard.retryJob(req.params.id);

    // Simulate processing again in dev
    if (config.nodeEnv !== "production") {
      jobBoard.executeJob(job.id, 3000);
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

/** GET /api/ci/alerts — Active competitor alerts (FR3.4) */
router.get("/ci/alerts", (req, res) => {
  try {
    const { ticker, severity, type } = req.query;
    const result = getCompetitorAlerts({ ticker, severity, type });
    res.json(result);
  } catch (err) {
    console.error("[ci] Alerts error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

/** GET /api/ci/monitor — Trigger a monitoring check (FR3.4) */
router.get("/ci/monitor", async (req, res) => {
  try {
    const result = await monitorCompetitors();
    res.json(result);
  } catch (err) {
    console.error("[ci] Monitor error:", err.message);
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
// CI — PDF Upload & Analysis
// ============================================================

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB max
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("Only PDF files are accepted"));
    }
  },
});

/** POST /api/ci/upload — Upload a PDF for CI analysis */
router.post("/ci/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No PDF file provided" });
    }

    // Extract text from PDF
    const pdfData = await pdfParse(req.file.buffer);
    const text = pdfData.text || "";
    const pageCount = pdfData.numpages || 0;
    const wordCount = text.split(/\s+/).filter(Boolean).length;

    // Detect key financial terms
    const financialTerms = [
      "revenue", "earnings", "EBITDA", "margin", "profit", "loss",
      "operating income", "net income", "cash flow", "dividend",
      "organic growth", "volume", "price", "mix", "market share",
      "guidance", "outlook", "forecast", "acquisition", "restructuring",
      "cost savings", "inflation", "FX", "currency", "debt", "leverage",
    ];
    const detectedTerms = financialTerms.filter((term) =>
      text.toLowerCase().includes(term.toLowerCase())
    );

    const result = {
      filename: req.file.originalname,
      pageCount,
      wordCount,
      detectedTerms,
      textPreview: text.slice(0, 2000),
      extractedText: text,
      summary: null,
    };

    // If Anthropic API key is available, generate a themed summary
    if (config.anthropicApiKey) {
      try {
        const { default: Anthropic } = await import("@anthropic-ai/sdk");
        const client = new Anthropic({ apiKey: config.anthropicApiKey });

        const message = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 2000,
          messages: [
            {
              role: "user",
              content: `You are a financial analyst at Mars, Incorporated. Analyze the following text extracted from a competitor earnings document and provide a structured summary with these themes:
1. **Organic Growth** — Revenue growth, volume, price, mix
2. **Margins** — Gross, operating, net margin trends
3. **Projections** — Forward guidance, outlook
4. **Consumer Trends** — Consumer behavior, market dynamics
5. **Key Risks** — Challenges, headwinds

Keep each section to 2-3 bullet points. Be concise and data-driven.

Document text (first 8000 chars):
${text.slice(0, 8000)}`,
            },
          ],
        });

        const summaryText = message.content[0]?.type === "text" ? message.content[0].text : null;
        result.summary = summaryText;
      } catch (llmErr) {
        console.error("[ci] LLM summary error:", llmErr.message);
        // Continue without summary — return extracted text only
      }
    }

    res.json(result);
  } catch (err) {
    console.error("[ci] Upload error:", err.message);
    if (err.message === "Only PDF files are accepted") {
      return res.status(400).json({ error: err.message });
    }
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

router.post("/admin/config/test", requireRole("admin"), async (req, res) => {
  try {
    const overrideConfig = req.body.serverHostname ? req.body : null;
    const result = await testDatabricksConnection(overrideConfig);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch("/admin/config", requireRole("admin"), async (req, res) => {
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

router.post("/admin/users/:id/role", requireRole("admin"), (req, res) => {
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

router.patch("/admin/prompts/:id", requireRole("admin"), (req, res) => {
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

router.post("/admin/prompts/:id/toggle", requireRole("admin"), (req, res) => {
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

router.post("/admin/templates", requireRole("admin"), (req, res) => {
  try {
    const { name, ...config } = req.body;
    if (!name) return res.status(400).json({ error: "name is required" });
    const template = createTemplate(name, config);
    res.status(201).json({ template });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch("/admin/templates/:id", requireRole("admin"), (req, res) => {
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

router.patch("/admin/peer-groups/:id", requireRole("admin"), (req, res) => {
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
// Gateway status (FR6.4)
// ============================================================

/** GET /api/gateway/status — Rate limit config and current request counts */
router.get("/gateway/status", (req, res) => {
  try {
    const status = getRateLimitStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// Cache monitoring
// ============================================================

/** GET /api/cache/stats — Cache hit/miss statistics */
router.get("/cache/stats", (req, res) => {
  res.json(cache.stats());
});

/** POST /api/cache/clear — Clear all cached data (admin only) */
router.post("/cache/clear", requireRole("admin"), (req, res) => {
  cache.clear();
  res.json({ message: "Cache cleared", stats: cache.stats() });
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

router.get("/intelligence/marketing/:entity", async (req, res) => {
  try {
    const entity = req.params.entity;
    const result = await getMarketingInsights(entity);
    res.json(result);
  } catch (err) {
    console.error("[intelligence] Marketing error:", err.message);
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

    const mode = dataLayer.getMode();
    const sourceSystem = mode === "databricks"
      ? "Databricks FinSight"
      : "SQLite Synthetic";

    // Derive last_updated from the most recent fiscal period
    const latestDate = dates.length > 0 ? dates[0] : null;
    const lastUpdated = latestDate
      ? `FY${latestDate.Year} P${latestDate.Period}`
      : null;

    res.json({
      mode,
      source_system: sourceSystem,
      last_updated: lastUpdated,
      last_updated_timestamp: new Date().toISOString(),
      tables: {
        entities: {
          count: entities.length,
          source: "finiq_dim_entity",
          source_system: sourceSystem,
          last_updated: lastUpdated,
          transformations: [
            "Feeds finiq_vw_pl_entity (Entity dimension for P&L view)",
            "Feeds finiq_vw_ncfo_entity (Entity dimension for NCFO view)",
            "Feeds finiq_vw_pl_brand_product (Entity filter for brand/product view)",
            "Provides org hierarchy (Parent_Entity -> Child_Entity) for roll-ups",
          ],
        },
        accounts: {
          count: accounts.length,
          source: "finiq_dim_account",
          source_system: sourceSystem,
          last_updated: lastUpdated,
          transformations: [
            "Defines KPI account hierarchy (Parent_Account -> Child_Account)",
            "Sign_Conversion field controls aggregation polarity in views",
            "finiq_account_formula references accounts for KPI calculations",
            "Feeds all 3 PES views via Account_KPI column",
          ],
        },
        products: {
          count: products.length,
          source: "finiq_composite_item",
          source_system: sourceSystem,
          last_updated: lastUpdated,
          transformations: [
            "Feeds finiq_vw_pl_brand_product (Brand/Segment/Product_Category breakdown)",
            "Linked to finiq_item via finiq_item_composite_item bridge table",
          ],
        },
        customers: {
          count: customers.length,
          source: "finiq_customer",
          source_system: sourceSystem,
          last_updated: lastUpdated,
          transformations: [
            "Linked via finiq_customer_map for customer hierarchy",
            "Used in ad-hoc NL queries for customer-level analysis",
          ],
        },
        fiscal_periods: {
          count: dates.length,
          source: "finiq_date",
          source_system: sourceSystem,
          last_updated: lastUpdated,
          transformations: [
            "Date_Offset=100 for LY, 0 for CY in PES views",
            "View_ID=1 for Periodic, View_ID=2 for YTD in PES views",
            "Drives all temporal filtering across financial facts",
          ],
        },
      },
      views: {
        finiq_vw_pl_entity: {
          description: "P&L by Entity — maps to PES P&L Excel sheet",
          source_tables: ["finiq_financial_cons", "finiq_dim_entity", "finiq_dim_account", "finiq_date"],
          outputs: ["Entity", "Account_KPI", "Period", "YTD_LY", "YTD_CY", "Periodic_LY", "Periodic_CY"],
        },
        finiq_vw_pl_brand_product: {
          description: "P&L by Brand/Product — maps to PES Product/Brand Excel sheets",
          source_tables: ["finiq_financial_cons", "finiq_dim_entity", "finiq_dim_account", "finiq_composite_item", "finiq_date"],
          outputs: ["Entity", "Brand", "Segment", "Account_KPI", "Period", "YTD_LY", "YTD_CY", "Periodic_LY", "Periodic_CY"],
        },
        finiq_vw_ncfo_entity: {
          description: "NCFO by Entity — maps to PES NCFO Excel sheet",
          source_tables: ["finiq_financial_cons", "finiq_dim_entity", "finiq_dim_account", "finiq_date"],
          outputs: ["Entity", "Account_KPI", "Period", "YTD_LY", "YTD_CY", "Periodic_LY", "Periodic_CY"],
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
