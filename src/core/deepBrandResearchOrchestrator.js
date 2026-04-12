/**
 * Deep Brand Research Orchestrator
 *
 * Extends the core orchestrator to specialize in brand research with 1000+ sources.
 * Integrates the deep brand research template with optimized query generation.
 *
 * Usage:
 *   const orchestrator = new DeepBrandResearchOrchestrator({ brand: "Based", niche: "social-commerce" });
 *   const result = await orchestrator.research();
 */
import { DeepResearchOrchestrator } from './orchestrator.js';
import { generateDeepBrandResearchPlan, generateBrandSearchQueries, } from './templates/deepBrandResearch.js';
import { generateBrandSearchStrategy, flattenBrandSearchStrategy, analyzeSourceDiversity, batchQueries, } from '../utils/searchQueryOptimizer.js';
import { createLogger } from '../utils/logger.js';
import { liveDisplay } from '../utils/liveDisplay.js';
const log = createLogger('deepBrandResearchOrchestrator');
export const DEEP_BRAND_RESEARCH_CONFIG = {
    maxIterations: 100,
    sourcesPerSection: 1000, // Increased from default 500
    coverageThreshold: 0.85,
    maxParallelAgents: 15, // Increased from default 7
    timeoutMs: 60 * 60 * 1000, // 60 minutes
};
// ─────────────────────────────────────────────────────────────
// DEEP BRAND RESEARCH ORCHESTRATOR
// ─────────────────────────────────────────────────────────────
export class DeepBrandResearchOrchestrator extends DeepResearchOrchestrator {
    constructor(brandConfig) {
        // Merge brand config with deep research defaults
        const config = {
            ...DEEP_BRAND_RESEARCH_CONFIG,
            ...brandConfig,
        };
        super(config);
        this.sourceTracker = new Map();
        this.brandContext = {
            brand: brandConfig.brand,
            niche: brandConfig.niche,
            website: brandConfig.website,
            competitors: brandConfig.competitors,
            targetAudience: brandConfig.targetAudience,
        };
        log.info(`Initialized Deep Brand Research for: ${brandConfig.brand}${brandConfig.niche ? ` (${brandConfig.niche})` : ''}`);
    }
    /**
     * Initialize search strategy for the brand.
     * Generates 1000+ targeted queries across all platforms.
     */
    initializeSearchStrategy() {
        log.info(`Generating search strategy for ${this.brandContext.brand}...`);
        liveDisplay.setAgentStatus('Brand Research', 'Generating optimized search queries...');
        this.queryStrategy = generateBrandSearchStrategy(this.brandContext.brand, this.brandContext.niche, this.brandContext.competitors);
        liveDisplay.logEvent(`  Search strategy ready: ${this.queryStrategy.totalEstimatedQueries} queries across ${this.queryStrategy.queries.length} platforms. Estimated ${this.queryStrategy.totalEstimatedSources} sources.`);
        return this.queryStrategy;
    }
    /**
     * Get all search queries for the brand research.
     */
    getSearchQueries() {
        if (!this.queryStrategy) {
            this.initializeSearchStrategy();
        }
        return flattenBrandSearchStrategy(this.queryStrategy);
    }
    /**
     * Get queries for a specific research phase.
     */
    getPhaseQueries(phaseId) {
        return generateBrandSearchQueries(this.brandContext.brand, phaseId, this.brandContext.niche);
    }
    /**
     * Track a source for diversity analysis.
     */
    trackSource(phaseId, url, platform) {
        if (!this.sourceTracker.has(phaseId)) {
            this.sourceTracker.set(phaseId, []);
        }
        this.sourceTracker.get(phaseId).push({ url, platform });
    }
    /**
     * Analyze source diversity and identify gaps.
     */
    analyzeSourceDiversity(phaseId) {
        const phaseSources = this.sourceTracker.get(phaseId) || [];
        const diversity = analyzeSourceDiversity(phaseSources);
        return {
            score: diversity.diversityScore,
            gaps: diversity.gapAnalysis,
            breakdown: diversity.byPlatform,
        };
    }
    /**
     * Generate research plan for the brand.
     */
    generateResearchPlan() {
        log.info(`Generating deep brand research plan for ${this.brandContext.brand}...`);
        liveDisplay.setAgentStatus('Planner', 'Creating 8-phase deep brand research plan...');
        const plan = generateDeepBrandResearchPlan(this.brandContext.brand, this.brandContext.niche);
        liveDisplay.logEvent(`  Research plan ready: ${plan.sections.length} phases, targeting ${plan.totalEstimatedSources} sources`);
        return plan;
    }
    /**
     * Get batch-optimized queries for parallel execution.
     */
    getQueryBatches(batchSize = 5) {
        if (!this.queryStrategy) {
            this.initializeSearchStrategy();
        }
        return batchQueries(this.queryStrategy, batchSize);
    }
    /**
     * Get source diversity report.
     */
    getSourceDiversityReport() {
        const byPhase = {};
        let totalScore = 0;
        let phaseCount = 0;
        for (const [phaseId, sources] of this.sourceTracker.entries()) {
            const diversity = analyzeSourceDiversity(sources);
            byPhase[phaseId] = {
                score: diversity.diversityScore,
                gaps: diversity.gapAnalysis,
            };
            totalScore += diversity.diversityScore;
            phaseCount += 1;
        }
        const overallScore = phaseCount > 0 ? totalScore / phaseCount : 0;
        const recommendations = [];
        if (overallScore < 0.5)
            recommendations.push('Increase source diversity across platforms');
        if (Object.values(byPhase).some(p => p.gaps.some(g => g.includes('TikTok') || g.includes('Reddit')))) {
            recommendations.push('Focus on social media (TikTok, Reddit) for authentic voice');
        }
        if (Object.values(byPhase).some(p => p.gaps.some(g => g.includes('Review')))) {
            recommendations.push('Increase customer review sources (Trustpilot, Google, Amazon)');
        }
        return { overallScore, byPhase, recommendations };
    }
    /**
     * Get brand context information.
     */
    getBrandContext() {
        return this.brandContext;
    }
    /**
     * Format research summary.
     */
    getResearchSummary() {
        const diversity = this.getSourceDiversityReport();
        const phaseCount = this.sourceTracker.size;
        const totalSources = Array.from(this.sourceTracker.values()).reduce((sum, sources) => sum + sources.length, 0);
        return `
Deep Brand Research Summary
${'-'.repeat(50)}
Brand: ${this.brandContext.brand}${this.brandContext.niche ? ` (${this.brandContext.niche})` : ''}
Total Sources: ${totalSources}
Research Phases: ${phaseCount}
Source Diversity Score: ${(diversity.overallScore * 100).toFixed(1)}%
Query Batches: ${this.getQueryBatches().length}
Estimated Coverage: ${Math.min(totalSources / (this.queryStrategy?.totalEstimatedSources || 1), 1.0) * 100 | 0}%

${diversity.recommendations.length > 0 ? `Recommendations:\n${diversity.recommendations.map(r => `  • ${r}`).join('\n')}` : 'Research is well-balanced.'}
    `.trim();
    }
}
export default DeepBrandResearchOrchestrator;
//# sourceMappingURL=deepBrandResearchOrchestrator.js.map