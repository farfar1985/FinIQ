/**
 * FR6.4: External API Gateway — In-memory rate limiter middleware
 *
 * Tracks requests per IP address using a Map.
 * - Default: 100 requests per minute for regular endpoints
 * - Stricter: 10 requests per minute for /api/chat (LLM calls)
 * - Returns 429 Too Many Requests with Retry-After header when exceeded
 * - Auto-cleanup of expired entries every 60 seconds
 */

import config from "./config.mjs";

// Read limits from env or use defaults
const DEFAULT_RPM = parseInt(process.env.RATE_LIMIT_RPM || "100", 10);
const CHAT_RPM = parseInt(process.env.RATE_LIMIT_CHAT_RPM || "10", 10);
const WINDOW_MS = 60_000; // 1 minute

/** @type {Map<string, { count: number; resetAt: number }>} */
const buckets = new Map();

// Auto-cleanup expired entries every 60 seconds
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}, 60_000);

// Allow the process to exit cleanly
if (cleanupInterval.unref) cleanupInterval.unref();

/**
 * Create a rate limiter middleware for a given requests-per-minute limit.
 * @param {number} maxRequests — max requests per window per IP
 * @returns Express middleware
 */
export function rateLimiter(maxRequests) {
  return (req, res, next) => {
    const ip = req.ip || req.socket?.remoteAddress || "unknown";
    const prefix = maxRequests === DEFAULT_RPM ? "general" : `limit-${maxRequests}`;
    const key = `${prefix}:${ip}`;
    const now = Date.now();

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + WINDOW_MS };
      buckets.set(key, bucket);
    }

    bucket.count++;

    // Set rate limit headers
    res.set("X-RateLimit-Limit", String(maxRequests));
    res.set("X-RateLimit-Remaining", String(Math.max(0, maxRequests - bucket.count)));
    res.set("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > maxRequests) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        error: "Too Many Requests",
        message: `Rate limit exceeded. Max ${maxRequests} requests per minute.`,
        retryAfter,
      });
    }

    next();
  };
}

/** General rate limiter — 100 RPM (configurable via RATE_LIMIT_RPM) */
export const generalLimiter = rateLimiter(DEFAULT_RPM);

/** Stricter rate limiter for chat/LLM — 10 RPM (configurable via RATE_LIMIT_CHAT_RPM) */
export const chatLimiter = rateLimiter(CHAT_RPM);

/**
 * Get current rate limit status for the gateway status endpoint.
 * @returns {{ config: object, activeBuckets: number, buckets: object[] }}
 */
export function getRateLimitStatus() {
  const now = Date.now();
  const activeBuckets = [];
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt > now) {
      activeBuckets.push({
        key,
        count: bucket.count,
        remaining: key.startsWith("general")
          ? Math.max(0, DEFAULT_RPM - bucket.count)
          : Math.max(0, CHAT_RPM - bucket.count),
        resetsAt: new Date(bucket.resetAt).toISOString(),
      });
    }
  }

  return {
    config: {
      general: { maxRequestsPerMinute: DEFAULT_RPM, windowMs: WINDOW_MS },
      chat: { maxRequestsPerMinute: CHAT_RPM, windowMs: WINDOW_MS },
    },
    activeBuckets: activeBuckets.length,
    buckets: activeBuckets,
  };
}
