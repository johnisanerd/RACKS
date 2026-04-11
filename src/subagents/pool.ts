/**
 * Subagent Manager — Real parallel research workers
 * Each subagent: Wayfarer search → page extraction → Ollama compression → structured facts
 */

import { createLogger } from './logger.js';
import { liveDisplay } from './liveDisplay.js';
import { wayfarerService } from './wayfarer.js';
import { ollamaService } from './ollama.js';
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
  private taskId: number = 0;

  constructor(maxConcurrency: number = 7) {
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

        // Process pages in small parallel batches (3 at a time) to stay within Ollama limits
        const pageBatchLimit = p(3);

        await Promise.all(
          pages.slice(0, 8).map(page =>
            pageBatchLimit(async () => {
              if (!page.content || page.content.length < 100) return;

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
                const response = await ollamaService.generateStream(
                  compressionPrompt,
                  'gemma4:e2b', // Gemma 4 2B: fastest, best JSON compliance for extraction
                  { temperature: 0.1, num_ctx: 4096, num_predict: 512 }
                );

                // Parse JSON array from response
                const jsonMatch = response.match(/\[[\s\S]*?\]/);
                if (jsonMatch) {
                  const facts = JSON.parse(jsonMatch[0].replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "").trim()) as string[];
                  allFacts.push(...facts.filter(f => typeof f === 'string' && f.length > 10));
                }

                allSources.push(page.url);
              } catch {
                // Fallback: use title + snippet as a basic fact
                if (page.title && page.title !== 'Untitled') {
                  allFacts.push(`${page.title}: ${page.content.slice(0, 150)}`);
                  allSources.push(page.url);
                }
              }
            })
          )
        );

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
