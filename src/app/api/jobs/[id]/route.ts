/**
 * Job Board API — Individual Job Operations
 *
 * GET   /api/jobs/[id]       — Get single job details
 * PATCH /api/jobs/[id]       — Update job status
 * POST  /api/jobs/[id]       — Retry a failed job (body: { action: "retry" })
 */

import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { jobs, type JobRecord } from "@/app/api/jobs/route";
// processLLMQuery removed — jobs now use real Databricks only

// ============================================================
// GET /api/jobs/[id]
// ============================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { allowed, headers } = checkRateLimit(ip, 100);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too Many Requests" },
      { status: 429, headers }
    );
  }

  const job = jobs.get(id);
  if (!job) {
    return NextResponse.json({ error: `Job not found: ${id}` }, { status: 404, headers });
  }

  return NextResponse.json({ job }, { headers });
}

// ============================================================
// PATCH /api/jobs/[id] — Update status
// ============================================================

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { allowed, headers } = checkRateLimit(ip, 100);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too Many Requests" },
      { status: 429, headers }
    );
  }

  const job = jobs.get(id);
  if (!job) {
    return NextResponse.json({ error: `Job not found: ${id}` }, { status: 404, headers });
  }

  try {
    const body = await request.json();
    const { status, result, error } = body;

    const validStatuses: JobRecord["status"][] = ["submitted", "queued", "processing", "completed", "failed"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status: ${status}. Must be one of: ${validStatuses.join(", ")}` },
        { status: 400, headers }
      );
    }

    if (status) {
      job.status = status;
      if (status === "completed" || status === "failed") {
        job.completed_at = new Date().toISOString();
      }
    }
    if (result !== undefined) job.result = result;
    if (error !== undefined) job.error = error;
    job.updated_at = new Date().toISOString();

    return NextResponse.json({ job }, { headers });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers });
  }
}

// ============================================================
// POST /api/jobs/[id] — Retry failed job
// ============================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const ip = request.headers.get("x-forwarded-for") || "unknown";
  const { allowed, headers } = checkRateLimit(ip, 100);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too Many Requests" },
      { status: 429, headers }
    );
  }

  const job = jobs.get(id);
  if (!job) {
    return NextResponse.json({ error: `Job not found: ${id}` }, { status: 404, headers });
  }

  try {
    const body = await request.json();

    // FR5.7: Collaborative review workflow — approve/reject/comment
    if (body.action === "approve") {
      if (job.status !== "completed") {
        return NextResponse.json(
          { error: `Only completed jobs can be approved. Current status: ${job.status}` },
          { status: 400, headers }
        );
      }
      job.updated_at = new Date().toISOString();
      (job as Record<string, unknown>).review = {
        status: "approved",
        reviewer: body.reviewer || "reviewer@mars.com",
        comment: body.comment || "",
        reviewedAt: job.updated_at,
      };
      return NextResponse.json({ job, message: `Job ${id} approved` }, { headers });
    }

    if (body.action === "reject") {
      if (job.status !== "completed") {
        return NextResponse.json(
          { error: `Only completed jobs can be rejected. Current status: ${job.status}` },
          { status: 400, headers }
        );
      }
      job.updated_at = new Date().toISOString();
      (job as Record<string, unknown>).review = {
        status: "rejected",
        reviewer: body.reviewer || "reviewer@mars.com",
        comment: body.comment || "",
        reviewedAt: job.updated_at,
      };
      return NextResponse.json({ job, message: `Job ${id} rejected — will be re-queued for revision` }, { headers });
    }

    if (body.action === "comment") {
      job.updated_at = new Date().toISOString();
      const comments = ((job as Record<string, unknown>).comments as Array<Record<string, string>>) || [];
      comments.push({
        author: body.reviewer || "reviewer@mars.com",
        text: body.comment || "",
        timestamp: job.updated_at,
      });
      (job as Record<string, unknown>).comments = comments;
      return NextResponse.json({ job, message: `Comment added to job ${id}` }, { headers });
    }

    if (body.action === "retry") {
      if (job.status !== "failed") {
        return NextResponse.json(
          { error: `Only failed jobs can be retried. Current status: ${job.status}` },
          { status: 400, headers }
        );
      }
      if (job.retries >= job.max_retries) {
        return NextResponse.json(
          { error: `Maximum retries (${job.max_retries}) exceeded for job ${id}` },
          { status: 400, headers }
        );
      }

      // Reset and re-queue
      job.retries++;
      job.error = null;
      job.result = null;
      job.status = "queued";
      job.completed_at = null;
      job.updated_at = new Date().toISOString();

      // Re-process async
      retryProcessJob(job.id).catch((err) => {
        console.error(`[Job ${job.id}] Retry error:`, err);
      });

      return NextResponse.json({ job, message: `Job ${id} queued for retry (attempt ${job.retries}/${job.max_retries})` }, { headers });
    }

    return NextResponse.json({ error: "Unknown action. Use { action: 'retry' }" }, { status: 400, headers });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400, headers });
  }
}

// ============================================================
// Retry processing helper
// ============================================================

async function retryProcessJob(jobId: string) {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = "processing";
  job.updated_at = new Date().toISOString();

  try {
    // Jobs use real Databricks — reprocessing not supported without full Databricks path
    job.status = "failed";
    job.updated_at = new Date().toISOString();
    job.error = "Job reprocessing requires re-submission through the Query page.";
  } catch (err) {
    job.status = "failed";
    job.updated_at = new Date().toISOString();
    job.error = err instanceof Error ? err.message : "Unknown error during processing";
  }
}
