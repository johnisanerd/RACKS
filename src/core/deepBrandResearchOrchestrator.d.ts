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
import { DeepResearchOrchestrator, type ResearchConfig } from './orchestrator.js';
import { type DeepBrandResearchPhase, type BrandContext } from './templates/deepBrandResearch.js';
import { type BrandQueryStrategy } from '../utils/searchQueryOptimizer.js';
export interface BrandResearchConfig extends Partial<ResearchConfig> {
    brand: string;
    niche?: string;
    website?: string;
    competitors?: string[];
    targetAudience?: string;
    focusPhases?: DeepBrandResearchPhase[];
    targetSources?: number;
}
export declare const DEEP_BRAND_RESEARCH_CONFIG: ResearchConfig;
export declare class DeepBrandResearchOrchestrator extends DeepResearchOrchestrator {
    private brandContext;
    private queryStrategy?;
    private sourceTracker;
    constructor(brandConfig: BrandResearchConfig);
    /**
     * Initialize search strategy for the brand.
     * Generates 1000+ targeted queries across all platforms.
     */
    initializeSearchStrategy(): BrandQueryStrategy;
    /**
     * Get all search queries for the brand research.
     */
    getSearchQueries(): string[];
    /**
     * Get queries for a specific research phase.
     */
    getPhaseQueries(phaseId: DeepBrandResearchPhase): string[];
    /**
     * Track a source for diversity analysis.
     */
    trackSource(phaseId: string, url: string, platform?: string): void;
    /**
     * Analyze source diversity and identify gaps.
     */
    analyzeSourceDiversity(phaseId: string): {
        score: number;
        gaps: string[];
        breakdown: Record<string, number>;
    };
    /**
     * Generate research plan for the brand.
     */
    generateResearchPlan(): {
        sections: import("./orchestrator.js").ResearchSection[];
        totalEstimatedSources: number;
        researchStrategy: string;
        brandContext: BrandContext;
    };
    /**
     * Get batch-optimized queries for parallel execution.
     */
    getQueryBatches(batchSize?: number): string[][];
    /**
     * Get source diversity report.
     */
    getSourceDiversityReport(): {
        overallScore: number;
        byPhase: Record<string, {
            score: number;
            gaps: string[];
        }>;
        recommendations: string[];
    };
    /**
     * Get brand context information.
     */
    getBrandContext(): BrandContext;
    /**
     * Format research summary.
     */
    getResearchSummary(): string;
}
export default DeepBrandResearchOrchestrator;
//# sourceMappingURL=deepBrandResearchOrchestrator.d.ts.map