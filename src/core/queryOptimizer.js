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
import { createLogger } from '../utils/logger.js';
import { ollamaService } from '../services/ollama.js';
import { getModel } from '../config/models.js';
const log = createLogger('queryOptimizer');
/**
 * Calculate effectiveness score for a query
 * Composite metric: fact volume, confidence, time efficiency, source quality
 */
export function calculateEffectiveness(metrics) {
    const factScore = Math.min(1, metrics.factsExtracted / 20); // 20 facts = perfect
    const confidenceScore = metrics.confidence;
    const efficiencyScore = Math.min(1, 10000 / metrics.executionTime); // Faster = better
    const engagementScore = metrics.engagementScore || 0.5;
    const qualityScore = metrics.sourceQuality || 0.5;
    return (factScore * 0.25 +
        confidenceScore * 0.25 +
        efficiencyScore * 0.15 +
        engagementScore * 0.175 +
        qualityScore * 0.175);
}
export class QueryOptimizer {
    constructor() {
        this.metrics = [];
        this.patterns = null;
        this.lastAnalysis = 0;
        this.ANALYSIS_INTERVAL = 5; // Analyze every 5 queries
    }
    /**
     * Record metrics for a query
     */
    recordQuery(metrics) {
        this.metrics.push(metrics);
        log.info(`Query recorded: "${metrics.query.slice(0, 50)}" → ${metrics.factsExtracted} facts, ${metrics.confidence.toFixed(2)} confidence`);
        // Analyze and regenerate if we've hit the threshold
        if (this.metrics.length % this.ANALYSIS_INTERVAL === 0) {
            this.analyzeAndRegenerate().catch(err => {
                log.warn(`Query regeneration failed:`, err);
            });
        }
    }
    /**
     * Analyze last N queries, extract patterns, suggest improvements
     */
    async analyzeAndRegenerate() {
        const recent = this.metrics.slice(-this.ANALYSIS_INTERVAL);
        log.info(`Analyzing ${recent.length} recent queries for patterns...`);
        // Rank by effectiveness
        const ranked = recent
            .map(m => ({
            ...m,
            effectiveness: calculateEffectiveness(m)
        }))
            .sort((a, b) => b.effectiveness - a.effectiveness);
        const topQueries = ranked.slice(0, Math.ceil(ranked.length / 2));
        const bottomQueries = ranked.slice(Math.ceil(ranked.length / 2));
        // Extract patterns from top performers
        this.patterns = this.extractPatterns(topQueries, bottomQueries);
        log.info(`Top patterns: keywords="${this.patterns.bestKeywords.join(', ')}", length=${this.patterns.bestLength} words`);
        log.info(`Worst patterns: ${this.patterns.worstPatterns.join(', ')}`);
        // Log improvement suggestions
        log.info(`Suggested next queries: ${this.patterns.suggestedQueries.slice(0, 2).join(' | ')}`);
    }
    /**
     * Extract patterns from top/bottom performing queries
     */
    extractPatterns(topQueries, bottomQueries) {
        // Extract keywords from top queries
        const topWords = topQueries
            .flatMap(q => q.query.toLowerCase().split(/\s+/))
            .filter(w => w.length > 4);
        const wordFreq = new Map();
        for (const word of topWords) {
            wordFreq.set(word, (wordFreq.get(word) || 0) + 1);
        }
        const bestKeywords = Array.from(wordFreq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([w]) => w);
        // Calculate optimal length
        const topLengths = topQueries.map(q => q.query.split(/\s+/).length);
        const avgLength = Math.round(topLengths.reduce((a, b) => a + b, 0) / topLengths.length);
        // Extract worst patterns (what to avoid)
        const worstPatterns = [];
        const bottomWords = bottomQueries
            .flatMap(q => q.query.toLowerCase().split(/\s+/))
            .slice(0, 5);
        worstPatterns.push(...bottomWords);
        const suggestedQueries = this.generateSuggestedQueries(bestKeywords, avgLength);
        return {
            bestKeywords,
            bestLength: avgLength,
            bestPlatforms: this.extractBestPlatforms(topQueries),
            worstPatterns,
            suggestedQueries
        };
    }
    /**
     * Extract which platforms/query types work best
     */
    extractBestPlatforms(topQueries) {
        const platforms = new Map();
        for (const q of topQueries) {
            const platform = q.platform || 'web';
            platforms.set(platform, (platforms.get(platform) || 0) + 1);
        }
        return Array.from(platforms.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 3)
            .map(([p]) => p);
    }
    /**
     * Generate suggested queries based on top patterns
     */
    generateSuggestedQueries(keywords, optimalLength) {
        const suggestions = [];
        // Combine best keywords in new ways
        if (keywords.length >= 2) {
            suggestions.push(`${keywords[0]} ${keywords[1]} detailed`);
            suggestions.push(`why ${keywords[2]} ${keywords[3]}`);
            suggestions.push(`${keywords[0]} vs ${keywords[1]}`);
        }
        // Add variations
        suggestions.push(`${keywords[0]} problems objections`);
        suggestions.push(`${keywords[1]} solutions benefits`);
        return suggestions.slice(0, 5);
    }
    /**
     * Get current patterns (for UI display)
     */
    getPatterns() {
        return this.patterns;
    }
    /**
     * Get analysis report
     */
    getReport() {
        if (this.metrics.length === 0)
            return 'No queries analyzed yet';
        const top3 = this.metrics
            .map(m => ({ ...m, effectiveness: calculateEffectiveness(m) }))
            .sort((a, b) => b.effectiveness - a.effectiveness)
            .slice(0, 3);
        const avgEffectiveness = this.metrics.reduce((sum, m) => sum + calculateEffectiveness(m), 0) / this.metrics.length;
        let report = `\n📊 Query Optimization Report\n`;
        report += `Queries analyzed: ${this.metrics.length}\n`;
        report += `Average effectiveness: ${(avgEffectiveness * 100).toFixed(0)}%\n\n`;
        report += `Top Performers:\n`;
        for (const q of top3) {
            report += `  ✓ "${q.query.slice(0, 50)}" → ${(q.effectiveness * 100).toFixed(0)}% effective\n`;
        }
        if (this.patterns) {
            report += `\nLearned Patterns:\n`;
            report += `  Keywords: ${this.patterns.bestKeywords.join(', ')}\n`;
            report += `  Optimal length: ${this.patterns.bestLength} words\n`;
            report += `  Best platforms: ${this.patterns.bestPlatforms.join(', ')}\n`;
            report += `\nSuggested next queries:\n`;
            for (const q of this.patterns.suggestedQueries) {
                report += `  → ${q}\n`;
            }
        }
        return report;
    }
    /**
     * Get regenerated queries based on patterns
     * Called by planner to get adaptive next batch
     */
    async getRegeneratedQueries(originalSection, brandName, count = 7) {
        if (!this.patterns || this.metrics.length < this.ANALYSIS_INTERVAL) {
            return []; // Not enough data yet
        }
        const PLANNING_MODEL = getModel('planning');
        const topPattern = this.patterns.suggestedQueries.slice(0, 3).join(', ');
        const prompt = `Based on research patterns for "${brandName}":

WHAT WORKED:
- Keywords: ${this.patterns.bestKeywords.join(', ')}
- Optimal query length: ${this.patterns.bestLength} words
- Best platforms: ${this.patterns.bestPlatforms.join(', ')}

SUGGESTED DIRECTIONS:
${topPattern}

Generate ${count} NEW queries that follow these patterns but are DIFFERENT from what we already tried:
- Use the effective keywords in new combinations
- Keep around ${this.patterns.bestLength} words
- Focus on ${this.patterns.bestPlatforms[0]} platform
- Avoid patterns: ${this.patterns.worstPatterns.join(', ')}

Return only the queries, one per line, no numbering:`;
        try {
            const response = await ollamaService.generateStream(prompt, PLANNING_MODEL, { temperature: 0.8 });
            const queries = response
                .split('\n')
                .filter(line => line.trim().length > 5 && line.trim().length < 150)
                .map(line => line.replace(/^[\d.)\-*]\s*/, '').trim())
                .slice(0, count);
            log.info(`Regenerated ${queries.length} optimized queries`);
            return queries;
        }
        catch (err) {
            log.warn(`Query regeneration failed:`, err);
            return [];
        }
    }
    /**
     * Reset metrics (start fresh for new research)
     */
    reset() {
        this.metrics = [];
        this.patterns = null;
        this.lastAnalysis = 0;
    }
}
export const queryOptimizer = new QueryOptimizer();
//# sourceMappingURL=queryOptimizer.js.map