/**
 * Load-Aware Ollama Service
 * Wraps OllamaService with LoadMonitor to prevent overload
 */
import { GenerateOptions } from './ollama.js';
export declare class LoadAwareOllamaService {
    private ollama;
    constructor(baseUrl?: string);
    /**
     * Generate with load monitoring
     */
    generateStream(prompt: string, model: string, options?: GenerateOptions): Promise<string>;
    /**
     * Embed with load monitoring
     */
    embed(text: string, model?: string): Promise<number[]>;
}
export declare function initializeLoadAwareOllama(baseUrl?: string): LoadAwareOllamaService;
export declare function getLoadAwareOllama(): LoadAwareOllamaService;
//# sourceMappingURL=loadAwareOllama.d.ts.map