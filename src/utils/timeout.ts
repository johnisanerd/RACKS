/**
 * Timeout Management — Handle network timeouts and circuit breaking
 *
 * Provides timeout handling, retry logic, and circuit breaker patterns.
 */

import { createLogger } from './logger.js';

const log = createLogger('timeout');

/**
 * Execute function with timeout
 */
export async function withTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number,
  context?: string
): Promise<T> {
  let timeoutHandle: NodeJS.Timeout | null = null;

  try {
    const timeoutPromise = new Promise<T>((_, reject) => {
      timeoutHandle = setTimeout(() => {
        reject(new Error(`Timeout after ${timeoutMs}ms: ${context || 'unknown'}`));
      }, timeoutMs);
    });

    return await Promise.race([fn(), timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

/**
 * Circuit breaker to prevent cascading failures
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold = 5,
    private resetTimeoutMs = 60000
  ) {}

  /**
   * Execute function through circuit breaker
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      // Check if we should try to recover
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = 'half-open';
        log.info('Circuit breaker: transitioning to half-open');
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await fn();

      if (this.state === 'half-open') {
        this.state = 'closed';
        this.failureCount = 0;
        log.info('Circuit breaker: fully recovered');
      }

      return result;
    } catch (error) {
      this.failureCount++;
      this.lastFailureTime = Date.now();

      if (this.failureCount >= this.failureThreshold) {
        this.state = 'open';
        log.warn(`Circuit breaker: opened after ${this.failureCount} failures`);
      }

      throw error;
    }
  }

  /**
   * Get current state
   */
  getState(): string {
    return this.state;
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = 'closed';
    this.failureCount = 0;
    this.lastFailureTime = 0;
  }
}

/**
 * Timeout configuration for different operation types
 */
export const TIMEOUTS = {
  // Network operations
  network: {
    fast: 5000,      // DNS lookup, simple queries
    normal: 15000,   // API calls, basic requests
    slow: 30000,     // Large transfers, complex operations
    very_slow: 60000 // Long-running operations
  },

  // LLM operations
  llm: {
    short: 30000,    // Quick inference
    normal: 60000,   // Standard generation
    long: 120000,    // Complex generation
    very_long: 300000 // Very long outputs
  },

  // Research phase operations
  research: {
    query: 15000,        // Individual query
    section: 120000,     // Full section research
    reflection: 30000,   // Gap analysis
    synthesis: 60000     // Report generation
  }
};

/**
 * Get appropriate timeout for operation
 */
export function getTimeout(
  category: 'network' | 'llm' | 'research',
  level: 'fast' | 'normal' | 'slow' | 'very_slow' | 'short' | 'long' | 'very_long' | 'query' | 'section' | 'reflection' | 'synthesis'
): number {
  const config = TIMEOUTS[category] as Record<string, number>;
  return config[level as keyof typeof config] || 30000;
}

/**
 * Exponential backoff retry helper
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  initialDelayMs = 1000,
  maxDelayMs = 30000,
  context?: string
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts - 1) {
        // Calculate delay with exponential backoff
        const delay = Math.min(
          initialDelayMs * Math.pow(2, attempt),
          maxDelayMs
        );

        log.warn(
          `Retry attempt ${attempt + 1}/${maxAttempts} for ${context || 'unknown'}: ` +
          `waiting ${delay}ms`
        );

        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('All retry attempts exhausted');
}

/**
 * Deadline-based execution
 */
export async function withDeadline<T>(
  fn: () => Promise<T>,
  deadlineMs: number,
  context?: string
): Promise<T> {
  const startTime = Date.now();
  const elapsedMs = (): number => Date.now() - startTime;

  if (elapsedMs() > deadlineMs) {
    throw new Error(`Deadline exceeded before execution: ${context || 'unknown'}`);
  }

  return withTimeout(fn, deadlineMs - elapsedMs(), context);
}
