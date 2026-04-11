/**
 * Search Query Validator
 *
 * Tests generated search queries against real search engines before
 * deploying them in full research. Ensures queries are relevant and
 * not casting nets too wide.
 */
import { wayfarerService } from './wayfarer.js';
import { createLogger } from './logger.js';
const log = createLogger('searchQueryValidator');
/**
 * Validate a search query by testing it and checking result quality.
 * Returns true if top 3 results are relevant to the topic.
 */
export async function validateSearchQuery(query, topicContext) {
    try {
        log.info(`Validating query: "${query}"`);
        // Fetch top 3 results from SearXNG via Wayfarer
        const results = await wayfarerService.search(query, 1); // 1 page = ~5 results
        if (!results || results.length === 0) {
            return {
                query,
                isValid: false,
                topResults: [],
                relevanceScore: 0,
                reasoning: 'No search results found'
            };
        }
        // Extract top 3 results
        const topThree = results.slice(0, 3);
        const topResults = topThree
            .map(r => `${r.title} (${r.url})`);
        // Score relevance: do results match the topic?
        const resultText = topThree
            .map(r => `${r.title} ${r.snippet}`)
            .join(' ')
            .toLowerCase();
        const topicWords = topicContext
            .toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 4); // Only meaningful words
        const matchedWords = topicWords.filter(w => resultText.includes(w)).length;
        const relevanceScore = matchedWords / Math.max(topicWords.length, 1);
        // Heuristic: query is valid if top results are relevant enough
        const isValid = topThree.length > 0 &&
            relevanceScore > 0.4 && // At least 40% of topic words present
            !resultText.includes('error') &&
            !resultText.includes('blocked'); // Check for error pages
        const reasoning = relevanceScore < 0.4
            ? `Low relevance (${(relevanceScore * 100).toFixed(0)}% match to topic)`
            : relevanceScore < 0.7
                ? `Moderate relevance (${(relevanceScore * 100).toFixed(0)}% match)`
                : `Good relevance (${(relevanceScore * 100).toFixed(0)}% match)`;
        log.info(`Query "${query}" → ${isValid ? '✓ VALID' : '✗ INVALID'} (${reasoning})`);
        return {
            query,
            isValid,
            topResults,
            relevanceScore,
            reasoning
        };
    }
    catch (error) {
        log.warn(`Query validation failed: "${query}"`, error);
        return {
            query,
            isValid: false,
            topResults: [],
            relevanceScore: 0,
            reasoning: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
        };
    }
}
/**
 * Validate multiple queries in parallel, return only the valid ones.
 * Strict: requires at least 60% relevance.
 */
export async function validateQueriesBatch(queries, topicContext, maxValidQueries = 5) {
    log.info(`Validating ${queries.length} queries...`);
    const validationResults = await Promise.all(queries.map(q => validateSearchQuery(q, topicContext)));
    const valid = validationResults
        .filter(r => r.isValid && r.relevanceScore > 0.6)
        .sort((a, b) => b.relevanceScore - a.relevanceScore)
        .slice(0, maxValidQueries)
        .map(r => r.query);
    const invalid = validationResults.filter(r => !r.isValid || r.relevanceScore <= 0.6);
    log.info(`Validation complete: ${valid.length}/${queries.length} queries valid`);
    if (valid.length === 0) {
        log.warn('No valid queries found! Using fallback strategy...');
    }
    return { valid, invalid };
}
/**
 * If validation finds bad queries, suggest improved versions.
 * Can regenerate queries or fall back to simpler ones.
 */
export function suggestQueryImprovements(invalidResults) {
    const suggestions = [];
    for (const result of invalidResults) {
        // Too broad? Add specificity
        if (result.relevanceScore < 0.3) {
            const parts = result.query.split(' ');
            if (parts.length > 1) {
                // Try with fewer, more specific words
                const improved = parts.slice(0, Math.ceil(parts.length / 2)).join(' ');
                suggestions.push(improved);
            }
        }
        // No results? Try synonyms or related terms
        if (result.topResults.length === 0) {
            // Add common qualifiers
            suggestions.push(`"${result.query}" tutorial`);
            suggestions.push(`${result.query} 2025`);
            suggestions.push(`${result.query} reddit`);
        }
    }
    return suggestions;
}
//# sourceMappingURL=searchQueryValidator.js.map