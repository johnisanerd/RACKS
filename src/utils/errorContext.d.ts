/**
 * Error Context — Enhanced error information and recovery tracking
 *
 * Provides detailed error context, stack traces, and recovery options.
 */
/**
 * Enhanced error with context information
 */
export interface ErrorContext {
    message: string;
    code?: string;
    context?: string;
    timestamp: Date;
    retryable: boolean;
    attemptNumber?: number;
    maxAttempts?: number;
    lastError?: Error;
    stackTrace?: string;
    metadata?: Record<string, unknown>;
}
/**
 * Error context tracker for recovery
 */
export declare class ErrorContextTracker {
    private errors;
    private readonly maxErrors;
    /**
     * Track an error with context
     */
    track(error: unknown, context?: string): ErrorContext;
    /**
     * Get error pattern analysis
     */
    analyzePattern(): {
        mostCommonError: string | null;
        retryablePercentage: number;
        errorFrequency: Map<string, number>;
        recentErrors: ErrorContext[];
    };
    /**
     * Clear error history
     */
    clear(): void;
    /**
     * Get all errors
     */
    getAll(): ErrorContext[];
}
/**
 * State recovery helper
 */
export declare class StateRecovery {
    private savePoints;
    /**
     * Save a checkpoint
     */
    save(key: string, state: unknown): void;
    /**
     * Restore from checkpoint
     */
    restore(key: string): unknown | null;
    /**
     * Has checkpoint
     */
    has(key: string): boolean;
    /**
     * Clear checkpoint
     */
    clear(key?: string): void;
    /**
     * Get all checkpoints
     */
    getCheckpoints(): Map<string, unknown>;
}
/**
 * Error recovery strategy
 */
export declare enum RecoveryStrategy {
    RETRY = "retry",
    FALLBACK = "fallback",
    SKIP = "skip",
    ABORT = "abort"
}
/**
 * Determine recovery strategy based on error type
 */
export declare function determineRecoveryStrategy(error: unknown): RecoveryStrategy;
/**
 * Error severity classification
 */
export declare enum ErrorSeverity {
    LOW = "low",// Can be ignored
    MEDIUM = "medium",// Should be handled
    HIGH = "high",// Must be addressed
    CRITICAL = "critical"
}
/**
 * Classify error severity
 */
export declare function classifyErrorSeverity(error: unknown): ErrorSeverity;
/**
 * Global error tracker
 */
export declare const errorContextTracker: ErrorContextTracker;
export declare const stateRecovery: StateRecovery;
//# sourceMappingURL=errorContext.d.ts.map