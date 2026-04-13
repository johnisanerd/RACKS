/**
 * Determine recovery strategy based on error type
 */
export function determineRecoveryStrategy(error: any): any;
/**
 * Classify error severity
 */
export function classifyErrorSeverity(error: any): any;
/**
 * Error context tracker for recovery
 */
export class ErrorContextTracker {
    errors: any[];
    maxErrors: number;
    /**
     * Track an error with context
     */
    track(error: any, context: any): {
        message: string;
        context: any;
        timestamp: Date;
        retryable: boolean;
        stackTrace: string;
    };
    /**
     * Get error pattern analysis
     */
    analyzePattern(): {
        mostCommonError: any;
        retryablePercentage: number;
        errorFrequency: Map<any, any>;
        recentErrors: any[];
    };
    /**
     * Clear error history
     */
    clear(): void;
    /**
     * Get all errors
     */
    getAll(): any[];
}
/**
 * State recovery helper
 */
export class StateRecovery {
    savePoints: Map<any, any>;
    /**
     * Save a checkpoint
     */
    save(key: any, state: any): void;
    /**
     * Restore from checkpoint
     */
    restore(key: any): any;
    /**
     * Has checkpoint
     */
    has(key: any): boolean;
    /**
     * Clear checkpoint
     */
    clear(key: any): void;
    /**
     * Get all checkpoints
     */
    getCheckpoints(): Map<any, any>;
}
/**
 * Error recovery strategy
 */
export const RecoveryStrategy: any;
/**
 * Error severity classification
 */
export const ErrorSeverity: any;
/**
 * Global error tracker
 */
export const errorContextTracker: ErrorContextTracker;
export const stateRecovery: StateRecovery;
//# sourceMappingURL=errorContext.d.ts.map