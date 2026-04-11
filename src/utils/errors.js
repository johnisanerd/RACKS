/**
 * Error Handling — Custom error types for the research pipeline
 *
 * Defines a hierarchy of error types that can be caught and handled
 * specifically throughout the research orchestration process.
 */
/**
 * Base error class for all research-related errors
 */
export class ResearchError extends Error {
    constructor(code, message, retryable = false) {
        super(message);
        this.name = 'ResearchError';
        this.code = code;
        this.retryable = retryable;
        this.timestamp = new Date();
        Object.setPrototypeOf(this, ResearchError.prototype);
    }
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            retryable: this.retryable,
            timestamp: this.timestamp.toISOString(),
        };
    }
}
/**
 * Error during research planning phase
 */
export class PlanningError extends ResearchError {
    constructor(message, retryable = false) {
        super('PLANNING_ERROR', message, retryable);
        this.name = 'PlanningError';
        Object.setPrototypeOf(this, PlanningError.prototype);
    }
}
/**
 * Error during fact extraction from web pages
 */
export class ExtractionError extends ResearchError {
    constructor(message, retryable = true) {
        super('EXTRACTION_ERROR', message, retryable);
        this.name = 'ExtractionError';
        Object.setPrototypeOf(this, ExtractionError.prototype);
    }
}
/**
 * Error during research orchestration/subagent deployment
 */
export class ResearchOrchestratorError extends ResearchError {
    constructor(message, retryable = false) {
        super('ORCHESTRATOR_ERROR', message, retryable);
        this.name = 'ResearchOrchestratorError';
        Object.setPrototypeOf(this, ResearchOrchestratorError.prototype);
    }
}
/**
 * Error during reflection/gap analysis phase
 */
export class ReflectionError extends ResearchError {
    constructor(message, retryable = false) {
        super('REFLECTION_ERROR', message, retryable);
        this.name = 'ReflectionError';
        Object.setPrototypeOf(this, ReflectionError.prototype);
    }
}
/**
 * Error during synthesis/report generation phase
 */
export class SynthesisError extends ResearchError {
    constructor(message, retryable = false) {
        super('SYNTHESIS_ERROR', message, retryable);
        this.name = 'SynthesisError';
        Object.setPrototypeOf(this, SynthesisError.prototype);
    }
}
/**
 * Error during subagent task execution
 */
export class SubagentError extends ResearchError {
    constructor(message, retryable = true, subagentId, taskId) {
        super('SUBAGENT_ERROR', message, retryable);
        this.name = 'SubagentError';
        this.subagentId = subagentId;
        this.taskId = taskId;
        Object.setPrototypeOf(this, SubagentError.prototype);
    }
}
/**
 * Error communicating with external services (Ollama, Wayfarer, etc.)
 */
export class ServiceError extends ResearchError {
    constructor(serviceName, message, retryable = true, statusCode) {
        super('SERVICE_ERROR', `${serviceName}: ${message}`, retryable);
        this.name = 'ServiceError';
        this.serviceName = serviceName;
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, ServiceError.prototype);
    }
}
/**
 * Error with LLM inference (Ollama)
 */
export class OllamaError extends ServiceError {
    constructor(message, retryable = true, statusCode) {
        super('Ollama', message, retryable, statusCode);
        this.name = 'OllamaError';
        Object.setPrototypeOf(this, OllamaError.prototype);
    }
}
/**
 * Error with web scraping/research service (Wayfarer)
 */
export class WayfarerError extends ServiceError {
    constructor(message, retryable = true, statusCode) {
        super('Wayfarer', message, retryable, statusCode);
        this.name = 'WayfarerError';
        Object.setPrototypeOf(this, WayfarerError.prototype);
    }
}
/**
 * Error with configuration or environment
 */
export class ConfigurationError extends ResearchError {
    constructor(message) {
        super('CONFIGURATION_ERROR', message, false);
        this.name = 'ConfigurationError';
        Object.setPrototypeOf(this, ConfigurationError.prototype);
    }
}
/**
 * Error with input validation
 */
export class ValidationError extends ResearchError {
    constructor(message, field) {
        super('VALIDATION_ERROR', message, false);
        this.name = 'ValidationError';
        this.field = field;
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}
/**
 * Type guard to check if an error is a ResearchError
 */
export function isResearchError(error) {
    return error instanceof ResearchError;
}
/**
 * Type guard to check if an error is retryable
 */
export function isRetryableError(error) {
    return isResearchError(error) && error.retryable;
}
/**
 * Format error for logging
 */
export function formatError(error) {
    if (isResearchError(error)) {
        return `[${error.code}] ${error.message}`;
    }
    if (error instanceof Error) {
        return `${error.name}: ${error.message}`;
    }
    return String(error);
}
//# sourceMappingURL=errors.js.map