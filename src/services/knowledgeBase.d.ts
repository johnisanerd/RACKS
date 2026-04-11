/**
 * Knowledge Base — Persistent findings storage with semantic search
 *
 * Stores extracted facts with embeddings for RAG-based retrieval
 * Enables follow-up queries: "You found X, how does that compare to Y?"
 */
export interface KnowledgeEntry {
    id: string;
    taskId: string;
    sectionId: string;
    fact: string;
    sourceUrls: string[];
    confidence: number;
    embedding: number[];
    timestamp: number;
    verified: boolean;
    verificationSources?: string[];
}
export interface SearchResult {
    entry: KnowledgeEntry;
    similarity: number;
}
export declare class KnowledgeBase {
    private db;
    private embedBatchQueue;
    private batchScheduled;
    private embedFlushTimer;
    constructor();
    private initSchema;
    indexFinding(fact: string, sourceUrls: string[], confidence: number, taskId?: string, sectionId?: string): Promise<void>;
    private scheduleBatchEmbed;
    private flushEmbedBatch;
    searchBySemanticSimilarity(query: string, limit?: number, threshold?: number): Promise<SearchResult[]>;
    searchByKeyword(query: string, limit?: number): SearchResult[];
    private cosineSimilarity;
    getRelatedFindings(findingId: string, limit?: number): Promise<SearchResult[]>;
    verifyFact(findingId: string, newSources: string[]): Promise<void>;
    private rowToEntry;
    close(): void;
}
export declare const knowledgeBase: KnowledgeBase;
//# sourceMappingURL=knowledgeBase.d.ts.map