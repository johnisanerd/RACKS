/**
 * Deep Brand Research Template
 *
 * Comprehensive brand analysis with 1000+ sources across 8 research phases:
 * - Brand Fundamentals (150+ sources)
 * - Social Media & Internet Presence (200+ sources)
 * - Customer Sentiment & Reviews (150+ sources)
 * - Products & Features Deep-Dive (200+ sources)
 * - Partnerships & Collaborations (150+ sources)
 * - Niche & Market Position (150+ sources)
 * - History & Evolution (100+ sources)
 * - Internet Culture & Memes (100+ sources)
 *
 * Total target: 1000+ sources, 8 research phases
 */
import type { ResearchSection } from '../phases/planner.js';
export type DeepBrandResearchPhase = 'brand-basics' | 'social-media-presence' | 'customer-sentiment' | 'products-features' | 'partnerships' | 'niche-market' | 'history-timeline' | 'internet-culture';
export interface DeepBrandResearchConfig {
    id: DeepBrandResearchPhase;
    title: string;
    description: string;
    scope: 'core' | 'extended';
    priority: 'critical' | 'high' | 'medium';
    estimatedSources: number;
    keyQuestions: string[];
    searchQueryTemplates: string[];
}
export interface BrandContext {
    brand: string;
    niche?: string;
    website?: string;
    competitors?: string[];
    targetAudience?: string;
}
export declare const DEEP_BRAND_RESEARCH_PHASES: Record<DeepBrandResearchPhase, DeepBrandResearchConfig>;
/**
 * Generate a deep brand research plan targeting 1000+ sources.
 * Replaces generic LLM planning with structured 8-phase research.
 */
export declare function generateDeepBrandResearchPlan(brand: string, niche?: string, focusPhases?: DeepBrandResearchPhase[]): {
    sections: ResearchSection[];
    totalEstimatedSources: number;
    researchStrategy: string;
    brandContext: BrandContext;
};
/**
 * Generate optimized search queries specifically for brand research.
 * Focuses on finding the brand across all platforms with high precision.
 */
export declare function generateBrandSearchQueries(brand: string, phaseId: DeepBrandResearchPhase, niche?: string): string[];
/**
 * Calculate source diversity score (ensures we're not over-reliant on one platform).
 * Returns 0-1 where 1 is perfectly balanced across platforms.
 */
export declare function calculateSourceDiversity(sourceBreakdown: Record<string, number>): number;
/**
 * Identify source diversity gaps for a given research phase.
 * Used by reflection agent to determine if more research is needed.
 */
export declare function identifySourceGaps(phaseId: DeepBrandResearchPhase, sourceBreakdown: Record<string, number>): string[];
declare const _default: {
    DEEP_BRAND_RESEARCH_PHASES: Record<DeepBrandResearchPhase, DeepBrandResearchConfig>;
    generateDeepBrandResearchPlan: typeof generateDeepBrandResearchPlan;
    generateBrandSearchQueries: typeof generateBrandSearchQueries;
    calculateSourceDiversity: typeof calculateSourceDiversity;
    identifySourceGaps: typeof identifySourceGaps;
};
export default _default;
//# sourceMappingURL=deepBrandResearch.d.ts.map