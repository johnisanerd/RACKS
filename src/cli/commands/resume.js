/**
 * Command: racks resume
 *
 * Resume a paused or crashed research session from checkpoint.
 * Usage: racks resume --task-id "task-abc123" [--time "30m"]
 */
import chalk from 'chalk';
import { createLogger } from '../../utils/logger.js';
import { createTaskQueue } from '../../core/taskQueue.js';
import { DeepResearchOrchestrator } from '../../core/orchestrator.js';
const log = createLogger('command-resume');
const taskQueue = createTaskQueue();
/**
 * Parse command-line arguments for resume command
 */
function parseArgs(args) {
    const options = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if ((arg === '--task-id' || arg === '--id') && i + 1 < args.length) {
            options.taskId = args[++i];
        }
        else if (arg === '--time' && i + 1 < args.length) {
            options.time = args[++i];
        }
        else if (arg === '--help' || arg === '-h') {
            options.help = true;
        }
    }
    return options;
}
/**
 * Show help for resume command
 */
function showHelp() {
    console.log(chalk.bold.yellow('\nracks resume — Resume a paused research session\n'));
    console.log(chalk.gray('USAGE:'));
    console.log('  racks resume --task-id <id> [--time <duration>]\n');
    console.log(chalk.gray('OPTIONS:'));
    console.log('  --task-id <id>, --id <id>  Task ID to resume (required)');
    console.log('  --time <duration>           Additional time budget (e.g., "30m", "1h")');
    console.log('  --help, -h                  Show this help\n');
    console.log(chalk.gray('EXAMPLES:'));
    console.log('  racks resume --task-id "task-abc123"');
    console.log('  racks resume --id "task-abc123" --time "30m"\n');
}
/**
 * Parse time string to milliseconds
 */
function parseTimeToMs(time) {
    const match = time.match(/^(\d+)([smh])$/);
    if (!match)
        return 3600000; // default 1h
    const [, amount, unit] = match;
    const num = parseInt(amount, 10);
    switch (unit) {
        case 's':
            return num * 1000;
        case 'm':
            return num * 60 * 1000;
        case 'h':
            return num * 60 * 60 * 1000;
        default:
            return 3600000;
    }
}
/**
 * Execute resume command
 */
export async function commandResume(args) {
    const options = parseArgs(args);
    if (options.help) {
        showHelp();
        return;
    }
    if (!options.taskId) {
        console.error(chalk.red('✗ Error: --task-id is required'));
        showHelp();
        process.exit(1);
    }
    try {
        const additionalTime = options.time ? parseTimeToMs(options.time) : undefined;
        console.log(chalk.blue(`\n📋 Loading checkpoint for task ${options.taskId}...\n`));
        const task = taskQueue.getTask(options.taskId);
        if (!task) {
            console.error(chalk.red(`✗ Task not found: ${options.taskId}`));
            process.exit(1);
        }
        if (task.status === 'completed') {
            console.error(chalk.red(`✗ Task already completed`));
            if (task.reportPath) {
                console.log(chalk.gray(`  Report: ${task.reportPath}`));
            }
            process.exit(1);
        }
        if (task.status === 'failed') {
            console.error(chalk.red(`✗ Task failed: ${task.errorMessage || 'Unknown error'}`));
            process.exit(1);
        }
        if (!task.checkpoint) {
            console.error(chalk.red(`✗ No checkpoint available for task ${options.taskId}`));
            process.exit(1);
        }
        // Restore from checkpoint
        let checkpointData;
        try {
            checkpointData = JSON.parse(task.checkpoint.findings);
        }
        catch (e) {
            console.error(chalk.red(`✗ Failed to parse checkpoint data: ${e instanceof Error ? e.message : String(e)}`));
            process.exit(1);
        }
        const resumeIteration = task.checkpoint.iteration || 0;
        console.log(chalk.green(`✓ Checkpoint found at iteration ${resumeIteration}`));
        console.log(`📊 Current state: ${task.coverage || 0}% coverage, ${Math.round(task.confidence || 0)}% confidence\n`);
        // Re-run orchestrator with resume flag
        const config = {
            question: task.question,
            timeLimit: additionalTime || (task.timeoutMs || 3600000),
            depthLevel: 'nr', // Can be overridden per task type if needed
            resumeFromCheckpoint: {
                iteration: resumeIteration,
                findings: checkpointData
            }
        };
        console.log(chalk.cyan(`🔄 Resuming research from iteration ${resumeIteration}...`));
        console.log(`⏱️  Time budget: ${Math.round((config.timeLimit || 0) / 60000)} minutes\n`);
        // Update task status to running
        taskQueue.setStatus(options.taskId, 'running');
        // Create orchestrator instance and run research
        const orchestrator = new DeepResearchOrchestrator();
        // Orchestrate the research with the loaded task
        const state = await orchestrator.orchestrate(task);
        // Synthesize results
        const result = await orchestrator.synthesize(state, options.taskId);
        // Update task as completed
        taskQueue.setStatus(options.taskId, 'completed');
        console.log(chalk.green(`\n✓ Research completed!`));
        console.log(`📄 Results generated`);
        console.log('');
        taskQueue.close();
    }
    catch (error) {
        log.error('Resume failed:', error);
        console.error(chalk.red(`\n✗ Resume failed: ${error instanceof Error ? error.message : String(error)}`));
        taskQueue.close();
        process.exit(1);
    }
}
//# sourceMappingURL=resume.js.map