/**
 * FinIQ Job Board — FR5.1-5.7
 * Enterprise agent job queue with priority routing, SLA enforcement,
 * agent pool management, and scheduled/recurring job support.
 */

import crypto from "crypto";

// ============================================================
// Constants
// ============================================================

const JOB_STATES = [
  "submitted",
  "queued",
  "assigned",
  "processing",
  "review",
  "completed",
  "failed",
];

const PRIORITIES = {
  critical: { slaMs: 2 * 60 * 1000, label: "Critical", order: 0 },
  high: { slaMs: 10 * 60 * 1000, label: "High", order: 1 },
  medium: { slaMs: 30 * 60 * 1000, label: "Medium", order: 2 },
  low: { slaMs: 2 * 60 * 60 * 1000, label: "Low", order: 3 },
};

const AGENT_POOL = {
  pes: {
    id: "pes",
    name: "PES Agent",
    description: "Period End Summary report generation",
    intents: ["pes", "variance", "ranking"],
    capacity: 3,
    activeJobs: 0,
  },
  ci: {
    id: "ci",
    name: "CI Agent",
    description: "Competitive intelligence and benchmarking",
    intents: ["ci"],
    capacity: 2,
    activeJobs: 0,
  },
  forecasting: {
    id: "forecasting",
    name: "Forecasting Agent",
    description: "Financial forecasting and trend analysis",
    intents: ["trend", "product"],
    capacity: 2,
    activeJobs: 0,
  },
  adhoc: {
    id: "adhoc",
    name: "Ad-Hoc Agent",
    description: "General-purpose NL query execution",
    intents: ["adhoc"],
    capacity: 5,
    activeJobs: 0,
  },
};

// Intent keywords for auto-classification
const INTENT_KEYWORDS = {
  pes: ["pes", "period end", "summary", "kpi", "organic growth", "mac shape", "a&cp", "ncfo", "performance"],
  variance: ["variance", "budget", "replan", "actual vs", "favorable", "unfavorable"],
  product: ["product", "brand", "segment", "item", "category"],
  trend: ["trend", "over time", "history", "compare period", "year over year", "yoy", "growth"],
  ranking: ["rank", "top", "bottom", "best", "worst", "highest", "lowest"],
  ci: ["competitor", "nestle", "mondelez", "hershey", "benchmark", "peer", "competitive", "swot", "porter"],
};

// ============================================================
// Job store (in-memory)
// ============================================================

const jobs = new Map();
let scheduledCheckInterval = null;

// ============================================================
// Intent classification
// ============================================================

function classifyIntent(query) {
  const lower = query.toLowerCase();
  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return intent;
    }
  }
  return "adhoc";
}

// ============================================================
// Agent assignment
// ============================================================

function resolveAgentType(query, requestedAgent) {
  if (requestedAgent && AGENT_POOL[requestedAgent]) {
    return requestedAgent;
  }

  const intent = classifyIntent(query);

  for (const [agentId, agent] of Object.entries(AGENT_POOL)) {
    if (agent.intents.includes(intent)) {
      return agentId;
    }
  }

  return "adhoc";
}

function findAvailableAgent(agentType) {
  const agent = AGENT_POOL[agentType];
  if (!agent) return AGENT_POOL.adhoc;
  if (agent.activeJobs < agent.capacity) return agent;

  // Fallback to adhoc if preferred agent is at capacity
  if (agentType !== "adhoc" && AGENT_POOL.adhoc.activeJobs < AGENT_POOL.adhoc.capacity) {
    return AGENT_POOL.adhoc;
  }

  // All agents busy — still return the requested one (will queue)
  return agent;
}

// ============================================================
// Core job operations
// ============================================================

/**
 * Submit a new job to the queue.
 * @param {string} query - The NL query or task description
 * @param {string} [priority="medium"] - critical | high | medium | low
 * @param {string} [agentType] - Requested agent type (auto-assigned if omitted)
 * @param {object} [options] - Additional options (schedule, submitter, etc.)
 * @returns {object} The created job
 */
function submitJob(query, priority = "medium", agentType = null, options = {}) {
  if (!query || typeof query !== "string" || query.trim().length === 0) {
    throw new Error("Job query is required");
  }

  if (!PRIORITIES[priority]) {
    throw new Error(`Invalid priority: ${priority}. Must be one of: ${Object.keys(PRIORITIES).join(", ")}`);
  }

  const resolvedAgent = resolveAgentType(query, agentType);
  const agent = findAvailableAgent(resolvedAgent);
  const now = new Date().toISOString();
  const slaDeadline = new Date(Date.now() + PRIORITIES[priority].slaMs).toISOString();

  const job = {
    id: crypto.randomUUID(),
    query: query.trim(),
    status: "submitted",
    priority,
    agent_type: agent.id,
    agent_name: agent.name,
    intent: classifyIntent(query),
    sla_deadline: slaDeadline,
    created_at: now,
    updated_at: now,
    submitted_by: options.submitter || "anonymous",
    result: null,
    error: null,
    retries: 0,
    max_retries: 3,
    // Scheduled / recurring fields
    schedule: options.schedule || null, // cron expression like "0 9 * * 1-5"
    is_recurring: !!options.schedule,
    last_run_at: null,
    next_run_at: options.schedule ? computeNextRun(options.schedule) : null,
  };

  jobs.set(job.id, job);

  // Transition to queued immediately
  transitionJob(job, "queued");

  // Auto-assign if agent has capacity
  if (agent.activeJobs < agent.capacity) {
    transitionJob(job, "assigned");
    agent.activeJobs++;
    // Auto-transition to processing after a short delay (simulates agent pickup)
    setTimeout(() => {
      if (job.status === "assigned") {
        transitionJob(job, "processing");
      }
    }, 500);
  }

  return job;
}

/**
 * Get jobs with optional filters.
 * @param {object} filters - { status, priority, agent_type, limit, offset }
 * @returns {object} { jobs, total, counts }
 */
function getJobs(filters = {}) {
  let result = Array.from(jobs.values());

  // Apply filters
  if (filters.status) {
    const statuses = filters.status.split(",");
    result = result.filter((j) => statuses.includes(j.status));
  }
  if (filters.priority) {
    const priorities = filters.priority.split(",");
    result = result.filter((j) => priorities.includes(j.priority));
  }
  if (filters.agent_type) {
    result = result.filter((j) => j.agent_type === filters.agent_type);
  }

  // Sort: priority order first, then creation time
  result.sort((a, b) => {
    const pa = PRIORITIES[a.priority]?.order ?? 99;
    const pb = PRIORITIES[b.priority]?.order ?? 99;
    if (pa !== pb) return pa - pb;
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  // Count by status
  const allJobs = Array.from(jobs.values());
  const counts = {
    submitted: 0,
    queued: 0,
    assigned: 0,
    processing: 0,
    review: 0,
    completed: 0,
    failed: 0,
    total: allJobs.length,
  };
  for (const j of allJobs) {
    if (counts[j.status] !== undefined) counts[j.status]++;
  }

  // Pagination
  const total = result.length;
  const limit = Math.min(parseInt(filters.limit) || 50, 200);
  const offset = parseInt(filters.offset) || 0;
  result = result.slice(offset, offset + limit);

  return { jobs: result, total, counts };
}

/**
 * Get a single job by ID.
 * @param {string} id
 * @returns {object|null}
 */
function getJob(id) {
  return jobs.get(id) || null;
}

/**
 * Update a job's status and optionally its result.
 * @param {string} id
 * @param {string} status
 * @param {object} [data] - { result, error }
 * @returns {object} The updated job
 */
function updateJobStatus(id, status, data = {}) {
  const job = jobs.get(id);
  if (!job) {
    throw new Error(`Job not found: ${id}`);
  }

  if (!JOB_STATES.includes(status)) {
    throw new Error(`Invalid status: ${status}. Must be one of: ${JOB_STATES.join(", ")}`);
  }

  const previousStatus = job.status;
  transitionJob(job, status);

  if (data.result !== undefined) {
    job.result = data.result;
  }
  if (data.error !== undefined) {
    job.error = data.error;
  }

  // Free agent capacity on completion/failure
  if ((status === "completed" || status === "failed") && AGENT_POOL[job.agent_type]) {
    AGENT_POOL[job.agent_type].activeJobs = Math.max(
      0,
      AGENT_POOL[job.agent_type].activeJobs - 1
    );
  }

  return job;
}

/**
 * Retry a failed job.
 * @param {string} id
 * @returns {object} The retried job
 */
function retryJob(id) {
  const job = jobs.get(id);
  if (!job) {
    throw new Error(`Job not found: ${id}`);
  }
  if (job.status !== "failed") {
    throw new Error(`Only failed jobs can be retried. Current status: ${job.status}`);
  }
  if (job.retries >= job.max_retries) {
    throw new Error(`Maximum retries (${job.max_retries}) exceeded for job ${id}`);
  }

  job.retries++;
  job.error = null;
  job.result = null;

  // Re-enter the queue
  transitionJob(job, "queued");

  const agent = AGENT_POOL[job.agent_type];
  if (agent && agent.activeJobs < agent.capacity) {
    transitionJob(job, "assigned");
    agent.activeJobs++;
    setTimeout(() => {
      if (job.status === "assigned") {
        transitionJob(job, "processing");
      }
    }, 500);
  }

  return job;
}

// ============================================================
// Job state transitions
// ============================================================

// Callback for broadcasting updates (set by websocket.mjs)
let onJobUpdate = null;

function setOnJobUpdate(callback) {
  onJobUpdate = callback;
}

function transitionJob(job, newStatus) {
  job.status = newStatus;
  job.updated_at = new Date().toISOString();

  // Broadcast via WebSocket if callback is set
  if (onJobUpdate) {
    onJobUpdate(job);
  }
}

// ============================================================
// Scheduled / recurring jobs
// ============================================================

/**
 * Compute next run time from a cron expression.
 * Simplified parser: supports "minute hour day month weekday" with basic values.
 * For MVP, returns a time offset based on the cron pattern.
 */
function computeNextRun(cronExpression) {
  if (!cronExpression) return null;

  const parts = cronExpression.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const [minute, hour] = parts;
  const now = new Date();
  const next = new Date(now);

  // Set the target hour and minute
  const targetHour = hour === "*" ? now.getHours() : parseInt(hour);
  const targetMinute = minute === "*" ? 0 : parseInt(minute);

  next.setHours(targetHour, targetMinute, 0, 0);

  // If the target time is in the past today, move to tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  return next.toISOString();
}

/**
 * Check all recurring jobs and re-submit any that are due.
 */
function checkScheduledJobs() {
  const now = new Date();

  for (const [id, job] of jobs) {
    if (!job.is_recurring || !job.next_run_at) continue;
    if (job.status !== "completed" && job.status !== "failed") continue;

    const nextRun = new Date(job.next_run_at);
    if (now >= nextRun) {
      // Create a new job instance for this scheduled run
      const newJob = submitJob(job.query, job.priority, job.agent_type, {
        submitter: job.submitted_by,
      });
      // Don't make the new one recurring — it's a child run
      newJob.is_recurring = false;
      newJob.schedule = null;

      // Update the recurring parent
      job.last_run_at = now.toISOString();
      job.next_run_at = computeNextRun(job.schedule);
      job.updated_at = now.toISOString();
    }
  }
}

/**
 * Start the scheduled job checker interval.
 */
function startScheduler() {
  if (scheduledCheckInterval) return;
  // Check every 30 seconds
  scheduledCheckInterval = setInterval(checkScheduledJobs, 30_000);
}

/**
 * Stop the scheduler.
 */
function stopScheduler() {
  if (scheduledCheckInterval) {
    clearInterval(scheduledCheckInterval);
    scheduledCheckInterval = null;
  }
}

// ============================================================
// Agent pool info
// ============================================================

function getAgentPool() {
  return Object.values(AGENT_POOL).map((agent) => ({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    capacity: agent.capacity,
    activeJobs: agent.activeJobs,
    available: agent.capacity - agent.activeJobs,
    intents: agent.intents,
  }));
}

// ============================================================
// Simulate job completion (for demo / development)
// ============================================================

function simulateJobCompletion(jobId, durationMs = 3000) {
  const job = jobs.get(jobId);
  if (!job) return;

  setTimeout(() => {
    if (job.status !== "processing") return;

    // 90% success rate for simulation
    const success = Math.random() > 0.1;

    if (success) {
      transitionJob(job, "review");
      setTimeout(() => {
        updateJobStatus(jobId, "completed", {
          result: {
            summary: `Analysis complete for query: "${job.query}"`,
            rows_analyzed: Math.floor(Math.random() * 5000) + 100,
            tables_queried: ["finiq_financial", "finiq_dim_entity", "finiq_dim_account"],
            generated_at: new Date().toISOString(),
          },
        });
      }, 1000);
    } else {
      updateJobStatus(jobId, "failed", {
        error: "Simulated failure: timeout while querying data source",
      });
    }
  }, durationMs);
}

// ============================================================
// Exports
// ============================================================

export default {
  submitJob,
  getJobs,
  getJob,
  updateJobStatus,
  retryJob,
  getAgentPool,
  setOnJobUpdate,
  startScheduler,
  stopScheduler,
  simulateJobCompletion,
  JOB_STATES,
  PRIORITIES,
};
