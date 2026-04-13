/**
 * Model Registry — Single source of truth for all LLM model assignments
 *
 * Routing strategy (REMOTE Ollama @ 100.74.135.83:11440):
 *   Qwen 2b/4b    — Fast fact extraction, planning, YouTube analysis
 *   Qwen 9b       — Reasoning, reflection, synthesis, analysis
 *
 * All components import models from here, preventing duplication.
 */
export declare const MODEL_REGISTRY: {
    readonly planning: "gemma4:e2b";
    readonly extraction: "gemma4:e4b";
    readonly youtube_analysis: "gemma4:e2b";
    readonly reasoning: "gemma4:e4b";
    readonly reflection: "gemma4:e4b";
    readonly synthesis: "gemma4:e4b";
    readonly section_synthesis: "gemma4:e4b";
    readonly citation: "gemma4:e2b";
    readonly desire_analysis: "gemma4:e4b";
    readonly embedding: "nomic-embed-text:latest";
    readonly context1: "chromadb-context-1:latest";
};
/**
 * Backward-compatibility alias: extraction model for callers that import this name directly.
 */
export declare const EXTRACTION_MODEL: "gemma4:e4b";
/**
 * Validate that all required models are defined
 */
export declare function validateModelRegistry(): void;
/**
 * Get a model by phase name
 */
export declare function getModel(phase: keyof typeof MODEL_REGISTRY): string;
//# sourceMappingURL=models.d.ts.map