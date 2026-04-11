/**
 * Rate Limiter — Prevent overloading services and handle backpressure
 *
 * Token bucket algorithm for fair rate limiting and backpressure handling.
 */
import { createLogger } from './logger.js';
const log = createLogger('rate-limiter');
/**
 * Token bucket rate limiter
 */
export class RateLimiter {
    constructor(capacity = 100, refillRatePerSecond = 10) {
        this.capacity = capacity;
        this.refillRatePerSecond = refillRatePerSecond;
        this.tokens = capacity;
        this.lastRefill = Date.now();
    }
    /**
     * Try to acquire tokens without waiting
     */
    tryAcquire(tokens = 1) {
        this.refill();
        if (this.tokens >= tokens) {
            this.tokens -= tokens;
            return true;
        }
        return false;
    }
    /**
     * Acquire tokens, waiting if necessary
     */
    async acquire(tokens = 1, timeoutMs = 30000) {
        const startTime = Date.now();
        while (Date.now() - startTime < timeoutMs) {
            if (this.tryAcquire(tokens)) {
                return true;
            }
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        log.warn(`Rate limiter: timeout waiting for ${tokens} tokens`);
        return false;
    }
    /**
     * Refill tokens based on elapsed time
     */
    refill() {
        const now = Date.now();
        const elapsedMs = now - this.lastRefill;
        const elapsedSeconds = elapsedMs / 1000;
        const tokensToAdd = elapsedSeconds * this.refillRatePerSecond;
        this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
        this.lastRefill = now;
    }
    /**
     * Get current token count
     */
    getTokens() {
        this.refill();
        return this.tokens;
    }
    /**
     * Reset limiter
     */
    reset() {
        this.tokens = this.capacity;
        this.lastRefill = Date.now();
    }
}
/**
 * Multi-limiter for different service types
 */
export class ServiceRateLimiters {
    constructor() {
        this.limiters = new Map();
    }
    /**
     * Get or create limiter for service
     */
    get(service, capacity = 100, rate = 10) {
        const key = service.toLowerCase();
        if (!this.limiters.has(key)) {
            this.limiters.set(key, new RateLimiter(capacity, rate));
        }
        return this.limiters.get(key);
    }
    /**
     * Create limiter with preset
     */
    createWithPreset(service, preset) {
        const config = ServiceRateLimiters.PRESETS[preset];
        return this.get(service, config.capacity, config.rate);
    }
}
/**
 * Predefined limiters for common services
 */
ServiceRateLimiters.PRESETS = {
    ollama: { capacity: 50, rate: 10 }, // 10 req/sec, burst 50
    wayfarer: { capacity: 20, rate: 5 }, // 5 req/sec, burst 20
    embedding: { capacity: 100, rate: 20 }, // 20 req/sec, burst 100
    youtube: { capacity: 10, rate: 2 }, // 2 req/sec, burst 10
};
/**
 * Adaptive rate limiter that adjusts based on error rates
 */
export class AdaptiveRateLimiter extends RateLimiter {
    constructor(capacity = 100, refillRate = 10, backoffMultiplier = 0.5, recoveryMultiplier = 1.1) {
        super(capacity, refillRate);
        this.backoffMultiplier = backoffMultiplier;
        this.recoveryMultiplier = recoveryMultiplier;
        this.errorCount = 0;
        this.successCount = 0;
        this.minRate = refillRate * 0.1;
        this.maxRate = refillRate * 2;
    }
    /**
     * Record successful operation
     */
    recordSuccess() {
        this.successCount++;
        this.attemptRecovery();
    }
    /**
     * Record failed operation
     */
    recordError() {
        this.errorCount++;
        this.backoff();
    }
    /**
     * Backoff on errors
     */
    backoff() {
        const errorRate = this.errorCount / Math.max(this.successCount + this.errorCount, 1);
        if (errorRate > 0.1) {
            // High error rate, reduce rate
            const currentRate = this.refillRatePerSecond;
            const newRate = Math.max(this.minRate, currentRate * this.backoffMultiplier);
            log.warn(`Rate limiting: backing off (error rate: ${(errorRate * 100).toFixed(1)}%)`);
            this.refillRatePerSecond = newRate;
        }
        // Reset counters periodically
        if (this.errorCount + this.successCount > 1000) {
            this.errorCount = Math.floor(this.errorCount * 0.1);
            this.successCount = Math.floor(this.successCount * 0.1);
        }
    }
    /**
     * Try to recover rate
     */
    attemptRecovery() {
        const errorRate = this.errorCount / Math.max(this.successCount + this.errorCount, 1);
        if (errorRate < 0.01 && this.refillRatePerSecond < this.maxRate) {
            // Low error rate, try to increase rate
            const currentRate = this.refillRatePerSecond;
            const newRate = Math.min(this.maxRate, currentRate * this.recoveryMultiplier);
            this.refillRatePerSecond = newRate;
        }
    }
}
/**
 * Global rate limiters
 */
export const rateLimiters = new ServiceRateLimiters();
//# sourceMappingURL=rateLimiter.js.map