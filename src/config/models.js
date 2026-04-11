/**
 * Model Registry — Single source of truth for all LLM model assignments
 *
 * Centralizes model selection across all research phases.
 * All components import models from here, preventing duplication.
 */
export const MODEL_REGISTRY = {
    // Planning phase: decompose question into sections
    planning: 'gemma4:e2b',
    // Synthesis phase: generate final markdown report
    synthesis: 'gemma3:20b',
    // Fact extraction: compress web pages into key facts
    extraction: 'gemma4:e2b',
    // Embedding: vector representation of facts for semantic search
    embedding: 'nomic-embed-text',
    // Reflection: identify gaps and missing research angles
    reflection: 'gemma4:e2b',
    // Summarization: compress long text into concise summaries
    summarization: 'gemma4:e2b',
    // YouTube transcript analysis: extract key points from videos
    youtube_transcript: 'gemma4:e2b',
};
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