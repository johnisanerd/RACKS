/**
 * Search Query Optimizer for Deep Brand Research
 *
 * Generates highly targeted search queries for brand research across all platforms.
 * Focuses on precision and source diversity (not just volume).
 */
export interface OptimizedQuerySet {
    platform: 'tiktok' | 'instagram' | 'youtube' | 'reddit' | 'twitter' | 'general' | 'news' | 'reviews';
    queries: string[];
    purpose: string;
    estimatedSources: number;
}
export interface BrandQueryStrategy {
    brand: string;
    niche?: string;
    competitors?: string[];
    queries: OptimizedQuerySet[];
    totalEstimatedQueries: number;
    totalEstimatedSources: number;
}
/**
 * Generate a comprehensive search query strategy for a brand.
 * Returns queries optimized for all platforms to achieve 1000+ sources.
 */
export declare function generateBrandSearchStrategy(brand: string, niche?: string, competitors?: string[]): BrandQueryStrategy;
/**
 * Flatten the strategy into a simple query list for execution.
 */
export declare function flattenBrandSearchStrategy(strategy: BrandQueryStrategy): string[];
/**
 * Get queries for a specific platform only.
 */
export declare function getQueriesByPlatform(strategy: BrandQueryStrategy, platform: OptimizedQuerySet['platform']): string[];
/**
 * Batch queries into groups of N for parallel execution.
 */
export declare function batchQueries(strategy: BrandQueryStrategy, batchSize?: number): string[][];
/**
 * Track source diversity across platforms.
 * Used by reflection agent to detect over-reliance on single sources.
 */
export interface SourceDiversityTracker {
    total: number;
    byPlatform: Record<string, number>;
    byCategory: Record<string, number>;
    diversityScore: number;
    gapAnalysis: string[];
}
export declare function analyzeSourceDiversity(sources: Array<{
    url: string;
    platform?: string;
    category?: string;
}>): SourceDiversityTracker;
declare const _default: {
    generateBrandSearchStrategy: typeof generateBrandSearchStrategy;
    flattenBrandSearchStrategy: typeof flattenBrandSearchStrategy;
    getQueriesByPlatform: typeof getQueriesByPlatform;
    batchQueries: typeof batchQueries;
    analyzeSourceDiversity: typeof analyzeSourceDiversity;
};
export default _default;
//# sourceMappingURL=searchQueryOptimizer.d.ts.map