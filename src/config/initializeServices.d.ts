/**
 * Initialize all services with proper configuration
 * Called once at application startup
 */
export declare function initializeAllServices(): Promise<void>;
/**
 * Health check for all services
 */
export declare function healthCheck(): Promise<{
    healthy: boolean;
    details: string[];
}>;
//# sourceMappingURL=initializeServices.d.ts.map