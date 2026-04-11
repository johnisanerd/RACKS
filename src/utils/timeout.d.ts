/**
 * Timeout Management — Handle network timeouts and circuit breaking
 *
 * Provides timeout handling, retry logic, and circuit breaker patterns.
 */
/**
 * Execute function with timeout
 */
export declare function withTimeout<T>(fn: () => Promise<T>, timeoutMs: number, context?: string): Promise<T>;
/**
 * Circuit breaker to prevent cascading failures
 */
export declare class CircuitBreaker {
    private failureThreshold;
    private resetTimeoutMs;
    private failureCount;
    private lastFailureTime;
    private state;
    constructor(failureThreshold?: number, resetTimeoutMs?: number);
    /**
     * Execute function through circuit breaker
     */
    execute<T>(fn: () => Promise<T>): Promise<T>;
    /**
     * Get current state
     */
    getState(): string;
    /**
     * Reset circuit breaker
     */
    reset(): void;
}
/**
 * Timeout configuration for different operation types
 */
export declare const TIMEOUTS: {
    network: {
        fast: number;
        normal: number;
        slow: number;
        very_slow: number;
    };
    llm: {
        short: number;
        normal: number;
        long: number;
        very_long: number;
    };
    research: {
        query: number;
        section: number;
        reflection: number;
        synthesis: number;
    };
};
/**
 * Get appropriate timeout for operation
 */
export declare function getTimeout(category: 'network' | 'llm' | 'research', level: 'fast' | 'normal' | 'slow' | 'very_slow' | 'short' | 'long' | 'very_long' | 'query' | 'section' | 'reflection' | 'synthesis'): number;
/**
 * Exponential backoff retry helper
 */
export declare function retryWithBackoff<T>(fn: () => Promise<T>, maxAttempts?: number, initialDelayMs?: number, maxDelayMs?: number, context?: string): Promise<T>;
/**
 * Deadline-based execution
 */
export declare function withDeadline<T>(fn: () => Promise<T>, deadlineMs: number, context?: string): Promise<T>;
//# sourceMappingURL=timeout.d.ts.map