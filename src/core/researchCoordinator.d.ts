/**
 * Research Coordinator — Manages Parallel Web + Visual Research
 *
 * Orchestrates:
 * 1. Web Research (Wayfarer) — SearXNG + Playwright text scraping
 * 2. Visual Research (Browser Operator) — UI-TARS screenshot + vision analysis
 * 3. Parallel execution of both streams
 * 4. Deduplication across sources
 * 5. Fact synthesis + quality ranking
 *
 * Flow:
 * Query → [Web Researcher (Wayfarer) + Visual Researcher (Browser Op)] → Merged Findings
 */
export interface ResearchQuery {
    query: string;
    section: string;
    platforms: Array<'web' | 'tiktok' | 'amazon' | 'facebook' | 'trustpilot'>;
    depth: 'quick' | 'normal' | 'deep';
}
export interface MergedFindings {
    query: string;
    section: string;
    webFindings: WebFinding[];
    visualFindings: VisualFinding[];
    deduplicatedFacts: DedupFact[];
    confidence: number;
    sources: Map<string, number>;
    executionTime: number;
}
export interface WebFinding {
    id: string;
    content: string;
    source: string;
    url: string;
    platform: 'web';
    confidence: number;
    metadata: Record<string, any>;
}
export interface VisualFinding {
    id: string;
    content: string;
    source: string;
    platform: 'tiktok' | 'amazon' | 'trustpilot' | 'facebook';
    confidence: number;
    metadata: Record<string, any>;
}
export interface DedupFact {
    id: string;
    fact: string;
    sourceCount: number;
    sources: Array<{
        platform: string;
        url?: string;
    }>;
    confidence: number;
}
/**
 * Execute research on query across web + selected visual platforms
 * Returns deduplicated, ranked findings
 */
export declare function coordinateResearch(query: ResearchQuery, abortSignal?: AbortSignal): Promise<MergedFindings>;
/**
 * Quality score for findings (for ranking)
 * Higher score = more reliable
 */
export declare function calculateQualityScore(fact: DedupFact): number;
/**
 * Format findings for display/synthesis
 */
export declare function formatMergedFindings(findings: MergedFindings): string;
//# sourceMappingURL=researchCoordinator.d.ts.map