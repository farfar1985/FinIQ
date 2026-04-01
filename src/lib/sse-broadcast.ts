/**
 * SSE broadcaster — shared module for broadcasting events to connected clients.
 * Extracted from api/events/route.ts so route files only export HTTP methods.
 */

type SSEController = ReadableStreamDefaultController<Uint8Array>;

const g = globalThis as unknown as {
  __finiq_sse_controllers?: Set<SSEController>;
};
if (!g.__finiq_sse_controllers) {
  g.__finiq_sse_controllers = new Set<SSEController>();
}

export const controllers: Set<SSEController> = g.__finiq_sse_controllers;
export const encoder = new TextEncoder();

/**
 * Broadcast an event to all connected SSE clients.
 * Call this from any API route when state changes.
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
