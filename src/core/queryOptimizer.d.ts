/**
 * Query Optimizer — Live Query Feedback Loop
 *
 * Measures which queries actually work, regenerates better ones mid-research
 *
 * Flow:
 * 1. Execute query → measure effectiveness
 * 2. After 5 queries, analyze what worked
 * 3. LLM regenerates next batch based on patterns
 * 4. Iteratively improve query quality throughout research
 *
 * Result: Iteration 1 sucks, iteration 2+ exponentially better
 */
export interface QueryMetrics {
    query: string;
    platform?: string;
    factsExtracted: number;
    confidence: number;
    executionTime: number;
    engagementScore?: number;
    sourceQuality?: number;
    sentimentVariance?: number;
}
export interface QueryEffectiveness {
    query: string;
    effectiveness: number;
    factsPerSecond: number;
    qualityScore: number;
    reasons: string[];
}
export interface QueryPattern {
    bestKeywords: string[];
    bestLength: number;
    bestPlatforms: string[];
    worstPatterns: string[];
    suggestedQueries: string[];
}
/**
 * Calculate effectiveness score for a query
 * Composite metric: fact volume, confidence, time efficiency, source quality
 */
export declare function calculateEffectiveness(metrics: QueryMetrics): number;
export declare class QueryOptimizer {
    private metrics;
    private patterns;
    private lastAnalysis;
    private ANALYSIS_INTERVAL;
    /**
     * Record metrics for a query
     */
    recordQuery(metrics: QueryMetrics): void;
    /**
     * Analyze last N queries, extract patterns, suggest improvements
     */
    private analyzeAndRegenerate;
    /**
     * Extract patterns from top/bottom performing queries
     */
    private extractPatterns;
    /**
     * Extract which platforms/query types work best
     */
    private extractBestPlatforms;
    /**
     * Generate suggested queries based on top patterns
     */
    private generateSuggestedQueries;
    /**
     * Get current patterns (for UI display)
     */
    getPatterns(): QueryPattern | null;
    /**
     * Get analysis report
     */
    getReport(): string;
    /**
     * Get regenerated queries based on patterns
     * Called by planner to get adaptive next batch
     */
    getRegeneratedQueries(originalSection: string, brandName: string, count?: number): Promise<string[]>;
    /**
     * Reset metrics (start fresh for new research)
     */
    reset(): void;
}
export declare const queryOptimizer: QueryOptimizer;
//# sourceMappingURL=queryOptimizer.d.ts.map