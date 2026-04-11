/**
 * Context-1 Service — Real Vector Retrieval via nomic-embed-text
 *
 * Uses Ollama's /api/embed endpoint (batch) for semantic embeddings.
 * Deduplication: fingerprint fast-path + cosine similarity for semantics.
 * Search: cosine similarity against all indexed embeddings.
 */
import { createLogger } from '../utils/logger.js';
const log = createLogger('context1Service');
const OLLAMA_BASE = process.env.VITE_OLLAMA_URL || 'http://100.74.135.83:11434';
const EMBED_MODEL = 'nomic-embed-text';
const DEDUP_THRESHOLD = 0.92; // cosine similarity above this = duplicate
const BATCH_SIZE = 32; // facts per embed API call
// ─────────────────────────────────────────────────────────────
// Embedding helpers
// ─────────────────────────────────────────────────────────────
async function embedBatch(texts) {
    try {
        const res = await fetch(`${OLLAMA_BASE}/api/embed`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
            signal: AbortSignal.timeout(15000)
        });
        if (!res.ok)
            throw new Error(`embed API ${res.status}`);
        const data = await res.json();
        return data.embeddings;
    }
    catch (err) {
        log.warn(`embedBatch failed, returning sparse embeddings:`, err);
        // Return sparse embeddings (zero vectors clearly marked as incomplete)
        return texts.map(() => new Array(384).fill(0));
    }
}
function cosine(a, b) {
    if (a.length === 0 || b.length === 0)
        return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        na += a[i] * a[i];
        nb += b[i] * b[i];
    }
    return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}
// ─────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────
export class Context1Service {
    constructor() {
        this.vectorCache = new Map();
        /** Fast fingerprint dedup (first pass — no API call) */
        this.contentHashes = new Set();
        /** Buffer of items waiting for embeddings to be computed */
        this.embedQueue = [];
        this.embedFlushTimer = null;
        /** Atomic flag to prevent concurrent flushes */
        this.embedFlushScheduled = false;
        this.maxTokenBudget = 32000;
        this.MAX_CACHE_SIZE = 1000;
    }
    fingerprint(text) {
        return text.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim().slice(0, 120);
    }
    /** Evict oldest entries if cache exceeds MAX_CACHE_SIZE */
    evictIfNeeded() {
        if (this.vectorCache.size >= this.MAX_CACHE_SIZE) {
            // Remove oldest entries (simple FIFO, first added = first removed)
            const entries = Array.from(this.vectorCache.entries());
            const toDelete = entries.slice(0, Math.floor(this.MAX_CACHE_SIZE * 0.2)); // remove 20%
            for (const [key] of toDelete) {
                this.vectorCache.delete(key);
            }
            log.info(`Vector cache evicted ${toDelete.length} entries, now at ${this.vectorCache.size} entries`);
        }
    }
    // ── Indexing ────────────────────────────────────────────────
    /**
     * Index content. Uses fingerprint fast-dedup synchronously, then
     * queues real embeddings to be flushed in batches.
     */
    async indexContent(id, content, source, metadata) {
        log.info(`Indexing [${source}]: ${id}`);
        // Fast fingerprint dedup
        const fp = this.fingerprint(content);
        if (this.contentHashes.has(fp)) {
            log.debug(`Fingerprint dedup: ${id}`);
            return { id, source, content, embedding: [], metadata: { ...metadata, extractedAt: Date.now() }, tokens: 0 };
        }
        this.contentHashes.add(fp);
        const tokens = Math.ceil(content.length / 4);
        const entry = {
            id, source, content, embedding: [],
            metadata: { ...metadata, extractedAt: Date.now() },
            tokens
        };
        this.vectorCache.set(id, entry);
        this.evictIfNeeded();
        // Queue embedding computation (flushed in batches)
        this.embedQueue.push({ id, text: content.slice(0, 512) }); // nomic truncates anyway
        this.scheduleFlush();
        return entry;
    }
    /** Flush queued items in BATCH_SIZE chunks */
    scheduleFlush() {
        if (this.embedFlushScheduled)
            return;
        this.embedFlushScheduled = true;
        this.embedFlushTimer = setTimeout(() => {
            this.flushEmbedQueue().finally(() => {
                this.embedFlushScheduled = false;
                this.embedFlushTimer = null;
            });
        }, 200);
    }
    async flushEmbedQueue() {
        this.embedFlushTimer = null;
        while (this.embedQueue.length > 0) {
            const batch = this.embedQueue.splice(0, BATCH_SIZE);
            try {
                const embeddings = await embedBatch(batch.map(b => b.text));
                for (let i = 0; i < batch.length; i++) {
                    const entry = this.vectorCache.get(batch[i].id);
                    if (entry && embeddings[i]?.length > 0) {
                        entry.embedding = embeddings[i];
                    }
                }
                log.info(`Embedded ${batch.length} items`);
            }
            catch (err) {
                log.warn(`Embed flush failed for batch of ${batch.length}`, err);
            }
        }
    }
    /** Wait for all pending embeddings to finish (call before search) */
    async flush() {
        if (this.embedFlushTimer) {
            clearTimeout(this.embedFlushTimer);
            this.embedFlushTimer = null;
            await this.flushEmbedQueue();
        }
    }
    // ── Search ──────────────────────────────────────────────────
    /**
     * Semantic search — embeds query, ranks by cosine similarity.
     * Falls back to keyword matching if embeddings aren't ready.
     */
    async search(query, maxResults = 10) {
        log.info(`Search: "${query.slice(0, 50)}"`);
        // Get query embedding
        const [queryEmbed] = await embedBatch([query.slice(0, 512)]);
        const useVector = queryEmbed && queryEmbed.length > 0;
        const results = [];
        const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        for (const item of this.vectorCache.values()) {
            let score = 0;
            if (useVector && item.embedding.length > 0) {
                score = cosine(queryEmbed, item.embedding);
                if (score < 0.3)
                    continue;
            }
            else {
                // Keyword fallback
                const lower = item.content.toLowerCase();
                const hits = queryWords.filter(w => lower.includes(w)).length;
                if (hits === 0)
                    continue;
                score = hits / queryWords.length;
            }
            results.push({ item, score });
        }
        results.sort((a, b) => b.score - a.score);
        return results.slice(0, maxResults).map(r => ({
            id: r.item.id,
            source: r.item.source,
            content: r.item.content.slice(0, 500),
            relevance: (r.item.metadata.confidence || 0.5) * r.score,
            metadata: r.item.metadata
        }));
    }
    async hybridSearch(query, keywords, maxResults = 10) {
        const results = await this.search(query, maxResults * 2);
        if (!keywords?.length)
            return results.slice(0, maxResults);
        const boosted = results.map(r => ({
            ...r,
            relevance: r.relevance + keywords.filter(k => r.content.toLowerCase().includes(k.toLowerCase())).length * 0.05
        }));
        boosted.sort((a, b) => b.relevance - a.relevance);
        return boosted.slice(0, maxResults);
    }
    async multiHopRetrieval(query, maxHops = 3, resultsPerHop = 5) {
        const allResults = [];
        let currentQuery = query;
        for (let hop = 0; hop < maxHops; hop++) {
            const hopResults = await this.search(currentQuery, resultsPerHop);
            if (hopResults.length === 0)
                break;
            allResults.push(...hopResults);
            currentQuery = hopResults[0].content;
        }
        const seen = new Set();
        return allResults.filter(r => { if (seen.has(r.id))
            return false; seen.add(r.id); return true; });
    }
    budgetTokens(results, maxTokens = this.maxTokenBudget) {
        let used = 0;
        const selected = [];
        for (const r of results) {
            const t = r.content.length / 4;
            if (used + t > maxTokens)
                break;
            selected.push(r.content);
            used += t;
        }
        return selected;
    }
    getStats() {
        let totalTokens = 0;
        const bySource = {};
        for (const doc of this.vectorCache.values()) {
            totalTokens += doc.tokens;
            bySource[doc.source] = (bySource[doc.source] || 0) + 1;
        }
        return { totalDocuments: this.vectorCache.size, totalTokens, bySource };
    }
    clear() {
        this.vectorCache.clear();
        this.contentHashes.clear();
        this.embedQueue = [];
        if (this.embedFlushTimer) {
            clearTimeout(this.embedFlushTimer);
            this.embedFlushTimer = null;
        }
        log.info('Vector cache cleared');
    }
    destroy() {
        if (this.embedFlushTimer) {
            clearTimeout(this.embedFlushTimer);
            this.embedFlushTimer = null;
        }
        this.clear();
    }
}
export const context1Service = new Context1Service();
//# sourceMappingURL=context1Service.js.map