/**
 * Context-1 Service ENHANCED — Cross-Session Persistent Knowledge Graph
 *
 * Improvements over base service:
 * 1. SQLite persistence (knowledge survives sessions)
 * 2. Fact credibility scoring (track sources, recency, contradictions)
 * 3. Domain knowledge extraction (remember learnings about "supplement market", reuse for new brands)
 * 4. Semantic clustering (group similar findings, detect patterns)
 * 5. Knowledge decay (older facts weighted lower, fresher facts higher)
 * 6. Cross-topic linking (if researching "collagen", remember "supplement regulations")
 * 7. Contradiction detection (flag conflicting facts, suggest resolution queries)
 */
export interface EmbeddedFact {
    id: string;
    content: string;
    embedding: number[];
    source: string;
    url: string;
    domain: string;
    extractedAt: number;
    confidence: number;
    sourceCount: number;
    contradictions?: string[];
    metadata: Record<string, any>;
}
export interface FactCluster {
    clusterId: string;
    theme: string;
    facts: EmbeddedFact[];
    confidence: number;
    patterns: string[];
}
export interface DomainKnowledge {
    domain: string;
    insights: string[];
    relatedDomains: string[];
    lastUpdated: number;
    relevantToQueries: string[];
}
export declare class Context1ServiceEnhanced {
    private db;
    private vectorCache;
    private embedQueue;
    private embedFlushTimer;
    private embedFlushScheduled;
    constructor(dbPath?: string);
    private initDb;
    /**
     * Index fact with credibility tracking
     * If similar fact exists, increment source count + update confidence
     */
    indexFact(id: string, content: string, source: string, url: string, domain: string, metadata: Record<string, any>): Promise<EmbeddedFact>;
    /**
     * Detect contradictions between facts
     * Returns conflicting fact pairs that should be resolved via follow-up queries
     */
    detectContradictions(domain: string): Promise<Array<{
        fact1: EmbeddedFact;
        fact2: EmbeddedFact;
        conflict: string;
    }>>;
    /**
     * Extract domain knowledge: what did we learn about this general area?
     * Reusable across future researches of similar topics
     */
    extractDomainKnowledge(domain: string): Promise<DomainKnowledge>;
    /**
     * Semantic clustering: group similar findings together
     * Helps identify patterns and themes
     */
    clusterFacts(domain: string, theme: string): Promise<FactCluster>;
    /**
     * Search with knowledge decay (older facts weighted lower)
     */
    search(query: string, domain?: string, maxResults?: number): Promise<EmbeddedFact[]>;
    /**
     * Get domain knowledge for context (seed queries with learnings from past research)
     */
    getDomainContext(domain: string): Promise<string[]>;
    private findRelatedDomains;
    private extractKeyQueries;
    private extractPatterns;
    private scheduleFlush;
    private flushEmbedQueue;
    flush(): Promise<void>;
    getStats(): {
        cachedFacts: number;
        persistedFacts: {
            count: number;
        };
    };
    close(): void;
}
export declare const context1ServiceEnhanced: Context1ServiceEnhanced;
//# sourceMappingURL=context1ServiceEnhanced.d.ts.map