/**
 * Response Validation — Validate and sanitize external service responses
 *
 * Ensures responses from services are valid, safe, and match expected types.
 */
/**
 * Validate HTTP response is OK
 */
export declare function validateHttpResponse(response: Response, expectedStatus?: number): boolean;
/**
 * Validate JSON response structure
 */
export declare function validateJsonStructure(data: unknown, schema: Record<string, string>): boolean;
/**
 * Sanitize string from service response
 */
export declare function sanitizeResponseString(value: unknown, maxLength?: number): string;
/**
 * Validate array response
 */
export declare function validateArrayResponse(data: unknown, minLength?: number, maxLength?: number): unknown[];
/**
 * Validate object has required fields
 */
export declare function hasRequiredFields(obj: unknown, fields: string[]): obj is Record<string, unknown>;
/**
 * Validate service response format
 */
export interface ServiceResponse {
    status: 'success' | 'error';
    data?: unknown;
    error?: string;
}
export declare function validateServiceResponse(response: unknown): response is ServiceResponse;
/**
 * Validate and parse service error response
 */
export declare function extractServiceError(response: unknown): string;
/**
 * Validate LLM response format
 */
export declare function validateLlmResponse(response: unknown): boolean;
//# sourceMappingURL=responseValidator.d.ts.map