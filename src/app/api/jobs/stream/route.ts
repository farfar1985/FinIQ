/**
 * Job Stream SSE API — FR8.3
 *
 * GET /api/jobs/stream — Server-Sent Events endpoint for real-time job updates
 *
 * Sends events: job:created, job:updated, job:completed, job:failed
 * Clients connect via EventSource and receive live updates.
 */

import { NextResponse } from "next/server";

// Import the shared jobs store from the parent route
// We access it via globalThis since the Map is stored there
interface JobRecord {
  id: string;
  status: "submitted" | "queued" | "processing" | "completed" | "failed";
  title: string;
  priority: string;
  type: string;
  agent_name: string;
  updated_at: string;
  completed_at: string | null;
  error: string | null;
}

function getJobsMap(): Map<string, JobRecord> {
  const g = globalThis as unknown as { __finiq_jobs?: Map<string, JobRecord> };
  return g.__finiq_jobs || new Map();
}

// Track last-known status per job for change detection
const globalSSE = globalThis as unknown as { __finiq_sse_snapshot?: Map<string, string> };
if (!globalSSE.__finiq_sse_snapshot) {
  globalSSE.__finiq_sse_snapshot = new Map<string, string>();
}
const lastSnapshot: Map<string, string> = globalSSE.__finiq_sse_snapshot;

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ time: new Date().toISOString() })}\n\n`)
      );

      const interval = setInterval(() => {
        try {
          const jobs = getJobsMap();
          const events: string[] = [];

          for (const [id, job] of jobs.entries()) {
            const prevStatus = lastSnapshot.get(id);

            if (!prevStatus) {
              // New job
              events.push(
                `event: job:created\ndata: ${JSON.stringify({
                  id: job.id,
                  title: job.title,
                  status: job.status,
                  priority: job.priority,
                  type: job.type,
                  agent_name: job.agent_name,
                  updated_at: job.updated_at,
                })}\n\n`
              );
              lastSnapshot.set(id, job.status);
            } else if (prevStatus !== job.status) {
              // Status changed
              const eventType =
                job.status === "completed"
                  ? "job:completed"
                  : job.status === "failed"
                    ? "job:failed"
                    : "job:updated";

              events.push(
                `event: ${eventType}\ndata: ${JSON.stringify({
                  id: job.id,
                  title: job.title,
                  status: job.status,
                  previousStatus: prevStatus,
                  priority: job.priority,
                  type: job.type,
                  agent_name: job.agent_name,
                  updated_at: job.updated_at,
                  completed_at: job.completed_at,
                  error: job.error,
                })}\n\n`
              );
              lastSnapshot.set(id, job.status);
            }
          }

          // Send all detected changes
          for (const event of events) {
            controller.enqueue(encoder.encode(event));
          }

          // Heartbeat every cycle to keep connection alive
          if (events.length === 0) {
            controller.enqueue(
              encoder.encode(`: heartbeat ${new Date().toISOString()}\n\n`)
            );
          }
        } catch {
          // Silently handle errors during streaming
        }
      }, 2000); // Check every 2 seconds

      // Clean up on close — the controller.close will be called by the client disconnecting
      // We use a timeout to auto-close after 5 minutes to prevent resource leaks
      const timeout = setTimeout(() => {
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      }, 5 * 60 * 1000);

      // Store cleanup refs so they can be accessed if needed
      (controller as unknown as Record<string, unknown>).__interval = interval;
      (controller as unknown as Record<string, unknown>).__timeout = timeout;
    },

    cancel() {
      // Client disconnected — cleanup happens via the timeout above
    },
  });

  return new NextResponse(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
