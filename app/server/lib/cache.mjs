/**
 * FinIQ In-Memory Cache with TTL
 *
 * Simple Map-based cache for caching PES reports, variance results,
 * and entity lists to achieve sub-second response times on repeated queries.
 */

const DEFAULT_TTL = 300_000; // 5 minutes

class ResultCache {
  constructor() {
    /** @type {Map<string, { value: unknown, expiresAt: number }>} */
    this._store = new Map();
    this._hits = 0;
    this._misses = 0;
  }

  /**
   * Get a cached value. Returns null if not found or expired.
   * @param {string} key
   * @returns {unknown | null}
   */
  get(key) {
    const entry = this._store.get(key);
    if (!entry) {
      this._misses++;
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this._store.delete(key);
      this._misses++;
      return null;
    }
    this._hits++;
    return entry.value;
  }

  /**
   * Store a value with a TTL.
   * @param {string} key
   * @param {unknown} value
   * @param {number} [ttlMs=DEFAULT_TTL] — time-to-live in milliseconds
   */
  set(key, value, ttlMs = DEFAULT_TTL) {
    this._store.set(key, {
      value,
      expiresAt: Date.now() + ttlMs,
    });
  }

  /**
   * Remove a specific key from the cache.
   * @param {string} key
   */
  invalidate(key) {
    this._store.delete(key);
  }

  /**
   * Remove all entries from the cache.
   */
  clear() {
    this._store.clear();
    this._hits = 0;
    this._misses = 0;
  }

  /**
   * Return hit/miss/size statistics.
   * @returns {{ hits: number, misses: number, size: number, hitRate: string }}
   */
  stats() {
    // Prune expired entries before reporting size
    const now = Date.now();
    for (const [key, entry] of this._store) {
      if (now > entry.expiresAt) this._store.delete(key);
    }

    const total = this._hits + this._misses;
    return {
      hits: this._hits,
      misses: this._misses,
      size: this._store.size,
      hitRate: total > 0 ? `${((this._hits / total) * 100).toFixed(1)}%` : "0.0%",
    };
  }
}

const cache = new ResultCache();

export default cache;
