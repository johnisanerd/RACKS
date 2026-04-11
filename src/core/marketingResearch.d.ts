/**
 * Marketing Research Orchestration
 *
 * Implements the 5-step marketing research workflow from the PDF:
 *
 * STEP 1: Brand & Product Analysis
 * STEP 2: Desire & Problem Mapping
 * STEP 3: Competitor & Market Research
 * STEP 4: Identity Markers Research      ← YouTube is EXPLICITLY needed here
 * STEP 5: Amazon Review Mining
 *
 * YouTube strategy: ONLY fetch when section specifically needs real customer voice
 * or identity group media consumption data. NOT for facts already well-covered.
 */
import type { ResearchSection } from './phases/planner.js';
export type MarketingSection = 'brand_analysis' | 'desire_mapping' | 'competitor_research' | 'identity_markers' | 'amazon_research';
export interface MarketingSectionConfig {
    id: MarketingSection;
    title: string;
    description: string;
    keyQuestions: string[];
    priority: 'high' | 'medium' | 'low';
    youtubeBehavior: YouTubeBehavior;
    primarySources: SourceType[];
    minFacts: number;
    minSourcedQuotes: number;
}
export type SourceType = 'brand_website' | 'amazon' | 'reddit' | 'competitor_sites' | 'youtube' | 'google' | 'social_media';
export interface YouTubeBehavior {
    when: 'always' | 'never' | 'gap_only';
    searchTemplate: string;
    purpose: string;
    maxVideos: number;
    requiredFor: string[];
}
export declare const MARKETING_SECTIONS: Record<MarketingSection, MarketingSectionConfig>;
/**
 * Generate a marketing research plan from the 5-step PDF workflow.
 * This replaces the generic LLM-generated plan for marketing research.
 */
export declare function generateMarketingPlan(question: string, brandUrl?: string, targetAudience?: string, focusSections?: MarketingSection[]): {
    sections: ResearchSection[];
    totalEstimatedSources: number;
    researchStrategy: string;
};
export interface YouTubeDecision {
    shouldFetch: boolean;
    reason: string;
    searchQuery: string;
    maxVideos: number;
    purpose: string;
}
/**
 * Decide if YouTube should be searched for a given section.
 * This is the core logic that prevents random/blind YouTube fetching.
 */
export declare function decideYouTube(sectionId: string, marketingSection: MarketingSection, findings: {
    facts: string[];
    confidence: number;
    sources: string[];
}): YouTubeDecision;
export interface SourcedFact {
    fact: string;
    sourceUrl: string;
    sourceTitle?: string;
    directQuote?: string;
    extractionMethod: 'direct_quote' | 'paraphrase' | 'inference';
    extractedAt: Date;
    section: MarketingSection;
    confidence: number;
}
/**
 * Format a sourced fact as a markdown citation.
 * Used in final report to ensure every claim is attributable.
 */
export declare function formatCitation(fact: SourcedFact, index: number): string;
//# sourceMappingURL=marketingResearch.d.ts.map