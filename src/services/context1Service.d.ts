/**
 * Context-1 Service — Real Vector Retrieval via nomic-embed-text
 *
 * Uses Ollama's /api/embed endpoint (batch) for semantic embeddings.
 * Deduplication: fingerprint fast-path + cosine similarity for semantics.
 * Search: cosine similarity against all indexed embeddings.
 */
export interface EmbeddedContent {
    id: string;
    source: 'web' | 'image' | 'video' | 'transcript';
    content: string;
    embedding: number[];
    metadata: {
        url?: string;
        title?: string;
        timestamp?: string;
        confidence?: number;
        mediaType?: string;
        language?: string;
        extractedAt: number;
    };
    tokens: number;
}
export interface SearchResult {
    id: string;
    source: string;
    content: string;
    relevance: number;
    metadata: Record<string, any>;
}
export declare class Context1Service {
    private vectorCache;
    /** Fast fingerprint dedup (first pass — no API call) */
    private contentHashes;
    /** Buffer of items waiting for embeddings to be computed */
    private embedQueue;
    private embedFlushTimer;
    private maxTokenBudget;
    private fingerprint;
    /**
     * Index content. Uses fingerprint fast-dedup synchronously, then
     * queues real embeddings to be flushed in batches.
     */
    indexContent(id: string, content: string, source: 'web' | 'image' | 'video' | 'transcript', metadata: Record<string, any>): Promise<EmbeddedContent>;
    /** Flush queued items in BATCH_SIZE chunks */
    private scheduleFlush;
    private flushEmbedQueue;
    /** Wait for all pending embeddings to finish (call before search) */
    flush(): Promise<void>;
    /**
     * Semantic search — embeds query, ranks by cosine similarity.
     * Falls back to keyword matching if embeddings aren't ready.
     */
    search(query: string, maxResults?: number): Promise<SearchResult[]>;
    hybridSearch(query: string, keywords?: string[], maxResults?: number): Promise<SearchResult[]>;
    multiHopRetrieval(query: string, maxHops?: number, resultsPerHop?: number): Promise<SearchResult[]>;
    budgetTokens(results: SearchResult[], maxTokens?: number): string[];
    getStats(): {
        totalDocuments: number;
        totalTokens: number;
        bySource: Record<string, number>;
    };
    clear(): void;
}
export declare const context1Service: Context1Service;
//# sourceMappingURL=context1Service.d.ts.map