/**
 * Command: racks list-tasks
 *
 * List all research tasks and their status.
 * Usage: racks list-tasks
 */
import chalk from 'chalk';
import { createLogger } from '../../utils/logger.js';
const log = createLogger('command-list-tasks');
/**
 * Parse command-line arguments for list-tasks command
 */
function parseArgs(args) {
    const options = {};
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--help' || arg === '-h') {
            options.help = true;
        }
    }
    return options;
}
/**
 * Show help for list-tasks command
 */
function showHelp() {
    console.log(chalk.bold.yellow('\nracks list-tasks — List all research tasks\n'));
    console.log(chalk.gray('USAGE:'));
    console.log('  racks list-tasks [options]\n');
    console.log(chalk.gray('OPTIONS:'));
    console.log('  --help, -h  Show this help\n');
    console.log(chalk.gray('EXAMPLE:'));
    console.log('  racks list-tasks\n');
}
/**
 * Execute list-tasks command
 */
export async function commandListTasks(args) {
    const options = parseArgs(args);
    if (options.help) {
        showHelp();
        return;
    }
    log.info('Listing all tasks');
    // TODO: Implement task listing from database
    console.log(chalk.blue('\n📋 Research Tasks\n'));
    console.log(chalk.yellow('⚠️  Task persistence not yet implemented\n'));
    console.log(chalk.gray('No tasks found\n'));
}
//# sourceMappingURL=listTasks.js.map