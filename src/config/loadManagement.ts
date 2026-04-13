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

export const LOAD_MANAGEMENT_CONFIG: LoadMonitorConfig = {
  // Model concurrency limits
  models: [
    {
      model: 'gemma4:e2b',
      maxConcurrency: 1, // Planning is serial
      estimatedMemoryMB: 12000,
      timeout: 45_000
    },
    {
      model: 'gemma4:e4b',
      maxConcurrency: 2, // Larger model, limit carefully
      estimatedMemoryMB: 16000,
      timeout: 45_000
    },
    {
      model: 'qwen3.5:0.8b',
      maxConcurrency: 12, // Very light
      estimatedMemoryMB: 800,
      timeout: 20_000
    },
    {
      model: 'qwen3.5:2b',
      maxConcurrency: 8,
      estimatedMemoryMB: 2500,
      timeout: 30_000
    },
    {
      model: 'qwen3.5:4b',
      maxConcurrency: 6,
      estimatedMemoryMB: 4500,
      timeout: 30_000
    },
    {
      model: 'qwen3.5:9b',
      maxConcurrency: 3,
      estimatedMemoryMB: 9000,
      timeout: 35_000
    },
    {
      model: 'qwen3.5:27b',
      maxConcurrency: 1, // Huge model, serialize
      estimatedMemoryMB: 27000,
      timeout: 60_000
    },
    {
      model: 'gpt-oss-20b',
      maxConcurrency: 2,
      estimatedMemoryMB: 20000,
      timeout: 40_000
    },
    {
      model: 'nomic-embed-text',
      maxConcurrency: 8, // Embeddings are fast
      estimatedMemoryMB: 1000,
      timeout: 10_000
    }
  ],

  // Global limits
  globalMaxConcurrency: 15, // Never exceed 15 concurrent tasks
  totalGPUMemoryMB: 40_000, // 40GB total GPU memory

  // Circuit breaker configuration
  circuitBreakerThreshold: 0.5, // Open circuit if error rate > 50%
  circuitBreakerWindow: 60_000 // 60s window for error tracking
};

/**
 * Get recommended concurrency based on research preset
 */
export function getConcurrencyForPreset(preset: 'sq' | 'qk' | 'nr' | 'ex' | 'mx'): number {
  switch (preset) {
    case 'sq': return 3; // Super Quick: minimal parallelization
    case 'qk': return 5; // Quick: moderate parallelization
    case 'nr': return 8; // Normal: good parallelization
    case 'ex': return 12; // Extended: aggressive parallelization
    case 'mx': return 15; // Maximum: fully parallel
  }
}

/**
 * Get timeout for model based on typical research duration
 */
export function getTimeoutForModel(modelKey: string): number {
  const config = LOAD_MANAGEMENT_CONFIG.models.find(m => m.model === modelKey);
  return config?.timeout || 30_000;
}

/**
 * Estimate memory usage for given models
 */
export function estimateMemoryUsage(models: string[]): number {
  let total = 0;
  const seen = new Set<string>();

  for (const modelKey of models) {
    if (seen.has(modelKey)) continue;
    seen.add(modelKey);

    const config = LOAD_MANAGEMENT_CONFIG.models.find(m => m.model === modelKey);
    if (config) {
      total += config.estimatedMemoryMB;
    }
  }

  return total;
}

/**
 * Check if proposed model combination fits in available memory
 */
export function canFitModels(models: string[]): { canFit: boolean; memoryNeeded: number; available: number } {
  const memoryNeeded = estimateMemoryUsage(models);
  const available = LOAD_MANAGEMENT_CONFIG.totalGPUMemoryMB;

  return {
    canFit: memoryNeeded <= available,
    memoryNeeded,
    available
  };
}
