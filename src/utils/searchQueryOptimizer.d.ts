/**
 * Generate a comprehensive search query strategy for a brand.
 * Returns queries optimized for all platforms to achieve 1000+ sources.
 */
export function generateBrandSearchStrategy(brand: any, niche: any, competitors: any): {
    brand: any;
    niche: any;
    competitors: any;
    queries: {
        platform: string;
        purpose: string;
        estimatedSources: number;
        queries: string[];
    }[];
    totalEstimatedQueries: number;
    totalEstimatedSources: number;
};
/**
 * Flatten the strategy into a simple query list for execution.
 */
export function flattenBrandSearchStrategy(strategy: any): any;
/**
 * Get queries for a specific platform only.
 */
export function getQueriesByPlatform(strategy: any, platform: any): any;
/**
 * Batch queries into groups of N for parallel execution.
 */
export function batchQueries(strategy: any, batchSize?: number): any[];
export function analyzeSourceDiversity(sources: any): {
    total: any;
    byPlatform: {};
    byCategory: {
        official: number;
        social_media: number;
        reviews: number;
        news: number;
        blogs: number;
        forums: number;
        video: number;
        other: number;
    };
    diversityScore: number;
    gapAnalysis: string[];
};
declare namespace _default {
    export { generateBrandSearchStrategy };
    export { flattenBrandSearchStrategy };
    export { getQueriesByPlatform };
    export { batchQueries };
    export { analyzeSourceDiversity };
}
export default _default;
//# sourceMappingURL=searchQueryOptimizer.d.ts.map