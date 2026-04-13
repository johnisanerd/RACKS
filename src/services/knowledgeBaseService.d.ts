export function getKnowledgeBase(): any;
/**
 * Knowledge Base Manager
 * In a real implementation, would use:
 * - SQLite for persistent storage
 * - Vector embeddings for semantic search (Context-1 or similar)
 * - LRU cache for recent queries
 */
export class KnowledgeBaseManager {
    entries: Map<any, any>;
    sessions: Map<any, any>;
    topicIndex: Map<any, any>;
    /**
     * Add a fact to knowledge base
     */
    addKnowledge(entry: any): Promise<void>;
    /**
     * Query knowledge base by topic
     */
    queryByTopic(topic: any, topK?: number): Promise<any>;
    /**
     * Semantic search (requires embeddings)
     * In real implementation, would use vector similarity search
     */
    semanticSearch(query: any, embedding: any, topK?: number): Promise<any[]>;
    /**
     * Get related knowledge to a topic
     */
    getRelated(topic: any): Promise<any[]>;
    /**
     * Extract domain-level insights from entries
     */
    generateInsights(entries: any): Promise<{
        text: string;
        importance: string;
        relatesTo: any[];
        actionable: boolean;
        timestamp: number;
    }[]>;
    /**
     * Create or update session memory
     */
    createSession(domain: any, question: any, taskIds?: any[]): {
        sessionId: string;
        domain: any;
        question: any;
        taskIds: any[];
        knowledge: any[];
        insights: any[];
        metadata: {
            createdAt: number;
            updatedAt: number;
            duration: number;
        };
    };
    /**
     * Load session from history
     */
    getSession(sessionId: any): any;
    /**
     * List all sessions
     */
    listSessions(): any[];
    /**
     * Find sessions by domain
     */
    findSessionsByDomain(domain: any): any[];
    /**
     * Add knowledge to session
     */
    appendKnowledge(sessionId: any, entry: any): void;
    /**
     * Query session's accumulated knowledge
     * Used for follow-up questions
     */
    querySession(sessionId: any, query: any): any;
    /**
     * Generate summary of session knowledge
     */
    summarizeSession(sessionId: any): string;
    /**
     * Export knowledge for external use
     */
    exportKnowledge(domain: any): any[];
    /**
     * Import knowledge (for seeding from external sources)
     */
    importKnowledge(entries: any): Promise<void>;
    /**
     * Cleanup old knowledge (older than maxAge milliseconds)
     */
    cleanup(maxAgeMs?: number): number;
}
//# sourceMappingURL=knowledgeBaseService.d.ts.map