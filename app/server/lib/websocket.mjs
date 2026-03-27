/**
 * FinIQ WebSocket Handler
 * FR8.3: Real-time SSE updates for job progress and query results
 * Phase 3: Full WebSocket implementation with job board integration
 */

// Connected clients registry: Map<clientId, WebSocket>
const clients = new Map();

// Job subscriptions: Map<jobId, Set<clientId>>
const jobSubscriptions = new Map();

/**
 * Handle WebSocket connection upgrade
 */
export function isUpgradeAuthorized(req) {
  // Future: Check auth token from headers
  return true;
}

/**
 * Reject WebSocket upgrade
 */
export function rejectUpgrade(socket, message) {
  socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
  socket.destroy();
  console.warn('🚫 [websocket] Rejected upgrade:', message);
}

/**
 * Handle WebSocket connection
 */
export function handleWssConnection(ws, req, ctx) {
  const clientId = `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  clients.set(clientId, ws);

  console.log(`✅ [websocket] Client connected: ${clientId} (${clients.size} total)`);

  // Send welcome message
  ws.send(JSON.stringify({
    type: 'welcome',
    clientId,
    timestamp: new Date().toISOString(),
    message: 'Connected to FinIQ real-time updates',
  }));

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📨 [websocket] ${clientId}: ${message.type}`);

      handleClientMessage(ws, clientId, message, ctx);
    } catch (err) {
      console.error('❌ [websocket] Message parse error:', err.message);
      ws.send(JSON.stringify({
        type: 'error',
        error: 'Invalid JSON message',
        timestamp: new Date().toISOString(),
      }));
    }
  });

  // Handle errors
  ws.on('error', (err) => {
    console.error(`❌ [websocket] Error for ${clientId}:`, err.message);
  });

  // Handle close
  ws.on('close', () => {
    clients.delete(clientId);

    // Clean up job subscriptions
    for (const [jobId, subscribers] of jobSubscriptions.entries()) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        jobSubscriptions.delete(jobId);
      }
    }

    console.log(`👋 [websocket] Client disconnected: ${clientId} (${clients.size} remaining)`);
  });
}

/**
 * Handle client messages
 */
function handleClientMessage(ws, clientId, message, ctx) {
  switch (message.type) {
    case 'ping':
      ws.send(JSON.stringify({
        type: 'pong',
        timestamp: new Date().toISOString(),
      }));
      break;

    case 'subscribe_job':
      if (message.jobId) {
        subscribeToJob(clientId, message.jobId);
        ws.send(JSON.stringify({
          type: 'subscribed',
          jobId: message.jobId,
          timestamp: new Date().toISOString(),
        }));
      }
      break;

    case 'unsubscribe_job':
      if (message.jobId) {
        unsubscribeFromJob(clientId, message.jobId);
        ws.send(JSON.stringify({
          type: 'unsubscribed',
          jobId: message.jobId,
          timestamp: new Date().toISOString(),
        }));
      }
      break;

    case 'subscribe_all_jobs':
      subscribeToAllJobs(clientId);
      ws.send(JSON.stringify({
        type: 'subscribed_all',
        timestamp: new Date().toISOString(),
      }));
      break;

    default:
      ws.send(JSON.stringify({
        type: 'error',
        error: `Unknown message type: ${message.type}`,
        timestamp: new Date().toISOString(),
      }));
  }
}

/**
 * Subscribe client to job updates
 */
function subscribeToJob(clientId, jobId) {
  if (!jobSubscriptions.has(jobId)) {
    jobSubscriptions.set(jobId, new Set());
  }
  jobSubscriptions.get(jobId).add(clientId);
  console.log(`🔔 [websocket] ${clientId} subscribed to job ${jobId}`);
}

/**
 * Unsubscribe client from job updates
 */
function unsubscribeFromJob(clientId, jobId) {
  if (jobSubscriptions.has(jobId)) {
    jobSubscriptions.get(jobId).delete(clientId);
    if (jobSubscriptions.get(jobId).size === 0) {
      jobSubscriptions.delete(jobId);
    }
  }
  console.log(`🔕 [websocket] ${clientId} unsubscribed from job ${jobId}`);
}

/**
 * Subscribe client to all job updates
 */
function subscribeToAllJobs(clientId) {
  if (!jobSubscriptions.has('*')) {
    jobSubscriptions.set('*', new Set());
  }
  jobSubscriptions.get('*').add(clientId);
  console.log(`🔔 [websocket] ${clientId} subscribed to all jobs`);
}

/**
 * Broadcast job update to all subscribed clients
 * Called by job-board.mjs when job status changes
 */
export function broadcastJobUpdate(jobId, jobData) {
  const message = JSON.stringify({
    type: 'job_update',
    jobId,
    job: jobData,
    timestamp: new Date().toISOString(),
  });

  // Send to clients subscribed to this specific job
  const subscribers = jobSubscriptions.get(jobId) || new Set();

  // Send to clients subscribed to all jobs
  const allSubscribers = jobSubscriptions.get('*') || new Set();

  const allRecipients = new Set([...subscribers, ...allSubscribers]);

  let sent = 0;
  for (const clientId of allRecipients) {
    const ws = clients.get(clientId);
    if (ws && ws.readyState === 1) { // WebSocket.OPEN === 1
      ws.send(message);
      sent++;
    }
  }

  if (sent > 0) {
    console.log(`📡 [websocket] Broadcast job ${jobId} update to ${sent} clients`);
  }
}

/**
 * Broadcast query result to all connected clients
 * Used for real-time query result streaming
 */
export function broadcastQueryResult(query, result) {
  const message = JSON.stringify({
    type: 'query_result',
    query,
    result,
    timestamp: new Date().toISOString(),
  });

  let sent = 0;
  for (const [clientId, ws] of clients.entries()) {
    if (ws.readyState === 1) {
      ws.send(message);
      sent++;
    }
  }

  if (sent > 0) {
    console.log(`📡 [websocket] Broadcast query result to ${sent} clients`);
  }
}

/**
 * Get connection stats
 */
export function getStats() {
  return {
    connectedClients: clients.size,
    activeSubscriptions: jobSubscriptions.size,
  };
}
