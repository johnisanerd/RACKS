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
export class OllamaService {
    constructor(baseUrl) {
        this.maxRetries = 3;
        this.retryDelayMs = 1000;
        this.explicitBaseUrl = baseUrl;
        this.defaultModel = 'gemma2b';
    }
    // Lazy getter that reads environment every time
    get baseUrl() {
        return this.explicitBaseUrl || process.env.OLLAMA_URL || 'http://localhost:11434';
    }
    /**
     * Generate text — serialized through global concurrency limiter with retry
     */
    async generateStream(prompt, model = this.defaultModel, options = {}) {
        return ollamaLimit(() => this._generate(prompt, model, options));
    }
    async _generate(prompt, model, options, attempt = 1) {
        const maxAttempts = 3;
        try {
            log.info(`Calling ${model} for generation (attempt ${attempt})`);
            log.debug(`  URL: ${this.baseUrl}/api/generate`);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
            const response = await fetch(`${this.baseUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model,
                    prompt,
                    stream: false,
                    options: {
                        temperature: options.temperature ?? 0.7,
                        num_ctx: options.num_ctx ?? 4096,
                        num_predict: options.num_predict ?? 2048
                    }
                }),
                signal: controller.signal
            });
            clearTimeout(timeout);
            if (!response.ok) {
                const errText = await response.text().catch(() => '(unable to read error body)');
                log.error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
                throw new Error(`Ollama error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
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
        }
        catch (error) {
            if (attempt < maxAttempts) {
                const delay = 2000 * attempt; // 2s, 4s backoff
                log.warn(`Generation attempt ${attempt} failed, retrying in ${delay}ms...`);
                await this._sleep(delay);
                return this._generate(prompt, model, options, attempt + 1);
            }
            // All retries exhausted — throw typed error
            const message = error instanceof Error ? error.message : String(error);
            const statusCode = error instanceof Error && 'status' in error ? error.status : undefined;
            log.error(`Generation failed after ${maxAttempts} attempts`, { error: message });
            throw new OllamaError(message, true, statusCode);
        }
    }
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Generate embeddings
     */
    async embed(text, model = 'nomic-embed-text') {
        try {
            const response = await fetch(`${this.baseUrl}/api/embeddings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, prompt: text })
            });
            if (!response.ok) {
                throw new Error(`Embedding error: ${response.statusText}`);
            }
            const data = await response.json();
            return data.embedding || [];
        }
        catch (error) {
            log.error('Embedding failed', { error });
            throw error;
        }
    }
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`);
            return response.ok;
        }
        catch {
            return false;
        }
    }
}
export const ollamaService = new OllamaService();
//# sourceMappingURL=ollama.js.map