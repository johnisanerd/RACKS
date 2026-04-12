/**
 * Model Registry — Single source of truth for all LLM model assignments
 *
 * Routing strategy (REMOTE Ollama @ 100.74.135.83:11440):
 *   Qwen 2b/4b    — Fast fact extraction, planning, YouTube analysis
 *   Qwen 9b       — Reasoning, reflection, synthesis, analysis
 *
 * All components import models from here, preventing duplication.
 */
export const MODEL_REGISTRY = {
    // === QWEN FAST TIER (2b - planning/extraction) ===
    planning: 'qwen3.5:2b', // Decompose questions, generate queries
    extraction: 'qwen3.5:4b', // Extract facts from scraped pages (JSON structured output)
    youtube_analysis: 'qwen3.5:2b', // Fast: extract insights from YouTube transcripts
    // === QWEN MID TIER (4b/9b - reasoning/reflection/synthesis) ===
    reasoning: 'qwen3.5:4b', // Analyze findings, spot contradictions, generate insights
    reflection: 'qwen3.5:4b', // Gap analysis, what's missing, what to research next
    synthesis: 'qwen3.5:9b', // Executive summary, full report writing
    section_synthesis: 'qwen3.5:9b', // Section-level summaries
    citation: 'qwen3.5:2b', // Match facts to sources, format citations
    desire_analysis: 'qwen3.5:9b', // Customer desire/emotion analysis
    // === RETRIEVAL ===
    embedding: 'nomic-embed-text:latest', // Keep: vector embeddings for RAG
    context1: 'chromadb-context-1:latest', // Context-1 for observe-reason-act RAG
};
/**
 * Backward-compatibility alias: extraction model for callers that import this name directly.
 */
export const EXTRACTION_MODEL = MODEL_REGISTRY.extraction;
/**
 * Validate that all required models are defined
 */
export function validateModelRegistry() {
    const requiredModels = [
        'planning',
        'synthesis',
        'extraction',
        'embedding',
        'reflection',
    ];
    for (const key of requiredModels) {
        if (!MODEL_REGISTRY[key]) {
            throw new Error(`Missing required model: ${key}`);
        }
    }
}
/**
 * Get a model by phase name
 */
export function getModel(phase) {
    const model = MODEL_REGISTRY[phase];
    if (!model) {
        throw new Error(`Unknown phase: ${phase}`);
    }
    return model;
}
//# sourceMappingURL=models.js.map