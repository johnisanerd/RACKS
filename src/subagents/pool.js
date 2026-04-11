/**
 * Subagent Manager — Real parallel research workers
 * Each subagent: Wayfarer search → page extraction → Ollama compression → structured facts
 */
import { createLogger } from '../utils/logger.js';
import { liveDisplay } from '../utils/liveDisplay.js';
import { wayfarerService } from '../services/wayfarer.js';
import { ollamaService } from '../services/ollama.js';
import p from 'p-limit';
const log = createLogger('subagentManager');
export class SubagentPool {
    constructor(maxConcurrency = 7) {
        this.taskId = 0;
        this.concurrency = maxConcurrency;
        this.limiter = p(maxConcurrency);
        log.info(`Subagent pool initialized with concurrency=${maxConcurrency}`);
    }
    /**
     * Submit a real research task:
     *   1. Wayfarer /research → fetch + extract N pages
     *   2. For each page: Ollama compress → extract key facts
     *   3. Return structured findings
     */
    async submit(task) {
        return this.limiter(async () => {
            const id = this.taskId++;
            const agentId = `Agent-${id + 1}`;
            log.info(`Subagent #${id} starting: "${task.query}"`);
            try {
                // ── Step 1: Search + scrape ───────────────────────────────────────
                liveDisplay.setAgentStatus(agentId, `Searching: "${task.query}"`);
                const pages = await wayfarerService.research(task.query, 8, 20);
                if (pages.length === 0) {
                    log.warn(`Subagent #${id}: no pages found for "${task.query}"`);
                    liveDisplay.clearAgent(agentId);
                    return { success: true, facts: [], sources: [], taskId: `subagent-${id}` };
                }
                log.info(`Subagent #${id}: got ${pages.length} pages`);
                liveDisplay.setAgentStatus(agentId, `Scraping ${pages.length} pages: "${task.query}"`);
                // ── Step 2: Compress each page → extract facts ────────────────────
                const allFacts = [];
                const allSources = [];
                const allQuotes = [];
                // Process pages in small parallel batches (3 at a time) to stay within Ollama limits
                const pageBatchLimit = p(3);
                let successCount = 0;
                let failureCount = 0;
                await Promise.all(pages.slice(0, 8).map(page => pageBatchLimit(async () => {
                    if (!page.content || page.content.length < 100) {
                        failureCount++;
                        return;
                    }
                    liveDisplay.setAgentStatus(agentId, `Extracting: ${new URL(page.url).hostname}`);
                    // Truncate to ~3000 chars for the model
                    const truncated = page.content.slice(0, 3000);
                    const compressionPrompt = `You are a research fact extractor. Extract the most important, specific facts from this web page about "${task.query}".

Context: ${task.context.slice(0, 300)}

Page: ${page.title}
URL: ${page.url}
Content:
${truncated}

Extract 3-6 specific, concrete facts. Each fact should be:
- One sentence, factual and specific (not vague)
- Include numbers, names, dates where available
- Directly relevant to: ${task.query}

Return ONLY a JSON array of fact strings. No preamble, no explanation.
Example: ["Fact 1 here.", "Fact 2 here.", "Fact 3 here."]`;
                    try {
                        const response = await ollamaService.generateStream(compressionPrompt, 'gemma4:e2b', // Gemma 4 2B: fastest, best JSON compliance for extraction
                        { temperature: 0.1, num_ctx: 4096, num_predict: 512 });
                        // Parse JSON array from response
                        const jsonMatch = response.match(/\[[\s\S]*?\]/);
                        if (jsonMatch) {
                            const facts = JSON.parse(jsonMatch[0].replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim());
                            allFacts.push(...facts.filter(f => typeof f === 'string' && f.length > 10));
                        }
                        allSources.push(page.url);
                        successCount++;
                    }
                    catch (err) {
                        failureCount++;
                        log.warn(`Extraction failed for page ${page.title}: ${err instanceof Error ? err.message : 'unknown'}`);
                        // Fallback: use title + snippet as a basic fact
                        if (page.title && page.title !== 'Untitled') {
                            allFacts.push(`${page.title}: ${page.content.slice(0, 150)}`);
                            allSources.push(page.url);
                        }
                    }
                })));
                log.info(`Page extraction: ${successCount} success, ${failureCount} failures, ${allFacts.length} facts extracted`);
                liveDisplay.setAgentStatus(agentId, `Indexing ${allFacts.length} facts from "${task.query}"`);
                log.info(`Subagent #${id} complete: ${allFacts.length} facts from ${allSources.length} sources`);
                liveDisplay.clearAgent(agentId);
                return {
                    success: true,
                    taskId: `subagent-${id}`,
                    facts: allFacts,
                    quotes: allQuotes,
                    statistics: {},
                    sources: allSources
                };
            }
            catch (error) {
                log.error(`Subagent #${id} failed`, { error });
                liveDisplay.clearAgent(agentId);
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    facts: [],
                    sources: []
                };
            }
        });
    }
    /**
     * Close the pool
     */
    close() {
        log.info('Closing subagent pool');
    }
}
//# sourceMappingURL=pool.js.map