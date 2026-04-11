/**
 * Ollama Service — CLI/Backend implementation
 * Connects to remote Ollama instance for model inference
 *
 * Concurrency: capped at 5 simultaneous requests
 * Retries: up to 3 attempts with exponential backoff on failure
 * Error handling: typed OllamaError exceptions with retryable flag
 */

import { createLogger } from '../utils/logger.js';
import { OllamaError } from '../utils/errors.js';
import p from 'p-limit';

const log = createLogger('ollama');

// Global concurrency limiter — 5 concurrent is safe: previous runs had zero retries at 3,
// and the remote has both GPU (gpt-oss:20b) and CPU (gemma3:4b, gemma2 models)
const ollamaLimit = p(5);

export interface GenerateOptions {
  temperature?: number;
  num_ctx?: number;
  num_predict?: number;
  top_p?: number;
  top_k?: number;
}

export class OllamaService {
  private baseUrl: string;
  private defaultModel: string;
  private maxRetries: number = 3;
  private retryDelayMs: number = 1000;

  constructor(baseUrl?: string) {
    // Use provided URL, fall back to environment variable, then default
    this.baseUrl = baseUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
    this.defaultModel = 'gemma4:e2b';
  }

  /**
   * Generate text — serialized through global concurrency limiter with retry
   */
  async generateStream(
    prompt: string,
    model: string = this.defaultModel,
    options: GenerateOptions = {}
  ): Promise<string> {
    return ollamaLimit(() => this._generate(prompt, model, options));
  }

  private async _generate(
    prompt: string,
    model: string,
    options: GenerateOptions,
    attempt: number = 1
  ): Promise<string> {
    const maxAttempts = 3;
    try {
      log.info(`Calling ${model} for generation (attempt ${attempt})`);

      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          think: false,
          options: {
            temperature: options.temperature ?? 0.7,
            num_ctx: options.num_ctx ?? 4096,
            num_predict: options.num_predict ?? 2048
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json() as any;
      const result = data.response || '';

      if (!result && attempt < maxAttempts) {
        log.warn(`Empty response from ${model}, retrying...`);
        await this._sleep(1000 * attempt);
        return this._generate(prompt, model, options, attempt + 1);
      }

      if (!result) {
        throw new OllamaError(`Empty response from ${model} after ${maxAttempts} attempts`, true);
      }

      return result;
    } catch (error) {
      if (attempt < maxAttempts) {
        const delay = 2000 * attempt; // 2s, 4s backoff
        log.warn(`Generation attempt ${attempt} failed, retrying in ${delay}ms...`);
        await this._sleep(delay);
        return this._generate(prompt, model, options, attempt + 1);
      }

      // All retries exhausted — throw typed error
      const message = error instanceof Error ? error.message : String(error);
      const statusCode = error instanceof Error && 'status' in error ? (error as any).status : undefined;
      log.error(`Generation failed after ${maxAttempts} attempts`, { error: message });
      throw new OllamaError(message, true, statusCode);
    }
  }

  private _sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate embeddings
   */
  async embed(text: string, model: string = 'nomic-embed-text'): Promise<number[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, prompt: text })
      });

      if (!response.ok) {
        throw new Error(`Embedding error: ${response.statusText}`);
      }

      const data = await response.json() as any;
      return data.embedding || [];
    } catch (error) {
      log.error('Embedding failed', { error });
      throw error;
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const ollamaService = new OllamaService();
