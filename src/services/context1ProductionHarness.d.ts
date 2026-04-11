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
declare const DEFAULT_CONFIG: {
    chunkSizeWords: number;
    maxCorpusDocs: number;
    charsPerToken: number;
    tokenBudget: number;
    softThreshold: number;
    hardCutoff: number;
    generateTimeout: number;
    maxParallelTools: number;
};
export interface RetrievedChunk {
    chunkId: string;
    docId: string;
    content: string;
    score: number;
    metadata?: Record<string, unknown>;
}
export interface RetrievalResult {
    chunks: RetrievedChunk[];
    tokensUsed: number;
    steps: number;
    durationMs: number;
    toolCalls?: Array<{
        tool: string;
        args: string;
        resultChunks: number;
    }>;
}
export interface RetrievalEvent {
    type: 'tool_call' | 'observation' | 'reasoning' | 'prune' | 'budget_warning' | 'done' | 'error';
    tool?: string;
    args?: string;
    chunksFound?: number;
    chunksPruned?: number;
    tokensUsed?: number;
    tokenBudget?: number;
    message?: string;
}
export interface Context1HealthResult {
    status: 'connected' | 'disconnected';
    endpoint: string;
    latencyMs: number;
    modelLoaded?: boolean;
    error?: string;
}
export interface QueryFindingsOptions {
    maxChunks?: number;
    maxSteps?: number;
    onEvent?: (event: RetrievalEvent) => void;
    decomposeQuery?: boolean;
}
export interface SearchDuringResearchOptions {
    maxChunks?: number;
    maxSteps?: number;
    onEvent?: (event: RetrievalEvent) => void;
}
interface CorpusDoc {
    docId: string;
    url: string;
    title: string;
    fullContent: string;
    chunks: CorpusChunk[];
    images?: Array<{
        url: string;
        description: string;
    }>;
}
interface CorpusChunk {
    chunkId: string;
    docId: string;
    content: string;
    score: number;
    pruned: boolean;
    embedding?: number[];
}
interface RetrievalOptions {
    maxChunks?: number;
    maxSteps?: number;
    tokenBudget?: number;
    signal?: AbortSignal;
    onEvent?: (event: RetrievalEvent) => void;
    config?: Partial<typeof DEFAULT_CONFIG>;
    decomposeQuery?: boolean;
}
export declare class Context1ProductionHarness {
    private ollamaService;
    private wayfarerService;
    private corpusCache;
    private ollamaUrl;
    constructor(ollamaUrl?: string, wayfarerUrl?: string);
    /**
     * Call Ollama /api/generate directly — NO stop token.
     * Context-1 outputs multi-turn sequences (analysis → final → tool call) so
     * we let it generate fully and scan the entire output for tool calls.
     *
     * Includes timeout protection (30s) to prevent indefinite hangs.
     */
    private ollamaGenerate;
    /**
     * Hybrid search combining BM25 keyword matching with vector semantic similarity.
     * Weights: 40% BM25, 60% vector (semantic beats keyword).
     * Falls back to BM25-only if embedding generation fails.
     */
    private execHybridSearch;
    private execSearchCorpus;
    private execGrepCorpus;
    private execReadDocument;
    private execPruneChunks;
    private execSearchImages;
    private execWriteChunk;
    private execUpdateChunk;
    private execDeleteChunk;
    /**
     * Decompose a complex query into focused subqueries using the model.
     * Falls back to the original query on failure.
     */
    private decomposeQuery;
    /**
     * Build a corpus Map from a flat array of { url, title, content } objects.
     * Used by queryFindings() to avoid a live Wayfarer round-trip.
     */
    private buildCorpusFromFindings;
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
    retrieve(query: string, options?: RetrievalOptions, initialCorpus?: Map<string, CorpusDoc>): Promise<RetrievalResult>;
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
    queryFindings(query: string, findings: Array<{
        url: string;
        title: string;
        content: string;
    }>, options?: QueryFindingsOptions): Promise<RetrievalResult>;
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
    searchDuringResearch(query: string, existingCorpus: Array<{
        url: string;
        title: string;
        content: string;
    }>, options?: SearchDuringResearchOptions): Promise<RetrievalResult>;
    healthCheck(): Promise<Context1HealthResult>;
    isAvailable(): Promise<boolean>;
    /** Clear the chunk cache (useful between independent research sessions) */
    clearCache(): void;
}
export declare const context1Harness: Context1ProductionHarness;
export declare function isContext1Available(): Promise<boolean>;
/**
 * Query a pre-fetched findings corpus — shorthand over the singleton instance.
 * Suitable for post-research Q&A over stored findings.
 */
export declare function queryFindings(query: string, findings: Array<{
    url: string;
    title: string;
    content: string;
}>, options?: QueryFindingsOptions): Promise<RetrievalResult>;
/**
 * Dedup + gap search during an active research session — shorthand over singleton.
 * Allows live Wayfarer fetches to fill gaps in the existing corpus.
 */
export declare function searchDuringResearch(query: string, existingCorpus: Array<{
    url: string;
    title: string;
    content: string;
}>, options?: SearchDuringResearchOptions): Promise<RetrievalResult>;
export {};
//# sourceMappingURL=context1ProductionHarness.d.ts.map