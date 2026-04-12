/**
 * Knowledge Base Service
 * Persistent semantic knowledge accumulation across research sessions
 * Enables follow-up questions and knowledge reuse
 */
import { createLogger } from '../utils/logger.js';
const log = createLogger('knowledgeBase');
/**
 * Knowledge Base Manager
 * In a real implementation, would use:
 * - SQLite for persistent storage
 * - Vector embeddings for semantic search (Context-1 or similar)
 * - LRU cache for recent queries
 */
export class KnowledgeBaseManager {
    constructor() {
        this.entries = new Map();
        this.sessions = new Map();
        this.topicIndex = new Map(); // topic -> entry IDs
    }
    /**
     * Add a fact to knowledge base
     */
    async addKnowledge(entry) {
        const id = entry.id || `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        entry.id = id;
        entry.lastUpdated = Date.now();
        this.entries.set(id, entry);
        // Index by topic
        if (!this.topicIndex.has(entry.topic)) {
            this.topicIndex.set(entry.topic, []);
        }
        this.topicIndex.get(entry.topic).push(id);
        log.info(`Knowledge stored: ${entry.topic} (confidence: ${entry.confidence})`);
    }
    /**
     * Query knowledge base by topic
     */
    async queryByTopic(topic, topK = 5) {
        const entryIds = this.topicIndex.get(topic) || [];
        const entries = entryIds
            .map(id => this.entries.get(id))
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, topK);
        log.info(`Found ${entries.length} entries for topic: ${topic}`);
        return entries;
    }
    /**
     * Semantic search (requires embeddings)
     * In real implementation, would use vector similarity search
     */
    async semanticSearch(query, embedding, topK = 5) {
        // Fallback to keyword matching if no embeddings
        if (!embedding) {
            return Array.from(this.entries.values())
                .filter(e => e.content.toLowerCase().includes(query.toLowerCase()))
                .slice(0, topK);
        }
        // With embeddings, would compute cosine similarity
        // For now, return by confidence
        return Array.from(this.entries.values())
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, topK);
    }
    /**
     * Get related knowledge to a topic
     */
    async getRelated(topic) {
        const entries = Array.from(this.entries.values()).filter(e => e.relatedTopics.includes(topic));
        return entries.sort((a, b) => b.lastUpdated - a.lastUpdated);
    }
    /**
     * Extract domain-level insights from entries
     */
    async generateInsights(entries) {
        const insights = [];
        // Identify high-confidence facts
        const highConfidence = entries.filter(e => e.confidence > 80);
        if (highConfidence.length > 0) {
            insights.push({
                text: `${highConfidence.length} high-confidence facts established about this domain`,
                importance: 'high',
                relatesTo: [...new Set(highConfidence.flatMap(e => e.relatedTopics))],
                actionable: false,
                timestamp: Date.now()
            });
        }
        // Identify contradictions
        const byTopic = new Map();
        entries.forEach(e => {
            if (!byTopic.has(e.topic)) {
                byTopic.set(e.topic, []);
            }
            byTopic.get(e.topic).push(e);
        });
        // Check for conflicting confidence levels
        for (const [topic, topicEntries] of byTopic) {
            const confidences = topicEntries.map(e => e.confidence);
            const maxConf = Math.max(...confidences);
            const minConf = Math.min(...confidences);
            if (maxConf - minConf > 40) {
                insights.push({
                    text: `Conflicting confidence on ${topic} - high-confidence and low-confidence sources disagree`,
                    importance: 'high',
                    relatesTo: [topic],
                    actionable: true,
                    timestamp: Date.now()
                });
            }
        }
        return insights;
    }
    /**
     * Create or update session memory
     */
    createSession(domain, question, taskIds = []) {
        const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const session = {
            sessionId,
            domain,
            question,
            taskIds,
            knowledge: [],
            insights: [],
            metadata: {
                createdAt: Date.now(),
                updatedAt: Date.now(),
                duration: 0
            }
        };
        this.sessions.set(sessionId, session);
        log.info(`Session created: ${sessionId}`);
        return session;
    }
    /**
     * Load session from history
     */
    getSession(sessionId) {
        return this.sessions.get(sessionId) || null;
    }
    /**
     * List all sessions
     */
    listSessions() {
        return Array.from(this.sessions.values());
    }
    /**
     * Find sessions by domain
     */
    findSessionsByDomain(domain) {
        return Array.from(this.sessions.values()).filter(s => s.domain === domain);
    }
    /**
     * Add knowledge to session
     */
    appendKnowledge(sessionId, entry) {
        const session = this.sessions.get(sessionId);
        if (!session) {
            log.warn(`Session not found: ${sessionId}`);
            return;
        }
        session.knowledge.push(entry);
        session.metadata.updatedAt = Date.now();
    }
    /**
     * Query session's accumulated knowledge
     * Used for follow-up questions
     */
    querySession(sessionId, query) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return [];
        return session.knowledge.filter(k => k.content.toLowerCase().includes(query.toLowerCase()) ||
            k.topic.toLowerCase().includes(query.toLowerCase()));
    }
    /**
     * Generate summary of session knowledge
     */
    summarizeSession(sessionId) {
        const session = this.sessions.get(sessionId);
        if (!session)
            return '';
        const byDomain = new Map();
        session.knowledge.forEach(k => {
            if (!byDomain.has(k.domain)) {
                byDomain.set(k.domain, []);
            }
            byDomain.get(k.domain).push(k);
        });
        let summary = `Session Summary: ${session.question}\n`;
        summary += `Domain: ${session.domain}\n`;
        summary += `Duration: ${Math.round(session.metadata.duration / 60000)} minutes\n\n`;
        summary += `Knowledge Accumulated:\n`;
        for (const [domain, entries] of byDomain) {
            const avgConfidence = Math.round(entries.reduce((sum, e) => sum + e.confidence, 0) / entries.length);
            summary += `  • ${domain}: ${entries.length} facts (avg confidence: ${avgConfidence}%)\n`;
        }
        return summary;
    }
    /**
     * Export knowledge for external use
     */
    exportKnowledge(domain) {
        if (domain) {
            return Array.from(this.entries.values()).filter(e => e.domain === domain);
        }
        return Array.from(this.entries.values());
    }
    /**
     * Import knowledge (for seeding from external sources)
     */
    async importKnowledge(entries) {
        for (const entry of entries) {
            await this.addKnowledge(entry);
        }
        log.info(`Imported ${entries.length} knowledge entries`);
    }
    /**
     * Cleanup old knowledge (older than maxAge milliseconds)
     */
    cleanup(maxAgeMs = 30 * 24 * 60 * 60 * 1000) {
        const cutoff = Date.now() - maxAgeMs;
        let removed = 0;
        for (const [id, entry] of this.entries) {
            if (entry.lastUpdated < cutoff) {
                this.entries.delete(id);
                removed++;
            }
        }
        log.info(`Cleaned up ${removed} old entries`);
        return removed;
    }
}
/**
 * Global knowledge base instance
 */
let globalKnowledgeBase = null;
export function getKnowledgeBase() {
    if (!globalKnowledgeBase) {
        globalKnowledgeBase = new KnowledgeBaseManager();
    }
    return globalKnowledgeBase;
}
//# sourceMappingURL=knowledgeBaseService.js.map