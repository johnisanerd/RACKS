/**
 * Command: racks query
 *
 * Ask follow-up questions about previous research using Context-1 production harness.
 * Context-1 runs an observe-reason-act loop over the stored findings corpus,
 * doing multi-hop hybrid search (BM25 + dense vectors) to surface relevant evidence.
 *
 * Usage: racks query <task-id> "Your question here?"
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import chalk from 'chalk';
import { createLogger } from '../../utils/logger.js';
import { createTaskQueue } from '../../core/taskQueue.js';
import { queryFindings, isContext1Available } from '../../services/context1ProductionHarness.js';
import { ollamaService } from '../../services/ollama.js';
import { getModel } from '../../config/models.js';

const log = createLogger('command-query');
const taskQueue = createTaskQueue();

interface QueryOptions {
  taskId?: string;
  question?: string;
  help?: boolean;
  verbose?: boolean;
}

function parseArgs(args: string[]): QueryOptions {
  const options: QueryOptions = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--task-id' && i + 1 < args.length) {
      options.taskId = args[++i];
    } else if (arg === '--question' && i + 1 < args.length) {
      options.question = args[++i];
    } else if (arg === '--verbose' || arg === '-v') {
      options.verbose = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (!arg.startsWith('--')) {
      positional.push(arg);
    }
  }

  if (positional.length >= 1 && !options.taskId) options.taskId = positional[0];
  if (positional.length >= 2 && !options.question) options.question = positional.slice(1).join(' ');

  return options;
}

function showHelp(): void {
  console.log(chalk.bold.cyan('\nracks query — Ask follow-up questions about research\n'));
  console.log(chalk.gray('Uses Context-1 (chromadb-context-1) to do multi-hop search over your findings.\n'));
  console.log(chalk.gray('USAGE:'));
  console.log('  racks query <task-id> "<question>"\n');
  console.log(chalk.gray('OPTIONS:'));
  console.log('  --task-id <id>     Research task ID (required)');
  console.log('  --question <q>     Question to ask (required)');
  console.log('  --verbose, -v      Show Context-1 retrieval steps');
  console.log('  --help, -h         Show this help\n');
  console.log(chalk.gray('EXAMPLES:'));
  console.log('  racks query task-abc123 "What are the top 3 customer objections?"');
  console.log('  racks query task-abc123 "Which competitor has the strongest identity marketing?" --verbose\n');
}

export async function commandQuery(args: string[]): Promise<void> {
  const options = parseArgs(args);

  if (options.help) { showHelp(); return; }

  if (!options.taskId || !options.question) {
    console.error(chalk.red('✗ Error: both task-id and question are required'));
    showHelp();
    process.exit(1);
  }

  try {
    // Load task metadata
    const task = taskQueue.getTask(options.taskId);
    if (!task) {
      console.error(chalk.red(`✗ Task not found: ${options.taskId}`));
      console.error(chalk.gray('Run `racks list` to see all tasks.'));
      process.exit(1);
    }

    console.log(chalk.bold.white(`\n  Research: "${task.question}"`));
    console.log(chalk.gray(`  Coverage: ${task.coverage || 0}% | Task ID: ${task.id}\n`));

    // Load findings from storage — read all .json files in findings/ subdirectory
    console.log(chalk.gray('  Loading findings corpus...'));
    let findings: Record<string, unknown> = {};
    try {
      const findingsDir = path.join(os.homedir(), 'research-output', options.taskId, 'findings');
      const files = await fs.readdir(findingsDir);
      await Promise.all(files
        .filter(f => f.endsWith('.json'))
        .map(async (f) => {
          try {
            const raw = await fs.readFile(path.join(findingsDir, f), 'utf-8');
            const sectionId = f.replace(/\.json$/, '');
            findings[sectionId] = JSON.parse(raw);
          } catch { /* skip corrupt files */ }
        })
      );
    } catch (err) {
      log.warn('Could not load findings from storage:', err);
    }

    const sectionCount = Object.keys(findings).length;
    console.log(chalk.gray(`  Corpus: ${sectionCount} sections loaded\n`));

    // Build a flat text corpus from findings for Context-1 to search
    // Each "document" in the corpus = one section's facts
    const corpus: Array<{ url: string; title: string; content: string }> = [];

    for (const [sectionId, sectionData] of Object.entries(findings)) {
      const section = sectionData as any;
      if (!section?.facts?.length) continue;

      // Facts as numbered list with sources inline
      const factsText = section.facts
        .slice(0, 100)
        .map((f: string, i: number) => `${i + 1}. ${f}`)
        .join('\n');

      const sourcesText = (section.sources || [])
        .slice(0, 20)
        .map((s: string) => `[${s}]`)
        .join(' ');

      corpus.push({
        url: (section.sources?.[0] as string | undefined) ?? `findings://${sectionId}`,
        title: section.sectionTitle || sectionId,
        content: `=== ${section.sectionTitle || sectionId} ===\n\nSources: ${sourcesText}\n\nFindings:\n${factsText}`,
      });
    }

    if (corpus.length === 0) {
      console.log(chalk.yellow('  ⚠ No findings found for this task. Was the research completed?'));
      taskQueue.close();
      return;
    }

    // Check if Context-1 is available
    const c1Available = await isContext1Available();

    if (c1Available) {
      // === PATH A: Context-1 production harness ===
      console.log(chalk.cyan(`  🔍 Context-1 searching ${corpus.length} sections for: "${options.question}"\n`));

      const result = await queryFindings(options.question, corpus, {
        maxSteps: 8,
        onEvent: options.verbose ? (event) => {
          if (event.type === 'tool_call') {
            console.log(chalk.dim(`    [C1] ${event.tool}(${event.args?.slice(0, 60)}...)`));
          } else if (event.type === 'observation') {
            console.log(chalk.dim(`    [C1] Found ${event.chunksFound || 0} chunks`));
          } else if (event.type === 'budget_warning') {
            console.log(chalk.yellow(`    [C1] ⚠ Token budget ${event.tokensUsed}/${event.tokenBudget}`));
          } else if (event.type === 'prune') {
            console.log(chalk.dim(`    [C1] Pruned ${event.chunksPruned || 0} irrelevant chunks`));
          }
        } : undefined,
      });

      if (result.chunks.length === 0) {
        console.log(chalk.yellow('  No relevant findings found for this question.'));
        console.log(chalk.gray('  Try rephrasing or running deeper research.\n'));
        taskQueue.close();
        return;
      }

      // Build answer using retrieved chunks as grounded context
      const retrievedContext = result.chunks
        .slice(0, 10)
        .map((c, i) => `[${i + 1}] ${c.content}`)
        .join('\n\n');

      const answerPrompt = `You are a research analyst. Using ONLY the retrieved evidence below, answer the question.

Question: "${options.question}"

Retrieved Evidence (from research on "${task.question}"):
${retrievedContext}

Rules:
- Only use facts from the evidence above. Never hallucinate.
- Reference specific sources when possible (use [source] notation).
- If the evidence doesn't fully answer the question, say so clearly.
- Keep the answer focused and actionable.`;

      const SYNTHESIS_MODEL = getModel('section_synthesis');
      console.log(chalk.bold.white(`  Answer:\n`));

      const answer = await ollamaService.generateStream(answerPrompt, SYNTHESIS_MODEL, {
        temperature: 0.3,
        num_predict: 800,
        num_ctx: 8192,
      });

      console.log(answer);

      // Show sources
      const sourcedChunks = result.chunks.filter(c => c.metadata?.url);
      if (sourcedChunks.length > 0) {
        console.log(chalk.gray('\n  Sources cited:'));
        const uniqueSources = new Set(sourcedChunks.map(c => c.metadata?.url as string).filter(Boolean));
        Array.from(uniqueSources).slice(0, 8).forEach((url, i) => {
          console.log(chalk.gray(`    [${i + 1}] ${url}`));
        });
      }

      if (options.verbose) {
        console.log(chalk.dim(`\n  Context-1 stats: ${result.steps} steps, ${result.tokensUsed} tokens used, ${result.durationMs}ms`));
      }

    } else {
      // === PATH B: Fallback — simple LLM query without Context-1 ===
      console.log(chalk.yellow('  ⚠ Context-1 not available — falling back to direct LLM query'));
      console.log(chalk.gray('  (Run `ollama pull chromadb-context-1:latest` for better results)\n'));

      // Build a context from all findings
      const allFacts = corpus
        .flatMap(c => c.content.split('\n').filter(l => /^\d+\./.test(l)))
        .slice(0, 80)
        .join('\n');

      const fallbackPrompt = `You are a research analyst. Based on these research findings, answer the question.

Research Question: "${task.question}"
Follow-up: "${options.question}"

Research Findings:
${allFacts}

Answer based only on the findings above. If uncertain, say so.`;

      const answer = await ollamaService.generateStream(
        fallbackPrompt,
        getModel('section_synthesis'),
        { temperature: 0.3, num_predict: 600 }
      );

      console.log(chalk.bold.white('  Answer:\n'));
      console.log(answer);
      console.log(chalk.yellow('\n  ⚠ This answer used fallback mode — citations may be incomplete.\n'));
    }

    console.log('');
    taskQueue.close();

  } catch (error) {
    log.error('Query failed:', error);
    console.error(chalk.red(`\n✗ Query failed: ${error instanceof Error ? error.message : String(error)}`));
    taskQueue.close();
    process.exit(1);
  }
}
