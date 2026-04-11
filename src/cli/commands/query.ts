/**
 * Command: racks query
 *
 * Ask follow-up questions about previous research using knowledge base + RAG.
 * Usage: racks query <session-id> "Your question here?"
 */

import chalk from 'chalk';
import { createLogger } from '../../utils/logger.js';
import { createTaskQueue } from '../../core/taskQueue.js';
import { ollamaService } from '../../services/ollama.js';
import { storageService } from '../../services/storageService.js';

const log = createLogger('command-query');
const taskQueue = createTaskQueue();

interface QueryOptions {
  sessionId?: string;
  question?: string;
  help?: boolean;
}

/**
 * Parse command-line arguments for query command
 */
function parseArgs(args: string[]): QueryOptions {
  const options: QueryOptions = {};
  const positional: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--session-id' && i + 1 < args.length) {
      options.sessionId = args[++i];
    } else if (arg === '--question' && i + 1 < args.length) {
      options.question = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (!arg.startsWith('--')) {
      positional.push(arg);
    }
  }

  // Support positional args: query <session-id> "<question>"
  if (positional.length >= 1 && !options.sessionId) {
    options.sessionId = positional[0];
  }
  if (positional.length >= 2 && !options.question) {
    options.question = positional[1];
  }

  return options;
}

/**
 * Show help for query command
 */
function showHelp(): void {
  console.log(chalk.bold.yellow('\nracks query — Ask follow-up questions about research\n'));
  console.log(chalk.gray('USAGE:'));
  console.log('  racks query <session-id> "<question>"\n');
  console.log('  racks query --session-id <id> --question "<question>"\n');

  console.log(chalk.gray('OPTIONS:'));
  console.log('  --session-id <id>  Research session/task ID (required)');
  console.log('  --question <q>     Question to ask (required)');
  console.log('  --help, -h         Show this help\n');

  console.log(chalk.gray('EXAMPLES:'));
  console.log('  racks query task-abc123 "What are the top 3 trends?"');
  console.log('  racks query --session-id task-abc123 --question "How does this compare to 2023?"\n');
}

/**
 * Execute query command
 */
export async function commandQuery(args: string[]): Promise<void> {
  const options = parseArgs(args);

  if (options.help) {
    showHelp();
    return;
  }

  if (!options.sessionId || !options.question) {
    console.error(chalk.red('✗ Error: both session-id and question are required'));
    showHelp();
    process.exit(1);
  }

  try {
    console.log(chalk.blue(`\n🔍 Querying session ${options.sessionId}...\n`));

    // Load task to get original question
    const task = taskQueue.getTask(options.sessionId);
    if (!task) {
      console.error(chalk.red(`✗ Session not found: ${options.sessionId}`));
      process.exit(1);
    }

    console.log(chalk.gray(`Original question: "${task.question}"`));
    console.log(chalk.gray(`Current coverage: ${task.coverage || 0}%, Confidence: ${Math.round(task.confidence || 0)}%\n`));

    console.log(chalk.cyan(`💭 Analyzing your question: "${options.question}"\n`));

    // Query using Ollama RAG approach
    // In a full implementation, this would retrieve relevant findings from storage
    // and use an LLM to synthesize an answer
    const prompt = `
Based on the following research findings, answer this question:

Original Research Question: "${task.question}"
Research Coverage: ${task.coverage || 0}%
Research Confidence: ${Math.round(task.confidence || 0)}%

Follow-up Question: "${options.question}"

Provide a concise, evidence-based answer. If the answer cannot be determined from the available research, explain why.
`;

    console.log(chalk.gray('Generating response from research findings...\n'));

    let fullResponse = '';

    // Generate response using Ollama
    try {
      fullResponse = await ollamaService.generateStream(
        prompt,
        'qwen3.5:4b',
        {
          temperature: 0.3,
          num_predict: 500
        }
      );
      process.stdout.write(fullResponse);
    } catch (error) {
      log.error('Generation failed:', error);
      fullResponse = 'Unable to generate response at this time.';
      process.stdout.write(fullResponse);
    }

    console.log('\n');

    // Confidence assessment
    const confidenceScore = Math.min(1, (task.confidence || 0) / 100);
    const confidencePercent = Math.round(confidenceScore * 100);

    console.log(chalk.gray(`\n📊 Confidence: ${confidencePercent}%`));

    if (confidenceScore < 0.6) {
      console.log(chalk.yellow(`⚠️  Low confidence — consider running fresh research on "${options.question}"\n`));
    } else {
      console.log(chalk.gray(`Generated based on ${task.coverage || 0}% coverage\n`));
    }

    taskQueue.close();
  } catch (error) {
    log.error('Query failed:', error);
    console.error(chalk.red(`\n✗ Query failed: ${error instanceof Error ? error.message : String(error)}`));
    taskQueue.close();
    process.exit(1);
  }
}
