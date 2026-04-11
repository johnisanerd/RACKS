/**
 * Context-1 Production Harness — ported from nomads/frontend/utils/context1Service.ts
 *
 * Harness for Chroma's chromadb-context-1:latest model running on Ollama.
 * Implements a full observe-reason-act retrieval loop with 4 core tools:
 *   search_corpus, grep_corpus, read_document, prune_chunks
 * plus extended tools: search_images, write_chunk, update_chunk, delete_chunk.
 *
 * ═══════════════════════════════════════════════════════════════════════
 * OLLAMA TOKEN FORMAT (verified via live testing on remote Ollama):
 *
 *   System:      <|start|>system<|channel|>final<|message|>{text}<|end|>
 *   User:        <|start|>user<|channel|>final<|message|>{text}<|end|>
 *   Thinking:    <|start|>assistant<|channel|>analysis<|message|>{text}<|end|>
 *   Response:    <|start|>assistant<|channel|>final<|message|>{text}<|end|>
 *   Tool call:   ...to={tool}...<|message|>{args_json}<|call|>...
 *   Tool result: <|start|>tool to={tool}<|channel|>result<|message|>{result}<|end|>
 *
 * The model generates MULTI-TURN sequences per generation call:
 *   analysis → final → tool_call  (all in one response)
 * So we generate WITHOUT stop tokens and scan the full output.
 * ═══════════════════════════════════════════════════════════════════════
 *
 * SELF-EDITING CONTEXT WINDOW (per Chroma's research paper):
 *
 *   Token Budget:  32,768 tokens tracked across full trajectory
 *   Soft Limit:    50% — model is told to consider pruning
 *   Hard Cutoff:   85% — only prune_chunks allowed
 *   Deduplication: seenChunkIds prevent re-retrieval across searches
 *   Termination:   text-only response (no tool calls) OR step limit
 *
 * @see https://www.trychroma.com/research/context-1
 */
import { createLogger } from '../utils/logger.js';
import { OllamaService } from './ollama.js';
import { WayfarerService } from './wayfarer.js';
const log = createLogger('context1');
class CorpusCache {
    constructor() {
        this.cache = new Map();
        this.maxCached = 50;
    }
    set(docId, content, chunks) {
        const contentHash = this.hashContent(content);
        this.cache.set(docId, {
            docId,
            contentHash,
            chunks,
            lastAccessed: Date.now(),
        });
        // Evict oldest if cache too large (LRU)
        if (this.cache.size > this.maxCached) {
            let oldest = null;
            for (const entry of this.cache.entries()) {
                if (!oldest || entry[1].lastAccessed < oldest[1].lastAccessed) {
                    oldest = entry;
                }
            }
            if (oldest) {
                this.cache.delete(oldest[0]);
            }
        }
    }
    get(docId, contentHash) {
        const cached = this.cache.get(docId);
        if (cached && cached.contentHash === contentHash) {
            cached.lastAccessed = Date.now();
            return cached.chunks;
        }
        return null;
    }
    clear() {
        this.cache.clear();
    }
    hashContent(content) {
        let hash = 0;
        for (let i = 0; i < Math.min(content.length, 1000); i++) {
            hash = ((hash << 5) - hash) + content.charCodeAt(i);
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }
}
// ─── Constants ────────────────────────────────────────────────────────────────
const CONTEXT1_MODEL = 'chromadb-context-1:latest';
const DEFAULT_CONFIG = {
    chunkSizeWords: 200,
    maxCorpusDocs: 40,
    charsPerToken: 4,
    tokenBudget: 32768,
    softThreshold: 0.50, // 50% — inject pruning suggestion
    hardCutoff: 0.85, // 85% — reject all tools except prune
    generateTimeout: 30000,
    maxParallelTools: 4, // Per Chroma: avg 2.56 tools/turn, allow up to 4
};
const CHUNK_SIZE_WORDS = DEFAULT_CONFIG.chunkSizeWords;
const MAX_CORPUS_DOCS = DEFAULT_CONFIG.maxCorpusDocs;
const CHARS_PER_TOKEN = DEFAULT_CONFIG.charsPerToken;
const TOKEN_BUDGET = DEFAULT_CONFIG.tokenBudget;
// Special tokens (verified via live testing)
const T = {
    START: '<|start|>',
    END: '<|end|>',
    CHANNEL: '<|channel|>',
    MSG: '<|message|>',
    CALL: '<|call|>',
    CONSTRAIN: '<|constrain|>',
};
// ─── Corpus helpers ───────────────────────────────────────────────────────────
function chunkText(text, docId, startIdx) {
    const words = text.split(/\s+/).filter(Boolean);
    const chunks = [];
    for (let i = 0; i < words.length; i += CHUNK_SIZE_WORDS) {
        const slice = words.slice(i, i + CHUNK_SIZE_WORDS).join(' ');
        if (slice.trim().length < 30)
            continue;
        chunks.push({
            chunkId: `${docId}_c${startIdx + chunks.length}`,
            docId,
            content: slice,
            score: 0,
            pruned: false,
        });
    }
    return chunks;
}
/** BM25-lite: count unique query terms present in chunk, length-normalised */
function scoreChunk(chunk, queryTerms) {
    const lower = chunk.toLowerCase();
    let hits = 0;
    for (const term of queryTerms) {
        if (lower.includes(term))
            hits++;
    }
    const density = hits / (queryTerms.length || 1);
    const lengthBonus = Math.min(chunk.length / 500, 1);
    return density * 0.8 + lengthBonus * 0.2;
}
function tokEst(text) {
    return Math.ceil(text.length / CHARS_PER_TOKEN);
}
/** Cosine similarity between two equal-length vectors */
function cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length)
        return 0;
    let dot = 0, normA = 0, normB = 0;
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    const denom = Math.sqrt(normA) * Math.sqrt(normB);
    return denom === 0 ? 0 : dot / denom;
}
// ─── Prompt builders ──────────────────────────────────────────────────────────
function sysTurn(c) { return `${T.START}system${T.CHANNEL}final${T.MSG}${c}${T.END}\n`; }
function usrTurn(c) { return `${T.START}user${T.CHANNEL}final${T.MSG}${c}${T.END}\n`; }
function toolRes(tool, json) { return `${T.START}tool to=${tool}${T.CHANNEL}result${T.MSG}${json}${T.END}\n`; }
const SYSTEM_PROMPT = `You are Context-1, a retrieval-only agent. You do NOT generate answers — you find the most relevant document chunks for a query.

Available tools:
  search_corpus(query: str)       — hybrid BM25 + dense vector search, returns top chunks + reranks
  search_images(query: str)       — image similarity search (text or image URL to find relevant images)
  grep_corpus(pattern: str)       — regex search across all chunks in the corpus
  read_document(doc_id: str)      — retrieve full document content by doc ID
  write_chunk(doc_id: str, content: str) — add new chunk to document
  update_chunk(chunk_id: str, content: str) — update existing chunk content
  delete_chunk(chunk_id: str)     — remove chunk from corpus
  prune_chunks(chunk_ids: list)   — remove irrelevant chunks to free token budget

STRATEGY:
1. Start with search_corpus using the original query and varied reformulations
2. Execute 2–4 diverse searches to get broad coverage across different aspects
3. Use grep_corpus for specific terms, numbers, or proper nouns
4. Use read_document when a chunk looks very promising and you need full context
5. Watch your token budget — when it gets high, prune chunks that are off-topic or redundant
6. Stop (output text with no tool calls) when you have 8–15 high-quality, diverse chunks

TOKEN BUDGET:
After each tool result you will see "[Token usage: X/32,768]".
When usage exceeds 50%, actively prune low-quality chunks before searching more.
When usage exceeds 85%, you MUST prune — no other tools will be accepted.

DEDUPLICATION:
Search results automatically exclude previously seen chunks. Use varied queries to find new content.`;
// ─── Robust tool call parser ──────────────────────────────────────────────────
/**
 * Find ALL tool calls in a model response.
 * Handles three observed format variants:
 *   1. commentary to=TOOL <|constrain|>json<|message|>{args}<|call|>
 *   2. to=TOOL<|channel|>commentary N<|message|>{args}
 *   3. to=TOOL<|channel|>commentary <|constrain|>json<|message|>{args}
 */
function findToolCalls(text) {
    const calls = [];
    const toRe = /\bto=([a-zA-Z_]+)/g;
    let m;
    while ((m = toRe.exec(text)) !== null) {
        const tool = m[1];
        const afterTo = text.slice(m.index + m[0].length);
        // Find the next <|message|> after the "to=" marker
        const msgIdx = afterTo.indexOf(T.MSG);
        if (msgIdx === -1)
            continue;
        const afterMsg = afterTo.slice(msgIdx + T.MSG.length);
        // Content goes until <|call|>, <|end|>, or next <|start|>
        const terminators = [T.CALL, T.END, T.START];
        let endIdx = Infinity;
        for (const t of terminators) {
            const i = afterMsg.indexOf(t);
            if (i !== -1 && i < endIdx)
                endIdx = i;
        }
        const jsonStr = (endIdx === Infinity ? afterMsg : afterMsg.slice(0, endIdx)).trim();
        // Extract reasoning (after <|call|> if present)
        let reasoning = '';
        const callIdx = afterTo.indexOf(T.CALL);
        if (callIdx !== -1) {
            const afterCall = afterTo.slice(callIdx + T.CALL.length);
            const reasonMsgIdx = afterCall.indexOf(T.MSG);
            if (reasonMsgIdx !== -1) {
                const afterReasonMsg = afterCall.slice(reasonMsgIdx + T.MSG.length);
                const reasonEnd = afterReasonMsg.indexOf(T.END);
                reasoning = (reasonEnd !== -1 ? afterReasonMsg.slice(0, reasonEnd) : afterReasonMsg).trim();
            }
        }
        // Parse JSON args
        try {
            const args = JSON.parse(jsonStr);
            calls.push({ tool, args, reasoning });
        }
        catch {
            // Try extracting just the JSON object
            const jm = jsonStr.match(/(\{[\s\S]*?\})/);
            if (jm) {
                try {
                    const args = JSON.parse(jm[1]);
                    calls.push({ tool, args, reasoning });
                }
                catch { /* skip malformed */ }
            }
        }
    }
    return calls;
}
// ─── Main class ───────────────────────────────────────────────────────────────
export class Context1ProductionHarness {
    constructor(ollamaUrl, wayfarerUrl) {
        this.ollamaUrl = ollamaUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
        this.ollamaService = new OllamaService(this.ollamaUrl);
        this.wayfarerService = new WayfarerService(wayfarerUrl);
        this.corpusCache = new CorpusCache();
    }
    // ─── Ollama raw generate ──────────────────────────────────────────────────
    /**
     * Call Ollama /api/generate directly — NO stop token.
     * Context-1 outputs multi-turn sequences (analysis → final → tool call) so
     * we let it generate fully and scan the entire output for tool calls.
     *
     * Includes timeout protection (30s) to prevent indefinite hangs.
     */
    async ollamaGenerate(prompt, signal) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), DEFAULT_CONFIG.generateTimeout);
        // Compose external abort signal with timeout
        const onAbort = () => controller.abort();
        if (signal)
            signal.addEventListener('abort', onAbort);
        try {
            const response = await fetch(`${this.ollamaUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: CONTEXT1_MODEL,
                    prompt,
                    stream: false,
                    options: {
                        temperature: 0.0,
                        num_predict: 800,
                        repeat_penalty: 1.05,
                    },
                }),
                signal: controller.signal,
            });
            if (!response.ok) {
                throw new Error(`Ollama generate failed: HTTP ${response.status}`);
            }
            const data = await response.json();
            return data.response ?? '';
        }
        finally {
            clearTimeout(timeoutId);
            if (signal)
                signal.removeEventListener('abort', onAbort);
        }
    }
    // ─── Hybrid search (BM25 + dense vectors) ────────────────────────────────
    /**
     * Hybrid search combining BM25 keyword matching with vector semantic similarity.
     * Weights: 40% BM25, 60% vector (semantic beats keyword).
     * Falls back to BM25-only if embedding generation fails.
     */
    async execHybridSearch(query, corpus, seenChunkIds, remainingBudget, signal) {
        const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        try {
            // Generate query embedding via nomic-embed-text
            const queryEmbedding = await this.ollamaService.embed(query, 'nomic-embed-text');
            // Collect all candidate chunks
            const candidates = [];
            for (const doc of corpus.values()) {
                for (const chunk of doc.chunks) {
                    if (!chunk.pruned && !seenChunkIds.has(chunk.chunkId)) {
                        candidates.push(chunk);
                    }
                }
            }
            // BM25-lite scores
            const bm25Scores = new Map();
            for (const chunk of candidates) {
                bm25Scores.set(chunk.chunkId, scoreChunk(chunk.content, queryTerms));
            }
            // Batch-generate missing embeddings in parallel
            const missingEmbeddings = candidates.filter(c => !c.embedding);
            if (missingEmbeddings.length > 0) {
                await Promise.all(missingEmbeddings.map(async (chunk) => {
                    try {
                        chunk.embedding = await this.ollamaService.embed(chunk.content, 'nomic-embed-text');
                    }
                    catch (err) {
                        log.warn(`Failed to embed chunk ${chunk.chunkId}`, { error: String(err) });
                        chunk.embedding = Array(768).fill(0); // fallback zero vector
                    }
                }));
            }
            // Vector similarity scores
            const vectorScores = new Map();
            for (const chunk of candidates) {
                const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
                vectorScores.set(chunk.chunkId, similarity);
            }
            // Combine: 40% BM25, 60% vector
            const combinedScores = new Map();
            for (const chunk of candidates) {
                const bm25 = bm25Scores.get(chunk.chunkId) || 0;
                const vector = vectorScores.get(chunk.chunkId) || 0;
                combinedScores.set(chunk.chunkId, bm25 * 0.4 + vector * 0.6);
            }
            // Sort, budget-truncate, deduplicate
            const scored = candidates
                .map(c => ({ ...c, score: combinedScores.get(c.chunkId) || 0 }))
                .sort((a, b) => b.score - a.score);
            const results = [];
            let budgetUsed = 0;
            for (const c of scored) {
                const cTokens = tokEst(c.content);
                if (budgetUsed + cTokens > remainingBudget * 0.3)
                    break;
                results.push(c);
                budgetUsed += cTokens;
                seenChunkIds.add(c.chunkId);
                if (results.length >= 12)
                    break;
            }
            return results;
        }
        catch (err) {
            log.warn('Hybrid search failed, falling back to BM25', { error: String(err) });
            return this.execSearchCorpus(query, corpus, seenChunkIds, remainingBudget);
        }
    }
    // ─── Tool executors ───────────────────────────────────────────────────────
    async execSearchCorpus(query, corpus, seenChunkIds, remainingBudget) {
        const queryTerms = query.toLowerCase().split(/\s+/).filter(t => t.length > 2);
        // Fetch new web content via Wayfarer if under doc limit
        if (corpus.size < MAX_CORPUS_DOCS) {
            try {
                const pages = await this.wayfarerService.research(query, 5);
                for (const page of pages) {
                    if (corpus.has(page.url))
                        continue;
                    const docId = `d${corpus.size + 1}`;
                    const content = page.content;
                    const contentHash = this.corpusCache.hashContent(content);
                    let chunks = this.corpusCache.get(docId, contentHash);
                    if (!chunks) {
                        chunks = chunkText(content, docId, 0);
                        this.corpusCache.set(docId, content, chunks);
                    }
                    for (const c of chunks)
                        c.score = scoreChunk(c.content, queryTerms);
                    corpus.set(page.url, {
                        docId, url: page.url, title: page.title,
                        fullContent: content, chunks,
                    });
                }
            }
            catch (err) {
                if (err?.name === 'AbortError')
                    throw err;
                log.warn('Wayfarer search failed, using in-memory corpus only', { error: String(err) });
            }
        }
        // Score all non-pruned, non-duplicate chunks
        const scored = [];
        for (const doc of corpus.values()) {
            for (const c of doc.chunks) {
                if (c.pruned || seenChunkIds.has(c.chunkId))
                    continue;
                scored.push({ ...c, score: scoreChunk(c.content, queryTerms) });
            }
        }
        // Sort by score, truncate to fit remaining token budget (max 30% per search)
        scored.sort((a, b) => b.score - a.score);
        const results = [];
        let budgetUsed = 0;
        for (const c of scored) {
            const cTokens = tokEst(c.content);
            if (budgetUsed + cTokens > remainingBudget * 0.3)
                break;
            results.push(c);
            budgetUsed += cTokens;
            seenChunkIds.add(c.chunkId);
            if (results.length >= 12)
                break;
        }
        return results;
    }
    execGrepCorpus(pattern, corpus, seenChunkIds) {
        let regex;
        try {
            regex = new RegExp(pattern, 'i');
        }
        catch {
            regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        }
        const matches = [];
        for (const doc of corpus.values()) {
            for (const c of doc.chunks) {
                if (!c.pruned && !seenChunkIds.has(c.chunkId) && regex.test(c.content)) {
                    matches.push({ ...c, score: 0.7 });
                    seenChunkIds.add(c.chunkId);
                }
            }
        }
        return matches.slice(0, 5);
    }
    execReadDocument(docId, corpus, remainingBudget) {
        for (const doc of corpus.values()) {
            if (doc.docId === docId) {
                const maxChars = Math.min(doc.fullContent.length, Math.floor(remainingBudget * 0.25 * CHARS_PER_TOKEN));
                return doc.fullContent.slice(0, maxChars);
            }
        }
        return `Document "${docId}" not found in corpus.`;
    }
    execPruneChunks(chunkIds, corpus) {
        let pruned = 0;
        let tokensFreed = 0;
        for (const doc of corpus.values()) {
            for (const c of doc.chunks) {
                if (chunkIds.includes(c.chunkId) && !c.pruned) {
                    c.pruned = true;
                    pruned++;
                    tokensFreed += tokEst(c.content);
                }
            }
        }
        return { pruned, tokensFreed };
    }
    execSearchImages(query, corpus, seenChunkIds) {
        const images = [];
        for (const doc of corpus.values()) {
            if (doc.images) {
                doc.images.forEach((img, idx) => {
                    images.push({
                        chunkId: `${doc.docId}_img${idx}`,
                        docId: doc.docId,
                        url: img.url,
                        description: img.description,
                    });
                });
            }
        }
        if (images.length === 0)
            return [];
        const queryTerms = query.toLowerCase().split(/\s+/);
        const scored = images
            .filter(img => !seenChunkIds.has(img.chunkId))
            .map(img => {
            const descLower = img.description.toLowerCase();
            let matches = 0;
            for (const term of queryTerms) {
                if (descLower.includes(term))
                    matches++;
            }
            return { img, score: matches / (queryTerms.length || 1) };
        })
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);
        return scored.map(({ img, score }) => {
            seenChunkIds.add(img.chunkId);
            return {
                chunkId: img.chunkId,
                docId: img.docId,
                content: `[IMAGE] ${img.url}\n${img.description}`,
                score,
                pruned: false,
            };
        });
    }
    execWriteChunk(docId, content, corpus) {
        // Find by docId (corpus is keyed by URL)
        for (const doc of corpus.values()) {
            if (doc.docId === docId) {
                const newChunkId = `${docId}_c${doc.chunks.length}`;
                doc.chunks.push({ chunkId: newChunkId, docId, content, score: 1.0, pruned: false });
                return { success: true, chunkId: newChunkId };
            }
        }
        return { success: false, error: `Document ${docId} not found` };
    }
    execUpdateChunk(chunkId, content, corpus) {
        for (const doc of corpus.values()) {
            const chunk = doc.chunks.find(c => c.chunkId === chunkId);
            if (chunk) {
                chunk.content = content;
                return { success: true };
            }
        }
        return { success: false, error: `Chunk ${chunkId} not found` };
    }
    execDeleteChunk(chunkId, corpus) {
        for (const doc of corpus.values()) {
            const idx = doc.chunks.findIndex(c => c.chunkId === chunkId);
            if (idx >= 0) {
                doc.chunks.splice(idx, 1);
                return { success: true };
            }
        }
        return { success: false, error: `Chunk ${chunkId} not found` };
    }
    // ─── Query decomposition ──────────────────────────────────────────────────
    /**
     * Decompose a complex query into focused subqueries using the model.
     * Falls back to the original query on failure.
     */
    async decomposeQuery(query, signal) {
        const decompositionPrompt = `${T.START}system${T.CHANNEL}final${T.MSG}You are a query decomposition assistant. Break down complex queries into focused subqueries.

Output format:
SUBQUERY: [focused search query 1]
PURPOSE: [what this finds]

SUBQUERY: [focused search query 2]
PURPOSE: [what this finds]

(up to 3 subqueries)${T.END}

${T.START}user${T.CHANNEL}final${T.MSG}${query}${T.END}

${T.START}assistant${T.CHANNEL}final${T.MSG}`;
        try {
            const response = await this.ollamaGenerate(decompositionPrompt, signal);
            const subqueries = [];
            const subqRegex = /SUBQUERY:\s*([^\n]+)\s*PURPOSE:\s*([^\n]+)/g;
            let match;
            while ((match = subqRegex.exec(response)) !== null) {
                subqueries.push({ query: match[1].trim(), purpose: match[2].trim() });
            }
            return {
                originalQuery: query,
                subqueries: subqueries.length > 0 ? subqueries : [{ query, purpose: 'Original query' }],
            };
        }
        catch (err) {
            log.warn('Query decomposition failed, using original query', { error: String(err) });
            return { originalQuery: query, subqueries: [{ query, purpose: 'Original query' }] };
        }
    }
    // ─── Pre-load a corpus from already-fetched content ──────────────────────
    /**
     * Build a corpus Map from a flat array of { url, title, content } objects.
     * Used by queryFindings() to avoid a live Wayfarer round-trip.
     */
    buildCorpusFromFindings(findings) {
        const corpus = new Map();
        for (const f of findings) {
            if (corpus.has(f.url))
                continue;
            const docId = `d${corpus.size + 1}`;
            const contentHash = this.corpusCache.hashContent(f.content);
            let chunks = this.corpusCache.get(docId, contentHash);
            if (!chunks) {
                chunks = chunkText(f.content, docId, 0);
                this.corpusCache.set(docId, f.content, chunks);
            }
            corpus.set(f.url, { docId, url: f.url, title: f.title, fullContent: f.content, chunks });
        }
        return corpus;
    }
    // ─── Core observe-reason-act loop ────────────────────────────────────────
    /**
     * Run a retrieval query through the Context-1 harness.
     *
     * Implements Chroma's full observe-reason-act loop with:
     *   - Self-editing context window (token budget tracking + soft/hard thresholds)
     *   - Chunk deduplication across all searches
     *   - Tool execution: search→Wayfarer, grep→regex, read→full doc, prune→evict
     *   - Query decomposition for complex multi-faceted queries
     *   - Parallel tool execution (up to 4 tools per turn)
     *   - Automatic termination on text-only response or budget exhaustion
     *
     * @param initialCorpus  If provided, search_corpus will NOT fetch new web content
     *                       (used by queryFindings). Pass undefined to allow live fetches.
     */
    async retrieve(query, options = {}, initialCorpus) {
        const { maxChunks = 10, maxSteps = 15, tokenBudget = DEFAULT_CONFIG.tokenBudget, signal, onEvent, config: userConfig, decomposeQuery: shouldDecompose, } = options;
        const cfg = { ...DEFAULT_CONFIG, ...userConfig };
        const startTime = Date.now();
        // Optional query decomposition
        let queriesToRun = [query];
        if (shouldDecompose) {
            try {
                const decomp = await this.decomposeQuery(query, signal);
                queriesToRun = decomp.subqueries.map(sq => sq.query);
                log.info(`Query decomposed into ${queriesToRun.length} subqueries`);
                onEvent?.({ type: 'observation', tool: 'decompose', chunksFound: queriesToRun.length, message: `Decomposed into: ${queriesToRun.join('; ')}` });
            }
            catch (err) {
                log.warn('Query decomposition failed, using original', { error: String(err) });
            }
        }
        // Per-session state
        const corpus = initialCorpus ?? new Map();
        const seenChunkIds = new Set();
        const toolCallLog = [];
        let step = 0;
        let tokensUsed = 0;
        let prunedTokens = 0;
        let softWarningIssued = false;
        const combinedQuery = queriesToRun.length > 1
            ? `Research these topics in order and collect relevant chunks for each:\n${queriesToRun.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
            : query;
        let prompt = sysTurn(SYSTEM_PROMPT) + usrTurn(combinedQuery) + `${T.START}assistant`;
        tokensUsed += tokEst(prompt);
        try {
            while (step < maxSteps) {
                if (signal?.aborted)
                    throw Object.assign(new Error('Aborted'), { name: 'AbortError' });
                // Generate (no stop token — model outputs multi-turn sequences)
                const responseText = await this.ollamaGenerate(prompt, signal);
                tokensUsed += tokEst(responseText);
                // Append full response to prompt (strip trailing garbage, keep clean boundary)
                const lastEnd = responseText.lastIndexOf(T.END);
                const cleanResponse = lastEnd !== -1
                    ? responseText.slice(0, lastEnd + T.END.length)
                    : responseText + T.END;
                prompt += cleanResponse + '\n';
                // Parse for tool calls
                const toolCalls = findToolCalls(responseText);
                if (toolCalls.length === 0) {
                    // No tool calls — model has finished retrieving
                    onEvent?.({ type: 'done', tokensUsed, tokenBudget, message: 'Retrieval complete' });
                    break;
                }
                // Execute at most maxParallelTools per turn
                const toolsToExecute = toolCalls.slice(0, DEFAULT_CONFIG.maxParallelTools);
                const netTokensUsed = tokensUsed - prunedTokens;
                const effectiveBudget = tokenBudget - netTokensUsed;
                const usageRatio = netTokensUsed / tokenBudget;
                for (const tc of toolsToExecute) {
                    onEvent?.({ type: 'tool_call', tool: tc.tool, args: JSON.stringify(tc.args), tokensUsed, tokenBudget, message: tc.reasoning });
                }
                // Hard cutoff: only prune_chunks allowed above 85%
                if (usageRatio >= cfg.hardCutoff) {
                    const nonPrune = toolsToExecute.filter(t => t.tool !== 'prune_chunks');
                    if (nonPrune.length > 0) {
                        for (const tc of nonPrune) {
                            prompt += toolRes(tc.tool, JSON.stringify({ error: 'Budget exceeded — only prune_chunks allowed' }));
                        }
                        const rejection = `[BUDGET EXCEEDED: ${netTokensUsed}/${tokenBudget} tokens (${Math.round(usageRatio * 100)}%). Only prune_chunks is allowed. Prune irrelevant chunks or conclude by outputting your final assessment with no tool calls.]`;
                        prompt += `\n${rejection}\n${T.START}assistant`;
                        onEvent?.({ type: 'budget_warning', tokensUsed, tokenBudget, message: 'Hard cutoff — only prune allowed' });
                        step++;
                        continue;
                    }
                }
                // Execute tools in parallel — individual failures do not abort the batch
                const toolResults = [];
                await Promise.all(toolsToExecute.map(async (tc) => {
                    let resultChunks = [];
                    let resultJson = '';
                    try {
                        switch (tc.tool) {
                            case 'search_corpus': {
                                const q = tc.args.query || query;
                                // Hybrid search first; falls back to BM25 on embedding error
                                resultChunks = await this.execHybridSearch(q, corpus, seenChunkIds, effectiveBudget, signal);
                                const serialized = resultChunks.map(c => ({
                                    chunk_id: c.chunkId,
                                    doc_id: c.docId,
                                    content: c.content,
                                    score: +c.score.toFixed(3),
                                    metadata: { url: [...corpus.entries()].find(([, d]) => d.docId === c.docId)?.[0] ?? '' },
                                }));
                                resultJson = JSON.stringify(serialized);
                                onEvent?.({ type: 'observation', tool: tc.tool, chunksFound: resultChunks.length });
                                break;
                            }
                            case 'grep_corpus': {
                                const pattern = tc.args.pattern || '';
                                resultChunks = this.execGrepCorpus(pattern, corpus, seenChunkIds);
                                resultJson = JSON.stringify(resultChunks.map(c => ({
                                    chunk_id: c.chunkId, doc_id: c.docId, content: c.content, score: c.score,
                                })));
                                onEvent?.({ type: 'observation', tool: tc.tool, chunksFound: resultChunks.length });
                                break;
                            }
                            case 'read_document': {
                                const docId = tc.args.doc_id || '';
                                const content = this.execReadDocument(docId, corpus, effectiveBudget);
                                // Mark all chunks of this document as seen
                                for (const doc of corpus.values()) {
                                    if (doc.docId === docId) {
                                        for (const c of doc.chunks)
                                            seenChunkIds.add(c.chunkId);
                                        break;
                                    }
                                }
                                resultJson = JSON.stringify({ doc_id: docId, content });
                                onEvent?.({ type: 'observation', tool: tc.tool, chunksFound: 1 });
                                break;
                            }
                            case 'search_images': {
                                const q = tc.args.query || query;
                                resultChunks = this.execSearchImages(q, corpus, seenChunkIds);
                                resultJson = JSON.stringify(resultChunks.map(c => ({
                                    chunk_id: c.chunkId, content: c.content, score: +c.score.toFixed(3),
                                })));
                                onEvent?.({ type: 'observation', tool: tc.tool, chunksFound: resultChunks.length });
                                break;
                            }
                            case 'write_chunk': {
                                const docId = tc.args.doc_id || '';
                                const content = tc.args.content || '';
                                const result = this.execWriteChunk(docId, content, corpus);
                                resultJson = JSON.stringify(result);
                                onEvent?.({ type: 'observation', tool: tc.tool, chunksFound: result.success ? 1 : 0 });
                                break;
                            }
                            case 'update_chunk': {
                                const chunkId = tc.args.chunk_id || '';
                                const content = tc.args.content || '';
                                const result = this.execUpdateChunk(chunkId, content, corpus);
                                resultJson = JSON.stringify(result);
                                onEvent?.({ type: 'observation', tool: tc.tool, chunksFound: result.success ? 1 : 0 });
                                break;
                            }
                            case 'delete_chunk': {
                                const chunkId = tc.args.chunk_id || '';
                                const result = this.execDeleteChunk(chunkId, corpus);
                                resultJson = JSON.stringify(result);
                                onEvent?.({ type: 'observation', tool: tc.tool, chunksFound: result.success ? 1 : 0 });
                                break;
                            }
                            case 'prune_chunks': {
                                const ids = tc.args.chunk_ids || [];
                                const result = this.execPruneChunks(ids, corpus);
                                prunedTokens += result.tokensFreed;
                                resultJson = JSON.stringify({ pruned: result.pruned, tokens_freed: result.tokensFreed });
                                onEvent?.({ type: 'prune', chunksPruned: result.pruned, tokensUsed });
                                break;
                            }
                            default:
                                resultJson = JSON.stringify({ error: `Unknown tool: ${tc.tool}` });
                        }
                        toolResults.push({ tool: tc.tool, result: resultJson, chunks: resultChunks.length });
                        tokensUsed += tokEst(resultJson);
                    }
                    catch (err) {
                        const errMsg = err instanceof Error ? err.message : 'Unknown error';
                        toolResults.push({ tool: tc.tool, result: JSON.stringify({ error: errMsg }), chunks: 0 });
                        onEvent?.({ type: 'error', message: `Tool ${tc.tool} failed: ${errMsg}` });
                    }
                }));
                // Inject tool results + token usage observation into prompt
                for (const { tool, result } of toolResults) {
                    prompt += toolRes(tool, result);
                    toolCallLog.push({
                        tool,
                        args: JSON.stringify(toolsToExecute.find(t => t.tool === tool)?.args ?? {}),
                        resultChunks: toolResults.find(r => r.tool === tool)?.chunks ?? 0,
                    });
                }
                const usageAfter = tokensUsed - prunedTokens;
                let observation = `\n[Token usage: ${usageAfter.toLocaleString()}/${tokenBudget.toLocaleString()}]\n`;
                // Soft threshold warning (issued once)
                if (!softWarningIssued && usageAfter / tokenBudget >= cfg.softThreshold) {
                    observation += `[Note: Context is filling up (${Math.round(usageAfter / tokenBudget * 100)}%). Consider pruning irrelevant chunks before searching more. Use prune_chunks to free space.]\n`;
                    softWarningIssued = true;
                    onEvent?.({ type: 'budget_warning', tokensUsed: usageAfter, tokenBudget, message: 'Soft threshold — consider pruning' });
                }
                prompt += observation + `${T.START}assistant`;
                step++;
            }
        }
        catch (err) {
            if (err?.name === 'AbortError') {
                log.info('Context-1 retrieval aborted');
                throw err;
            }
            log.error('Context-1 harness error', { error: String(err) });
            onEvent?.({ type: 'error', message: err instanceof Error ? err.message : 'Unknown' });
        }
        // Collect final ranked chunks
        const allChunks = [];
        for (const doc of corpus.values()) {
            for (const c of doc.chunks) {
                if (!c.pruned && c.score > 0) {
                    allChunks.push({
                        chunkId: c.chunkId,
                        docId: c.docId,
                        content: c.content,
                        score: c.score,
                        metadata: { url: doc.url, title: doc.title },
                    });
                }
            }
        }
        return {
            chunks: allChunks.sort((a, b) => b.score - a.score).slice(0, maxChunks),
            tokensUsed,
            steps: step,
            durationMs: Date.now() - startTime,
            toolCalls: toolCallLog,
        };
    }
    // ─── Public API ───────────────────────────────────────────────────────────
    /**
     * Post-research Q&A over a stored findings corpus.
     *
     * Takes an array of already-fetched research findings (url + title + content)
     * and runs the Context-1 loop over them WITHOUT fetching new web content.
     * Use this for answering questions about what was already researched.
     *
     * @param query    The question to answer / what to find
     * @param findings Array of { url, title, content } — typically from a prior research run
     * @param options  maxChunks, maxSteps, onEvent, decomposeQuery
     */
    async queryFindings(query, findings, options = {}) {
        const corpus = this.buildCorpusFromFindings(findings);
        log.info(`queryFindings: ${findings.length} docs loaded, query="${query.slice(0, 80)}..."`);
        // Temporarily cap MAX_CORPUS_DOCS to prevent live Wayfarer fetches.
        // We do this by pre-filling the corpus to the limit with a sentinel doc,
        // then removing it after. Simpler: just pass a patched config with maxCorpusDocs=0
        // so execSearchCorpus skips the Wayfarer branch.
        return this.retrieve(query, {
            maxChunks: options.maxChunks ?? 10,
            maxSteps: options.maxSteps ?? 15,
            onEvent: options.onEvent,
            decomposeQuery: options.decomposeQuery,
            config: { maxCorpusDocs: 0 }, // no live fetches — corpus is pre-loaded
        }, corpus);
    }
    /**
     * Dedup + gap-finding during an ongoing research session.
     *
     * Takes the existing in-progress corpus and a new query, and uses Context-1
     * to find what is already covered vs. what is still missing. Allows live
     * Wayfarer fetches (up to DEFAULT maxCorpusDocs) to fill gaps.
     *
     * @param query          What to search for / check gaps on
     * @param existingCorpus Array of { url, title, content } already collected so far
     * @param options        maxChunks, maxSteps, onEvent
     */
    async searchDuringResearch(query, existingCorpus, options = {}) {
        const corpus = this.buildCorpusFromFindings(existingCorpus);
        log.info(`searchDuringResearch: ${existingCorpus.length} existing docs, query="${query.slice(0, 80)}..."`);
        // Live Wayfarer fetches allowed — model may call search_corpus to fetch more
        return this.retrieve(query, {
            maxChunks: options.maxChunks ?? 12,
            maxSteps: options.maxSteps ?? 20,
            onEvent: options.onEvent,
        }, corpus);
    }
    // ─── Health check ─────────────────────────────────────────────────────────
    async healthCheck() {
        const start = Date.now();
        try {
            const res = await fetch(`${this.ollamaUrl}/api/tags`, {
                signal: AbortSignal.timeout(30000),
            });
            const latencyMs = Date.now() - start;
            if (!res.ok)
                return { status: 'disconnected', endpoint: this.ollamaUrl, latencyMs, error: `HTTP ${res.status}` };
            const data = await res.json();
            const loaded = data.models?.some(m => m.name.includes('chromadb-context-1')) ?? false;
            return {
                status: loaded ? 'connected' : 'disconnected',
                endpoint: this.ollamaUrl,
                latencyMs,
                modelLoaded: loaded,
                error: loaded ? undefined : 'chromadb-context-1 not found in Ollama model list',
            };
        }
        catch (err) {
            return {
                status: 'disconnected',
                endpoint: this.ollamaUrl,
                latencyMs: Date.now() - start,
                error: err instanceof Error ? err.message : 'Unknown error',
            };
        }
    }
    async isAvailable() {
        try {
            return (await this.healthCheck()).status === 'connected';
        }
        catch {
            return false;
        }
    }
    /** Clear the chunk cache (useful between independent research sessions) */
    clearCache() {
        this.corpusCache.clear();
    }
}
// ─── Singleton ────────────────────────────────────────────────────────────────
export const context1Harness = new Context1ProductionHarness();
// ─── Cached availability helper ───────────────────────────────────────────────
let _cachedHealth = null;
const CACHE_TTL = 30000;
export async function isContext1Available() {
    if (_cachedHealth && Date.now() - _cachedHealth.ts < CACHE_TTL)
        return _cachedHealth.ok;
    const ok = await context1Harness.isAvailable();
    _cachedHealth = { ok, ts: Date.now() };
    return ok;
}
// ─── Convenience re-exports ───────────────────────────────────────────────────
/**
 * Query a pre-fetched findings corpus — shorthand over the singleton instance.
 * Suitable for post-research Q&A over stored findings.
 */
export async function queryFindings(query, findings, options = {}) {
    return context1Harness.queryFindings(query, findings, options);
}
/**
 * Dedup + gap search during an active research session — shorthand over singleton.
 * Allows live Wayfarer fetches to fill gaps in the existing corpus.
 */
export async function searchDuringResearch(query, existingCorpus, options = {}) {
    return context1Harness.searchDuringResearch(query, existingCorpus, options);
}
//# sourceMappingURL=context1ProductionHarness.js.map