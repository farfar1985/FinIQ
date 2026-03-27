/**
 * FinIQ Server — Main Entry Point
 * Adapted from Amira Meet Desktop architecture
 * Implements modular server with shared ctx pattern
 */

import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import { config } from './lib/config.mjs';
import * as db from './lib/databricks.mjs';
import { setupRoutes } from './lib/routes.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// CONTEXT OBJECT (shared across all modules)
// ============================================================================

const ctx = {
  // Configuration (immutable)
  config,
  
  // Data connections
  db,
  
  // State (mutable)
  clients: new Set(), // WebSocket clients (future)
  isReady: false,
};

// ============================================================================
// SERVER INITIALIZATION
// ============================================================================

async function startServer() {
  console.log('🚀 FinIQ Server starting...');
  console.log(`📊 Data Mode: ${config.DATA_MODE}`);

  // Initialize database
  try {
    const dbInfo = await db.initDB();
    console.log(`✅ Database initialized: ${dbInfo.mode}, ${dbInfo.orgUnits} org units`);
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    process.exit(1);
  }
  
  // Create Express app
  const app = express();
  
  // Middleware
  app.use(express.json());
  app.use((req, res, next) => {
    // CORS
    res.header('Access-Control-Allow-Origin', config.CLIENT_URL);
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }

    next();
  });

  // Serve static files from client/dist/ (production build)
  const clientDistPath = path.join(__dirname, '../client/dist');
  app.use(express.static(clientDistPath));

  // Setup API routes
  setupRoutes(app, ctx);

  // Fallback to index.html for SPA (all non-API routes)
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next(); // Let API routes handle it
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
  
  // Create HTTP server
  const server = http.createServer(app);
  
  // Start listening
  server.listen(config.PORT, () => {
    ctx.isReady = true;
    console.log(`✅ FinIQ Server ready on port ${config.PORT}`);
    console.log(`📡 API: http://localhost:${config.PORT}/api/health`);
    console.log(`🌐 Client: ${config.CLIENT_URL}`);
  });
  
  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    await db.closeDB();
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
  });
}

// Start the server
startServer().catch(error => {
  console.error('❌ Fatal error during startup:', error);
  process.exit(1);
});
