/**
 * FinIQ Server — Express entry point
 */

import express from "express";
import cors from "cors";
import { createServer } from "http";
import config from "./lib/config.mjs";
import routes from "./lib/routes.mjs";

const app = express();
const server = createServer(app);

// Middleware
app.use(cors({ origin: "http://localhost:3000" }));
app.use(express.json({ limit: "10mb" }));

// API routes
app.use("/api", routes);

// Start server
server.listen(config.port, () => {
  console.log(`
╔══════════════════════════════════════════╗
║   FinIQ Server v2.0.0                    ║
║   Port: ${String(config.port).padEnd(33)}║
║   Mode: ${String(config.dataMode).padEnd(33)}║
║   Env:  ${String(config.nodeEnv).padEnd(33)}║
╚══════════════════════════════════════════╝
  `);
});

export { server, app };
