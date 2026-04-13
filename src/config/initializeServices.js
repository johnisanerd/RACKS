/**
 * Initialize all services with proper configuration
 * Called once at application startup
 */
import { initializeLoadMonitor } from '../services/loadMonitor.js';
import { initializeLoadAwareOllama } from '../services/loadAwareOllama.js';
import { LOAD_MANAGEMENT_CONFIG } from './loadManagement.js';
import { createLogger } from '../utils/logger.js';
const log = createLogger('serviceInitialization');
export async function initializeAllServices() {
    log.info('Initializing RACKS services...');
    // 1. Initialize load monitor
    log.info('Setting up load monitor...');
    const loadMonitor = initializeLoadMonitor(LOAD_MANAGEMENT_CONFIG);
    log.info(`Load monitor initialized: ${LOAD_MANAGEMENT_CONFIG.models.length} models, ${LOAD_MANAGEMENT_CONFIG.globalMaxConcurrency} global concurrency`);
    // 2. Initialize load-aware Ollama
    log.info('Initializing Ollama service...');
    const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
    const ollama = initializeLoadAwareOllama(ollamaUrl);
    log.info(`Ollama service initialized: ${ollamaUrl}`);
    // 3. Validate critical models are available
    log.info('Validating model availability...');
    try {
        const response = await fetch(`${ollamaUrl}/api/tags`);
        if (response.ok) {
            const data = (await response.json());
            const availableModels = (data.models || []).map(m => m.name);
            log.info(`Available models: ${availableModels.slice(0, 5).join(', ')}${availableModels.length > 5 ? '...' : ''}`);
        }
    }
    catch (error) {
        log.warn(`Could not verify model availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    // 4. Print status
    log.info('Service initialization complete');
    log.info(loadMonitor.getReport());
}
/**
 * Health check for all services
 */
export async function healthCheck() {
    const details = [];
    try {
        const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434';
        const response = await fetch(`${ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(5000) });
        if (response.ok) {
            details.push('✓ Ollama: Healthy');
        }
        else {
            details.push(`✗ Ollama: HTTP ${response.status}`);
        }
    }
    catch (error) {
        details.push(`✗ Ollama: ${error instanceof Error ? error.message : 'Connection failed'}`);
    }
    return {
        healthy: details.every(d => d.startsWith('✓')),
        details
    };
}
//# sourceMappingURL=initializeServices.js.map