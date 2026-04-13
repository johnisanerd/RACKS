#!/usr/bin/env node
/**
 * RACKS CLI — Research Agent with Checkpoints and Streaming
 *
 * Usage:
 *   racks ask --question "..." [--time "2h"] [--depth "extended"]
 *   racks dive --url "https://github.com/..."
 *   racks resume --task-id "abc123"
 *   racks list-tasks
 */
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import { createLogger } from '../utils/logger.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const log = createLogger('racks-cli');
// Read version from package.json
function getVersion() {
    try {
        const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'));
        return packageJson.version || '0.0.1';
    }
    catch {
        return '0.0.1';
    }
}
/**
 * Display help message
 */
function showHelp() {
    const version = getVersion();
    console.log(chalk.bold.cyan(`\n╔════════════════════════════════════════════╗`));
    console.log(chalk.bold.cyan(`║         RACKS v${version} — Deep Research Agent       ║`));
    console.log(chalk.bold.cyan(`╚════════════════════════════════════════════╝\n`));
    console.log(chalk.yellow('USAGE:'));
    console.log('  racks <command> [options]\n');
    console.log(chalk.yellow('COMMANDS:'));
    console.log('  ask            Broad research on a topic');
    console.log('  ask-file       Research from a markdown document');
    console.log('  dive           Deep dive into a single source');
    console.log('  query          Ask follow-up questions about research');
    console.log('  resume         Resume a paused research session');
    console.log('  list-tasks     Show all research tasks');
    console.log('  brand-research Deep brand research (1000+ sources)\n');
    console.log(chalk.yellow('EXAMPLES:'));
    console.log('  racks ask --question "trends in AI safety" --time "2h"');
    console.log('  racks ask-file research-brief.md');
    console.log('  racks dive --url "https://github.com/anthropics/anthropic-sdk-python"');
    console.log('  racks query task-abc123 "What are the top 3 trends?"');
    console.log('  racks resume --task-id "task-abc123" --time "30m"');
    console.log('  racks list-tasks');
    console.log('  racks brand-research --brand "Based" --niche "social-commerce" --depth maximum\n');
    console.log(chalk.gray('For help on a command: racks <command> --help\n'));
}
/**
 * Display version
 */
function showVersion() {
    const version = getVersion();
    console.log(`RACKS v${version}`);
}
/**
 * Main CLI entry point
 */
async function main() {
    const args = process.argv.slice(2);
    // Handle no arguments
    if (args.length === 0) {
        showHelp();
        process.exit(0);
    }
    const command = args[0];
    try {
        switch (command) {
            case 'ask': {
                const { commandAsk } = await import('./commands/ask.js');
                await commandAsk(args.slice(1));
                break;
            }
            case 'ask-file': {
                const { commandAskFile } = await import('./commands/askFile.js');
                await commandAskFile(args.slice(1));
                break;
            }
            case 'dive': {
                const { commandDive } = await import('./commands/dive.js');
                await commandDive(args.slice(1));
                break;
            }
            case 'query': {
                const { commandQuery } = await import('./commands/query.js');
                await commandQuery(args.slice(1));
                break;
            }
            case 'resume': {
                const { commandResume } = await import('./commands/resume.js');
                await commandResume(args.slice(1));
                break;
            }
            case 'list-tasks': {
                const { commandListTasks } = await import('./commands/listTasks.js');
                await commandListTasks(args.slice(1));
                break;
            }
            case '--help':
            case '-h':
            case 'help': {
                showHelp();
                break;
            }
            case '--version':
            case '-v':
            case 'version': {
                showVersion();
                break;
            }
            default: {
                console.error(chalk.red(`✗ Unknown command: ${command}`));
                showHelp();
                process.exit(1);
            }
        }
    }
    catch (error) {
        log.error('CLI error:', error);
        console.error(chalk.red(`\n✗ Error: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
    }
}
// Run CLI
main().catch(err => {
    console.error(chalk.red('Fatal error:'), err);
    process.exit(1);
});
//# sourceMappingURL=index.js.map