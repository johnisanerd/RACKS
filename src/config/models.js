/**
 * Model Registry — Single source of truth for all LLM model assignments
 *
 * Routing strategy:
 *   Gemma models  — Planning/thinking and browsing/fact extraction from pages.
 *                   Gemma's thinking architecture is better at structured reasoning.
 *   Qwen models   — Technical synthesis, report writing, precision tasks.
 *   Minimum size  — 2b (no smaller models).
 *
 * All components import models from here, preventing duplication.
 */
export const MODEL_REGISTRY = {
    // === GEMMA TIER (thinking + browsing) ===
    planning: 'gemma4:e2b', // Fast: decompose questions, generate queries
    extraction: 'gemma4:e2b', // Fast: extract facts from scraped pages
    reasoning: 'gemma4:27b', // Deep: analyze findings, spot contradictions, generate insights
    reflection: 'gemma4:27b', // Deep: gap analysis, what's missing, what to research next
    youtube_analysis: 'gemma4:e2b', // Fast: extract insights from YouTube transcripts
    // === QWEN TIER (technical + writing) ===
    synthesis: 'qwen3.5:27b', // Best quality: executive summary, full report writing
    section_synthesis: 'qwen3.5:9b', // Section-level summaries (balance speed/quality)
    citation: 'qwen3.5:4b', // Match facts to sources, format citations
    desire_analysis: 'qwen3.5:9b', // Customer desire/emotion analysis (needs nuance)
    // === RETRIEVAL ===
    embedding: 'nomic-embed-text', // Keep: vector embeddings for RAG
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