/**
 * Safe Operations — Defensive programming utilities
 *
 * Wrappers for common operations that handle errors gracefully,
 * prevent null pointer exceptions, and provide fallbacks.
 */
/**
 * Safely parse JSON with fallback
 */
export declare function safeJsonParse<T = unknown>(text: string, fallback: T, context?: string): T;
/**
 * Safely extract object property with fallback
 */
export declare function safeGet<T = unknown>(obj: unknown, path: string, fallback: T): T;
/**
 * Safely invoke a function with error handling
 */
export declare function safeAsync<T>(fn: () => Promise<T>, fallback: T, context?: string, timeout?: number): Promise<T>;
/**
 * Safely invoke synchronous function
 */
export declare function safeSync<T>(fn: () => T, fallback: T, context?: string): T;
/**
 * Safely handle array operations
 */
export declare function safeArray<T>(arr: unknown): T[];
/**
 * Validate and sanitize string input
 */
export declare function sanitizeString(input: unknown, maxLength?: number): string;
/**
 * Check if value is valid number
 */
export declare function isValidNumber(value: unknown): value is number;
/**
 * Check if value exists and is not null/undefined
 */
export declare function exists<T>(value: T | null | undefined): value is T;
/**
 * Safely wait with timeout
 */
export declare function safeWait(ms: number, maxMs?: number): Promise<void>;
/**
 * Safely retry operation with backoff
 */
export declare function safeRetry<T>(fn: () => Promise<T>, maxAttempts?: number, delayMs?: number, context?: string): Promise<T | null>;
/**
 * Safely execute Promise.all with timeout
 */
export declare function safePromiseAll<T>(promises: Promise<T>[], timeoutMs?: number, context?: string): Promise<(T | null)[]>;
/**
 * Safely clear large collections to prevent memory leaks
 */
export declare function clearCollection(collection: Map<unknown, unknown> | Set<unknown>): void;
//# sourceMappingURL=safe.d.ts.map