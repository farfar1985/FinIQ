/**
 * Server-Sent Events API — FR8.3 (Real-time Updates)
 *
 * GET /api/events — Returns an SSE stream that broadcasts job state changes.
 *
 * Other API routes call broadcastEvent() from @/lib/sse-broadcast to push
 * updates to all connected clients.
 */

import { NextResponse } from "next/server";
import { controllers, encoder } from "@/lib/sse-broadcast";

// Re-export broadcastEvent for backward compatibility — but note:
// Next.js route files should only export HTTP methods. Other routes
// should import directly from "@/lib/sse-broadcast".

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
      controllers.delete(
        controller as ReadableStreamDefaultController<Uint8Array>
      );
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
