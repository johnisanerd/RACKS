/**
 * Ollama Service — CLI/Backend implementation
 * Connects to remote Ollama instance for model inference
 *
 * Concurrency: capped at 5 simultaneous requests
 * Retries: up to 3 attempts with exponential backoff on failure
 * Error handling: typed OllamaError exceptions with retryable flag
 */
export interface GenerateOptions {
    temperature?: number;
    num_ctx?: number;
    num_predict?: number;
    top_p?: number;
    top_k?: number;
}
export declare class OllamaService {
    private explicitBaseUrl;
    private defaultModel;
    private maxRetries;
    private retryDelayMs;
    constructor(baseUrl?: string);
    get baseUrl(): string;
    /**
     * Generate text — serialized through global concurrency limiter with retry
     */
    generateStream(prompt: string, model?: string, options?: GenerateOptions): Promise<string>;
    private _generate;
    private _sleep;
    /**
     * Generate embeddings
     */
    embed(text: string, model?: string): Promise<number[]>;
    /**
     * Health check
     */
    healthCheck(): Promise<boolean>;
}
export declare const ollamaService: OllamaService;
//# sourceMappingURL=ollama.d.ts.map