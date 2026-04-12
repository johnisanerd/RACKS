/**
 * Query Performance Tracker
 *
 * Tracks which research queries work best:
 * - Execution time, pages scraped, facts extracted
 * - Quality score calculation
 * - Pattern detection (best keywords, optimal length)
 * - Query suggestions for next iteration
 */
export interface QueryMetrics {
    queryId: string;
    timestamp: number;
    query: string;
    section?: string;
    duration_ms: number;
    wayfarer_calls: number;
    wayfarer_success_rate: number;
    pages_scraped: number;
    facts_extracted: number;
    facts_unique: number;
    facts_per_second: number;
    dedup_rate: number;
    coverage_delta: number;
    confidence_delta: number;
    quality_score: number;
    model_tokens_used: number;
    agent_cost?: number;
}
export interface QueryPattern {
    bestKeywords: string[];
    bestLength: number;
    bestSections: string[];
    worstPatterns: string[];
    suggestedQueries: string[];
    topQueriesCount: number;
}
export declare class QueryPerformanceTracker {
    private metrics;
    private patterns;
    constructor();
    /**
     * Record a query execution
     */
    recordQuery(metrics: QueryMetrics): void;
    /**
     * Update patterns based on recent queries
     */
    private updatePatterns;
    /**
     * Extract high-value keywords from queries
     */
    private extractKeywords;
    /**
     * Identify patterns in worst-performing queries
     */
    private identifyWorstPatterns;
    /**
     * Generate suggested next queries based on keywords
     */
    private generateSuggestedQueries;
    /**
     * Get the next suggested query
     */
    getSuggestedNextQuery(): string | null;
    /**
     * Get human-readable performance report
     */
    getReport(): string;
    /**
     * Get all metrics (for export/analysis)
     */
    getAllMetrics(): QueryMetrics[];
    /**
     * Get top N queries by quality score
     */
    getTopQueries(n?: number): QueryMetrics[];
    /**
     * Get bottom N queries by quality score
     */
    getBottomQueries(n?: number): QueryMetrics[];
    /**
     * Export metrics as JSON
     */
    exportJSON(): string;
}
//# sourceMappingURL=queryMetrics.d.ts.map