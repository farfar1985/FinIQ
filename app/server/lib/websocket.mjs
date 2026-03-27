/**
 * FinIQ WebSocket Server
 * Real-time job status broadcasting to all connected clients.
 * Attaches to the existing HTTP server created in index.js.
 */

import { WebSocketServer } from "ws";

let wss = null;
const clients = new Set();

/**
 * Initialize the WebSocket server on the given HTTP server.
 * @param {import("http").Server} server - The existing HTTP server
 */
function initWebSocket(server) {
  wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws, req) => {
    const clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    ws._finiqId = clientId;
    clients.add(ws);

    console.log(`[ws] Client connected: ${clientId} (total: ${clients.size})`);

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: "connected",
        data: {
          clientId,
          message: "Connected to FinIQ real-time updates",
          timestamp: new Date().toISOString(),
        },
      })
    );

    // Handle incoming messages from clients
    ws.on("message", (raw) => {
      try {
        const message = JSON.parse(raw.toString());
        handleClientMessage(ws, message);
      } catch (err) {
        ws.send(
          JSON.stringify({
            type: "error",
            data: { message: "Invalid JSON message" },
          })
        );
      }
    });

    // Handle disconnection
    ws.on("close", () => {
      clients.delete(ws);
      console.log(`[ws] Client disconnected: ${clientId} (total: ${clients.size})`);
    });

    // Handle errors
    ws.on("error", (err) => {
      console.error(`[ws] Client error (${clientId}):`, err.message);
      clients.delete(ws);
    });
  });

  console.log("[ws] WebSocket server initialized on /ws");
  return wss;
}

/**
 * Handle messages from connected clients.
 * Supports: ping, subscribe (future: per-job subscriptions)
 */
function handleClientMessage(ws, message) {
  switch (message.type) {
    case "ping":
      ws.send(
        JSON.stringify({
          type: "pong",
          data: { timestamp: new Date().toISOString() },
        })
      );
      break;

    case "subscribe":
      // Future: track per-client subscriptions to specific job IDs
      ws.send(
        JSON.stringify({
          type: "subscribed",
          data: { jobId: message.jobId, timestamp: new Date().toISOString() },
        })
      );
      break;

    default:
      ws.send(
        JSON.stringify({
          type: "error",
          data: { message: `Unknown message type: ${message.type}` },
        })
      );
  }
}

/**
 * Broadcast a message to all connected clients.
 * @param {string} type - Message type (e.g., "job:updated", "job:created")
 * @param {object} data - The payload to send
 */
function broadcast(type, data) {
  if (!wss) return;

  const message = JSON.stringify({
    type,
    data,
    timestamp: new Date().toISOString(),
  });

  let sent = 0;
  for (const client of clients) {
    if (client.readyState === 1) {
      // WebSocket.OPEN
      client.send(message);
      sent++;
    }
  }

  if (sent > 0) {
    console.log(`[ws] Broadcast ${type} to ${sent} client(s)`);
  }
}

/**
 * Broadcast a job update event.
 * This is the callback wired into job-board.mjs via setOnJobUpdate.
 * @param {object} job - The updated job object
 */
function broadcastJobUpdate(job) {
  broadcast("job:updated", {
    job,
  });
}

/**
 * Get WebSocket server stats.
 */
function getStats() {
  return {
    connected: clients.size,
    initialized: !!wss,
  };
}

function getWss() { return wss; }
export { initWebSocket, broadcast, broadcastJobUpdate, getStats, getWss };
export default { initWebSocket, broadcast, broadcastJobUpdate, getStats, getWss };
