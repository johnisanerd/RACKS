/**
 * Input Validation — Validate user input and configuration
 *
 * Provides type-safe validation for research questions, URLs, and configuration.
 */
/**
 * Validate a research question
 */
export declare function validateResearchQuestion(question: string): void;
/**
 * Validate a URL
 */
export declare function validateUrl(url: string): void;
/**
 * Validate time duration (e.g., "5m", "2h", "30s")
 */
export declare function validateDuration(duration: string): number;
/**
 * Validate research depth preset
 */
export declare function validateResearchDepth(depth: string): 'sq' | 'qk' | 'nr' | 'ex' | 'mx';
/**
 * Validate confidence threshold (0-1)
 */
export declare function validateConfidenceThreshold(threshold: number): void;
/**
 * Validate coverage percentage (0-100)
 */
export declare function validateCoveragePercentage(coverage: number): void;
/**
 * Validate number of parallel workers
 */
export declare function validateConcurrency(concurrency: number): void;
/**
 * Validate maximum iterations
 */
export declare function validateMaxIterations(iterations: number): void;
//# sourceMappingURL=validation.d.ts.map