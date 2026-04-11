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
export declare const MODEL_REGISTRY: {
    readonly planning: "gemma4:e2b";
    readonly extraction: "gemma4:e2b";
    readonly reasoning: "gemma4:27b";
    readonly reflection: "gemma4:27b";
    readonly youtube_analysis: "gemma4:e2b";
    readonly synthesis: "qwen3.5:27b";
    readonly section_synthesis: "qwen3.5:9b";
    readonly citation: "qwen3.5:4b";
    readonly desire_analysis: "qwen3.5:9b";
    readonly embedding: "nomic-embed-text";
    readonly context1: "chromadb-context-1:latest";
};
/**
 * Backward-compatibility alias: extraction model for callers that import this name directly.
 */
export declare const EXTRACTION_MODEL: "gemma4:e2b";
/**
 * Validate that all required models are defined
 */
export declare function validateModelRegistry(): void;
/**
 * Get a model by phase name
 */
export declare function getModel(phase: keyof typeof MODEL_REGISTRY): string;
//# sourceMappingURL=models.d.ts.map