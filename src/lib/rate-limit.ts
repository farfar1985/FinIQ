/**
 * FR6.4: Rate Limiting Utility — In-memory per-IP rate limiter
 *
 * Tracks requests per IP address using a Map with sliding window.
 * - Default: 100 requests per minute for regular endpoints
 * - Stricter: 10 requests per minute for chat/LLM endpoints
 * - Returns rate limit headers and allowed/denied status
 * - Auto-cleanup of expired entries every 60 seconds
 */

const WINDOW_MS = 60_000; // 1 minute sliding window

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Auto-cleanup expired entries every 60 seconds
if (typeof setInterval !== "undefined") {
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) {
        buckets.delete(key);
      }
    }
  }, 60_000);
  // Allow process to exit cleanly in Node.js
  if (typeof cleanup === "object" && "unref" in cleanup) {
    (cleanup as NodeJS.Timeout).unref();
  }
}

export interface RateLimitResult {
  allowed: boolean;
  headers: Record<string, string>;
}

/**
 * Check rate limit for a given IP address.
 * @param ip - Client IP address
 * @param limit - Max requests per minute (default: 100)
 * @returns Object with `allowed` boolean and headers to set on the response
 */
export function checkRateLimit(ip: string, limit: number = 100): RateLimitResult {
  const key = `rl:${limit}:${ip}`;
  const now = Date.now();

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(key, bucket);
  }

  bucket.count++;

  const remaining = Math.max(0, limit - bucket.count);
  const resetEpochSeconds = Math.ceil(bucket.resetAt / 1000);

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(limit),
    "X-RateLimit-Remaining": String(remaining),
    "X-RateLimit-Reset": String(resetEpochSeconds),
  };

  if (bucket.count > limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    headers["Retry-After"] = String(retryAfter);
    return { allowed: false, headers };
  }

  return { allowed: true, headers };
}

/**
 * Get current rate limit status for monitoring/admin endpoints.
 */
export function getRateLimitStatus() {
  const now = Date.now();
  const active: Array<{ key: string; count: number; remaining: number; resetsAt: string }> = [];

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt > now) {
      const limitMatch = key.match(/^rl:(\d+):/);
      const limit = limitMatch ? parseInt(limitMatch[1], 10) : 100;
      active.push({
        key,
        count: bucket.count,
        remaining: Math.max(0, limit - bucket.count),
        resetsAt: new Date(bucket.resetAt).toISOString(),
      });
    }
  }

  return {
    activeBuckets: active.length,
    buckets: active,
  };
}
