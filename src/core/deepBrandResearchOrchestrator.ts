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
import {
  generateDeepBrandResearchPlan,
  generateBrandSearchQueries,
  calculateSourceDiversity,
  identifySourceGaps,
  type DeepBrandResearchPhase,
  type BrandContext,
} from './templates/deepBrandResearch.js';
import {
  generateBrandSearchStrategy,
  flattenBrandSearchStrategy,
  analyzeSourceDiversity,
  batchQueries,
  type BrandQueryStrategy,
} from '../utils/searchQueryOptimizer.js';
import { createLogger } from '../utils/logger.js';
import { liveDisplay } from '../utils/liveDisplay.js';

const log = createLogger('deepBrandResearchOrchestrator');

// ─────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────

export interface BrandResearchConfig extends Partial<ResearchConfig> {
  brand: string;
  niche?: string;
  website?: string;
  competitors?: string[];
  targetAudience?: string;
  focusPhases?: DeepBrandResearchPhase[];
  targetSources?: number;
}

export const DEEP_BRAND_RESEARCH_CONFIG: ResearchConfig = {
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
  private brandContext: BrandContext;
  private queryStrategy?: BrandQueryStrategy;
  private sourceTracker: Map<string, Array<{ url: string; platform?: string }>> = new Map();

  constructor(brandConfig: BrandResearchConfig) {
    // Merge brand config with deep research defaults
    const config: ResearchConfig = {
      ...DEEP_BRAND_RESEARCH_CONFIG,
      ...brandConfig,
    };

    super(config);

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
  initializeSearchStrategy(): BrandQueryStrategy {
    log.info(`Generating search strategy for ${this.brandContext.brand}...`);
    liveDisplay.setAgentStatus('Brand Research', 'Generating optimized search queries...');

    this.queryStrategy = generateBrandSearchStrategy(
      this.brandContext.brand,
      this.brandContext.niche,
      this.brandContext.competitors
    );

    liveDisplay.logEvent(
      `  Search strategy ready: ${this.queryStrategy.totalEstimatedQueries} queries across ${this.queryStrategy.queries.length} platforms. Estimated ${this.queryStrategy.totalEstimatedSources} sources.`
    );

    return this.queryStrategy;
  }

  /**
   * Get all search queries for the brand research.
   */
  getSearchQueries(): string[] {
    if (!this.queryStrategy) {
      this.initializeSearchStrategy();
    }

    return flattenBrandSearchStrategy(this.queryStrategy!);
  }

  /**
   * Get queries for a specific research phase.
   */
  getPhaseQueries(phaseId: DeepBrandResearchPhase): string[] {
    return generateBrandSearchQueries(this.brandContext.brand, phaseId, this.brandContext.niche);
  }

  /**
   * Track a source for diversity analysis.
   */
  trackSource(phaseId: string, url: string, platform?: string): void {
    if (!this.sourceTracker.has(phaseId)) {
      this.sourceTracker.set(phaseId, []);
    }

    this.sourceTracker.get(phaseId)!.push({ url, platform });
  }

  /**
   * Analyze source diversity and identify gaps.
   */
  analyzeSourceDiversity(phaseId: string): {
    score: number;
    gaps: string[];
    breakdown: Record<string, number>;
  } {
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

    const plan = generateDeepBrandResearchPlan(
      this.brandContext.brand,
      this.brandContext.niche,
      // Optional: filter to specific phases if provided
    );

    liveDisplay.logEvent(
      `  Research plan ready: ${plan.sections.length} phases, targeting ${plan.totalEstimatedSources} sources`
    );

    return plan;
  }

  /**
   * Get batch-optimized queries for parallel execution.
   */
  getQueryBatches(batchSize: number = 5): string[][] {
    if (!this.queryStrategy) {
      this.initializeSearchStrategy();
    }

    return batchQueries(this.queryStrategy!, batchSize);
  }

  /**
   * Get source diversity report.
   */
  getSourceDiversityReport(): {
    overallScore: number;
    byPhase: Record<string, { score: number; gaps: string[] }>;
    recommendations: string[];
  } {
    const byPhase: Record<string, { score: number; gaps: string[] }> = {};
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

    const recommendations: string[] = [];
    if (overallScore < 0.5) recommendations.push('Increase source diversity across platforms');
    if (
      Object.values(byPhase).some(p =>
        p.gaps.some(g => g.includes('TikTok') || g.includes('Reddit'))
      )
    ) {
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
  getBrandContext(): BrandContext {
    return this.brandContext;
  }

  /**
   * Format research summary.
   */
  getResearchSummary(): string {
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
