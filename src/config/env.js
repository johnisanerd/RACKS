/**
 * Environment Configuration — Validate and load environment variables
 *
 * Centralizes environment variable validation and provides typed access.
 * Throws early at startup if required variables are missing.
 */
/**
 * Load and validate environment variables
 */
export function loadEnvironmentConfig() {
    const nodeEnv = (process.env.NODE_ENV || 'development');
    // For production, enforce required environment variables
    if (nodeEnv === 'production') {
        if (!process.env.OLLAMA_URL) {
            throw new Error('OLLAMA_URL environment variable is required in production. ' +
                'Set it to the URL of your Ollama service (e.g., http://localhost:11434)');
        }
        if (!process.env.WAYFARER_URL) {
            throw new Error('WAYFARER_URL environment variable is required in production. ' +
                'Set it to the URL of your Wayfarer service (e.g., http://localhost:8889)');
        }
    }
    // For development, use sensible defaults
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const wayfarerUrl = process.env.WAYFARER_URL || 'http://localhost:8889';
    const logLevel = (process.env.LOG_LEVEL || 'info');
    return {
        nodeEnv,
        ollamaUrl,
        wayfarerUrl,
        logLevel,
    };
}
/**
 * Get current environment config (lazy-loaded singleton)
 */
let cachedConfig = null;
export function getEnvironmentConfig() {
    if (!cachedConfig) {
        cachedConfig = loadEnvironmentConfig();
    }
    return cachedConfig;
}
/**
 * Check if running in production
 */
export function isProduction() {
    return getEnvironmentConfig().nodeEnv === 'production';
}
/**
 * Check if running in development
 */
export function isDevelopment() {
    return getEnvironmentConfig().nodeEnv === 'development';
}
/**
 * Log all loaded configuration (secrets masked)
 */
export function logEnvironmentConfig() {
    const config = getEnvironmentConfig();
    console.log('[env] Environment Configuration:');
    console.log(`[env] NODE_ENV: ${config.nodeEnv}`);
    console.log(`[env] OLLAMA_URL: ${config.ollamaUrl}`);
    console.log(`[env] WAYFARER_URL: ${config.wayfarerUrl}`);
    console.log(`[env] LOG_LEVEL: ${config.logLevel}`);
}
//# sourceMappingURL=env.js.map