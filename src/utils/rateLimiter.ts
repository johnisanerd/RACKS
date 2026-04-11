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
  private tokens: number;
  private lastRefill: number;
  private readonly capacity: number;
  private readonly refillRatePerSecond: number;

  constructor(capacity = 100, refillRatePerSecond = 10) {
    this.capacity = capacity;
    this.refillRatePerSecond = refillRatePerSecond;
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  /**
   * Try to acquire tokens without waiting
   */
  tryAcquire(tokens = 1): boolean {
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
  async acquire(tokens = 1, timeoutMs = 30000): Promise<boolean> {
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
  private refill(): void {
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
  getTokens(): number {
    this.refill();
    return this.tokens;
  }

  /**
   * Reset limiter
   */
  reset(): void {
    this.tokens = this.capacity;
    this.lastRefill = Date.now();
  }
}

/**
 * Multi-limiter for different service types
 */
export class ServiceRateLimiters {
  private limiters = new Map<string, RateLimiter>();

  /**
   * Get or create limiter for service
   */
  get(service: string, capacity = 100, rate = 10): RateLimiter {
    const key = service.toLowerCase();

    if (!this.limiters.has(key)) {
      this.limiters.set(key, new RateLimiter(capacity, rate));
    }

    return this.limiters.get(key)!;
  }

  /**
   * Predefined limiters for common services
   */
  static readonly PRESETS = {
    ollama: { capacity: 50, rate: 10 },      // 10 req/sec, burst 50
    wayfarer: { capacity: 20, rate: 5 },     // 5 req/sec, burst 20
    embedding: { capacity: 100, rate: 20 },  // 20 req/sec, burst 100
    youtube: { capacity: 10, rate: 2 },      // 2 req/sec, burst 10
  } as const;

  /**
   * Create limiter with preset
   */
  createWithPreset(
    service: string,
    preset: keyof typeof ServiceRateLimiters.PRESETS
  ): RateLimiter {
    const config = ServiceRateLimiters.PRESETS[preset];
    return this.get(service, config.capacity, config.rate);
  }
}

/**
 * Adaptive rate limiter that adjusts based on error rates
 */
export class AdaptiveRateLimiter extends RateLimiter {
  private errorCount = 0;
  private successCount = 0;
  private readonly minRate: number;
  private readonly maxRate: number;

  constructor(
    capacity = 100,
    refillRate = 10,
    private readonly backoffMultiplier = 0.5,
    private readonly recoveryMultiplier = 1.1
  ) {
    super(capacity, refillRate);
    this.minRate = refillRate * 0.1;
    this.maxRate = refillRate * 2;
  }

  /**
   * Record successful operation
   */
  recordSuccess(): void {
    this.successCount++;
    this.attemptRecovery();
  }

  /**
   * Record failed operation
   */
  recordError(): void {
    this.errorCount++;
    this.backoff();
  }

  /**
   * Backoff on errors
   */
  private backoff(): void {
    const errorRate = this.errorCount / Math.max(this.successCount + this.errorCount, 1);

    if (errorRate > 0.1) {
      // High error rate, reduce rate
      const currentRate = this.refillRatePerSecond;
      const newRate = Math.max(this.minRate, currentRate * this.backoffMultiplier);
      log.warn(`Rate limiting: backing off (error rate: ${(errorRate * 100).toFixed(1)}%)`);
      (this as any).refillRatePerSecond = newRate;
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
  private attemptRecovery(): void {
    const errorRate = this.errorCount / Math.max(this.successCount + this.errorCount, 1);

    if (errorRate < 0.01 && this.refillRatePerSecond < this.maxRate) {
      // Low error rate, try to increase rate
      const currentRate = this.refillRatePerSecond;
      const newRate = Math.min(this.maxRate, currentRate * this.recoveryMultiplier);
      (this as any).refillRatePerSecond = newRate;
    }
  }
}

/**
 * Global rate limiters
 */
export const rateLimiters = new ServiceRateLimiters();
