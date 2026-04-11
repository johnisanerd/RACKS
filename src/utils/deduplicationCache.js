/**
 * Deduplication Cache — Prevent duplicate research requests
 *
 * Caches research queries and results to avoid redundant work.
 * Uses hashing for quick lookup and TTL-based expiration.
 */
import { createHash } from 'crypto';
import { createLogger } from './logger.js';
const log = createLogger('deduplication-cache');
/**
 * Hash a string for cache key
 */
function hashKey(key) {
    return createHash('sha256').update(key).digest('hex').slice(0, 16);
}
/**
 * In-memory cache with TTL and deduplication
 */
export class DeduplicationCache {
    constructor(defaultTtlMs = 3600000, maxSize = 1000) {
        this.cache = new Map();
        this.defaultTtlMs = defaultTtlMs;
        this.maxSize = maxSize;
    }
    /**
     * Get value from cache
     */
    get(key) {
        const hashedKey = hashKey(key);
        const entry = this.cache.get(hashedKey);
        if (!entry) {
            return null;
        }
        // Check if expired
        const now = Date.now();
        if (now - entry.timestamp > entry.ttlMs) {
            this.cache.delete(hashedKey);
            return null;
        }
        return entry.value;
    }
    /**
     * Set value in cache
     */
    set(key, value, ttlMs) {
        const hashedKey = hashKey(key);
        // Enforce max size
        if (this.cache.size >= this.maxSize) {
            this.evictOldest();
        }
        this.cache.set(hashedKey, {
            key: hashedKey,
            value,
            timestamp: Date.now(),
            ttlMs: ttlMs || this.defaultTtlMs
        });
    }
    /**
     * Check if key exists and is not expired
     */
    has(key) {
        return this.get(key) !== null;
    }
    /**
     * Get or compute value
     */
    async getOrCompute(key, fn, ttlMs) {
        const cached = this.get(key);
        if (cached !== null) {
            log.debug(`Cache hit: ${key.slice(0, 20)}`);
            return cached;
        }
        log.debug(`Cache miss: ${key.slice(0, 20)}, computing...`);
        const value = await fn();
        this.set(key, value, ttlMs);
        return value;
    }
    /**
     * Clear entire cache
     */
    clear() {
        this.cache.clear();
    }
    /**
     * Evict oldest entry
     */
    evictOldest() {
        let oldest = null;
        let oldestTime = Infinity;
        for (const [key, entry] of this.cache.entries()) {
            if (entry.timestamp < oldestTime) {
                oldest = key;
                oldestTime = entry.timestamp;
            }
        }
        if (oldest) {
            this.cache.delete(oldest);
        }
    }
    /**
     * Get cache statistics
     */
    stats() {
        return {
            size: this.cache.size,
            hits: 0, // Would need to track separately
            misses: 0 // Would need to track separately
        };
    }
}
/**
 * Query deduplication for research phase
 */
export class QueryDeduplicator {
    constructor() {
        this.seenQueries = new Set();
        this.cache = new DeduplicationCache();
    }
    /**
     * Deduplicate a list of queries
     */
    deduplicateQueries(queries) {
        const unique = [];
        for (const query of queries) {
            const normalized = this.normalizeQuery(query);
            if (!this.seenQueries.has(normalized)) {
                this.seenQueries.add(normalized);
                unique.push(query);
            }
        }
        return unique;
    }
    /**
     * Check if query has been seen
     */
    hasSeen(query) {
        return this.seenQueries.has(this.normalizeQuery(query));
    }
    /**
     * Reset deduplicator for new research session
     */
    reset() {
        this.seenQueries.clear();
        this.cache.clear();
    }
    /**
     * Normalize query for comparison
     */
    normalizeQuery(query) {
        return query
            .toLowerCase()
            .trim()
            .replace(/\s+/g, ' ')
            .replace(/[,.!?;:—]/g, '');
    }
}
/**
 * Global cache instances
 */
export const queryCache = new DeduplicationCache(3600000);
export const dataCache = new DeduplicationCache(1800000);
export const queryDeduplica = new QueryDeduplicator();
//# sourceMappingURL=deduplicationCache.js.map