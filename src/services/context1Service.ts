/**
 * Context-1 Service — Real Vector Retrieval via nomic-embed-text
 *
 * Uses Ollama's /api/embed endpoint (batch) for semantic embeddings.
 * Deduplication: fingerprint fast-path + cosine similarity for semantics.
 * Search: cosine similarity against all indexed embeddings.
 */

import { createLogger } from './logger.js';

const log = createLogger('context1Service');

const OLLAMA_BASE = process.env.VITE_OLLAMA_URL || 'http://100.74.135.83:11434';
const EMBED_MODEL = 'nomic-embed-text';
const DEDUP_THRESHOLD = 0.92; // cosine similarity above this = duplicate
const BATCH_SIZE = 32;        // facts per embed API call

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

// ─────────────────────────────────────────────────────────────
// Embedding helpers
// ─────────────────────────────────────────────────────────────

async function embedBatch(texts: string[]): Promise<number[][]> {
  try {
    const res = await fetch(`${OLLAMA_BASE}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBED_MODEL, input: texts }),
      signal: AbortSignal.timeout(15_000)
    });
    if (!res.ok) throw new Error(`embed API ${res.status}`);
    const data = await res.json() as { embeddings: number[][] };
    return data.embeddings;
  } catch (err) {
    log.warn(`embedBatch failed, using zeros:`, err);
    return texts.map(() => []);
  }
}

function cosine(a: number[], b: number[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i] * a[i];
    nb  += b[i] * b[i];
  }
  return na === 0 || nb === 0 ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// ─────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────

export class Context1Service {
  private vectorCache: Map<string, EmbeddedContent> = new Map();
  /** Fast fingerprint dedup (first pass — no API call) */
  private contentHashes: Set<string> = new Set();
  /** Buffer of items waiting for embeddings to be computed */
  private embedQueue: Array<{ id: string; text: string }> = [];
  private embedFlushTimer: ReturnType<typeof setTimeout> | null = null;

  private maxTokenBudget = 32_000;

  private fingerprint(text: string): string {
    return text.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim().slice(0, 120);
  }

  // ── Indexing ────────────────────────────────────────────────

  /**
   * Index content. Uses fingerprint fast-dedup synchronously, then
   * queues real embeddings to be flushed in batches.
   */
  async indexContent(
    id: string,
    content: string,
    source: 'web' | 'image' | 'video' | 'transcript',
    metadata: Record<string, any>
  ): Promise<EmbeddedContent> {
    log.info(`Indexing [${source}]: ${id}`);

    // Fast fingerprint dedup
    const fp = this.fingerprint(content);
    if (this.contentHashes.has(fp)) {
      log.debug(`Fingerprint dedup: ${id}`);
      return { id, source, content, embedding: [], metadata: { ...metadata, extractedAt: Date.now() }, tokens: 0 };
    }
    this.contentHashes.add(fp);

    const tokens = Math.ceil(content.length / 4);
    const entry: EmbeddedContent = {
      id, source, content, embedding: [],
      metadata: { ...metadata, extractedAt: Date.now() },
      tokens
    };
    this.vectorCache.set(id, entry);

    // Queue embedding computation (flushed in batches)
    this.embedQueue.push({ id, text: content.slice(0, 512) }); // nomic truncates anyway
    this.scheduleFlush();

    return entry;
  }

  /** Flush queued items in BATCH_SIZE chunks */
  private scheduleFlush(): void {
    if (this.embedFlushTimer) return;
    this.embedFlushTimer = setTimeout(() => this.flushEmbedQueue(), 200);
  }

  private async flushEmbedQueue(): Promise<void> {
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
      } catch (err) {
        log.warn(`Embed flush failed for batch of ${batch.length}`, err);
      }
    }
  }

  /** Wait for all pending embeddings to finish (call before search) */
  async flush(): Promise<void> {
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
  async search(query: string, maxResults = 10): Promise<SearchResult[]> {
    log.info(`Search: "${query.slice(0, 50)}"`);

    // Get query embedding
    const [queryEmbed] = await embedBatch([query.slice(0, 512)]);
    const useVector = queryEmbed && queryEmbed.length > 0;

    const results: Array<{ item: EmbeddedContent; score: number }> = [];
    const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 3);

    for (const item of this.vectorCache.values()) {
      let score = 0;
      if (useVector && item.embedding.length > 0) {
        score = cosine(queryEmbed, item.embedding);
        if (score < 0.3) continue;
      } else {
        // Keyword fallback
        const lower = item.content.toLowerCase();
        const hits = queryWords.filter(w => lower.includes(w)).length;
        if (hits === 0) continue;
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

  async hybridSearch(query: string, keywords?: string[], maxResults = 10): Promise<SearchResult[]> {
    const results = await this.search(query, maxResults * 2);
    if (!keywords?.length) return results.slice(0, maxResults);
    const boosted = results.map(r => ({
      ...r,
      relevance: r.relevance + keywords.filter(k => r.content.toLowerCase().includes(k.toLowerCase())).length * 0.05
    }));
    boosted.sort((a, b) => b.relevance - a.relevance);
    return boosted.slice(0, maxResults);
  }

  async multiHopRetrieval(query: string, maxHops = 3, resultsPerHop = 5): Promise<SearchResult[]> {
    const allResults: SearchResult[] = [];
    let currentQuery = query;
    for (let hop = 0; hop < maxHops; hop++) {
      const hopResults = await this.search(currentQuery, resultsPerHop);
      if (hopResults.length === 0) break;
      allResults.push(...hopResults);
      currentQuery = hopResults[0].content;
    }
    const seen = new Set<string>();
    return allResults.filter(r => { if (seen.has(r.id)) return false; seen.add(r.id); return true; });
  }

  budgetTokens(results: SearchResult[], maxTokens = this.maxTokenBudget): string[] {
    let used = 0;
    const selected: string[] = [];
    for (const r of results) {
      const t = r.content.length / 4;
      if (used + t > maxTokens) break;
      selected.push(r.content);
      used += t;
    }
    return selected;
  }

  getStats() {
    let totalTokens = 0;
    const bySource: Record<string, number> = {};
    for (const doc of this.vectorCache.values()) {
      totalTokens += doc.tokens;
      bySource[doc.source] = (bySource[doc.source] || 0) + 1;
    }
    return { totalDocuments: this.vectorCache.size, totalTokens, bySource };
  }

  clear(): void {
    this.vectorCache.clear();
    this.contentHashes.clear();
    this.embedQueue = [];
    if (this.embedFlushTimer) { clearTimeout(this.embedFlushTimer); this.embedFlushTimer = null; }
    log.info('Vector cache cleared');
  }
}

export const context1Service = new Context1Service();
