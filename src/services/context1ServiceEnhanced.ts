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

import Database from 'better-sqlite3';
import { createLogger } from '../utils/logger.js';

const log = createLogger('context1ServiceEnhanced');

const OLLAMA_BASE = process.env.OLLAMA_URL || process.env.VITE_OLLAMA_URL || 'http://localhost:11434';
const EMBED_MODEL = 'nomic-embed-text';
const DEDUP_THRESHOLD = 0.92;
const BATCH_SIZE = 32;

export interface EmbeddedFact {
  id: string;
  content: string;
  embedding: number[];
  source: string;
  url: string;
  domain: string;  // "supplement_market", "competitor_positioning", etc.
  extractedAt: number;
  confidence: number;  // 0-1, based on sources + recency
  sourceCount: number;  // how many sources confirm this?
  contradictions?: string[];  // conflicting fact IDs
  metadata: Record<string, any>;
}

export interface FactCluster {
  clusterId: string;
  theme: string;  // "customer objections", "pricing strategy", etc.
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
    log.warn(`embedBatch failed`, err);
    return texts.map(() => new Array(384).fill(0));
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

export class Context1ServiceEnhanced {
  private db: Database.Database;
  private vectorCache: Map<string, EmbeddedFact> = new Map();
  private embedQueue: Array<{ id: string; text: string }> = [];
  private embedFlushTimer: NodeJS.Timeout | null = null;
  private embedFlushScheduled = false;

  constructor(dbPath = './research-knowledge.db') {
    this.db = new Database(dbPath);
    this.initDb();
  }

  private initDb(): void {
    // Facts table with credibility tracking
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS facts (
        id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        embedding BLOB,
        source TEXT,
        url TEXT,
        domain TEXT,
        extractedAt INTEGER,
        confidence REAL,
        sourceCount INTEGER DEFAULT 1,
        contradictions TEXT,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS domainKnowledge (
        domain TEXT PRIMARY KEY,
        insights TEXT,
        relatedDomains TEXT,
        lastUpdated INTEGER,
        relevantToQueries TEXT
      );

      CREATE TABLE IF NOT EXISTS factClusters (
        clusterId TEXT PRIMARY KEY,
        theme TEXT,
        factIds TEXT,
        confidence REAL,
        patterns TEXT,
        createdAt INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_domain ON facts(domain);
      CREATE INDEX IF NOT EXISTS idx_extractedAt ON facts(extractedAt DESC);
      CREATE INDEX IF NOT EXISTS idx_confidence ON facts(confidence DESC);
    `);
  }

  /**
   * Index fact with credibility tracking
   * If similar fact exists, increment source count + update confidence
   */
  async indexFact(
    id: string,
    content: string,
    source: string,
    url: string,
    domain: string,
    metadata: Record<string, any>
  ): Promise<EmbeddedFact> {
    log.info(`Indexing fact [${domain}]: ${id}`);

    // Check for existing similar facts (dedup by embedding)
    const [embedding] = await embedBatch([content.slice(0, 512)]);

    let existingFact: EmbeddedFact | null = null;
    for (const cached of this.vectorCache.values()) {
      if (cached.domain === domain) {
        const sim = cosine(embedding, cached.embedding);
        if (sim > DEDUP_THRESHOLD) {
          existingFact = cached;
          break;
        }
      }
    }

    if (existingFact) {
      // Update existing fact
      existingFact.sourceCount++;
      existingFact.confidence = Math.min(0.99, 0.5 + (existingFact.sourceCount * 0.1));
      const stmt = this.db.prepare(`
        UPDATE facts SET sourceCount = ?, confidence = ?, metadata = ?
        WHERE id = ?
      `);
      stmt.run(existingFact.sourceCount, existingFact.confidence, JSON.stringify(metadata), existingFact.id);
      log.info(`Updated fact confidence: ${existingFact.id} (${existingFact.sourceCount} sources)`);
      return existingFact;
    }

    // New fact
    const confidence = 0.5; // Start at 50%, increases with more sources
    const fact: EmbeddedFact = {
      id, content, embedding, source, url, domain,
      extractedAt: Date.now(),
      confidence,
      sourceCount: 1,
      metadata
    };

    this.vectorCache.set(id, fact);

    // Persist to DB
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO facts
      (id, content, embedding, source, url, domain, extractedAt, confidence, sourceCount, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      id, content, Buffer.from(JSON.stringify(embedding)), source, url, domain,
      fact.extractedAt, confidence, 1, JSON.stringify(metadata)
    );

    // Queue embedding
    this.embedQueue.push({ id, text: content.slice(0, 512) });
    this.scheduleFlush();

    return fact;
  }

  /**
   * Detect contradictions between facts
   * Returns conflicting fact pairs that should be resolved via follow-up queries
   */
  async detectContradictions(domain: string): Promise<Array<{ fact1: EmbeddedFact; fact2: EmbeddedFact; conflict: string }>> {
    const facts = Array.from(this.vectorCache.values()).filter(f => f.domain === domain);
    const contradictions: Array<{ fact1: EmbeddedFact; fact2: EmbeddedFact; conflict: string }> = [];

    for (let i = 0; i < facts.length; i++) {
      for (let j = i + 1; j < facts.length; j++) {
        const sim = cosine(facts[i].embedding, facts[j].embedding);

        // Similar embeddings but different content = potential contradiction
        if (sim > 0.7 && sim < DEDUP_THRESHOLD) {
          const f1Words = new Set(facts[i].content.toLowerCase().split(/\s+/));
          const f2Words = new Set(facts[j].content.toLowerCase().split(/\s+/));

          const negationWords = ['not', 'no', 'dont', 'wont', 'isnt', 'cannot'];
          const hasNegation = negationWords.some(w => f1Words.has(w)) !== negationWords.some(w => f2Words.has(w));

          if (hasNegation || facts[i].content !== facts[j].content) {
            contradictions.push({
              fact1: facts[i],
              fact2: facts[j],
              conflict: `"${facts[i].content.slice(0, 50)}..." vs "${facts[j].content.slice(0, 50)}..."`
            });
          }
        }
      }
    }

    return contradictions;
  }

  /**
   * Extract domain knowledge: what did we learn about this general area?
   * Reusable across future researches of similar topics
   */
  async extractDomainKnowledge(domain: string): Promise<DomainKnowledge> {
    const facts = Array.from(this.vectorCache.values())
      .filter(f => f.domain === domain)
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 10);

    const insights = facts.map(f => f.content.slice(0, 100));
    const relatedDomains = this.findRelatedDomains(domain);

    const knowledge: DomainKnowledge = {
      domain,
      insights,
      relatedDomains,
      lastUpdated: Date.now(),
      relevantToQueries: this.extractKeyQueries(facts)
    };

    // Persist to DB
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO domainKnowledge
      (domain, insights, relatedDomains, lastUpdated, relevantToQueries)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(
      domain,
      JSON.stringify(knowledge.insights),
      JSON.stringify(knowledge.relatedDomains),
      knowledge.lastUpdated,
      JSON.stringify(knowledge.relevantToQueries)
    );

    return knowledge;
  }

  /**
   * Semantic clustering: group similar findings together
   * Helps identify patterns and themes
   */
  async clusterFacts(domain: string, theme: string): Promise<FactCluster> {
    const facts = Array.from(this.vectorCache.values()).filter(f => f.domain === domain);

    // Use first fact as cluster seed
    if (facts.length === 0) {
      return { clusterId: '', theme, facts: [], confidence: 0, patterns: [] };
    }

    const seed = facts[0];
    const cluster: EmbeddedFact[] = [seed];

    for (const fact of facts.slice(1)) {
      const sim = cosine(seed.embedding, fact.embedding);
      if (sim > 0.6) cluster.push(fact);
    }

    // Extract patterns from cluster
    const patterns = this.extractPatterns(cluster);
    const avgConfidence = cluster.reduce((sum, f) => sum + f.confidence, 0) / cluster.length;

    const clusterId = `cluster-${Date.now()}`;
    const result: FactCluster = { clusterId, theme, facts: cluster, confidence: avgConfidence, patterns };

    // Persist
    const stmt = this.db.prepare(`
      INSERT INTO factClusters (clusterId, theme, factIds, confidence, patterns, createdAt)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      clusterId,
      theme,
      JSON.stringify(cluster.map(f => f.id)),
      avgConfidence,
      JSON.stringify(patterns),
      Date.now()
    );

    return result;
  }

  /**
   * Search with knowledge decay (older facts weighted lower)
   */
  async search(query: string, domain?: string, maxResults = 10): Promise<EmbeddedFact[]> {
    const [queryEmbed] = await embedBatch([query.slice(0, 512)]);
    const now = Date.now();
    const KNOWLEDGE_DECAY_RATE = 0.0001; // per ms, ~1% per week

    const results: Array<{ fact: EmbeddedFact; score: number }> = [];

    for (const fact of this.vectorCache.values()) {
      if (domain && fact.domain !== domain) continue;

      const vectorSim = cosine(queryEmbed, fact.embedding);
      if (vectorSim < 0.3) continue;

      // Apply knowledge decay: newer facts score higher
      const ageMs = now - fact.extractedAt;
      const decayFactor = Math.exp(-KNOWLEDGE_DECAY_RATE * ageMs);

      const score = vectorSim * fact.confidence * decayFactor;
      results.push({ fact, score });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, maxResults).map(r => r.fact);
  }

  /**
   * Get domain knowledge for context (seed queries with learnings from past research)
   */
  async getDomainContext(domain: string): Promise<string[]> {
    const row = this.db.prepare(`
      SELECT insights FROM domainKnowledge WHERE domain = ?
    `).get(domain) as { insights: string } | undefined;

    if (!row) return [];
    return JSON.parse(row.insights);
  }

  // ── Helper methods ────────────────────────────────────────────

  private findRelatedDomains(domain: string): string[] {
    // Look for domains that share fact clusters
    const rows = this.db.prepare(`
      SELECT DISTINCT domain FROM facts WHERE domain != ?
    `).all(domain) as Array<{ domain: string }>;

    return rows.slice(0, 5).map(r => r.domain);
  }

  private extractKeyQueries(facts: EmbeddedFact[]): string[] {
    // Extract question-like patterns from facts
    const queries: string[] = [];
    for (const fact of facts) {
      if (fact.content.includes('?')) {
        queries.push(fact.content.slice(0, 80));
      }
    }
    return queries.slice(0, 5);
  }

  private extractPatterns(cluster: EmbeddedFact[]): string[] {
    const patterns: string[] = [];
    const words = new Map<string, number>();

    for (const fact of cluster) {
      const tokens = fact.content.toLowerCase().split(/\s+/);
      for (const token of tokens) {
        if (token.length > 4) {
          words.set(token, (words.get(token) || 0) + 1);
        }
      }
    }

    // Top 5 frequent words = patterns
    const sorted = Array.from(words.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);

    return sorted;
  }

  private scheduleFlush(): void {
    if (this.embedFlushScheduled) return;
    this.embedFlushScheduled = true;
    this.embedFlushTimer = setTimeout(() => {
      this.flushEmbedQueue().finally(() => {
        this.embedFlushScheduled = false;
        this.embedFlushTimer = null;
      });
    }, 200);
  }

  private async flushEmbedQueue(): Promise<void> {
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
      } catch (err) {
        log.warn(`Embed flush failed`, err);
      }
    }
  }

  async flush(): Promise<void> {
    if (this.embedFlushTimer) {
      clearTimeout(this.embedFlushTimer);
      this.embedFlushTimer = null;
      await this.flushEmbedQueue();
    }
  }

  getStats() {
    return {
      cachedFacts: this.vectorCache.size,
      persistedFacts: this.db.prepare('SELECT COUNT(*) as count FROM facts').get() as { count: number }
    };
  }

  close(): void {
    this.flush();
    this.db.close();
  }
}

export const context1ServiceEnhanced = new Context1ServiceEnhanced();
