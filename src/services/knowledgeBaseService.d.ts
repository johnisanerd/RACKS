/**
 * Knowledge Base Service
 * Persistent semantic knowledge accumulation across research sessions
 * Enables follow-up questions and knowledge reuse
 */
export interface KnowledgeEntry {
    id: string;
    topic: string;
    domain: string;
    content: string;
    embedding?: number[];
    sources: string[];
    confidence: number;
    lastUpdated: number;
    relatedTopics: string[];
    tags: string[];
    category: 'market' | 'competitor' | 'customer' | 'trend' | 'tactical';
}
export interface SessionMemory {
    sessionId: string;
    taskIds: string[];
    domain: string;
    question: string;
    knowledge: KnowledgeEntry[];
    insights: Insight[];
    metadata: {
        createdAt: number;
        updatedAt: number;
        duration: number;
    };
}
export interface Insight {
    text: string;
    importance: 'critical' | 'high' | 'medium';
    relatesTo: string[];
    actionable: boolean;
    timestamp: number;
}
/**
 * Knowledge Base Manager
 * In a real implementation, would use:
 * - SQLite for persistent storage
 * - Vector embeddings for semantic search (Context-1 or similar)
 * - LRU cache for recent queries
 */
export declare class KnowledgeBaseManager {
    private entries;
    private sessions;
    private topicIndex;
    /**
     * Add a fact to knowledge base
     */
    addKnowledge(entry: KnowledgeEntry): Promise<void>;
    /**
     * Query knowledge base by topic
     */
    queryByTopic(topic: string, topK?: number): Promise<KnowledgeEntry[]>;
    /**
     * Semantic search (requires embeddings)
     * In real implementation, would use vector similarity search
     */
    semanticSearch(query: string, embedding?: number[], topK?: number): Promise<KnowledgeEntry[]>;
    /**
     * Get related knowledge to a topic
     */
    getRelated(topic: string): Promise<KnowledgeEntry[]>;
    /**
     * Extract domain-level insights from entries
     */
    generateInsights(entries: KnowledgeEntry[]): Promise<Insight[]>;
    /**
     * Create or update session memory
     */
    createSession(domain: string, question: string, taskIds?: string[]): SessionMemory;
    /**
     * Load session from history
     */
    getSession(sessionId: string): SessionMemory | null;
    /**
     * List all sessions
     */
    listSessions(): SessionMemory[];
    /**
     * Find sessions by domain
     */
    findSessionsByDomain(domain: string): SessionMemory[];
    /**
     * Add knowledge to session
     */
    appendKnowledge(sessionId: string, entry: KnowledgeEntry): void;
    /**
     * Query session's accumulated knowledge
     * Used for follow-up questions
     */
    querySession(sessionId: string, query: string): KnowledgeEntry[];
    /**
     * Generate summary of session knowledge
     */
    summarizeSession(sessionId: string): string;
    /**
     * Export knowledge for external use
     */
    exportKnowledge(domain?: string): KnowledgeEntry[];
    /**
     * Import knowledge (for seeding from external sources)
     */
    importKnowledge(entries: KnowledgeEntry[]): Promise<void>;
    /**
     * Cleanup old knowledge (older than maxAge milliseconds)
     */
    cleanup(maxAgeMs?: number): number;
}
export declare function getKnowledgeBase(): KnowledgeBaseManager;
//# sourceMappingURL=knowledgeBaseService.d.ts.map