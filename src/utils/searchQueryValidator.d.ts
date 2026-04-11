/**
 * Search Query Validator
 *
 * Tests generated search queries against real search engines before
 * deploying them in full research. Ensures queries are relevant and
 * not casting nets too wide.
 */
export interface QueryValidationResult {
    query: string;
    isValid: boolean;
    topResults: string[];
    relevanceScore: number;
    reasoning: string;
}
/**
 * Validate a search query by testing it and checking result quality.
 * Returns true if top 3 results are relevant to the topic.
 */
export declare function validateSearchQuery(query: string, topicContext: string): Promise<QueryValidationResult>;
/**
 * Validate multiple queries in parallel, return only the valid ones.
 * Strict: requires at least 60% relevance.
 */
export declare function validateQueriesBatch(queries: string[], topicContext: string, maxValidQueries?: number): Promise<{
    valid: string[];
    invalid: QueryValidationResult[];
}>;
/**
 * If validation finds bad queries, suggest improved versions.
 * Can regenerate queries or fall back to simpler ones.
 */
export declare function suggestQueryImprovements(invalidResults: QueryValidationResult[]): string[];
//# sourceMappingURL=searchQueryValidator.d.ts.map