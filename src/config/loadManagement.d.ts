/**
 * Load Management Configuration
 * Configures concurrent limits, memory allocation, and load monitoring
 */
import { LoadMonitorConfig } from '../services/loadMonitor.js';
/**
 * Load management configuration for RACKS research system
 *
 * Strategy:
 * - Planning (Gemma): 1 concurrent (thinking models should be serial)
 * - Extraction (Gemma): 2 concurrent (careful with vRAM)
 * - Reflection (Gemma): 1-2 concurrent
 * - Research/Synthesis (Qwen): 8+ concurrent (lightweight)
 * - Total: 15 concurrent max (safe limit)
 *
 * Models:
 * - gemma4:e2b (5.1B) ≈ 12GB VRAM
 * - gemma4:e4b (8B) ≈ 16GB VRAM
 * - qwen3.5:4b ≈ 8GB VRAM
 * - qwen3.5:9b ≈ 18GB VRAM
 * - nomic-embed-text ≈ 1GB VRAM
 *
 * Assuming 40GB total GPU memory on Ollama instance
 */
export declare const LOAD_MANAGEMENT_CONFIG: LoadMonitorConfig;
/**
 * Get recommended concurrency based on research preset
 */
export declare function getConcurrencyForPreset(preset: 'sq' | 'qk' | 'nr' | 'ex' | 'mx'): number;
/**
 * Get timeout for model based on typical research duration
 */
export declare function getTimeoutForModel(modelKey: string): number;
/**
 * Estimate memory usage for given models
 */
export declare function estimateMemoryUsage(models: string[]): number;
/**
 * Check if proposed model combination fits in available memory
 */
export declare function canFitModels(models: string[]): {
    canFit: boolean;
    memoryNeeded: number;
    available: number;
};
//# sourceMappingURL=loadManagement.d.ts.map