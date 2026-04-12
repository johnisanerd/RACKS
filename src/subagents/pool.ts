/**
 * Subagent Manager — Real parallel research workers
 * Each subagent: Wayfarer search → page extraction → Ollama compression → structured facts
 */

import { createLogger } from '../utils/logger.js';
import { liveDisplay } from '../utils/liveDisplay.js';
import { wayfarerService } from '../services/wayfarer.js';
import { ollamaService } from '../services/ollama.js';
import { getModel } from '../config/models.js';
import p from 'p-limit';

const log = createLogger('subagentManager');

export interface SubagentTask {
  role: string;
  task: string;
  query: string;
  context: string;
  maxSteps: number;
}

export interface SubagentResult {
  success: boolean;
  taskId?: string;
  facts?: string[];
  quotes?: string[];
  statistics?: Record<string, string>;
  sources?: string[];
  error?: string;
}

export class SubagentPool {
  private concurrency: number;
  private limiter: ReturnType<typeof p>;
  private pageBatchLimiter: ReturnType<typeof p>;
  private taskId: number = 0;

  constructor(maxConcurrency: number = 7) {
    this.concurrency = maxConcurrency;
    this.limiter = p(maxConcurrency);
    // Create a separate limiter for page processing (8 concurrent compressions per subagent)
    this.pageBatchLimiter = p(8);
    log.info(`Subagent pool initialized with concurrency=${maxConcurrency}`);
  }

  /**
   * Submit a real research task:
   *   1. Wayfarer /research → fetch + extract N pages
   *   2. For each page: Ollama compress → extract key facts
   *   3. Return structured findings
   */
  async submit(task: SubagentTask): Promise<SubagentResult> {
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
        const allFacts: string[] = [];
        const allSources: string[] = [];
        const allQuotes: string[] = [];

        // Process pages in parallel batches (8 at a time for max throughput with 2b models)
        // Use shared pageBatchLimiter to prevent memory leaks from creating new limiters

        let successCount = 0;
        let failureCount = 0;

        await Promise.all(
          pages.slice(0, 8).map(page =>
            this.pageBatchLimiter(async () => {
              if (!page.content || page.content.length < 100) {
                failureCount++;
                return;
              }

              // Safely extract hostname from URL, fallback to domain if parsing fails
              let hostname = 'unknown';
              try {
                hostname = new URL(page.url).hostname || 'unknown';
              } catch (err) {
                log.warn(`Failed to parse URL: ${page.url}`, err);
                hostname = page.url.split('/')[2] || 'unknown';
              }
              liveDisplay.setAgentStatus(agentId, `Extracting: ${hostname}`);

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
                const response = await ollamaService.generateStream(
                  compressionPrompt,
                  getModel('extraction'),
                  { temperature: 0.1, num_ctx: 4096, num_predict: 512 }
                );

                // Multi-strategy JSON parsing for robustness
                let facts: string[] = [];
                let parsed = false;

                // Strategy 1: Direct JSON array match
                const jsonMatch = response.match(/\[[\s\S]*?\]/);
                if (jsonMatch) {
                  try {
                    const cleaned = jsonMatch[0].replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim();
                    facts = JSON.parse(cleaned) as string[];
                    parsed = true;
                  } catch (e) {
                    // Fallthrough to next strategy
                  }
                }

                // Strategy 2: Find all quoted strings if JSON array failed
                if (!parsed && response.includes('"')) {
                  const stringMatches = response.match(/"([^"]+)"/g);
                  if (stringMatches && stringMatches.length > 0) {
                    facts = stringMatches.map(s => s.slice(1, -1)).filter(s => s.length > 10);
                    parsed = facts.length > 0;
                  }
                }

                // Add extracted facts or fallback
                if (parsed && facts.length > 0) {
                  allFacts.push(...facts);
                  allSources.push(page.url);
                  successCount++;
                } else {
                  // Fallback: use title + snippet as basic fact
                  if (page.title && page.title !== 'Untitled') {
                    allFacts.push(`${page.title}: ${page.content.slice(0, 150)}`);
                    allSources.push(page.url);
                    successCount++;
                  } else {
                    failureCount++;
                  }
                }
              } catch (err) {
                failureCount++;
                log.warn(`Extraction failed for page ${page.title}: ${err instanceof Error ? err.message : 'unknown'}`);
                // Emergency fallback: use title + snippet
                if (page.title && page.title !== 'Untitled') {
                  allFacts.push(`${page.title}: ${page.content.slice(0, 150)}`);
                  allSources.push(page.url);
                }
              }
            })
          )
        );

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

      } catch (error) {
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
  close(): void {
    log.info('Closing subagent pool');
  }
}
