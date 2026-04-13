/**
 * Load-Aware Ollama Service
 * Wraps OllamaService with LoadMonitor to prevent overload
 */

import { OllamaService, GenerateOptions } from './ollama.js';
import { getLoadMonitor } from './loadMonitor.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('loadAwareOllama');

export class LoadAwareOllamaService {
  private ollama: OllamaService;

  constructor(baseUrl?: string) {
    this.ollama = new OllamaService(baseUrl);
  }

  /**
   * Generate with load monitoring
   */
  async generateStream(
    prompt: string,
    model: string,
    options: GenerateOptions = {}
  ): Promise<string> {
    const loadMonitor = getLoadMonitor();

    // Acquire slot from load monitor
    try {
      await loadMonitor.acquireSlot(model, 60_000, 'normal');
    } catch (error) {
      log.error(`Failed to acquire slot for ${model}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }

    try {
      const result = await this.ollama.generateStream(prompt, model, options);
      loadMonitor.releaseSlot(model, true);
      return result;
    } catch (error) {
      loadMonitor.releaseSlot(model, false);
      throw error;
    }
  }

  /**
   * Embed with load monitoring
   */
  async embed(text: string, model: string = 'nomic-embed-text'): Promise<number[]> {
    const loadMonitor = getLoadMonitor();

    try {
      await loadMonitor.acquireSlot(model, 30_000, 'normal');
    } catch (error) {
      log.warn(`Embedding load queue full, using fallback or cache`);
      throw error;
    }

    try {
      const result = await this.ollama.embed(text, model);
      loadMonitor.releaseSlot(model, true);
      return result;
    } catch (error) {
      loadMonitor.releaseSlot(model, false);
      throw error;
    }
  }
}

/**
 * Global load-aware Ollama instance
 */
let globalLoadAwareOllama: LoadAwareOllamaService | null = null;

export function initializeLoadAwareOllama(baseUrl?: string): LoadAwareOllamaService {
  globalLoadAwareOllama = new LoadAwareOllamaService(baseUrl);
  return globalLoadAwareOllama;
}

export function getLoadAwareOllama(): LoadAwareOllamaService {
  if (!globalLoadAwareOllama) {
    globalLoadAwareOllama = new LoadAwareOllamaService();
  }
  return globalLoadAwareOllama;
}
