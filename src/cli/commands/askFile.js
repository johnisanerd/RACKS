/**
 * Command: racks ask-file
 *
 * Research from a markdown document containing questions, constraints, and resource URLs.
 * Usage: racks ask-file <path/to/document.md>
 *
 * Document format:
 * # Research Brief
 *
 * ## Question
 * What are the latest trends in AI safety?
 *
 * ## Sub-questions
 * - What are the main challenges?
 * - Which organizations are leading?
 *
 * ## Constraints
 * Time: 60m
 * Depth: extended
 * MinConfidence: 0.7
 *
 * ## Resources
 * https://arxiv.org/...
 * https://github.com/...
 */
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../../utils/logger.js';
import { commandAsk } from './ask.js';
const log = createLogger('command-ask-file');
/**
 * Parse command-line arguments for ask-file command
 */
function parseArgs(args) {
    const options = {};
    const positional = [];
    for (let i = 0; i < args.length; i++) {
        const arg = args[i];
        if (arg === '--file' && i + 1 < args.length) {
            options.filePath = args[++i];
        }
        else if (arg === '--help' || arg === '-h') {
            options.help = true;
        }
        else if (!arg.startsWith('--')) {
            positional.push(arg);
        }
    }
    if (positional.length >= 1 && !options.filePath) {
        options.filePath = positional[0];
    }
    return options;
}
/**
 * Show help for ask-file command
 */
function showHelp() {
    console.log(chalk.bold.yellow('\nracks ask-file — Research from a markdown document\n'));
    console.log(chalk.gray('USAGE:'));
    console.log('  racks ask-file <document.md>\n');
    console.log(chalk.gray('DOCUMENT FORMAT:'));
    console.log('  # Research Brief');
    console.log('');
    console.log('  ## Question');
    console.log('  Your main research question here');
    console.log('');
    console.log('  ## Sub-questions (optional)');
    console.log('  - Sub question 1');
    console.log('  - Sub question 2');
    console.log('');
    console.log('  ## Constraints (optional)');
    console.log('  Time: 60m');
    console.log('  Depth: extended');
    console.log('  Confidence: 0.8');
    console.log('');
    console.log('  ## Resources (optional)');
    console.log('  https://example.com');
    console.log('  https://github.com/...\n');
    console.log(chalk.gray('EXAMPLES:'));
    console.log('  racks ask-file research-brief.md');
    console.log('  racks ask-file --file brief.md\n');
}
/**
 * Parse markdown document for research prompt
 */
function parsePrompt(content) {
    const result = {
        mainQuestion: '',
        subQuestions: [],
        constraints: {},
        resources: {
            youtubeUrls: [],
            githubRepos: [],
            customUrls: [],
            arxivPapers: []
        }
    };
    // Split into sections
    const sections = {};
    let currentSection = '';
    const lines = content.split('\n');
    for (const line of lines) {
        const headingMatch = line.match(/^##\s+(.+)$/);
        if (headingMatch) {
            currentSection = headingMatch[1].toLowerCase().trim();
            sections[currentSection] = '';
        }
        else if (currentSection) {
            sections[currentSection] += line + '\n';
        }
    }
    // Parse Question section
    if (sections.question) {
        result.mainQuestion = sections.question
            .split('\n')
            .filter(l => l.trim())
            .join(' ')
            .trim();
    }
    // Parse Sub-questions
    if (sections['sub-questions'] || sections.subquestions) {
        const subSection = sections['sub-questions'] || sections.subquestions;
        const subLines = subSection.split('\n').filter(l => l.trim().startsWith('-'));
        result.subQuestions = subLines.map(line => line.replace(/^[-*]\s*/, '').trim());
    }
    // Parse Constraints
    if (sections.constraints) {
        const constraintLines = sections.constraints.split('\n');
        for (const line of constraintLines) {
            const match = line.match(/^\s*(\w+):\s*(.+)$/);
            if (match) {
                const [, key, value] = match;
                const keyLower = key.toLowerCase();
                if (keyLower === 'time') {
                    result.constraints.timeLimit = value.trim();
                }
                else if (keyLower === 'depth') {
                    result.constraints.depthLevel = value.trim();
                }
                else if (keyLower === 'confidence' || keyLower === 'minconfidence') {
                    result.constraints.confidenceThreshold = parseFloat(value);
                }
            }
        }
    }
    // Parse Resources
    if (sections.resources) {
        const resourceLines = sections.resources.split('\n').filter(l => l.trim());
        for (const line of resourceLines) {
            const url = line.replace(/^[-*]\s*/, '').trim();
            if (url.startsWith('http')) {
                if (url.includes('youtube.com') || url.includes('youtu.be')) {
                    result.resources.youtubeUrls.push(url);
                }
                else if (url.includes('github.com')) {
                    result.resources.githubRepos.push(url);
                }
                else if (url.includes('arxiv.org')) {
                    result.resources.arxivPapers.push(url);
                }
                else {
                    result.resources.customUrls.push(url);
                }
            }
        }
    }
    return result;
}
/**
 * Validate parsed prompt
 */
function validateParsedPrompt(parsed) {
    const errors = [];
    if (!parsed.mainQuestion || parsed.mainQuestion.length < 5) {
        errors.push('Question must be at least 5 characters long');
    }
    if (parsed.constraints.depthLevel) {
        const validDepths = ['sq', 'qk', 'nr', 'ex', 'mx'];
        if (!validDepths.includes(parsed.constraints.depthLevel.toLowerCase())) {
            errors.push(`Depth must be one of: ${validDepths.join(', ')}`);
        }
    }
    if (parsed.constraints.confidenceThreshold) {
        if (parsed.constraints.confidenceThreshold < 0 || parsed.constraints.confidenceThreshold > 1) {
            errors.push('Confidence must be between 0 and 1');
        }
    }
    return {
        valid: errors.length === 0,
        errors
    };
}
/**
 * Execute ask-file command
 */
export async function commandAskFile(args) {
    const options = parseArgs(args);
    if (options.help) {
        showHelp();
        return;
    }
    if (!options.filePath) {
        console.error(chalk.red('✗ Error: file path is required'));
        showHelp();
        process.exit(1);
    }
    try {
        const absolutePath = path.resolve(options.filePath);
        console.log(chalk.blue(`\n📄 Parsing document: ${absolutePath}\n`));
        // Check file exists
        if (!fs.existsSync(absolutePath)) {
            console.error(chalk.red(`✗ File not found: ${absolutePath}`));
            process.exit(1);
        }
        // Read file
        const content = fs.readFileSync(absolutePath, 'utf-8');
        // Parse document
        const parsed = parsePrompt(content);
        // Validate
        const validation = validateParsedPrompt(parsed);
        if (!validation.valid) {
            console.error(chalk.red('✗ Document validation failed:'));
            validation.errors.forEach(err => console.error(chalk.red(`  • ${err}`)));
            process.exit(1);
        }
        console.log(chalk.green('✓ Document parsed successfully\n'));
        console.log(chalk.bold(`❓ Question: "${parsed.mainQuestion}"`));
        if (parsed.subQuestions.length > 0) {
            console.log(chalk.gray(`📌 Sub-questions: ${parsed.subQuestions.length}`));
            parsed.subQuestions.slice(0, 3).forEach(q => console.log(chalk.gray(`   • ${q}`)));
            if (parsed.subQuestions.length > 3) {
                console.log(chalk.gray(`   ... and ${parsed.subQuestions.length - 3} more`));
            }
        }
        if (Object.keys(parsed.constraints).length > 0) {
            console.log(chalk.gray('⚙️  Constraints:'));
            if (parsed.constraints.timeLimit)
                console.log(chalk.gray(`   • Time: ${parsed.constraints.timeLimit}`));
            if (parsed.constraints.depthLevel)
                console.log(chalk.gray(`   • Depth: ${parsed.constraints.depthLevel}`));
            if (parsed.constraints.confidenceThreshold)
                console.log(chalk.gray(`   • Confidence: ${Math.round(parsed.constraints.confidenceThreshold * 100)}%`));
        }
        if (parsed.resources.youtubeUrls.length > 0) {
            console.log(chalk.gray(`▶️  YouTube videos: ${parsed.resources.youtubeUrls.length}`));
        }
        if (parsed.resources.githubRepos.length > 0) {
            console.log(chalk.gray(`🐙 GitHub repos: ${parsed.resources.githubRepos.length}`));
        }
        if (parsed.resources.arxivPapers.length > 0) {
            console.log(chalk.gray(`📑 ArXiv papers: ${parsed.resources.arxivPapers.length}`));
        }
        if (parsed.resources.customUrls.length > 0) {
            console.log(chalk.gray(`🔗 Custom URLs: ${parsed.resources.customUrls.length}`));
        }
        console.log(chalk.cyan(`\n🔄 Starting research...\n`));
        // Convert to ask command args
        const askArgs = [
            '--question',
            parsed.mainQuestion,
            '--time',
            parsed.constraints.timeLimit || '90m',
            '--depth',
            parsed.constraints.depthLevel || 'nr'
        ];
        // Delegate to ask command
        await commandAsk(askArgs);
    }
    catch (error) {
        log.error('Ask file failed:', error);
        console.error(chalk.red(`\n✗ Error: ${error instanceof Error ? error.message : String(error)}`));
        process.exit(1);
    }
}
//# sourceMappingURL=askFile.js.map