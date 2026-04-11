/**
 * Safe Operations — Defensive programming utilities
 *
 * Wrappers for common operations that handle errors gracefully,
 * prevent null pointer exceptions, and provide fallbacks.
 */
import { createLogger } from './logger.js';
const log = createLogger('safe');
/**
 * Safely parse JSON with fallback
 */
export function safeJsonParse(text, fallback, context) {
    try {
        if (!text || typeof text !== 'string') {
            log.warn(`Invalid JSON input: ${context || 'unknown'}`, { text });
            return fallback;
        }
        const parsed = JSON.parse(text);
        return parsed || fallback;
    }
    catch (error) {
        log.warn(`JSON parse failed: ${context || 'unknown'}`, { error: String(error), text: text.slice(0, 100) });
        return fallback;
    }
}
/**
 * Safely extract object property with fallback
 */
export function safeGet(obj, path, fallback) {
    try {
        if (!obj || typeof obj !== 'object') {
            return fallback;
        }
        const keys = path.split('.');
        let current = obj;
        for (const key of keys) {
            if (!current || typeof current !== 'object') {
                return fallback;
            }
            current = current[key];
        }
        return current || fallback;
    }
    catch (error) {
        log.warn(`Safe get failed: ${path}`, { error: String(error) });
        return fallback;
    }
}
/**
 * Safely invoke a function with error handling
 */
export async function safeAsync(fn, fallback, context, timeout) {
    try {
        if (timeout) {
            return await Promise.race([
                fn(),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
            ]);
        }
        return await fn();
    }
    catch (error) {
        log.warn(`Async operation failed: ${context || 'unknown'}`, { error: String(error) });
        return fallback;
    }
}
/**
 * Safely invoke synchronous function
 */
export function safeSync(fn, fallback, context) {
    try {
        const result = fn();
        return result !== null && result !== undefined ? result : fallback;
    }
    catch (error) {
        log.warn(`Sync operation failed: ${context || 'unknown'}`, { error: String(error) });
        return fallback;
    }
}
/**
 * Safely handle array operations
 */
export function safeArray(arr) {
    if (!Array.isArray(arr)) {
        return [];
    }
    return arr;
}
/**
 * Validate and sanitize string input
 */
export function sanitizeString(input, maxLength = 1000) {
    if (typeof input !== 'string') {
        return '';
    }
    return input.trim().slice(0, maxLength);
}
/**
 * Check if value is valid number
 */
export function isValidNumber(value) {
    return typeof value === 'number' && !isNaN(value) && isFinite(value);
}
/**
 * Check if value exists and is not null/undefined
 */
export function exists(value) {
    return value !== null && value !== undefined;
}
/**
 * Safely wait with timeout
 */
export function safeWait(ms, maxMs = 60000) {
    const safeMs = Math.min(Math.max(0, ms), maxMs);
    return new Promise(resolve => setTimeout(resolve, safeMs));
}
/**
 * Safely retry operation with backoff
 */
export async function safeRetry(fn, maxAttempts = 3, delayMs = 1000, context) {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        }
        catch (error) {
            if (attempt === maxAttempts) {
                log.error(`Retry exhausted: ${context || 'unknown'}`, { error: String(error), attempts: attempt });
                return null;
            }
            const delay = delayMs * attempt;
            log.warn(`Retry attempt ${attempt}/${maxAttempts}: ${context || 'unknown'}`, { delay });
            await safeWait(delay);
        }
    }
    return null;
}
/**
 * Safely execute Promise.all with timeout
 */
export async function safePromiseAll(promises, timeoutMs = 30000, context) {
    try {
        if (!Array.isArray(promises) || promises.length === 0) {
            return [];
        }
        const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error(`Promise.all timeout: ${context || 'unknown'}`)), timeoutMs));
        // Wrap each promise to handle individual failures
        const safePromises = promises.map(p => Promise.resolve(p).catch(err => {
            log.warn(`Promise rejected in batch: ${context || 'unknown'}`, { error: String(err) });
            return null;
        }));
        return await Promise.race([
            Promise.all(safePromises),
            timeoutPromise
        ]);
    }
    catch (error) {
        log.warn(`Promise.all failed: ${context || 'unknown'}`, { error: String(error) });
        return promises.map(() => null);
    }
}
/**
 * Safely clear large collections to prevent memory leaks
 */
export function clearCollection(collection) {
    try {
        if (collection instanceof Map || collection instanceof Set) {
            collection.clear();
        }
    }
    catch (error) {
        log.warn('Failed to clear collection', { error: String(error) });
    }
}
//# sourceMappingURL=safe.js.map