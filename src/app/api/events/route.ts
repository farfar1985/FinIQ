/**
 * Server-Sent Events API — FR8.3 (Real-time Updates)
 *
 * GET /api/events — Returns an SSE stream that broadcasts job state changes.
 *
 * Other API routes call broadcastEvent() to push updates to all connected
 * clients. Events include: job:created, job:updated, job:completed, job:failed.
 */

import { NextResponse } from "next/server";

// ---------------------------------------------------------------------------
// SSE broadcaster — global so other routes can import broadcastEvent
// ---------------------------------------------------------------------------

type SSEController = ReadableStreamDefaultController<Uint8Array>;

const g = globalThis as unknown as {
  __finiq_sse_controllers?: Set<SSEController>;
};
if (!g.__finiq_sse_controllers) {
  g.__finiq_sse_controllers = new Set<SSEController>();
}
const controllers: Set<SSEController> = g.__finiq_sse_controllers;

const encoder = new TextEncoder();

/**
 * Broadcast an event to all connected SSE clients.
 * Call this from other API routes (e.g., jobs) when state changes.
 */
export function broadcastEvent(
  type: string,
  data: Record<string, unknown>
): void {
  const payload = `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
  const encoded = encoder.encode(payload);

  for (const controller of controllers) {
    try {
      controller.enqueue(encoded);
    } catch {
      // Client disconnected — remove on next cleanup
      controllers.delete(controller);
    }
  }
}

// ---------------------------------------------------------------------------
// GET /api/events — SSE endpoint
// ---------------------------------------------------------------------------

export async function GET() {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controllers.add(controller);

      // Send initial connection event
      const welcome = `event: connected\ndata: ${JSON.stringify({
        message: "SSE stream connected",
        timestamp: new Date().toISOString(),
        clients: controllers.size,
      })}\n\n`;
      controller.enqueue(encoder.encode(welcome));
    },
    cancel(controller) {
      controllers.delete(controller as SSEController);
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
