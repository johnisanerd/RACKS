/**
 * Environment Configuration — Validate and load environment variables
 *
 * Centralizes environment variable validation and provides typed access.
 * Throws early at startup if required variables are missing.
 */
export interface EnvironmentConfig {
    nodeEnv: 'development' | 'production' | 'test';
    ollamaUrl: string;
    wayfarerUrl: string;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
}
/**
 * Load and validate environment variables
 */
export declare function loadEnvironmentConfig(): EnvironmentConfig;
export declare function getEnvironmentConfig(): EnvironmentConfig;
/**
 * Check if running in production
 */
export declare function isProduction(): boolean;
/**
 * Check if running in development
 */
export declare function isDevelopment(): boolean;
/**
 * Log all loaded configuration (secrets masked)
 */
export declare function logEnvironmentConfig(): void;
//# sourceMappingURL=env.d.ts.map