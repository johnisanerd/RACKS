/**
 * Rate Limiter — Prevent overloading services and handle backpressure
 *
 * Token bucket algorithm for fair rate limiting and backpressure handling.
 */
/**
 * Token bucket rate limiter
 */
export declare class RateLimiter {
    private tokens;
    private lastRefill;
    private readonly capacity;
    protected refillRatePerSecond: number;
    constructor(capacity?: number, refillRatePerSecond?: number);
    /**
     * Try to acquire tokens without waiting
     */
    tryAcquire(tokens?: number): boolean;
    /**
     * Acquire tokens, waiting if necessary
     */
    acquire(tokens?: number, timeoutMs?: number): Promise<boolean>;
    /**
     * Refill tokens based on elapsed time
     */
    private refill;
    /**
     * Get current token count
     */
    getTokens(): number;
    /**
     * Reset limiter
     */
    reset(): void;
}
/**
 * Multi-limiter for different service types
 */
export declare class ServiceRateLimiters {
    private limiters;
    /**
     * Get or create limiter for service
     */
    get(service: string, capacity?: number, rate?: number): RateLimiter;
    /**
     * Predefined limiters for common services
     */
    static readonly PRESETS: {
        readonly ollama: {
            readonly capacity: 50;
            readonly rate: 10;
        };
        readonly wayfarer: {
            readonly capacity: 20;
            readonly rate: 5;
        };
        readonly embedding: {
            readonly capacity: 100;
            readonly rate: 20;
        };
        readonly youtube: {
            readonly capacity: 10;
            readonly rate: 2;
        };
    };
    /**
     * Create limiter with preset
     */
    createWithPreset(service: string, preset: keyof typeof ServiceRateLimiters.PRESETS): RateLimiter;
}
/**
 * Adaptive rate limiter that adjusts based on error rates
 */
export declare class AdaptiveRateLimiter extends RateLimiter {
    private readonly backoffMultiplier;
    private readonly recoveryMultiplier;
    private errorCount;
    private successCount;
    private readonly minRate;
    private readonly maxRate;
    constructor(capacity?: number, refillRate?: number, backoffMultiplier?: number, recoveryMultiplier?: number);
    /**
     * Record successful operation
     */
    recordSuccess(): void;
    /**
     * Record failed operation
     */
    recordError(): void;
    /**
     * Backoff on errors
     */
    private backoff;
    /**
     * Try to recover rate
     */
    private attemptRecovery;
}
/**
 * Global rate limiters
 */
export declare const rateLimiters: ServiceRateLimiters;
//# sourceMappingURL=rateLimiter.d.ts.map