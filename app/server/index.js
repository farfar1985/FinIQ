/**
 * FinIQ Server — Express entry point
 */

import express from "express";
import cors from "cors";
import { createServer } from "http";
import config from "./lib/config.mjs";
import routes from "./lib/routes.mjs";
import { initWebSocket, broadcastJobUpdate } from "./lib/websocket.mjs";
import jobBoard from "./lib/job-board.mjs";
import { generalLimiter } from "./lib/rate-limit.mjs";

const app = express();
const server = createServer(app);

// Middleware
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json({ limit: "10mb" }));

// FR6.4: Apply general rate limiting to all API routes (100 RPM default)
app.use("/api", generalLimiter);

// API routes
app.use("/api", routes);

// Initialize WebSocket on the HTTP server
initWebSocket(server);

// Wire job board updates to WebSocket broadcast
jobBoard.setOnJobUpdate(broadcastJobUpdate);

// Start the scheduled job checker
jobBoard.startScheduler();

// Start server
server.listen(config.port, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   FinIQ Server v2.0.0                    ║
║   Port: ${String(config.port).padEnd(33)}║
║   Mode: ${String(config.dataMode).padEnd(33)}║
║   Env:  ${String(config.nodeEnv).padEnd(33)}║
║   WebSocket: /ws                         ║
║   Job Board: active                      ║
╚══════════════════════════════════════════╝
  `);
});

export { server, app };
