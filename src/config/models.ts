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
  // === GEMMA4 TIER (planning/generation) ===
  // Using ONLY Gemma4 models that are reliably loaded on the Ollama instance
  // gemma4:e2b (5.1B) and gemma4:e4b (8B) are the stable, available models
  planning: 'gemma4:e2b',           // Decompose questions, generate queries (5.1B params)
  extraction: 'gemma4:e4b',         // Extract facts from scraped pages (8B params)
  youtube_analysis: 'gemma4:e2b',   // Fast: extract insights from YouTube transcripts

  // === REASONING/REFLECTION/SYNTHESIS ===
  // Using gemma4:e4b for all reasoning tasks - most capable available model
  reasoning: 'gemma4:e4b',          // Analyze findings, spot contradictions
  reflection: 'gemma4:e4b',         // Gap analysis, what's missing, what to research next
  synthesis: 'gemma4:e4b',          // Executive summary, full report writing
  section_synthesis: 'gemma4:e4b',  // Section-level summaries
  citation: 'gemma4:e2b',           // Match facts to sources, format citations
  desire_analysis: 'gemma4:e4b',    // Customer desire/emotion analysis

  // === RETRIEVAL ===
  embedding: 'nomic-embed-text:latest', // Vector embeddings for RAG
  context1: 'chromadb-context-1:latest', // Context-1 for observe-reason-act RAG
} as const;

/**
 * Backward-compatibility alias: extraction model for callers that import this name directly.
 */
export const EXTRACTION_MODEL = MODEL_REGISTRY.extraction;

/**
 * Validate that all required models are defined
 */
export function validateModelRegistry(): void {
  const requiredModels = [
    'planning',
    'synthesis',
    'extraction',
    'embedding',
    'reflection',
  ] as const;

  for (const key of requiredModels) {
    if (!MODEL_REGISTRY[key]) {
      throw new Error(`Missing required model: ${key}`);
    }
  }
}

/**
 * Get a model by phase name
 */
export function getModel(phase: keyof typeof MODEL_REGISTRY): string {
  const model = MODEL_REGISTRY[phase];
  if (!model) {
    throw new Error(`Unknown phase: ${phase}`);
  }
  return model;
}
