/**
 * In-memory query result cache.
 * Keyed by normalized query string (or composite key for reports).
 * TTL-based expiration — stale entries are lazily evicted.
 * Max entries capped to prevent unbounded memory growth.
 */

const DEFAULT_TTL = 10 * 60 * 1000; // 10 minutes
const MAX_ENTRIES = 200;

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  ttl: number;
}

const store = new Map<string, CacheEntry>();

/** Normalize a query string into a stable cache key */
function normalizeKey(raw: string): string {
  return raw.toLowerCase().trim().replace(/\s+/g, " ");
}

/** Build a composite key for report queries */
export function reportKey(type: string, unitAlias?: string, dateId?: number): string {
  return `report:${type}:${(unitAlias || "default").toLowerCase()}:${dateId || 0}`;
}

/** Get a cached value. Returns undefined on miss or expiry. */
export function cacheGet<T = unknown>(key: string): T | undefined {
  const entry = store.get(normalizeKey(key));
  if (!entry) return undefined;
  if (Date.now() - entry.timestamp > entry.ttl) {
    store.delete(normalizeKey(key));
    return undefined;
  }
  return entry.data as T;
}

/** Store a value in the cache. */
export function cacheSet<T = unknown>(key: string, data: T, ttl = DEFAULT_TTL): void {
  // Evict oldest entries if at capacity
  if (store.size >= MAX_ENTRIES) {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    for (const [k, v] of store) {
      if (v.timestamp < oldestTime) {
        oldestTime = v.timestamp;
        oldestKey = k;
      }
    }
    if (oldestKey) store.delete(oldestKey);
  }
  store.set(normalizeKey(key), { data, timestamp: Date.now(), ttl });
}

/** Get cache stats (for debugging / health endpoint) */
export function cacheStats(): { size: number; maxEntries: number; defaultTtlMs: number } {
  return { size: store.size, maxEntries: MAX_ENTRIES, defaultTtlMs: DEFAULT_TTL };
}
