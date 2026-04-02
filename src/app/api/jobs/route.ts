/**
 * Job Board API — FR5.1-5.7
 *
 * GET  /api/jobs         — List all jobs with optional status/priority filter
 * POST /api/jobs         — Submit a new job (triggers async LLM processing)
 *
 * Jobs are stored in-memory (Map). Each job goes through the lifecycle:
 * submitted -> queued -> processing -> completed/failed
 *
 * SLA targets: critical=2min, high=10min, medium=30min, low=120min
 * Agent pool: PES, CI, Forecasting, Ad-hoc (auto-assigned by intent)
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
// processLLMQuery removed — no simulated fallback
import { broadcastEvent } from "@/lib/sse-broadcast";
import { isConfigured, executeRawSql, setModeOverride, getActiveConfig } from "@/data/databricks";
import { SCHEMA_CONTEXT } from "@/lib/schema-context";
import Anthropic from "@anthropic-ai/sdk";
import { loadJobs, saveJobs, type PersistedJob } from "@/lib/job-persistence";

// ============================================================
// Types & Constants
// ============================================================

export interface JobRecord {
  id: string;
  query: string;
  title: string;
  status: "submitted" | "queued" | "processing" | "completed" | "failed";
  priority: "critical" | "high" | "medium" | "low";
  type: "PES" | "CI" | "Forecast" | "Ad-Hoc";
  agent_type: string;
  agent_name: string;
  intent: string;
  sla_target_minutes: number;
  sla_deadline: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  submitted_by: string;
  result: unknown | null;
  error: string | null;
  retries: number;
  max_retries: number;
}

const SLA_TARGETS: Record<string, { minutes: number; ms: number }> = {
  critical: { minutes: 2, ms: 2 * 60 * 1000 },
  high: { minutes: 10, ms: 10 * 60 * 1000 },
  medium: { minutes: 30, ms: 30 * 60 * 1000 },
  low: { minutes: 120, ms: 2 * 60 * 60 * 1000 },
};

const AGENT_POOL: Record<string, { id: string; name: string; intents: string[]; capacity: number; activeJobs: number }> = {
  pes: { id: "pes", name: "PES Agent", intents: ["pes", "variance", "ranking"], capacity: 3, activeJobs: 0 },
  ci: { id: "ci", name: "CI Agent", intents: ["ci"], capacity: 2, activeJobs: 0 },
  forecasting: { id: "forecasting", name: "Forecasting Agent", intents: ["trend", "product"], capacity: 2, activeJobs: 0 },
  adhoc: { id: "adhoc", name: "Ad-Hoc Agent", intents: ["adhoc"], capacity: 5, activeJobs: 0 },
};

const INTENT_KEYWORDS: Record<string, string[]> = {
  pes: ["pes", "period end", "summary", "kpi", "organic growth", "mac shape", "a&cp", "ncfo", "performance"],
  variance: ["variance", "budget", "replan", "actual vs", "favorable", "unfavorable"],
  product: ["product", "brand", "segment", "item", "category"],
  trend: ["trend", "over time", "history", "compare period", "year over year", "yoy", "growth"],
  ranking: ["rank", "top", "bottom", "best", "worst", "highest", "lowest"],
  ci: ["competitor", "nestle", "mondelez", "hershey", "benchmark", "peer", "competitive", "swot", "porter"],
};

// Map intent to job type for display
const INTENT_TO_TYPE: Record<string, JobRecord["type"]> = {
  pes: "PES",
  variance: "PES",
  ranking: "PES",
  ci: "CI",
  trend: "Forecast",
  product: "Forecast",
  adhoc: "Ad-Hoc",
};

// ============================================================
// In-memory job store (exported for use by [id] route)
// ============================================================

// Using globalThis to persist across hot-reloads in dev
const globalJobs = globalThis as unknown as {
  __finiq_jobs?: Map<string, JobRecord>;
  __finiq_scheduled_jobs?: ScheduledJob[];
  __finiq_scheduler_started?: boolean;
  __finiq_jobs_loaded?: boolean;
};
if (!globalJobs.__finiq_jobs) {
  globalJobs.__finiq_jobs = new Map<string, JobRecord>();
}
export const jobs: Map<string, JobRecord> = globalJobs.__finiq_jobs;

// Load persisted jobs from disk on first import
if (!globalJobs.__finiq_jobs_loaded) {
  globalJobs.__finiq_jobs_loaded = true;
  try {
    const persisted = loadJobs();
    for (const j of persisted) {
      jobs.set(j.id, j as unknown as JobRecord);
    }
    if (persisted.length > 0) {
      console.log(`[jobs] Loaded ${persisted.length} persisted jobs from disk`);
    }
  } catch (err) {
    console.warn("[jobs] Failed to load persisted jobs:", err);
  }
}

/** Helper to persist jobs after any mutation */
function persistJobs() {
  try {
    saveJobs(jobs as unknown as Map<string, PersistedJob>);
  } catch {
    // Non-critical — silently fail
  }
}

// ============================================================
// Job Scheduling — FR5.6
// ============================================================

interface ScheduledJob {
  id: string;
  query: string;
  title: string;
  priority: "critical" | "high" | "medium" | "low";
  type?: string;
  submitter: string;
  schedule: {
    cron?: string;   // Cron expression (e.g., "0 9 * * 1-5")
    runAt?: string;   // ISO timestamp for one-time execution
  };
  enabled: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  createdAt: string;
  jobsCreated: number;
}

if (!globalJobs.__finiq_scheduled_jobs) {
  globalJobs.__finiq_scheduled_jobs = [];
}
const scheduledJobs: ScheduledJob[] = globalJobs.__finiq_scheduled_jobs;

/** Parse a simple cron expression and check if it matches the current minute */
function cronMatchesNow(cron: string): boolean {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return false;
  const now = new Date();
  const fields = [now.getMinutes(), now.getHours(), now.getDate(), now.getMonth() + 1, now.getDay()];

  for (let i = 0; i < 5; i++) {
    const part = parts[i];
    if (part === "*") continue;
    // Handle ranges like "1-5"
    if (part.includes("-")) {
      const [lo, hi] = part.split("-").map(Number);
      if (fields[i] < lo || fields[i] > hi) return false;
      continue;
    }
    // Handle step like "*/5"
    if (part.startsWith("*/")) {
      const step = parseInt(part.slice(2), 10);
      if (fields[i] % step !== 0) return false;
      continue;
    }
    // Handle comma-separated values
    const vals = part.split(",").map(Number);
    if (!vals.includes(fields[i])) return false;
  }
  return true;
}

/** Check scheduled jobs and create due jobs */
function checkScheduledJobs() {
  const now = new Date();
  for (const sj of scheduledJobs) {
    if (!sj.enabled) continue;

    let shouldRun = false;

    if (sj.schedule.runAt) {
      // One-time schedule
      const runAt = new Date(sj.schedule.runAt);
      if (now >= runAt) {
        shouldRun = true;
        sj.enabled = false; // Disable after one-time run
      }
    } else if (sj.schedule.cron) {
      // Cron schedule — check if it matches the current minute
      if (cronMatchesNow(sj.schedule.cron)) {
        // Prevent double-firing within same minute
        if (sj.lastRunAt) {
          const lastRun = new Date(sj.lastRunAt);
          const diffMs = now.getTime() - lastRun.getTime();
          if (diffMs < 59000) continue; // Already ran this minute
        }
        shouldRun = true;
      }
    }

    if (shouldRun) {
      // Create a job from the scheduled definition
      const intent = classifyIntent(sj.query);
      const agentType = resolveAgentType(sj.query);
      const agent = AGENT_POOL[agentType] || AGENT_POOL.adhoc;
      const sla = SLA_TARGETS[sj.priority] || SLA_TARGETS.medium;
      const jobNow = new Date().toISOString();

      const job: JobRecord = {
        id: generateId(),
        query: sj.query,
        title: `[Scheduled] ${sj.title}`,
        status: "submitted",
        priority: sj.priority,
        type: (sj.type as JobRecord["type"]) || INTENT_TO_TYPE[intent] || "Ad-Hoc",
        agent_type: agent.id,
        agent_name: agent.name,
        intent,
        sla_target_minutes: sla.minutes,
        sla_deadline: new Date(Date.now() + sla.ms).toISOString(),
        created_at: jobNow,
        updated_at: jobNow,
        completed_at: null,
        submitted_by: sj.submitter,
        result: null,
        error: null,
        retries: 0,
        max_retries: 3,
      };

      jobs.set(job.id, job);
      job.status = "queued";
      job.updated_at = new Date().toISOString();
      agent.activeJobs++;

      processJob(job.id).catch((err) => {
        console.error(`[Scheduled Job ${job.id}] Processing error:`, err);
      });

      sj.lastRunAt = jobNow;
      sj.jobsCreated++;
    }
  }
}

// Start the scheduler interval (once)
if (!globalJobs.__finiq_scheduler_started) {
  globalJobs.__finiq_scheduler_started = true;
  setInterval(checkScheduledJobs, 60000); // Check every 60 seconds
}

// ============================================================
// Helpers
// ============================================================

function generateId(): string {
  return `JOB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

function classifyIntent(query: string): string {
  const lower = query.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return intent;
    }
  }
  return "adhoc";
}

function resolveAgentType(query: string): string {
  const intent = classifyIntent(query);
  for (const [agentId, agent] of Object.entries(AGENT_POOL)) {
    if (agent.intents.includes(intent)) return agentId;
  }
  return "adhoc";
}

function getJobCounts() {
  const counts = { submitted: 0, queued: 0, processing: 0, completed: 0, failed: 0, total: 0 };
  for (const job of jobs.values()) {
    counts.total++;
    if (job.status in counts) {
      counts[job.status as keyof typeof counts]++;
    }
  }
  return counts;
}

// ============================================================
// Async job processing — runs the real LLM query engine
// ============================================================

async function processJob(jobId: string) {
  const job = jobs.get(jobId);
  if (!job) return;

  // Transition to processing
  job.status = "processing";
  job.updated_at = new Date().toISOString();
  broadcastEvent("job:updated", { id: job.id, status: job.status });

  try {
    const dataMode = process.env.DATA_MODE || process.env.NEXT_PUBLIC_DATA_MODE || "simulated";
    let result: { text: string; data?: unknown; intent: string } | null = null;

    // Try real Databricks first
    const _anthropicKey = process.env.FINIQ_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
    if (dataMode === "real" && isConfigured() && _anthropicKey) {
      setModeOverride("real");
      try {
        const client = new Anthropic({ apiKey: _anthropicKey });
        const sqlResponse = await client.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 1024,
          temperature: 0,
          system: `${SCHEMA_CONTEXT}\n\nGenerate SQL for a live Databricks warehouse. Use fully qualified names: corporate_finance_analytics_prod.finsight_core_model.<table>.\nUse LOWER() for Unit_Alias comparisons. Default period: Date_ID = 202503.\nKEEP QUERIES SIMPLE: Always filter by specific Unit_Alias and Date_ID. Never scan all units or all periods at once. Use LIMIT 100.\nFor "top 5 GBUs" use: WHERE LOWER(Unit_Alias) LIKE 'gbu%' or specific GBU names.\nReturn ONLY a JSON object with: "sql" (the query), "description" (1 sentence).`,
          messages: [{ role: "user", content: job.query }],
        });
        const responseText = sqlResponse.content[0]?.type === "text" ? sqlResponse.content[0].text : "";
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          if (parsed.sql && parsed.sql.trim().toUpperCase().startsWith("SELECT")) {
            const rows = await executeRawSql(parsed.sql, 500, 60); // 5 min timeout for jobs
            if (rows && rows.length > 0) {
              // Summarize with LLM
              const summaryResp = await client.messages.create({
                model: "claude-haiku-4-5-20251001",
                max_tokens: 1024,
                temperature: 0,
                messages: [{ role: "user", content: `Provide an executive summary for this financial query. Question: "${job.query}"\n\nData (${rows.length} rows, sample):\n${JSON.stringify(rows.slice(0, 15), null, 2)}\n\nBe thorough. Use specific numbers. Include key findings, trends, and recommendations. Never say "replace" or "fragmented".` }],
              });
              const summary = summaryResp.content[0]?.type === "text" ? summaryResp.content[0].text : parsed.description;
              const columns = Object.keys(rows[0]);
              result = {
                text: summary,
                intent: "databricks",
                data: {
                  type: "table",
                  columns,
                  rows: rows.slice(0, 50).map((r) => {
                    const formatted: Record<string, unknown> = {};
                    for (const col of columns) {
                      const val = r[col];
                      formatted[col] = typeof val === "number" && Math.abs(val) >= 1000000
                        ? `$${(val / 1000000).toFixed(1)}M`
                        : val;
                    }
                    return formatted;
                  }),
                },
              };
            }
          }
        }
      } catch (dbErr) {
        console.warn("[jobs] Real Databricks query failed:", dbErr);
      } finally {
        setModeOverride(null);
      }
    }

    // No simulated fallback — if Databricks failed, report it
    if (!result) {
      result = {
        text: `Could not retrieve real data from Databricks for this query. The warehouse may be slow or the query too complex. Please try a more specific query or try again when the warehouse is warm.`,
        intent: "error",
      };
    }

    job.status = "completed";
    job.completed_at = new Date().toISOString();
    job.updated_at = job.completed_at;
    job.result = {
      summary: result.text || `Analysis complete for: "${job.query}"`,
      data: result.data || null,
      intent: result.intent,
      generated_at: new Date().toISOString(),
    };
    persistJobs();
    broadcastEvent("job:completed", { id: job.id, status: job.status, title: job.title });
  } catch (err) {
    job.status = "failed";
    job.updated_at = new Date().toISOString();
    job.error = err instanceof Error ? err.message : "Unknown error during processing";
    persistJobs();
    broadcastEvent("job:failed", { id: job.id, status: job.status, error: job.error });
  } finally {
    // Free agent capacity
    const agent = AGENT_POOL[job.agent_type];
    if (agent) {
      agent.activeJobs = Math.max(0, agent.activeJobs - 1);
    }
  }
}

// ============================================================
// GET /api/jobs
// ============================================================

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { allowed, headers } = checkRateLimit(ip, 100);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too Many Requests", message: "Rate limit exceeded. Max 100 requests per minute." },
      { status: 429, headers }
    );
  }

  const { searchParams } = new URL(request.url);

  // FR5.6: Return scheduled jobs list if requested
  if (searchParams.get("scheduled") === "true") {
    return NextResponse.json({ scheduledJobs, total: scheduledJobs.length }, { headers });
  }

  const statusFilter = searchParams.get("status");
  const priorityFilter = searchParams.get("priority");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 200);
  const offset = parseInt(searchParams.get("offset") || "0", 10);

  let result = Array.from(jobs.values());

  // Apply filters
  if (statusFilter) {
    const statuses = statusFilter.split(",");
    result = result.filter((j) => statuses.includes(j.status));
  }
  if (priorityFilter) {
    const priorities = priorityFilter.split(",");
    result = result.filter((j) => priorities.includes(j.priority));
  }

  // Sort: priority order, then creation time (newest first)
  const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
  result.sort((a, b) => {
    const pa = priorityOrder[a.priority] ?? 99;
    const pb = priorityOrder[b.priority] ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const total = result.length;
  result = result.slice(offset, offset + limit);

  const responseHeaders = new Headers(headers);
  return NextResponse.json(
    { jobs: result, total, counts: getJobCounts() },
    { headers: responseHeaders }
  );
}

// ============================================================
// POST /api/jobs
// ============================================================

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { allowed, headers } = checkRateLimit(ip, 100);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too Many Requests", message: "Rate limit exceeded. Max 100 requests per minute." },
      { status: 429, headers }
    );
  }

  try {
    const body = await request.json();
    const { query, title, priority = "medium", type, schedule } = body;

    if (!query || typeof query !== "string" || query.trim().length === 0) {
      return NextResponse.json({ error: "Missing or empty 'query' field" }, { status: 400, headers });
    }

    // FR5.6: If schedule is provided, create a scheduled job instead
    if (schedule && (schedule.cron || schedule.runAt)) {
      const sj: ScheduledJob = {
        id: `SCHED-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 5).toUpperCase()}`,
        query: query.trim(),
        title: (title || query.trim()).substring(0, 200),
        priority: priority as ScheduledJob["priority"],
        type: type || undefined,
        submitter: body.submitter || "current.user@mars.com",
        schedule: {
          cron: schedule.cron || undefined,
          runAt: schedule.runAt || undefined,
        },
        enabled: true,
        lastRunAt: null,
        nextRunAt: schedule.runAt || null,
        createdAt: new Date().toISOString(),
        jobsCreated: 0,
      };

      scheduledJobs.push(sj);

      const responseHeaders = new Headers(headers);
      return NextResponse.json({ scheduledJob: sj }, { status: 201, headers: responseHeaders });
    }

    const validPriorities = ["critical", "high", "medium", "low"];
    if (!validPriorities.includes(priority)) {
      return NextResponse.json(
        { error: `Invalid priority: ${priority}. Must be one of: ${validPriorities.join(", ")}` },
        { status: 400, headers }
      );
    }

    const intent = classifyIntent(query);
    const agentType = resolveAgentType(query);
    const agent = AGENT_POOL[agentType] || AGENT_POOL.adhoc;
    const now = new Date().toISOString();
    const sla = SLA_TARGETS[priority] || SLA_TARGETS.medium;

    const job: JobRecord = {
      id: generateId(),
      query: query.trim(),
      title: (title || query.trim()).substring(0, 200),
      status: "submitted",
      priority: priority as JobRecord["priority"],
      type: (type as JobRecord["type"]) || INTENT_TO_TYPE[intent] || "Ad-Hoc",
      agent_type: agent.id,
      agent_name: agent.name,
      intent,
      sla_target_minutes: sla.minutes,
      sla_deadline: new Date(Date.now() + sla.ms).toISOString(),
      created_at: now,
      updated_at: now,
      completed_at: null,
      submitted_by: body.submitter || "current.user@mars.com",
      result: null,
      error: null,
      retries: 0,
      max_retries: 3,
    };

    jobs.set(job.id, job);

    // Transition to queued
    job.status = "queued";
    job.updated_at = new Date().toISOString();
    persistJobs();

    // Increment agent active jobs
    agent.activeJobs++;

    // Kick off async processing (don't await — return immediately)
    processJob(job.id).catch((err) => {
      console.error(`[Job ${job.id}] Processing error:`, err);
    });

    const responseHeaders = new Headers(headers);
    return NextResponse.json({ job }, { status: 201, headers: responseHeaders });
  } catch (err) {
    console.error("[POST /api/jobs] Error:", err);
    return NextResponse.json(
      { error: "Failed to create job" },
      { status: 500, headers }
    );
  }
}
