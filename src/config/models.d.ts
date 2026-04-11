/**
 * Model Registry — Single source of truth for all LLM model assignments
 *
 * Centralizes model selection across all research phases.
 * All components import models from here, preventing duplication.
 */
export declare const MODEL_REGISTRY: {
    readonly planning: "gemma4:e2b";
    readonly synthesis: "gemma3:20b";
    readonly extraction: "gemma4:e2b";
    readonly embedding: "nomic-embed-text";
    readonly reflection: "gemma4:e2b";
    readonly summarization: "gemma4:e2b";
    readonly youtube_transcript: "gemma4:e2b";
};
/**
 * Validate that all required models are defined
 */
export declare function validateModelRegistry(): void;
/**
 * Get a model by phase name
 */
export declare function getModel(phase: keyof typeof MODEL_REGISTRY): string;
//# sourceMappingURL=models.d.ts.map