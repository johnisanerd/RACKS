/**
 * Error Handling — Custom error types for the research pipeline
 *
 * Defines a hierarchy of error types that can be caught and handled
 * specifically throughout the research orchestration process.
 */
/**
 * Base error class for all research-related errors
 */
export declare class ResearchError extends Error {
    readonly code: string;
    readonly retryable: boolean;
    readonly timestamp: Date;
    constructor(code: string, message: string, retryable?: boolean);
    toJSON(): {
        name: string;
        code: string;
        message: string;
        retryable: boolean;
        timestamp: string;
    };
}
/**
 * Error during research planning phase
 */
export declare class PlanningError extends ResearchError {
    constructor(message: string, retryable?: boolean);
}
/**
 * Error during fact extraction from web pages
 */
export declare class ExtractionError extends ResearchError {
    constructor(message: string, retryable?: boolean);
}
/**
 * Error during research orchestration/subagent deployment
 */
export declare class ResearchOrchestratorError extends ResearchError {
    constructor(message: string, retryable?: boolean);
}
/**
 * Error during reflection/gap analysis phase
 */
export declare class ReflectionError extends ResearchError {
    constructor(message: string, retryable?: boolean);
}
/**
 * Error during synthesis/report generation phase
 */
export declare class SynthesisError extends ResearchError {
    constructor(message: string, retryable?: boolean);
}
/**
 * Error during subagent task execution
 */
export declare class SubagentError extends ResearchError {
    readonly subagentId?: string;
    readonly taskId?: string;
    constructor(message: string, retryable?: boolean, subagentId?: string, taskId?: string);
}
/**
 * Error communicating with external services (Ollama, Wayfarer, etc.)
 */
export declare class ServiceError extends ResearchError {
    readonly serviceName: string;
    readonly statusCode?: number;
    constructor(serviceName: string, message: string, retryable?: boolean, statusCode?: number);
}
/**
 * Error with LLM inference (Ollama)
 */
export declare class OllamaError extends ServiceError {
    constructor(message: string, retryable?: boolean, statusCode?: number);
}
/**
 * Error with web scraping/research service (Wayfarer)
 */
export declare class WayfarerError extends ServiceError {
    constructor(message: string, retryable?: boolean, statusCode?: number);
}
/**
 * Error with configuration or environment
 */
export declare class ConfigurationError extends ResearchError {
    constructor(message: string);
}
/**
 * Error with input validation
 */
export declare class ValidationError extends ResearchError {
    readonly field?: string;
    constructor(message: string, field?: string);
}
/**
 * Type guard to check if an error is a ResearchError
 */
export declare function isResearchError(error: unknown): error is ResearchError;
/**
 * Type guard to check if an error is retryable
 */
export declare function isRetryableError(error: unknown): boolean;
/**
 * Format error for logging
 */
export declare function formatError(error: unknown): string;
//# sourceMappingURL=errors.d.ts.map