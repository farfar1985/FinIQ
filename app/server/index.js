/**
 * FinIQ Server — Express entry point
 */

import express from "express";
import cors from "cors";
import { createServer } from "http";
import config from "./lib/config.mjs";
import routes from "./lib/routes.mjs";
import { initWebSocket, broadcastJobUpdate, getWss } from "./lib/websocket.mjs";
import { handleVoiceConnection } from "./lib/realtime-agent.mjs";
import jobBoard from "./lib/job-board.mjs";
import { generalLimiter } from "./lib/rate-limit.mjs";
import { WebSocketServer } from "ws";

const app = express();
const server = createServer(app);

// Middleware
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json({ limit: "10mb" }));

// FR6.4: Apply general rate limiting to all API routes (100 RPM default)
app.use("/api", generalLimiter);

// API routes
app.use("/api", routes);

// Initialize WebSocket servers (both use noServer: true)
initWebSocket(server);
const jobsWss = getWss();

const voiceWss = new WebSocketServer({ noServer: true });
voiceWss.on("connection", handleVoiceConnection);

// Route ALL WebSocket upgrades by path
server.on("upgrade", (req, socket, head) => {
  const pathname = req.url;
  if (pathname === "/voice-ws") {
    voiceWss.handleUpgrade(req, socket, head, (ws) => {
      voiceWss.emit("connection", ws, req);
    });
  } else if (pathname === "/ws") {
    jobsWss.handleUpgrade(req, socket, head, (ws) => {
      jobsWss.emit("connection", ws, req);
    });
  } else {
    socket.destroy();
  }
});

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
║   Voice Agent: /voice-ws                 ║
╚══════════════════════════════════════════╝
  `);
});

export { server, app };
