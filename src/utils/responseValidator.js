/**
 * Response Validation — Validate and sanitize external service responses
 *
 * Ensures responses from services are valid, safe, and match expected types.
 */
import { createLogger } from './logger.js';
const log = createLogger('response-validator');
/**
 * Validate HTTP response is OK
 */
export function validateHttpResponse(response, expectedStatus = 200) {
    if (!response || typeof response.status !== 'number') {
        log.warn('Invalid response object');
        return false;
    }
    if (response.status !== expectedStatus) {
        log.warn(`Unexpected status: ${response.status} (expected ${expectedStatus})`);
        return false;
    }
    if (!response.headers?.get('content-type')) {
        log.warn('Missing content-type header');
        return false;
    }
    return true;
}
/**
 * Validate JSON response structure
 */
export function validateJsonStructure(data, schema) {
    if (!data || typeof data !== 'object') {
        log.warn('Invalid JSON structure: not an object');
        return false;
    }
    const obj = data;
    for (const [key, expectedType] of Object.entries(schema)) {
        if (!(key in obj)) {
            log.warn(`Missing required field: ${key}`);
            return false;
        }
        const actualType = typeof obj[key];
        if (actualType !== expectedType) {
            log.warn(`Type mismatch for ${key}: expected ${expectedType}, got ${actualType}`);
            return false;
        }
    }
    return true;
}
/**
 * Sanitize string from service response
 */
export function sanitizeResponseString(value, maxLength = 100000) {
    if (typeof value !== 'string') {
        return '';
    }
    // Remove potentially harmful characters
    let sanitized = value
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F]/g, '') // Remove control characters
        .trim()
        .slice(0, maxLength);
    // Prevent excessive whitespace
    sanitized = sanitized.replace(/\s+/g, ' ');
    return sanitized;
}
/**
 * Validate array response
 */
export function validateArrayResponse(data, minLength = 0, maxLength = 10000) {
    if (!Array.isArray(data)) {
        log.warn('Invalid response: not an array');
        return [];
    }
    if (data.length < minLength) {
        log.warn(`Array too short: ${data.length} < ${minLength}`);
        return [];
    }
    if (data.length > maxLength) {
        log.warn(`Array too long: ${data.length} > ${maxLength}`);
        return data.slice(0, maxLength);
    }
    return data;
}
/**
 * Validate object has required fields
 */
export function hasRequiredFields(obj, fields) {
    if (!obj || typeof obj !== 'object') {
        return false;
    }
    const o = obj;
    return fields.every(field => field in o && o[field] !== null && o[field] !== undefined);
}
export function validateServiceResponse(response) {
    if (!response || typeof response !== 'object') {
        log.warn('Invalid service response: not an object');
        return false;
    }
    const r = response;
    if (typeof r.status !== 'string' || !['success', 'error'].includes(r.status)) {
        log.warn('Invalid status field');
        return false;
    }
    if (r.status === 'error' && typeof r.error !== 'string') {
        log.warn('Error response must have error message');
        return false;
    }
    return true;
}
/**
 * Validate and parse service error response
 */
export function extractServiceError(response) {
    if (!response) {
        return 'Unknown error';
    }
    if (typeof response === 'string') {
        return response.slice(0, 500);
    }
    if (typeof response === 'object') {
        const r = response;
        if (typeof r.error === 'string') {
            return r.error.slice(0, 500);
        }
        if (typeof r.message === 'string') {
            return r.message.slice(0, 500);
        }
        if (r.errors && Array.isArray(r.errors) && r.errors.length > 0) {
            const firstError = r.errors[0];
            if (typeof firstError === 'string') {
                return firstError.slice(0, 500);
            }
            if (typeof firstError === 'object' && typeof firstError.message === 'string') {
                return firstError.message.slice(0, 500);
            }
        }
    }
    return 'Unknown error';
}
/**
 * Validate LLM response format
 */
export function validateLlmResponse(response) {
    if (typeof response !== 'string') {
        log.warn('LLM response must be a string');
        return false;
    }
    if (response.length === 0) {
        log.warn('LLM response is empty');
        return false;
    }
    if (response.length > 100000) {
        log.warn('LLM response exceeds max length');
        return false;
    }
    // Check for common error patterns
    const errorPatterns = ['error', 'failed', 'exception', 'undefined'];
    const lowerResponse = response.toLowerCase();
    if (response.length < 10 && errorPatterns.some(p => lowerResponse.includes(p))) {
        log.warn('Possible error response from LLM');
        return false;
    }
    return true;
}
//# sourceMappingURL=responseValidator.js.map