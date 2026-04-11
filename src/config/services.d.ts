/**
 * Service Configuration — Centralized URLs, timeouts, and limits
 *
 * All service URLs and configuration come from environment variables.
 * Defaults provided for local development.
 */
export declare const SERVICES: {
    readonly ollama: {
        readonly url: string;
        readonly timeout: 30000;
        readonly concurrency: 5;
    };
    readonly wayfarer: {
        readonly url: string;
        readonly timeout: 15000;
        readonly maxResults: 10;
    };
    readonly embedding: {
        readonly batchSize: 32;
        readonly deduplicationThreshold: 0.92;
        readonly model: "nomic-embed-text";
    };
    readonly youtube: {
        readonly concurrency: 3;
    };
    readonly reasoning: {
        readonly concurrency: 3;
    };
    readonly subagents: {
        readonly defaultConcurrency: 7;
        readonly maxConcurrency: 25;
        readonly maxQueueSize: 100;
    };
};
/**
 * Validate that all required environment variables are set
 */
export declare function validateServices(): void;
/**
 * Get service URL by name
 */
export declare function getServiceUrl(service: keyof Omit<typeof SERVICES, 'embedding' | 'youtube' | 'reasoning' | 'subagents'>): string;
//# sourceMappingURL=services.d.ts.map