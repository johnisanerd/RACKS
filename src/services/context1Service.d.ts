export class Context1Service {
    vectorCache: Map<any, any>;
    /** Fast fingerprint dedup (first pass — no API call) */
    contentHashes: Set<any>;
    /** Buffer of items waiting for embeddings to be computed */
    embedQueue: any[];
    embedFlushTimer: any;
    /** Atomic flag to prevent concurrent flushes */
    embedFlushScheduled: boolean;
    maxTokenBudget: number;
    MAX_CACHE_SIZE: number;
    fingerprint(text: any): any;
    /** Evict oldest entries if cache exceeds MAX_CACHE_SIZE */
    evictIfNeeded(): void;
    /**
     * Index content. Uses fingerprint fast-dedup synchronously, then
     * queues real embeddings to be flushed in batches.
     */
    indexContent(id: any, content: any, source: any, metadata: any): Promise<{
        id: any;
        source: any;
        content: any;
        embedding: any[];
        metadata: any;
        tokens: number;
    }>;
    /** Flush queued items in BATCH_SIZE chunks */
    scheduleFlush(): void;
    flushEmbedQueue(): Promise<void>;
    /** Wait for all pending embeddings to finish (call before search) */
    flush(): Promise<void>;
    /**
     * Semantic search — embeds query, ranks by cosine similarity.
     * Falls back to keyword matching if embeddings aren't ready.
     */
    search(query: any, maxResults?: number): Promise<{
        id: any;
        source: any;
        content: any;
        relevance: number;
        metadata: any;
    }[]>;
    hybridSearch(query: any, keywords: any, maxResults?: number): Promise<{
        id: any;
        source: any;
        content: any;
        relevance: number;
        metadata: any;
    }[]>;
    multiHopRetrieval(query: any, maxHops?: number, resultsPerHop?: number): Promise<{
        id: any;
        source: any;
        content: any;
        relevance: number;
        metadata: any;
    }[]>;
    budgetTokens(results: any, maxTokens?: number): any[];
    getStats(): {
        totalDocuments: number;
        totalTokens: number;
        bySource: {};
    };
    clear(): void;
    destroy(): void;
}
export const context1Service: Context1Service;
//# sourceMappingURL=context1Service.d.ts.map