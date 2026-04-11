/**
 * Deduplication Cache — Prevent duplicate research requests
 *
 * Caches research queries and results to avoid redundant work.
 * Uses hashing for quick lookup and TTL-based expiration.
 */
/**
 * In-memory cache with TTL and deduplication
 */
export declare class DeduplicationCache<T> {
    private cache;
    private defaultTtlMs;
    private maxSize;
    constructor(defaultTtlMs?: number, maxSize?: number);
    /**
     * Get value from cache
     */
    get(key: string): T | null;
    /**
     * Set value in cache
     */
    set(key: string, value: T, ttlMs?: number): void;
    /**
     * Check if key exists and is not expired
     */
    has(key: string): boolean;
    /**
     * Get or compute value
     */
    getOrCompute<R extends T>(key: string, fn: () => Promise<R>, ttlMs?: number): Promise<R>;
    /**
     * Clear entire cache
     */
    clear(): void;
    /**
     * Evict oldest entry
     */
    private evictOldest;
    /**
     * Get cache statistics
     */
    stats(): {
        size: number;
        hits: number;
        misses: number;
    };
}
/**
 * Query deduplication for research phase
 */
export declare class QueryDeduplicator {
    private seenQueries;
    private cache;
    /**
     * Deduplicate a list of queries
     */
    deduplicateQueries(queries: string[]): string[];
    /**
     * Check if query has been seen
     */
    hasSeen(query: string): boolean;
    /**
     * Reset deduplicator for new research session
     */
    reset(): void;
    /**
     * Normalize query for comparison
     */
    private normalizeQuery;
}
/**
 * Global cache instances
 */
export declare const queryCache: DeduplicationCache<string[]>;
export declare const dataCache: DeduplicationCache<unknown>;
export declare const queryDeduplica: QueryDeduplicator;
//# sourceMappingURL=deduplicationCache.d.ts.map