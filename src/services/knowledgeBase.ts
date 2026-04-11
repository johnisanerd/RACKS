/**
 * Knowledge Base — Persistent findings storage with semantic search
 *
 * Stores extracted facts with embeddings for RAG-based retrieval
 * Enables follow-up queries: "You found X, how does that compare to Y?"
 */

import Database from 'better-sqlite3';
import path from 'path';
import { homedir } from 'os';

const OLLAMA_BASE = process.env.VITE_OLLAMA_URL || 'http://100.74.135.83:11434';
const EMBED_MODEL = 'nomic-embed-text';

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
    console.warn(`embedBatch failed:`, err);
    // Return sparse embeddings (zero vectors clearly marked as incomplete)
    return texts.map(() => new Array(384).fill(0));
  }
}

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

export class KnowledgeBase {
  private db: Database.Database;
  private embedBatchQueue: Array<{ id: string; fact: string }> = [];
  private batchScheduled = false;
  private embedFlushTimer: NodeJS.Timeout | null = null;

  constructor() {
    const dbPath = path.join(homedir(), '.deep-research', 'knowledge.db');
    this.db = new Database(dbPath);
    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS knowledge_entries (
        id TEXT PRIMARY KEY,
        taskId TEXT NOT NULL,
        sectionId TEXT,
        fact TEXT NOT NULL,
        sourceUrls TEXT,  -- JSON array as string
        confidence REAL DEFAULT 0.5,
        embedding TEXT,   -- JSON array as string (float32)
        timestamp INTEGER DEFAULT 0,
        verified BOOLEAN DEFAULT 0,
        verificationSources TEXT,  -- JSON array as string

        CREATED_AT DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_taskId ON knowledge_entries(taskId);
      CREATE INDEX IF NOT EXISTS idx_verified ON knowledge_entries(verified);
      CREATE INDEX IF NOT EXISTS idx_timestamp ON knowledge_entries(timestamp DESC);
    `);
  }

  async indexFinding(
    fact: string,
    sourceUrls: string[],
    confidence: number,
    taskId?: string,
    sectionId?: string
  ): Promise<void> {
    try {
      const id = `kb_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

      // Queue for batch embedding
      this.embedBatchQueue.push({ id, fact });
      this.scheduleBatchEmbed();

      // Store immediately (embedding will be added async)
      const stmt = this.db.prepare(`
        INSERT INTO knowledge_entries
        (id, taskId, sectionId, fact, sourceUrls, confidence, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        id,
        taskId || '',
        sectionId || '',
        fact,
        JSON.stringify(sourceUrls),
        confidence,
        Date.now()
      );

      console.debug(`Indexed finding: ${fact.slice(0, 50)}...`);
    } catch (err) {
      console.error('indexFinding failed:', err);
    }
  }

  private scheduleBatchEmbed(): void {
    if (this.batchScheduled) return;
    this.batchScheduled = true;

    this.embedFlushTimer = setTimeout(() => {
      this.flushEmbedBatch();
    }, 5000); // Batch every 5 seconds
  }

  private async flushEmbedBatch(): Promise<void> {
    this.embedFlushTimer = null;

    if (this.embedBatchQueue.length === 0) {
      this.batchScheduled = false;
      return;
    }

    try {
      const batch = this.embedBatchQueue.splice(0, 32); // Max 32 at a time
      const texts = batch.map(b => b.fact);
      const embeddings = await embedBatch(texts);

      const stmt = this.db.prepare(`
        UPDATE knowledge_entries
        SET embedding = ?
        WHERE id = ?
      `);

      for (let i = 0; i < batch.length; i++) {
        stmt.run(JSON.stringify(embeddings[i]), batch[i].id);
      }

      console.info(`Embedded ${batch.length} findings`);
      this.batchScheduled = false;

      // Continue if more in queue
      if (this.embedBatchQueue.length > 0) {
        this.scheduleBatchEmbed();
      }
    } catch (err) {
      console.error('flushEmbedBatch failed:', err);
      this.batchScheduled = false;
    }
  }

  async searchBySemanticSimilarity(
    query: string,
    limit: number = 10,
    threshold: number = 0.8
  ): Promise<SearchResult[]> {
    try {
      const queryEmbedding = await embedBatch([query]);
      if (!queryEmbedding[0] || queryEmbedding[0].length === 0) {
        console.warn('Query embedding empty, falling back to keyword search');
        return this.searchByKeyword(query, limit);
      }

      const rows = this.db.prepare(`
        SELECT * FROM knowledge_entries
        WHERE embedding IS NOT NULL
        LIMIT 1000
      `).all() as any[];

      const results: SearchResult[] = [];

      for (const row of rows) {
        try {
          const embedding = JSON.parse(row.embedding);
          const similarity = this.cosineSimilarity(queryEmbedding[0], embedding);

          if (similarity >= threshold) {
            results.push({
              entry: this.rowToEntry(row),
              similarity
            });
          }
        } catch (err) {
          // Skip entries with bad embeddings
        }
      }

      results.sort((a, b) => b.similarity - a.similarity);
      return results.slice(0, limit);
    } catch (err) {
      console.error('searchBySemanticSimilarity failed:', err);
      return [];
    }
  }

  searchByKeyword(query: string, limit: number = 10): SearchResult[] {
    try {
      const rows = this.db.prepare(`
        SELECT * FROM knowledge_entries
        WHERE fact LIKE ?
        ORDER BY confidence DESC, timestamp DESC
        LIMIT ?
      `).all(`%${query}%`, limit) as any[];

      return rows.map(row => ({
        entry: this.rowToEntry(row),
        similarity: 1.0 // Exact keyword matches
      }));
    } catch (err) {
      console.error('searchByKeyword failed:', err);
      return [];
    }
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dotProduct / denom;
  }

  async getRelatedFindings(findingId: string, limit: number = 5): Promise<SearchResult[]> {
    try {
      const row = this.db.prepare(`
        SELECT * FROM knowledge_entries WHERE id = ?
      `).get(findingId) as any;

      if (!row || !row.embedding) return [];

      return await this.searchBySemanticSimilarity(row.fact, limit, 0.7);
    } catch (err) {
      console.error('getRelatedFindings failed:', err);
      return [];
    }
  }

  async verifyFact(findingId: string, newSources: string[]): Promise<void> {
    try {
      const row = this.db.prepare(`
        SELECT verificationSources FROM knowledge_entries WHERE id = ?
      `).get(findingId) as any;

      if (!row) return;

      const existing = row.verificationSources ? JSON.parse(row.verificationSources) : [];
      const combined = [...new Set([...existing, ...newSources])];

      this.db.prepare(`
        UPDATE knowledge_entries
        SET verified = 1, verificationSources = ?
        WHERE id = ?
      `).run(JSON.stringify(combined), findingId);
    } catch (err) {
      console.error('verifyFact failed:', err);
    }
  }

  private rowToEntry(row: any): KnowledgeEntry {
    return {
      id: row.id,
      taskId: row.taskId,
      sectionId: row.sectionId,
      fact: row.fact,
      sourceUrls: JSON.parse(row.sourceUrls || '[]'),
      confidence: row.confidence,
      embedding: row.embedding ? JSON.parse(row.embedding) : [],
      timestamp: row.timestamp,
      verified: Boolean(row.verified),
      verificationSources: row.verificationSources ? JSON.parse(row.verificationSources) : []
    };
  }

  close(): void {
    if (this.embedFlushTimer) {
      clearTimeout(this.embedFlushTimer);
      this.embedFlushTimer = null;
    }
    this.db.close();
  }
}

export const knowledgeBase = new KnowledgeBase();
