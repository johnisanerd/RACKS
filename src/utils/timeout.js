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
export async function withTimeout(fn, timeoutMs, context) {
    let timeoutHandle = null;
    try {
        const timeoutPromise = new Promise((_, reject) => {
            timeoutHandle = setTimeout(() => {
                reject(new Error(`Timeout after ${timeoutMs}ms: ${context || 'unknown'}`));
            }, timeoutMs);
        });
        return await Promise.race([fn(), timeoutPromise]);
    }
    finally {
        if (timeoutHandle) {
            clearTimeout(timeoutHandle);
        }
    }
}
/**
 * Circuit breaker to prevent cascading failures
 */
export class CircuitBreaker {
    constructor(failureThreshold = 5, resetTimeoutMs = 60000) {
        this.failureThreshold = failureThreshold;
        this.resetTimeoutMs = resetTimeoutMs;
        this.failureCount = 0;
        this.lastFailureTime = 0;
        this.state = 'closed';
    }
    /**
     * Execute function through circuit breaker
     */
    async execute(fn) {
        if (this.state === 'open') {
            // Check if we should try to recover
            if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
                this.state = 'half-open';
                log.info('Circuit breaker: transitioning to half-open');
            }
            else {
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
        }
        catch (error) {
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
    getState() {
        return this.state;
    }
    /**
     * Reset circuit breaker
     */
    reset() {
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
        fast: 5000, // DNS lookup, simple queries
        normal: 15000, // API calls, basic requests
        slow: 30000, // Large transfers, complex operations
        very_slow: 60000 // Long-running operations
    },
    // LLM operations
    llm: {
        short: 30000, // Quick inference
        normal: 60000, // Standard generation
        long: 120000, // Complex generation
        very_long: 300000 // Very long outputs
    },
    // Research phase operations
    research: {
        query: 15000, // Individual query
        section: 120000, // Full section research
        reflection: 30000, // Gap analysis
        synthesis: 60000 // Report generation
    }
};
/**
 * Get appropriate timeout for operation
 */
export function getTimeout(category, level) {
    const config = TIMEOUTS[category];
    return config[level] || 30000;
}
/**
 * Exponential backoff retry helper
 */
export async function retryWithBackoff(fn, maxAttempts = 3, initialDelayMs = 1000, maxDelayMs = 30000, context) {
    let lastError = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            lastError = error instanceof Error ? error : new Error(String(error));
            if (attempt < maxAttempts - 1) {
                // Calculate delay with exponential backoff
                const delay = Math.min(initialDelayMs * Math.pow(2, attempt), maxDelayMs);
                log.warn(`Retry attempt ${attempt + 1}/${maxAttempts} for ${context || 'unknown'}: ` +
                    `waiting ${delay}ms`);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    throw lastError || new Error('All retry attempts exhausted');
}
/**
 * Deadline-based execution
 */
export async function withDeadline(fn, deadlineMs, context) {
    const startTime = Date.now();
    const elapsedMs = () => Date.now() - startTime;
    if (elapsedMs() > deadlineMs) {
        throw new Error(`Deadline exceeded before execution: ${context || 'unknown'}`);
    }
    return withTimeout(fn, deadlineMs - elapsedMs(), context);
}
//# sourceMappingURL=timeout.js.map