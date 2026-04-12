/**
 * Brand Research Command
 *
 * CLI command for deep brand research targeting 1000+ sources.
 *
 * Usage:
 *   racks brand-research --brand "Based" --niche "social-commerce" --depth maximum
 */
import chalk from 'chalk';
import { createLogger } from '../../utils/logger.js';
import { liveDisplay } from '../../utils/liveDisplay.js';
import { DeepBrandResearchOrchestrator } from '../../core/deepBrandResearchOrchestrator.js';
const log = createLogger('command-brand-research');
export async function commandBrandResearch(args) {
    // Parse arguments manually (simple key=value parsing)
    const options = {};
    for (let i = 0; i < args.length; i++) {
        if (args[i].startsWith('--')) {
            const key = args[i].substring(2);
            const value = args[i + 1]?.startsWith('--') ? '' : args[++i];
            options[key] = value;
        }
    }
    const brandOptions = {
        brand: options['brand'],
        niche: options['niche'],
        website: options['website'],
        competitors: options['competitors'],
        audience: options['audience'],
        depth: options['depth'] || 'extended',
        targetSources: options['target-sources'],
        maxIterations: options['max-iterations'],
        exportPdf: options['export-pdf'],
        exportJson: options['export-json'],
        help: options['help'] !== undefined,
    };
    if (brandOptions.help) {
        console.log(chalk.yellow('racks brand-research - Deep brand research with 1000+ sources\n'));
        console.log(chalk.yellow('Usage:'));
        console.log('  racks brand-research --brand "Brand" [options]\n');
        console.log(chalk.yellow('Options:'));
        console.log('  --brand <name>              Brand name to research (required)');
        console.log('  --niche <category>          Market niche/category (optional)');
        console.log('  --website <url>             Brand website URL (optional)');
        console.log('  --competitors <list>        Comma-separated competitors (optional)');
        console.log('  --audience <description>    Target audience description (optional)');
        console.log('  --depth <level>             light|standard|extended|deep|maximum (default: extended)');
        console.log('  --target-sources <number>   Target source count (default: 1000)');
        console.log('  --max-iterations <number>   Max iterations (default: 100)');
        console.log('  --export-pdf <path>         Export PDF report (optional)');
        console.log('  --export-json <path>        Export JSON data (optional)');
        console.log('  --help                      Show this help\n');
        console.log(chalk.cyan('Example:'));
        console.log('  racks brand-research --brand "Based" --niche "social-commerce" --depth maximum\n');
        return;
    }
    try {
        await runBrandResearch(brandOptions);
    }
    catch (error) {
        log.error('Brand research failed:', error);
        liveDisplay.logEvent(chalk.red(`\n✗ Error: ${error}`));
        process.exit(1);
    }
}
async function runBrandResearch(options) {
    try {
        // ─────────────────────────────────────────────────────────────
        // VALIDATION
        // ─────────────────────────────────────────────────────────────
        if (!options.brand || options.brand.trim().length === 0) {
            log.error('Error: --brand is required');
            process.exit(1);
        }
        const brand = options.brand.trim();
        const niche = options.niche?.trim();
        const website = options.website?.trim();
        const competitors = options.competitors
            ? options.competitors.split(',').map(c => c.trim())
            : undefined;
        const audience = options.audience?.trim();
        const depthLevelMap = {
            light: 5,
            standard: 12,
            extended: 30,
            deep: 60,
            maximum: 100,
        };
        const maxIterations = Math.min(parseInt(options.maxIterations) || 100, depthLevelMap[options.depth] || 100);
        const targetSources = parseInt(options.targetSources) || 1000;
        // ─────────────────────────────────────────────────────────────
        // INITIALIZATION
        // ─────────────────────────────────────────────────────────────
        log.info(`Starting deep brand research for: ${brand}`);
        liveDisplay.logEvent(`\n${'='.repeat(60)}`);
        liveDisplay.logEvent(`DEEP BRAND RESEARCH: ${brand}${niche ? ` (${niche})` : ''}`);
        liveDisplay.logEvent(`${'='.repeat(60)}`);
        const orchestrator = new DeepBrandResearchOrchestrator({
            brand,
            niche,
            website,
            competitors,
            targetAudience: audience,
            maxIterations,
            sourcesPerSection: Math.ceil(targetSources / 8), // Distribute target across 8 phases
        });
        // ─────────────────────────────────────────────────────────────
        // RESEARCH PLAN
        // ─────────────────────────────────────────────────────────────
        liveDisplay.logEvent(`\n📋 Generating research plan...`);
        const plan = orchestrator.generateResearchPlan();
        liveDisplay.logEvent(`\n✓ Research Plan Ready:`);
        liveDisplay.logEvent(`  Phases: ${plan.sections.length}`);
        plan.sections.forEach((section, i) => {
            liveDisplay.logEvent(`    ${i + 1}. ${section.title} (${section.priority})`);
        });
        liveDisplay.logEvent(`  Total Estimated Sources: ${plan.totalEstimatedSources}`);
        // ─────────────────────────────────────────────────────────────
        // SEARCH STRATEGY
        // ─────────────────────────────────────────────────────────────
        liveDisplay.logEvent(`\n🔍 Initializing search strategy...`);
        const strategy = orchestrator.initializeSearchStrategy();
        liveDisplay.logEvent(`\n✓ Search Strategy Ready:`);
        liveDisplay.logEvent(`  Total Queries: ${strategy.totalEstimatedQueries}`);
        liveDisplay.logEvent(`  Platforms: ${strategy.queries.length}`);
        strategy.queries.forEach(qs => {
            liveDisplay.logEvent(`    • ${qs.platform.toUpperCase()}: ${qs.queries.length} queries, ~${qs.estimatedSources} sources`);
        });
        liveDisplay.logEvent(`  Estimated Sources: ${strategy.totalEstimatedSources}`);
        // ─────────────────────────────────────────────────────────────
        // RESEARCH EXECUTION
        // ─────────────────────────────────────────────────────────────
        liveDisplay.logEvent(`\n⚡ Starting research execution...`);
        liveDisplay.logEvent(`  Max Iterations: ${maxIterations}`);
        liveDisplay.logEvent(`  Target Sources: ${targetSources}`);
        liveDisplay.logEvent(`  Max Parallel Agents: 15`);
        liveDisplay.logEvent(`  Timeout: 60 minutes`);
        // Execute the full research orchestration
        liveDisplay.logEvent(`\n⏳ Executing full brand research orchestration...`);
        const researchTask = {
            id: `brand-${brand}-${Date.now()}`,
            name: `Brand Research: ${brand}`,
            question: `Deep research on brand: ${brand}${niche ? ` (${niche})` : ''}`,
            status: 'running',
            scheduleType: 'now',
            createdAt: Date.now(),
        };
        const researchState = await orchestrator.orchestrate(researchTask, (state) => {
            const totalSources = Array.from(state.findings.values())
                .reduce((sum, f) => sum + f.sources.length, 0);
            liveDisplay.logEvent(`  Iteration ${state.iteration}: Coverage ${state.coverage.toFixed(0)}%, ` +
                `Sources: ${totalSources}, Confidence: ${state.confidence.toFixed(2)}`);
        });
        liveDisplay.logEvent(`\n✓ Research execution complete!`);
        // ─────────────────────────────────────────────────────────────
        // RESEARCH SUMMARY
        // ─────────────────────────────────────────────────────────────
        liveDisplay.logEvent(`\n📊 Research Summary:`);
        const totalSources = Array.from(researchState.findings.values())
            .reduce((sum, f) => sum + f.sources.length, 0);
        const totalFacts = Array.from(researchState.findings.values())
            .reduce((sum, f) => sum + f.facts.length, 0);
        liveDisplay.logEvent(`Brand: ${brand}`);
        liveDisplay.logEvent(`Total Sources: ${totalSources}`);
        liveDisplay.logEvent(`Total Facts: ${totalFacts}`);
        liveDisplay.logEvent(`Coverage: ${researchState.coverage.toFixed(0)}%`);
        liveDisplay.logEvent(`Confidence: ${researchState.confidence.toFixed(2)}`);
        liveDisplay.logEvent(`Iterations: ${researchState.iteration}`);
        liveDisplay.logEvent(`Research Phases: ${researchState.plan.sections.length}`);
        // ─────────────────────────────────────────────────────────────
        // EXPORT OPTIONS
        // ─────────────────────────────────────────────────────────────
        if (options.exportPdf) {
            liveDisplay.logEvent(`\n💾 Exporting to PDF: ${options.exportPdf}`);
            liveDisplay.logEvent(`   ✓ PDF export ready (implementation pending)`);
        }
        if (options.exportJson) {
            liveDisplay.logEvent(`\n💾 Exporting to JSON: ${options.exportJson}`);
            liveDisplay.logEvent(`   ✓ JSON export ready (implementation pending)`);
        }
        // ─────────────────────────────────────────────────────────────
        // COMPLETION
        // ─────────────────────────────────────────────────────────────
        liveDisplay.logEvent(`\n✅ Deep brand research initialized successfully!`);
        liveDisplay.logEvent(`   Next: Run research execution (full orchestrator integration)`);
        log.info(`Brand research initialization complete for ${brand}`);
    }
    catch (error) {
        log.error(`Brand research failed: ${error}`);
        liveDisplay.logEvent(chalk.red(`\n✗ Error: ${error}`));
        throw error;
    }
}
//# sourceMappingURL=brandResearch.js.map