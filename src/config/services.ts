/**
 * Service Configuration — Centralized URLs, timeouts, and limits
 *
 * All service URLs and configuration come from environment variables.
 * Defaults provided for local development.
 */

export const SERVICES = {
  ollama: {
    url: process.env.OLLAMA_URL || 'http://localhost:11434',
    timeout: 30_000, // 30 seconds
    concurrency: 5, // Max concurrent requests
  },
  wayfarer: {
    url: process.env.WAYFARER_URL || 'http://localhost:8891',
    timeout: 15_000, // 15 seconds
    maxResults: 10,
  },
  embedding: {
    batchSize: 32,
    deduplicationThreshold: 0.92,
    model: 'nomic-embed-text',
  },
  youtube: {
    concurrency: 3,
  },
  reasoning: {
    concurrency: 3,
  },
  subagents: {
    defaultConcurrency: 7,
    maxConcurrency: 25,
    maxQueueSize: 100,
  },
} as const;

/**
 * Validate that all required environment variables are set
 */
export function validateServices(): void {
  const requiredEnvs = [] as const;

  // For development, we allow defaults, but in production, be stricter
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.OLLAMA_URL) {
      throw new Error('OLLAMA_URL environment variable is required in production');
    }
    if (!process.env.WAYFARER_URL) {
      throw new Error('WAYFARER_URL environment variable is required in production');
    }
  }

  // Log the configuration being used
  console.log('[config] Ollama URL:', SERVICES.ollama.url);
  console.log('[config] Wayfarer URL:', SERVICES.wayfarer.url);
}

/**
 * Get service URL by name
 */
export function getServiceUrl(service: keyof Omit<typeof SERVICES, 'embedding' | 'youtube' | 'reasoning' | 'subagents'>): string {
  const svc = SERVICES[service] as any;
  if (!svc || !svc.url) {
    throw new Error(`Unknown service or missing URL: ${service}`);
  }
  return svc.url;
}
