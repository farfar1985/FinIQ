/**
 * FinIQ Job Board
 * FR5: Enterprise Agent Job Board
 * FR8.3: Real-time WebSocket updates for job progress
 *
 * Manages query submission queue, job lifecycle, and agent processing
 */

import { processQuery } from '../agents/finiq-agent.mjs';
import { broadcastJobUpdate } from './websocket.mjs';

// In-memory job store (later: Redis or DB)
const jobs = new Map();
let jobCounter = 1;

/**
 * Job States:
 * - submitted: Job queued, waiting for agent
 * - processing: Agent currently working on it
 * - completed: Successfully processed
 * - failed: Error during processing
 */

/**
 * Submit a new job
 * FR5.1: Job submission interface
 */
export function submitJob(query, userId = 'anonymous', priority = 'normal') {
  const jobId = `job-${Date.now()}-${jobCounter++}`;

  const job = {
    id: jobId,
    query,
    userId,
    priority, // high | normal | low
    status: 'submitted',
    submittedAt: new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    result: null,
    error: null,
    sla: calculateSLA(priority),
    attempts: 0,
    maxAttempts: 3
  };

  jobs.set(jobId, job);

  // Broadcast job submitted event
  broadcastJobUpdate(jobId, getJob(jobId));

  // Auto-process (single agent worker picks it up)
  processNextJob().catch(err => {
    console.error(`[Job Board] Error auto-processing job ${jobId}:`, err);
  });

  return { jobId, status: 'submitted', estimatedCompletion: job.sla };
}

/**
 * Get job status and result
 * FR5.4: Job lifecycle tracking
 */
export function getJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) {
    return { error: 'Job not found' };
  }

  return {
    id: job.id,
    query: job.query,
    status: job.status,
    submittedAt: job.submittedAt,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    result: job.result,
    error: job.error,
    sla: job.sla,
    elapsedMs: job.completedAt
      ? new Date(job.completedAt) - new Date(job.submittedAt)
      : Date.now() - new Date(job.submittedAt)
  };
}

/**
 * List all jobs (optionally filtered by userId or status)
 * FR5.5: Job dashboard
 */
export function listJobs(filters = {}) {
  let result = Array.from(jobs.values());

  if (filters.userId) {
    result = result.filter(j => j.userId === filters.userId);
  }

  if (filters.status) {
    result = result.filter(j => j.status === filters.status);
  }

  // Sort by submission time (newest first)
  result.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

  return result.map(job => ({
    id: job.id,
    query: job.query,
    status: job.status,
    submittedAt: job.submittedAt,
    completedAt: job.completedAt,
    priority: job.priority,
    elapsedMs: job.completedAt
      ? new Date(job.completedAt) - new Date(job.submittedAt)
      : Date.now() - new Date(job.submittedAt)
  }));
}

/**
 * Process next job in queue
 * FR5.2: Agent pool management
 * FR5.3: SLA routing (priority queue)
 *
 * Single agent worker pattern for MVP
 * (Later: multiple workers, agent pool)
 */
async function processNextJob() {
  // Find next job to process (priority order)
  const pending = Array.from(jobs.values())
    .filter(j => j.status === 'submitted')
    .sort((a, b) => {
      // Sort by priority first
      const priorityOrder = { high: 0, normal: 1, low: 2 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by submission time
      return new Date(a.submittedAt) - new Date(b.submittedAt);
    });

  if (pending.length === 0) {
    return; // No jobs to process
  }

  const job = pending[0];

  // Mark as processing
  job.status = 'processing';
  job.startedAt = new Date().toISOString();
  job.attempts++;

  console.log(`[Job Board] Processing job ${job.id}: "${job.query}"`);

  // Broadcast processing event
  broadcastJobUpdate(job.id, getJob(job.id));

  try {
    // Process query using FinIQ agent
    const result = await processQuery(job.query, { jobId: job.id });

    // Mark as completed
    job.status = 'completed';
    job.completedAt = new Date().toISOString();
    job.result = result;

    const elapsed = new Date(job.completedAt) - new Date(job.startedAt);
    console.log(`[Job Board] Job ${job.id} completed in ${elapsed}ms`);

    // Check if we met SLA
    const totalElapsed = new Date(job.completedAt) - new Date(job.submittedAt);
    if (totalElapsed > job.sla) {
      console.warn(`[Job Board] Job ${job.id} exceeded SLA (${totalElapsed}ms > ${job.sla}ms)`);
    }

    // Broadcast completed event
    broadcastJobUpdate(job.id, getJob(job.id));

  } catch (error) {
    console.error(`[Job Board] Job ${job.id} failed:`, error);

    // Retry logic
    if (job.attempts < job.maxAttempts) {
      job.status = 'submitted'; // Re-queue
      console.log(`[Job Board] Retrying job ${job.id} (attempt ${job.attempts}/${job.maxAttempts})`);
      // Broadcast retry event
      broadcastJobUpdate(job.id, getJob(job.id));
    } else {
      job.status = 'failed';
      job.completedAt = new Date().toISOString();
      job.error = error.message || 'Unknown error';
      // Broadcast failed event
      broadcastJobUpdate(job.id, getJob(job.id));
    }
  }

  // Process next job if any
  if (pending.length > 1) {
    setImmediate(() => processNextJob().catch(err => {
      console.error('[Job Board] Error in processNextJob:', err);
    }));
  }
}

/**
 * Calculate SLA deadline based on priority
 * FR5.3: SLA routing
 */
function calculateSLA(priority) {
  switch (priority) {
    case 'high':
      return 5000; // 5 seconds
    case 'normal':
      return 15000; // 15 seconds
    case 'low':
      return 30000; // 30 seconds
    default:
      return 15000;
  }
}

/**
 * Cancel a job (if not yet started)
 */
export function cancelJob(jobId) {
  const job = jobs.get(jobId);
  if (!job) {
    return { error: 'Job not found' };
  }

  if (job.status === 'processing') {
    return { error: 'Cannot cancel job in progress' };
  }

  if (job.status === 'completed' || job.status === 'failed') {
    return { error: 'Job already finished' };
  }

  job.status = 'cancelled';
  job.completedAt = new Date().toISOString();

  return { success: true, jobId };
}

/**
 * Get job queue stats
 * FR5.5: Job dashboard
 */
export function getQueueStats() {
  const allJobs = Array.from(jobs.values());

  return {
    total: allJobs.length,
    submitted: allJobs.filter(j => j.status === 'submitted').length,
    processing: allJobs.filter(j => j.status === 'processing').length,
    completed: allJobs.filter(j => j.status === 'completed').length,
    failed: allJobs.filter(j => j.status === 'failed').length,
    averageCompletionMs: calculateAverage(
      allJobs.filter(j => j.status === 'completed')
        .map(j => new Date(j.completedAt) - new Date(j.submittedAt))
    ),
    slaBreaches: allJobs.filter(j =>
      j.status === 'completed' &&
      (new Date(j.completedAt) - new Date(j.submittedAt)) > j.sla
    ).length
  };
}

function calculateAverage(arr) {
  if (arr.length === 0) return 0;
  return Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
}
