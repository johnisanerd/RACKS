/**
 * Command: racks ask
 *
 * Broad research on a topic with automatic decomposition and synthesis.
 *
 * Flow:
 *   1. If no --no-intake flag: run interactive intake (brand, audience, competitors, depth)
 *   2. Confirm research plan with user
 *   3. Run orchestrator (plan → research → reflect → synthesize)
 *   4. Print report path + quick summary
 *
 * Usage:
 *   racks ask --question "What are trends in collagen supplements?"
 *   racks ask --question "..." --time "2h" --depth "extended"
 *   racks ask --question "..." --no-intake   # skip clarifying questions
 */

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { createLogger } from '../../utils/logger.js';
import { validateResearchQuestion, validateDuration, validateResearchDepth } from '../../utils/validation.js';
import { runIntake, enhanceQuestionWithIntake, type IntakeAnswers } from './intake.js';
import { createTaskQueue } from '../../core/taskQueue.js';
import { DeepResearchOrchestrator } from '../../core/orchestrator.js';
import { liveDisplay } from '../../utils/liveDisplay.js';
import type { ResearchTask } from '../../core/taskQueue.js';
import { classifyInput } from '../../utils/inputClassifier.js';
import { analyzeSnippet } from '../../utils/snippetParser.js';
import { analyzeCodebase } from '../../subagents/codebaseAnalyzer.js';
import { synthesizeCodeReport } from '../../core/phases/codeSynthesizer.js';

const log = createLogger('command-ask');

// ─────────────────────────────────────────────────────────────
// OPTIONS
// ─────────────────────────────────────────────────────────────

interface AskOptions {
  question?: string;
  time?: string;
  depth?: string;
  simulate?: boolean;
  noIntake?: boolean;
  help?: boolean;
}

// Depth string → timeout mapping
const DEPTH_TIMEOUTS: Record<string, number> = {
  sq: 5   * 60 * 1000,   //  5 min
  qk: 30  * 60 * 1000,   // 30 min
  nr: 90  * 60 * 1000,   // 90 min
  ex: 2   * 60 * 60 * 1000, // 2 h
  mx: 5   * 60 * 60 * 1000, // 5 h
};

const DEPTH_ITERATIONS: Record<string, number> = {
  sq: 5,
  qk: 12,
  nr: 30,
  ex: 45,
  mx: 100,
};

// ─────────────────────────────────────────────────────────────
// PARSE
// ─────────────────────────────────────────────────────────────

function parseArgs(args: string[]): AskOptions {
  const options: AskOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--question' && i + 1 < args.length) {
      options.question = args[++i];
    } else if (arg === '--time' && i + 1 < args.length) {
      options.time = args[++i];
    } else if (arg === '--depth' && i + 1 < args.length) {
      options.depth = args[++i];
    } else if (arg === '--simulate') {
      options.simulate = true;
    } else if (arg === '--no-intake' || arg === '--yes' || arg === '-y') {
      // Support multiple flags for skipping intake
      options.noIntake = true;
    } else if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (!arg.startsWith('--')) {
      // Positional: treat bare string as question
      if (!options.question) options.question = arg;
    }
  }

  return options;
}

// ─────────────────────────────────────────────────────────────
// HELP
// ─────────────────────────────────────────────────────────────

function showHelp(): void {
  console.log(chalk.bold.yellow('\nracks ask — Deep research on any topic\n'));
  console.log(chalk.gray('USAGE:'));
  console.log('  racks ask --question <question> [options]\n');

  console.log(chalk.gray('OPTIONS:'));
  console.log('  --question <q>     Research question (required)');
  console.log('  --time <duration>  Max research time (overrides --depth)');
  console.log('  --depth <level>    Research depth: sq/qk/nr/ex/mx (default: nr)');
  console.log('  --no-intake        Skip clarifying questions, start immediately');
  console.log('  --simulate         Dry run without executing research');
  console.log('  --help, -h         Show this help\n');

  console.log(chalk.gray('DEPTH LEVELS:'));
  console.log('  sq   Super Quick  ~5 min    basic overview');
  console.log('  qk   Quick       ~30 min    fast research');
  console.log('  nr   Normal      ~90 min    thorough (default)');
  console.log('  ex   Extended    ~2 hrs     comprehensive');
  console.log('  mx   Maximum     ~5 hrs     exhaustive\n');

  console.log(chalk.gray('EXAMPLES:'));
  console.log('  racks ask --question "What makes collagen supplements sell?"');
  console.log('  racks ask --question "Competitor analysis for Vital Proteins" --depth ex');
  console.log('  racks ask --question "..." --time "2h" --no-intake\n');
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

export async function commandAsk(args: string[]): Promise<void> {
  const options = parseArgs(args);

  if (options.help) { showHelp(); return; }

  // ── Validate question ────────────────────────────────────────
  if (!options.question) {
    console.error(chalk.red('✗ Error: --question is required'));
    showHelp();
    process.exit(1);
  }

  // ── Classify input (codebase, snippet, or web query) ──────────
  const classification = classifyInput(options.question);

  // Route to appropriate handler
  if (classification.type === 'codebase') {
    return await handleCodebaseAnalysis(classification.filePath || options.question); // ⚠️ Missing error handling // ⚠️ Missing error handling
  }

  if (classification.type === 'snippet') {
    return await handleSnippetAnalysis(options.question); // ⚠️ Missing error handling // ⚠️ Missing error handling
  }

  // Otherwise: validate as web query
  try {
    validateResearchQuestion(options.question);
  } catch (err) {
    console.error(chalk.red(`✗ Invalid question: ${err instanceof Error ? err.message : String(err)}`));
    process.exit(1);
  }

  // ── Intake ───────────────────────────────────────────────────
  let intake: IntakeAnswers | null = null;

  if (!options.noIntake && !options.simulate) {
    intake = await runIntake(); // ⚠️ Missing error handling // ⚠️ Missing error handling
    if (intake === null) {
      // User cancelled
      return;
    }
  }

  // ── Resolve depth / time ─────────────────────────────────────
  let depth = 'nr';
  if (options.depth) {
    try {
      depth = validateResearchDepth(options.depth) ?? 'nr';
    } catch (err) {
      console.error(chalk.red(`✗ Invalid depth: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  } else if (intake?.depth) {
    // Map intake depth → CLI depth level
    const intakeMap: Record<string, string> = {
      quick: 'qk',
      standard: 'nr',
      deep: 'ex',
    };
    depth = intakeMap[intake.depth] ?? 'nr';
  }

  let timeoutMs: number;
  if (options.time) {
    try {
      timeoutMs = validateDuration(options.time) ?? DEPTH_TIMEOUTS[depth];
    } catch (err) {
      console.error(chalk.red(`✗ Invalid time: ${err instanceof Error ? err.message : String(err)}`));
      process.exit(1);
    }
  } else {
    timeoutMs = DEPTH_TIMEOUTS[depth];
  }

  const maxIterations = DEPTH_ITERATIONS[depth] ?? 30;

  // ── Enrich question with intake context ──────────────────────
  const enhancedQuestion = intake
    ? enhanceQuestionWithIntake(options.question, intake)
    : options.question;

  // ── Simulate mode ────────────────────────────────────────────
  if (options.simulate) {
    const timeMins = Math.round(timeoutMs / 60000);
    console.log(chalk.blue('\nSimulated Research Plan (dry run)\n'));
    console.log(`  Question:    ${chalk.bold(options.question)}`);
    console.log(`  Depth:       ${chalk.bold(depth)} (${timeMins} min max)`);
    console.log(`  Iterations:  ${chalk.bold(maxIterations.toString())}`);
    console.log('');
    console.log(chalk.gray('  Phase 1: Decompose question into research sections'));
    console.log(chalk.gray('  Phase 2: Deploy parallel research subagents'));
    console.log(chalk.gray('  Phase 3: Analyze gaps, decide next research focus'));
    console.log(chalk.gray('  Phase 4: Repeat until coverage threshold met'));
    console.log(chalk.gray('  Phase 5: Synthesize full report + TLDR\n'));
    console.log(chalk.green('  Simulation complete (no research executed)\n'));
    return;
  }

  // ── Create task ──────────────────────────────────────────────
  const taskQueue = createTaskQueue();
  const taskId = `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const task = taskQueue.createTask({
    id: taskId,
    name: options.question.slice(0, 80),
    question: enhancedQuestion,
    status: 'running',
    scheduleType: 'now',
    createdAt: Date.now(),
    startedAt: Date.now(),
    timeoutMs,
    maxIterations,
  });

  // ── Show header ──────────────────────────────────────────────
  console.log(chalk.bold.white(`\n  Research: "${options.question}"\n`));

  if (intake) {
    if (intake.brandUrl)     console.log(chalk.gray(`  Brand:       ${intake.brandUrl}`));
    if (intake.productName)  console.log(chalk.gray(`  Product:     ${intake.productName}`));
    if (intake.targetAudience) console.log(chalk.gray(`  Audience:    ${intake.targetAudience}`));
    if (intake.competitors?.length) {
      console.log(chalk.gray(`  Competitors: ${intake.competitors.join(', ')}`));
    }
    console.log('');
  }

  const timeMins = Math.round(timeoutMs / 60000);
  console.log(chalk.cyan(`  Depth: ${depth} | Budget: ${timeMins} min | Max iterations: ${maxIterations}`));
  console.log(chalk.gray(`  Task ID: ${taskId}\n`));

  // ── Setup Ctrl+C handler ─────────────────────────────────────
  let interrupted = false;
  const sigintHandler = () => {
    if (!interrupted) {
      interrupted = true;
      console.log(chalk.yellow('\n\n  Research interrupted — saving checkpoint...\n'));
      taskQueue.setStatus(taskId, 'paused');
      console.log(chalk.gray(`  Resume with: racks resume --task-id ${taskId}\n`));
      taskQueue.close();
      process.removeAllListeners('SIGINT'); // Remove all SIGINT handlers before exit
      process.exit(0);
    }
  };
  process.once('SIGINT', sigintHandler); // Use once() to prevent handler stacking

  // ── Run orchestrator ─────────────────────────────────────────
  // Concurrency scaled aggressively per depth: most 2b scraping agents we can run
  const maxAgents = depth === 'mx' ? 30 : depth === 'ex' ? 20 : depth === 'nr' ? 12 : 6;

  const orchestrator = new DeepResearchOrchestrator({
    maxIterations,
    timeoutMs,
    maxParallelAgents: maxAgents,
    coverageThreshold: depth === 'mx' ? 0.92 : depth === 'ex' ? 0.88 : 0.80,
  }, intake ?? undefined);

  try {
    liveDisplay.start();

    const state = await orchestrator.orchestrate(task, (progress) => {
      // Progress callback — update task queue with current metrics
      try {
        taskQueue.updateProgress(taskId, {
          progressPercent: Math.round(progress.coverage),
          currentIteration: progress.iteration,
          coverage: progress.coverage,
          confidence: progress.confidence,
          readyScore: progress.readyScore,
        });

        // Save checkpoint
        if (progress.findings.size > 0) {
          const checkpointFindings = JSON.stringify(
            Object.fromEntries(
              Array.from(progress.findings.entries()).map(([k, v]) => [k, {
                facts: v.facts.slice(0, 50),
                sources: v.sources.slice(0, 20),
                confidence: v.confidence,
              }])
            )
          );
          taskQueue.saveCheckpoint(taskId, progress.iteration, checkpointFindings);
        }
      } catch (err) {
        log.warn('Failed to save progress:', err);
        // Don't throw - allow research to continue even if progress save fails
      }
    });

    liveDisplay.stop();

    // ── Finalize task ──────────────────────────────────────────
    const reportPath = path.join(os.homedir(), 'research-output', taskId, 'report.md');
    taskQueue.updateProgress(taskId, {
      progressPercent: 100,
      coverage: state.coverage,
      confidence: state.confidence,
      readyScore: state.readyScore,
    });
    taskQueue.setStatus(taskId, 'completed', { reportPath });

    // ── Print results ──────────────────────────────────────────
    const totalSources = Array.from(state.findings.values()).reduce((n, f) => n + f.sources.length, 0);
    const totalFacts   = Array.from(state.findings.values()).reduce((n, f) => n + f.facts.length, 0);

    console.log(chalk.bold.green('\n  Research complete!\n'));
    console.log(`  Coverage:   ${chalk.bold(state.coverage.toFixed(0) + '%')}`);
    console.log(`  Confidence: ${chalk.bold(state.confidence.toFixed(2))}`);
    console.log(`  Sources:    ${chalk.bold(totalSources.toString())}`);
    console.log(`  Facts:      ${chalk.bold(totalFacts.toString())}`);
    console.log(`  Iterations: ${chalk.bold(state.iteration.toString())}`);
    console.log('');
    console.log(chalk.cyan(`  Report:  ${reportPath}`));
    console.log(chalk.gray(`  Task ID: ${taskId}`));
    console.log(chalk.gray(`\n  Follow-up: racks query ${taskId} "your question here"\n`));

    // Print TLDR from report (first ~600 chars of executive summary)
    if (state.report) {
      const execStart = state.report.indexOf('## Executive Summary');
      if (execStart !== -1) {
        const execText = state.report.slice(execStart + 20, execStart + 700).trim();
        console.log(chalk.bold.white('  TLDR:\n'));
        console.log(chalk.white('  ' + execText.split('\n').join('\n  ')));
        console.log('');
      }
    }

  } catch (err) {
    liveDisplay.stop();
    log.error('Research failed:', err);
    try {
      taskQueue.setStatus(taskId, 'failed', { errorMessage: err instanceof Error ? err.message : String(err) });
    } catch (queueErr) {
      log.warn('Failed to mark task as failed:', queueErr);
    }
    console.error(chalk.red(`\n  Research failed: ${err instanceof Error ? err.message : String(err)}\n`));
    process.exit(1);
  } finally {
    // Always clean up resources
    try {
      orchestrator.close();
    } catch (err) {
      log.warn('Error closing orchestrator:', err);
    }
    try {
      taskQueue.close();
    } catch (err) {
      log.warn('Error closing task queue:', err);
    }
  }
}

// ─────────────────────────────────────────────────────────────
// CODEBASE ANALYSIS HANDLER
// ─────────────────────────────────────────────────────────────

async function handleCodebaseAnalysis(sourcePath: string): Promise<void> {
  console.log(chalk.bold.cyan('\n  📁 Code Analysis Mode\n'));
  console.log(chalk.gray(`  Analyzing: ${sourcePath}\n`));

  try {
    console.log(chalk.gray('  Scanning files...'));
    const analysis = await analyzeCodebase(sourcePath);

    console.log(chalk.green('  ✓ Analysis complete\n'));

    // Generate report
    const report = synthesizeCodeReport(analysis, sourcePath);

    // Save report
    const reportDir = path.join(os.homedir(), 'research-output', `codebase-${Date.now()}`);
    fs.mkdirSync(reportDir, { recursive: true });
    const reportPath = path.join(reportDir, 'code-analysis.md');
    fs.writeFileSync(reportPath, report, 'utf-8');

    // Export metrics
    const metricsPath = path.join(reportDir, 'metrics.json');
    fs.writeFileSync(metricsPath, JSON.stringify(analysis, null, 2), 'utf-8');

    // Print summary
    console.log(chalk.bold.white('  Code Analysis Summary:\n'));
    console.log(`  Files:     ${chalk.bold(analysis.files.length.toString())}`);
    console.log(`  Functions: ${chalk.bold(analysis.allFunctions.length.toString())}`);
    console.log(`  Lines:     ${chalk.bold(analysis.complexity.totalLines.toLocaleString())}`);
    console.log(`  Languages: ${chalk.bold(Array.from(new Set(analysis.files.map(f => f.language))).join(', '))}`);

    if (analysis.architecture.length > 0) {
      console.log(`\n  Patterns detected:`);
      analysis.architecture.forEach(arch => {
        console.log(`    • ${arch.type} (${(arch.confidence * 100).toFixed(0)}%)`);
      });
    }

    console.log(`\n  ${chalk.cyan('Report:')}  ${reportPath}`);
    console.log(`  ${chalk.cyan('Metrics:')} ${metricsPath}\n`);

  } catch (err) {
    console.error(chalk.red(`\n  Analysis failed: ${err instanceof Error ? err.message : String(err)}\n`));
    process.exit(1);
  }
}

// ─────────────────────────────────────────────────────────────
// SNIPPET ANALYSIS HANDLER
// ─────────────────────────────────────────────────────────────

async function handleSnippetAnalysis(code: string): Promise<void> {
  console.log(chalk.bold.cyan('\n  📝 Code Snippet Analysis\n'));

  try {
    const analysis = analyzeSnippet({
      content: code,
      language: 'typescript',  // Try to auto-detect
    });

    console.log(chalk.green('  ✓ Analysis complete\n'));

    // Print results
    console.log(chalk.bold.white('  Snippet Analysis:\n'));
    console.log(`  Summary:      ${analysis.summary}`);
    console.log(`  Language:     ${chalk.bold(analysis.complexity.lines)} lines\n`);

    if (analysis.functions.length > 0) {
      console.log(`  Functions: ${analysis.functions.join(', ')}`);
    }

    if (analysis.classes.length > 0) {
      console.log(`  Classes:   ${analysis.classes.join(', ')}`);
    }

    console.log(`\n  Complexity:   Cyclomatic=${analysis.complexity.cyclomatic}, Cognitive=${analysis.complexity.cognitive}`);

    if (analysis.possibleIssues.length > 0) {
      console.log(`\n  ${chalk.yellow('Issues:')}`);
      analysis.possibleIssues.forEach(issue => {
        console.log(`    ⚠️  ${issue}`);
      });
    }

    if (analysis.suggestions.length > 0) {
      console.log(`\n  ${chalk.blue('Suggestions:')}`);
      analysis.suggestions.forEach(sug => {
        console.log(`    💡 ${sug}`);
      });
    }

    if (analysis.relatedPatterns.length > 0) {
      console.log(`\n  ${chalk.cyan('Patterns:')}`);
      analysis.relatedPatterns.forEach(pat => {
        console.log(`    • ${pat}`);
      });
    }

    console.log(`\n  Confidence: ${(analysis.confidence * 100).toFixed(0)}%\n`);

  } catch (err) {
    console.error(chalk.red(`\n  Analysis failed: ${err instanceof Error ? err.message : String(err)}\n`));
    process.exit(1);
  }
}
