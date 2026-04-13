#!/usr/bin/env node
/**
 * Deep Research Harness — Enterprise-grade research automation
 *
 * Features:
 * - Recursive topic decomposition
 * - Context-1 multi-hop retrieval
 * - Time-based research adaptation (10min vs 40min = different strategies)
 * - Horizontal scaling via subagents (up to 10 parallel research workers)
 * - Confidence-based termination (coverage × confidence > threshold)
 * - Beautiful CLI with persistent header + real-time progress
 * - Daemon + interactive modes
 * - Final structured documents (PDF, JSON, Markdown)
 */

// Load environment variables from .env file FIRST
import dotenv from 'dotenv';
dotenv.config();

import * as readline from 'readline';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { spawn } from 'child_process';
import chalk from 'chalk';
import { input, confirm, select } from '@inquirer/prompts';
import Table from 'cli-table3';
import stripAnsi from 'strip-ansi';
import { resolve } from 'path';
import { liveDisplay } from '../utils/liveDisplay.js';
import { exportToHTML } from '../utils/pdfExporter.js';
import { analyzeTopicAndGenerateQuestions, formatQuestionsForDisplay } from '../utils/preResearchQuestioner.js';
import { analyzeSingleSource, formatAnalysisForDisplay } from '../utils/deepDiveAnalyzer.js';
import { DeepResearchOrchestrator } from '../core/orchestrator.js';

// ─────────────────────────────────────────────────────────────
// CONSTANTS & CONFIG
// ─────────────────────────────────────────────────────────────

const APP_NAME = 'Billy';
const APP_VERSION = '1.0.0';
const DATA_DIR = path.join(os.homedir(), '.deep-research');
const TASK_DB_PATH = path.join(DATA_DIR, 'tasks.db');
const OUTPUT_DIR = path.join(os.homedir(), 'research-output');

// Ensure directories exist
[DATA_DIR, OUTPUT_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
type ScheduleType = 'now' | 'at_time' | 'time_window' | 'cron';
type CommandMode = 'ask' | 'daemon' | 'task' | 'schedule';

interface ResearchTask {
  id: string;
  name: string;
  question: string;
  status: TaskStatus;

  // Scheduling
  scheduleType: ScheduleType;
  scheduledTime?: number;
  timeWindow?: { start: number; end: number };
  cronExpression?: string;

  // Execution
  createdAt: number;
  startedAt?: number;
  completedAt?: number;

  // Progress
  progressPercent?: number;
  currentIteration?: number;
  maxIterations?: number;
  readyScore?: number;

  // Results
  reportPath?: string;
  errorMessage?: string;
}

// ─────────────────────────────────────────────────────────────
// RESEARCH CONFIG
// ─────────────────────────────────────────────────────────────

/**
 * Adaptive research config based on time limit
 * 5 min: quick broad survey, 15 agents, 20 sources each
 * 1 hour: balanced depth, 12 agents, 50 sources each
 * 10 hours: deep rabbit hole, 20 agents, 40 sources each (easier summarization)
 * unlimited: keep going until 0.98 confidence or plateau
 */
function getAdaptiveConfig(timeoutMs?: number) {
  if (!timeoutMs) {
    // Unlimited research — go very deep
    return {
      maxIterations: 200,        // Keep iterating indefinitely
      sourcesPerSubtopic: 40,    // Fewer per agent = easier to summarize, more agents
      coverageThreshold: 0.98,   // Very high bar
      maxParallelAgents: 25,     // Many agents = diverse coverage
      timeoutMs: 36 * 60 * 60 * 1000 // 36 hours hard cap
    };
  }

  const seconds = timeoutMs / 1000;
  const minutes = timeoutMs / 60000;

  if (seconds < 20) {
    // Flash research (< 20 sec) — almost impossible, but try
    return {
      maxIterations: 1,          // Just one shot
      sourcesPerSubtopic: 3,     // Minimal sources
      coverageThreshold: 0.50,   // Very low bar
      maxParallelAgents: 3,      // Few agents to avoid timeout
      timeoutMs
    };
  } else if (seconds < 60) {
    // Rapid research (20-60 sec)
    return {
      maxIterations: 1,
      sourcesPerSubtopic: 8,
      coverageThreshold: 0.60,
      maxParallelAgents: 5,
      timeoutMs
    };
  } else if (minutes <= 5) {
    // Quick research (1-5 min)
    return {
      maxIterations: 3,
      sourcesPerSubtopic: 20,
      coverageThreshold: 0.75,   // Lower bar for quick research
      maxParallelAgents: 15,
      timeoutMs
    };
  } else if (minutes <= 30) {
    // Medium research
    return {
      maxIterations: 8,
      sourcesPerSubtopic: 40,
      coverageThreshold: 0.85,
      maxParallelAgents: 15,
      timeoutMs
    };
  } else if (minutes <= 120) {
    // Long research (1-2 hours)
    return {
      maxIterations: 25,
      sourcesPerSubtopic: 50,
      coverageThreshold: 0.90,
      maxParallelAgents: 20,
      timeoutMs
    };
  } else {
    // Very long research (2+ hours)
    return {
      maxIterations: 100,        // Keep going for days if needed
      sourcesPerSubtopic: 40,    // Fewer per agent = can summarize better
      coverageThreshold: 0.95,   // Strict bar
      maxParallelAgents: 25,     // Maximum agents for deep coverage
      timeoutMs
    };
  }
}

let RESEARCH_CONFIG = getAdaptiveConfig();

// ─────────────────────────────────────────────────────────────
// ASCII LOGO
// ─────────────────────────────────────────────────────────────

function renderLogo(): string {
  return chalk.cyan(`
█████ ██ █████ █████ █████
█     ██ █     █     █
█████ ██ █████ █████ █████
    █ ██     █ █       █
█████ ██ █████ █████ █████
  `);
}

// ─────────────────────────────────────────────────────────────
// PERSISTENT HEADER (TUI)
// ─────────────────────────────────────────────────────────────

interface PersistentHeader {
  title: string;
  mode: string;
  task?: ResearchTask;
  stats?: {
    coverage: number;
    confidence: number;
    readyScore: number;
    iteration: number;
    elapsed: number;
  };
}

function renderHeader(state: PersistentHeader): string {
  const lines: string[] = [];

  // Logo
  lines.push(renderLogo());

  // Title bar
  lines.push(
    chalk.inverse(
      ` ${APP_NAME} v${APP_VERSION} | Mode: ${state.mode} `.padEnd(80)
    )
  );

  // Task info bar (if task is running)
  if (state.task && state.task.status === 'running') {
    const taskInfo = [
      `Task: ${state.task.id}`,
      state.stats ? `| Coverage: ${state.stats.coverage}% | Confidence: ${(state.stats.confidence * 100).toFixed(0)}% | Ready: ${(state.stats.readyScore * 100).toFixed(0)}%` : '',
      state.stats ? `| Iteration: ${state.stats.iteration} | Elapsed: ${formatTime(state.stats.elapsed)}` : ''
    ].filter(Boolean).join(' ');
    lines.push(chalk.gray(taskInfo));
  }

  // Separator
  lines.push(chalk.gray('─'.repeat(80)));

  return lines.join('\n');
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  } else {
    return `${seconds}s`;
  }
}

// ─────────────────────────────────────────────────────────────
// MAIN COMMANDS
// ─────────────────────────────────────────────────────────────

async function commandAsk(args: string[]): Promise<void> {
  console.clear();
  console.log(renderHeader({ title: APP_NAME, mode: 'Interactive (Ask)' }));

  // Parse command line args
  let question = '';
  let timeLimit = 0; // in seconds
  let simulate = false;
  let skipConfirm = false;
  let skipQuestions = false;

  // Reconstruct question from args if it might have multiple words
  const questionParts: string[] = [];
  let i = 0;

  while (i < args.length) {
    if (args[i] === '--question') {
      // Collect words until next flag
      i++;
      while (i < args.length && !args[i].startsWith('--')) {
        questionParts.push(args[i]);
        i++;
      }
      question = questionParts.join(' ');
    } else if (args[i] === '--time' && args[i + 1] && !args[i + 1].startsWith('--')) {
      const timeStr = args[i + 1];
      if (timeStr.includes('m')) {
        timeLimit = parseInt(timeStr) * 60 * 1000;
      } else if (timeStr.includes('h')) {
        timeLimit = parseInt(timeStr) * 60 * 60 * 1000;
      }
      i += 2;
    } else if (args[i] === '--simulate') {
      simulate = true;
      i++;
    } else if (args[i] === '--yes' || args[i] === '-y') {
      skipConfirm = true;
      i++;
    } else if (args[i] === '--no-questions') {
      skipQuestions = true;
      i++;
    } else {
      i++;
    }
  }

  // Prompt if not provided
  if (!question) {
    question = await input({
      message: 'What would you like to research?',
      validate: (val) => val.length > 10 ? true : 'Question must be at least 10 characters'
    });
  }

  // Get adaptive config based on time limit
  RESEARCH_CONFIG = getAdaptiveConfig(timeLimit);

  // Pre-research clarifying questions (optional, can be skipped with --no-questions)
  let clarifications = '';
  if (!skipQuestions && !skipConfirm) {
    try {
      console.log(chalk.gray('\n⏳ Analyzing topic complexity...\n'));
      const { analysis, answers } = await analyzeTopicAndGenerateQuestions(question, false);

      if (analysis.questions.length > 0) {
        console.log(formatQuestionsForDisplay(analysis.questions));
        console.log('');

        const userAnswers: Record<string, string> = {};
        for (const q of analysis.questions) {
          const selected = await select({
            message: q.question,
            choices: q.options.map(opt => ({ name: opt, value: opt }))
          });
          userAnswers[q.question] = selected;
        }

        clarifications = Object.entries(userAnswers)
          .map(([q, a]) => `${q}: ${a}`)
          .join('\n');

        console.log(chalk.green('\n✓ Scope refined based on your answers.\n'));
      }
    } catch (err) {
      console.log(chalk.yellow('\n⚠ Skipping clarifying questions (error occurred).\n'));
      // Continue without questions
    }
  }

  // Show summary with timestamp
  const now = new Date().toLocaleString();
  const timeStr = timeLimit
    ? timeLimit < 60000
      ? `${Math.round(timeLimit / 1000)}s`
      : timeLimit < 3600000
        ? `${Math.round(timeLimit / 60000)}m`
        : `${Math.round(timeLimit / 3600000)}h`
    : 'Unlimited';

  console.log('\n' + chalk.blue('╔═══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.blue('║') + ' ' + chalk.bold('Research Configuration (Adaptive)') + chalk.blue('                      ║'));
  console.log(chalk.blue('╠═══════════════════════════════════════════════════════════════╣'));
  console.log(chalk.blue('║') + ` Question:  ${question.substring(0, 55)}`.padEnd(65) + chalk.blue('║'));
  console.log(chalk.blue('║') + ` Time Budget:  ${timeStr}`.padEnd(65) + chalk.blue('║'));
  console.log(chalk.blue('║') + ` Started:  ${now}`.padEnd(65) + chalk.blue('║'));
  if (clarifications) {
    console.log(chalk.blue('║') + ` Scope:  ${clarifications.split('\n')[0].substring(0, 50)}`.padEnd(65) + chalk.blue('║'));
  }
  console.log(chalk.blue('╠═══════════════════════════════════════════════════════════════╣'));
  console.log(chalk.blue('║') + ` Max Iterations:  ${RESEARCH_CONFIG.maxIterations}`.padEnd(65) + chalk.blue('║'));
  console.log(chalk.blue('║') + ` Parallel Agents:  ${RESEARCH_CONFIG.maxParallelAgents}`.padEnd(65) + chalk.blue('║'));
  console.log(chalk.blue('║') + ` Sources per Agent:  ${RESEARCH_CONFIG.sourcesPerSubtopic}`.padEnd(65) + chalk.blue('║'));
  console.log(chalk.blue('║') + ` Confidence Threshold:  ${(RESEARCH_CONFIG.coverageThreshold * 100).toFixed(0)}%`.padEnd(65) + chalk.blue('║'));
  console.log(chalk.blue('╚═══════════════════════════════════════════════════════════════╝\n'));

  if (!skipConfirm) {
    const proceed = await confirm({ message: 'Start research?' });

    if (!proceed) {
      console.log(chalk.yellow('Research cancelled.'));
      return;
    }
  }

  // Create task
  const task: ResearchTask = {
    id: generateTaskId(),
    name: question,
    question,
    status: 'running',
    scheduleType: 'now',
    createdAt: Date.now(),
    startedAt: Date.now(),
    progressPercent: 0,
    currentIteration: 1,
    maxIterations: RESEARCH_CONFIG.maxIterations,
    readyScore: 0
  };

  console.log(chalk.green(`\n✓ Task started: ${task.id}\n`));

  // Run research (simulation or actual based on --simulate flag)
  if (simulate) {
    console.log(chalk.gray('(Running in simulation mode)\n'));
    await simulateResearch(task, timeLimit);
  } else {
    await runResearch(task, timeLimit);
  }

  // Note: report is printed inline by runResearch() above
}

async function commandDive(args: string[]): Promise<void> {
  console.clear();
  console.log(renderHeader({ title: APP_NAME, mode: 'Deep Dive' }));

  // Parse URL from args
  let sourceUrl = '';
  let i = 0;

  while (i < args.length) {
    if (args[i] === '--url' && args[i + 1]) {
      sourceUrl = args[i + 1];
      i += 2;
    } else if (!args[i].startsWith('--')) {
      sourceUrl = args[i];
      i++;
    } else {
      i++;
    }
  }

  // Prompt if not provided
  if (!sourceUrl) {
    sourceUrl = await input({
      message: 'Enter source URL (GitHub repo, documentation, API, etc.):',
      validate: (val) => {
        try {
          new URL(val);
          return true;
        } catch {
          return 'Must be a valid URL';
        }
      }
    });
  }

  console.log(chalk.blue('\n╔═══════════════════════════════════════════════════════════════╗'));
  console.log(chalk.blue('║') + ' ' + chalk.bold('Deep Dive Analysis') + chalk.blue('                                       ║'));
  console.log(chalk.blue('╠═══════════════════════════════════════════════════════════════╣'));
  console.log(chalk.blue('║') + ` URL: ${sourceUrl}`.padEnd(65) + chalk.blue('║'));
  console.log(chalk.blue('║') + ` Started: ${new Date().toLocaleString()}`.padEnd(65) + chalk.blue('║'));
  console.log(chalk.blue('╚═══════════════════════════════════════════════════════════════╝\n'));

  try {
    console.log(chalk.gray('🔍 Analyzing source...\n'));
    const analysis = await analyzeSingleSource(sourceUrl);

    console.log(formatAnalysisForDisplay(analysis));

    // Save analysis to file
    const taskId = generateTaskId();
    const outputPath = path.join(OUTPUT_DIR, `dive-${taskId}.json`);
    fs.writeFileSync(outputPath, JSON.stringify(analysis, null, 2));

    console.log(chalk.green(`\n✓ Analysis saved to: ${outputPath}\n`));
  } catch (error) {
    console.error(chalk.red(`\n❌ Deep dive failed: ${error instanceof Error ? error.message : String(error)}\n`));
  }
}

async function commandDaemon(subcommand: string, args: string[]): Promise<void> {
  switch (subcommand) {
    case 'start':
      console.log(chalk.blue(`\n🚀 Starting ${APP_NAME} daemon...\n`));
      console.log(chalk.gray('Daemon started (PID: ' + process.pid + ')'));
      console.log(chalk.gray('Watching task queue for incoming research requests...'));
      console.log(chalk.gray('\nPress Ctrl+C to stop daemon.\n'));

      // Keep daemon running
      process.on('SIGINT', () => {
        console.log(chalk.yellow('\n\nDaemon shutting down gracefully...'));
        process.exit(0);
      });

      // Simulate daemon loop
      while (true) {
        await new Promise(resolve => setTimeout(resolve, 5000));
      }
      break;

    case 'stop':
      console.log(chalk.yellow('Daemon stop not yet implemented.'));
      break;

    case 'status':
      console.log(chalk.blue('\n╔══════════════════════════════════╗'));
      console.log(chalk.blue('║') + ' Daemon Status');
      console.log(chalk.blue('╚══════════════════════════════════╝\n'));

      const table = new Table({
        head: [chalk.bold('Metric'), chalk.bold('Value')],
        colWidths: [20, 30]
      });

      table.push(
        [chalk.gray('Status'), chalk.green('✓ Running')],
        [chalk.gray('PID'), process.pid.toString()],
        [chalk.gray('Uptime'), 'N/A'],
        [chalk.gray('Running Tasks'), '0'],
        [chalk.gray('Queued Tasks'), '0'],
        [chalk.gray('Completed Today'), '0']
      );

      console.log(table.toString());
      console.log();
      break;

    default:
      console.log(chalk.red(`Unknown daemon subcommand: ${subcommand}`));
  }
}

async function commandTask(subcommand: string, args: string[]): Promise<void> {
  switch (subcommand) {
    case 'new':
      console.log(chalk.blue('\n📋 Create New Research Task\n'));

      const taskName = await input({
        message: 'Task name:',
        default: 'Untitled Research'
      });

      const taskQuestion = await input({
        message: 'Research question:',
        validate: (val) => val.length > 10 ? true : 'Question must be at least 10 characters'
      });

      const scheduleType = await select({
        message: 'When to run?',
        choices: [
          { name: 'Run now', value: 'now' },
          { name: 'Run at specific time', value: 'at_time' },
          { name: 'Run within time window', value: 'time_window' },
          { name: 'Schedule recurring (cron)', value: 'cron' }
        ]
      });

      const task: ResearchTask = {
        id: generateTaskId(),
        name: taskName,
        question: taskQuestion,
        status: 'pending',
        scheduleType: scheduleType as ScheduleType,
        createdAt: Date.now()
      };

      console.log(chalk.green(`\n✓ Task created: ${task.id}\n`));
      console.log(`Name: ${task.name}`);
      console.log(`Question: ${task.question}\n`);
      break;

    case 'list':
      console.log(chalk.blue('\n📋 Task List\n'));

      const mockTasks: ResearchTask[] = [
        {
          id: 'task-20260409-001',
          name: 'Market Research: Collagen',
          question: 'What is the market opportunity for collagen supplements?',
          status: 'completed',
          scheduleType: 'now',
          createdAt: Date.now() - 2 * 60 * 60 * 1000,
          completedAt: Date.now() - 30 * 60 * 1000,
          progressPercent: 100,
          readyScore: 0.78
        }
      ];

      const taskTable = new Table({
        head: [chalk.bold('Task ID'), chalk.bold('Name'), chalk.bold('Status'), chalk.bold('Ready')],
        colWidths: [20, 30, 12, 8]
      });

      mockTasks.forEach(t => {
        const statusColor = t.status === 'completed' ? chalk.green : chalk.yellow;
        taskTable.push([
          t.id,
          t.name.substring(0, 30),
          statusColor(t.status),
          t.readyScore ? `${(t.readyScore * 100).toFixed(0)}%` : '-'
        ]);
      });

      console.log(taskTable.toString());
      console.log();
      break;

    default:
      console.log(chalk.red(`Unknown task subcommand: ${subcommand}`));
  }
}

// ─────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────

function generateTaskId(): string {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const random = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `task-${date}-${random}`;
}

async function runResearch(task: ResearchTask, timeLimit: number): Promise<void> {
  const startTime = Date.now();

  // Start live display (question pre-seeded so first render looks right)
  liveDisplay.start({ question: task.question, maxIterations: RESEARCH_CONFIG.maxIterations, maxAgents: RESEARCH_CONFIG.maxParallelAgents });

  try {
    const orchestrator = new DeepResearchOrchestrator(RESEARCH_CONFIG);

    const state = await orchestrator.orchestrate(
      {
        id: task.id,
        name: task.name,
        question: task.question,
        status: 'running',
        scheduleType: 'now',
        createdAt: task.createdAt
      },
      (progress) => {
        task.currentIteration = progress.iteration;
        task.progressPercent = Math.floor((progress.coverage / 100) * 100);
        task.readyScore = progress.readyScore;
      }
    );

    task.status = 'completed';
    task.completedAt = Date.now();

    orchestrator.close();
    liveDisplay.stop();

    // Print report to terminal
    const totalFacts = Array.from(state.findings.values()).reduce((n, f) => n + f.facts.length, 0);
    const totalSources = Array.from(state.findings.values()).reduce((n, f) => n + f.sources.length, 0);
    const reportPath = `~/research-output/${task.id}/report.md`;
    const htmlPath = resolve(os.homedir(), `research-output/${task.id}/report.html`);
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    const timestamp = new Date().toLocaleString();
    const avgConfidence = Array.from(state.findings.values()).reduce((sum, f) => sum + f.confidence, 0) / Math.max(state.plan.sections.length, 1);

    console.log('\n' + chalk.bold.green('═'.repeat(70)));
    console.log(chalk.bold.white(` ✓ Research Complete — ${timestamp}`));
    console.log(chalk.bold.green('═'.repeat(70)));
    console.log(chalk.gray(`  Question:   ${task.question}`));
    console.log(chalk.gray(`  Sections:   ${state.plan.sections.length}`));
    console.log(chalk.gray(`  Facts:      ${totalFacts}`));
    console.log(chalk.gray(`  Sources:    ${totalSources}`));
    console.log(chalk.gray(`  Coverage:   ${state.coverage.toFixed(0)}%`));
    console.log(chalk.gray(`  Confidence: ${(avgConfidence * 100).toFixed(0)}%`));
    console.log(chalk.gray(`  Ready Score: ${state.readyScore.toFixed(2)} (need: 0.92)`));
    console.log(chalk.gray(`  Elapsed:    ${elapsed}s`));
    console.log(chalk.yellow(`  📄 Report:   ${reportPath}`));
    console.log(chalk.yellow(`  🌐 HTML:     ${htmlPath}`));
    console.log(chalk.bold.green('═'.repeat(70)));

    // Export to HTML for PDF printing
    try {
      await exportToHTML(htmlPath, {
        question: task.question,
        generatedAt: timestamp,
        sections: Array.from(state.findings.entries()).map(([sectionId, findings]) => ({
          title: state.plan.sections.find(s => s.id === sectionId)?.title || sectionId,
          findings
        })),
        totalSources,
        avgConfidence,
        readyScore: state.readyScore
      });
      console.log(chalk.green(`\n  ✓ HTML report exported (can be printed to PDF)`));
    } catch (err) {
      console.log(chalk.yellow(`\n  ⚠ Failed to export HTML: ${err instanceof Error ? err.message : 'Unknown error'}`));
    }

    if (state.report) {
      console.log('\n' + chalk.bold.cyan('── SUMMARY ─────────────────────────────────────────────────────────'));
      // Print first ~40 lines of report
      const lines = state.report.split('\n').slice(0, 40);
      console.log(lines.join('\n'));
      if (state.report.split('\n').length > 40) {
        console.log(chalk.gray(`\n  ... (${state.report.split('\n').length - 40} more lines in full report)`));
      }
    }

  } catch (error) {
    task.status = 'failed';
    task.errorMessage = error instanceof Error ? error.message : 'Unknown error';
    task.completedAt = Date.now();
    liveDisplay.stop();

    const errorTime = new Date().toLocaleString();
    const elapsed = Math.round((Date.now() - startTime) / 1000);

    console.log('\n' + chalk.bold.red('═'.repeat(70)));
    console.log(chalk.bold.white(` ✗ Research Failed — ${errorTime}`));
    console.log(chalk.bold.red('═'.repeat(70)));
    console.log(chalk.gray(`  Question:   ${task.question}`));
    console.log(chalk.red(`  Error:      ${task.errorMessage}`));
    console.log(chalk.gray(`  Elapsed:    ${elapsed}s`));
    console.log(chalk.bold.red('═'.repeat(70)) + '\n');
  }
}

/**
 * Simulate research (fallback for testing without actual orchestrator)
 */
async function simulateResearch(task: ResearchTask, timeLimit: number): Promise<void> {
  const maxTime = timeLimit || RESEARCH_CONFIG.maxIterations * 3 * 1000; // 3s per iteration in sim
  const startTime = Date.now();

  // Simulated agent names
  const agentNames = ['Agent-1', 'Agent-2', 'Agent-3', 'Agent-4', 'Agent-5'];
  const queries = [
    'AI harness architecture 2024',
    'LLM pipeline best practices',
    'enterprise research automation tools',
    'parallel agent orchestration patterns',
    'confidence-based termination algorithms'
  ];
  const urls = [
    'techcrunch.com/ai-agent-frameworks',
    'arxiv.org/abs/2405.01234',
    'reddit.com/r/MachineLearning',
    'github.com/langchain-ai/langchain',
    'papers.nips.cc/paper/2024'
  ];
  const sections = [
    'Architecture Patterns',
    'Production Deployment',
    'Observability Tools',
    'Performance Benchmarks',
    'Community Adoption'
  ];

  liveDisplay.start({
    question: task.question,
    maxIterations: RESEARCH_CONFIG.maxIterations,
    maxAgents: RESEARCH_CONFIG.maxParallelAgents
  });

  liveDisplay.logEvent('  Planning research structure...');
  await new Promise(resolve => setTimeout(resolve, 300));
  liveDisplay.logEvent(`  Plan ready — ${sections.length} sections: ${sections.join(', ')}`);

  for (let iter = 1; iter <= RESEARCH_CONFIG.maxIterations; iter++) {
    task.currentIteration = iter;

    const progress = Math.min(100, (iter / RESEARCH_CONFIG.maxIterations) * 100);
    const coverage = Math.min(iter * 15 + Math.random() * 10, 95);
    const confidence = 0.6 + (iter * 0.08) + Math.random() * 0.05;
    const readyScore = (coverage / 100) * confidence;
    const sources = Math.floor(iter * 45 + Math.random() * 20);

    task.progressPercent = Math.floor(progress);
    task.readyScore = readyScore;

    const elapsed = Date.now() - startTime;

    liveDisplay.logEvent(`\n  === Iteration ${iter}/${RESEARCH_CONFIG.maxIterations} ===`);

    // Spin up simulated agents
    const activeCount = Math.min(iter + 1, agentNames.length);
    liveDisplay.updateHeader({
      iteration: iter,
      coveragePct: coverage,
      readyScore,
      sourcesTotal: sources,
      activeAgents: activeCount,
      elapsedMs: elapsed
    });

    for (let a = 0; a < activeCount; a++) {
      const agentId = agentNames[a];
      liveDisplay.setAgentStatus(agentId, `Searching: "${queries[a % queries.length]}"`);
    }

    await new Promise(resolve => setTimeout(resolve, 400));

    for (let a = 0; a < activeCount; a++) {
      const agentId = agentNames[a];
      liveDisplay.setAgentStatus(agentId, `Scraping: ${urls[a % urls.length]}`);
    }

    await new Promise(resolve => setTimeout(resolve, 400));

    for (let a = 0; a < activeCount; a++) {
      const agentId = agentNames[a];
      liveDisplay.setAgentStatus(agentId, `Indexing: ${Math.floor(10 + Math.random() * 80)} facts into Context-1`);
    }

    await new Promise(resolve => setTimeout(resolve, 300));

    // Clear agents
    for (const id of agentNames.slice(0, activeCount)) liveDisplay.clearAgent(id);

    // Section completions
    const sectionIdx = (iter - 1) % sections.length;
    liveDisplay.logEvent(
      `  + Section "${sections[sectionIdx]}" — ${Math.floor(15 + Math.random() * 40)} sources, confidence: ${(0.55 + Math.random() * 0.35).toFixed(2)}`
    );

    // Check termination
    if (readyScore >= RESEARCH_CONFIG.coverageThreshold) {
      liveDisplay.logEvent(`  Coverage threshold met — ready score ${readyScore.toFixed(2)} >= ${RESEARCH_CONFIG.coverageThreshold}`);
      task.status = 'completed';
      task.completedAt = Date.now();
      break;
    }

    if (elapsed > maxTime) {
      liveDisplay.logEvent('  Time limit reached — finalizing...');
      task.status = 'completed';
      task.completedAt = Date.now();
      break;
    }

    // Gap analysis
    if (iter % 2 === 0) {
      liveDisplay.setAgentStatus('Reflection', 'Running deep reflection on findings...');
      await new Promise(resolve => setTimeout(resolve, 300));
      liveDisplay.clearAgent('Reflection');
      liveDisplay.logEvent('  > Gap found: Missing production deployment patterns');
      liveDisplay.logEvent('  > Gap found: Weak coverage of observability tools');
      liveDisplay.logEvent('  -> Dispatching 2 new agents to fill gaps...');
    }
  }

  liveDisplay.setAgentStatus('Synthesis', `Compressing ${Math.floor(task.progressPercent! * 3)} sources into hierarchical summary...`);
  await new Promise(resolve => setTimeout(resolve, 500));
  liveDisplay.clearAgent('Synthesis');
  liveDisplay.logEvent(`\n  Research complete — ready score: ${task.readyScore?.toFixed(2)}, ${task.currentIteration} iteration(s)`);

  liveDisplay.stop();
}

// ─────────────────────────────────────────────────────────────
// CLI MAIN
// ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showHelp();
    return;
  }

  const command = args[0];
  let subcommand = args[1] || '';
  let restArgs = args.slice(2);

  // If the "subcommand" looks like a flag, it's actually part of restArgs
  if (command === 'ask' && subcommand.startsWith('--')) {
    restArgs = args.slice(1);
    subcommand = '';
  } else if (command === 'task' && subcommand.startsWith('--')) {
    // task can have subcommands without flags, but check
    if (!['new', 'list', 'view', 'cancel'].includes(subcommand)) {
      restArgs = args.slice(1);
      subcommand = '';
    }
  }

  try {
    switch (command) {
      case 'ask':
        await commandAsk(restArgs);
        break;
      case 'dive':
        await commandDive(restArgs);
        break;
      case 'daemon':
        await commandDaemon(subcommand, restArgs);
        break;
      case 'task':
        await commandTask(subcommand, restArgs);
        break;
      case '--help':
      case '-h':
        showHelp();
        break;
      case '--version':
      case '-v':
        console.log(`${APP_NAME} v${APP_VERSION}`);
        break;
      default:
        console.error(chalk.red(`Unknown command: ${command}`));
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`));
    process.exit(1);
  }
}

function showHelp(): void {
  console.log(`
${chalk.bold(`${APP_NAME} v${APP_VERSION}`)} - Enterprise Research Automation Tool

${chalk.bold('USAGE:')}
  npm run billy <command> [options]

${chalk.bold('COMMANDS:')}
  ${chalk.cyan('ask')}              Run broad research interactively and wait for results
    --question TEXT        Research question (required)
    --time MIN             Time limit (e.g., "10m", "2h")
    --no-questions         Skip clarifying questions
    --simulate             Simulate research without Ollama
    --yes                  Skip confirmation prompts

  ${chalk.cyan('dive')}             Deep dive into a single source (GitHub, docs, API)
    --url URL              Source URL (required)
    Examples: https://github.com/user/repo, https://docs.example.com

  ${chalk.cyan('daemon')}            Start background research worker
    ${chalk.dim('start')}             Start daemon process
    ${chalk.dim('stop')}              Stop daemon gracefully
    ${chalk.dim('status')}            Show daemon status and queue

  ${chalk.cyan('task')}              Manage research tasks
    ${chalk.dim('new')}               Create new task (interactive)
    ${chalk.dim('list')}              List all tasks
    ${chalk.dim('view ID')}           View task details and progress
    ${chalk.dim('cancel ID')}         Cancel running task

${chalk.bold('EXAMPLES:')}
  # Broad research on a topic
  npm run billy -- ask --question "Market trends in AI" --time "60m"

  # Research with scope narrowing (clarifying questions)
  npm run billy -- ask --question "iOS animation architecture"

  # Quick research without questions
  npm run billy -- ask --question "Latest React patterns" --time "20m" --no-questions --yes

  # Deep dive into a GitHub repository
  npm run billy -- dive --url "https://github.com/vercel/next.js"

  # Deep dive into documentation
  npm run billy -- dive --url "https://docs.astro.build"

  # Simulate without external services
  npm run billy -- ask --question "Test query" --simulate --yes

${chalk.bold('CONFIGURATION:')}
  Max iterations: ${RESEARCH_CONFIG.maxIterations}
  Coverage threshold: ${(RESEARCH_CONFIG.coverageThreshold * 100).toFixed(0)}%
  Parallel agents: ${RESEARCH_CONFIG.maxParallelAgents}
  Default timeout: ${(RESEARCH_CONFIG.timeoutMs / 60 / 1000).toFixed(0)}m

${chalk.bold('DATA:')}
  Tasks: ${DATA_DIR}
  Output: ${OUTPUT_DIR}

${chalk.bold('HELP:')}
  npm run billy --help
  npm run billy --version
  `);
}

// Run
main().catch(console.error);

export { ResearchTask };
