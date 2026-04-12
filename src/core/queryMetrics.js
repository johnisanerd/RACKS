/**
 * Query Performance Tracker
 *
 * Tracks which research queries work best:
 * - Execution time, pages scraped, facts extracted
 * - Quality score calculation
 * - Pattern detection (best keywords, optimal length)
 * - Query suggestions for next iteration
 */
import { createLogger } from '../utils/logger.js';
const log = createLogger('queryMetrics');
export class QueryPerformanceTracker {
    constructor() {
        this.metrics = [];
        this.patterns = new Map();
    }
    /**
     * Record a query execution
     */
    recordQuery(metrics) {
        this.metrics.push(metrics);
        log.info(`Query recorded: "${metrics.query}" (${metrics.duration_ms}ms, score: ${metrics.quality_score})`);
        // After every 5 queries, analyze patterns
        if (this.metrics.length % 5 === 0) {
            this.updatePatterns();
            const suggested = this.getSuggestedNextQuery();
            if (suggested) {
                log.info(`Suggested next query: "${suggested}"`);
            }
        }
    }
    /**
     * Update patterns based on recent queries
     */
    updatePatterns() {
        if (this.metrics.length === 0)
            return;
        // Analyze last 10 queries
        const recent = this.metrics.slice(-10);
        const topQueries = recent.sort((a, b) => b.quality_score - a.quality_score).slice(0, 3);
        if (topQueries.length === 0)
            return;
        // Extract keywords from top queries
        const keywords = this.extractKeywords(topQueries.map(q => q.query));
        // Calculate optimal length
        const lengths = topQueries.map(q => q.query.length);
        const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;
        // Best sections
        const sectionCounts = new Map();
        topQueries.forEach(q => {
            if (q.section) {
                sectionCounts.set(q.section, (sectionCounts.get(q.section) || 0) + 1);
            }
        });
        const bestSections = Array.from(sectionCounts.entries())
            .sort((a, b) => b[1] - a[1])
            .map(([section]) => section);
        // Identify worst patterns
        const worstQueries = this.metrics.slice(-20).sort((a, b) => a.quality_score - b.quality_score).slice(0, 3);
        const worstPatterns = this.identifyWorstPatterns(worstQueries);
        // Generate suggestions
        const suggestedQueries = this.generateSuggestedQueries(keywords);
        this.patterns.set('current', {
            bestKeywords: keywords.slice(0, 5),
            bestLength: Math.round(avgLength),
            bestSections,
            worstPatterns,
            suggestedQueries,
            topQueriesCount: topQueries.length,
        });
    }
    /**
     * Extract high-value keywords from queries
     */
    extractKeywords(queries) {
        const wordFreq = new Map();
        const stopWords = new Set([
            'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'is', 'are', 'am', 'was', 'were', 'be', 'being', 'been', 'what', 'how', 'why', 'when', 'where',
        ]);
        for (const query of queries) {
            const words = query.toLowerCase().split(/\s+/);
            for (const word of words) {
                const clean = word.replace(/[^\w-]/g, '');
                if (clean.length > 3 && !stopWords.has(clean)) {
                    wordFreq.set(clean, (wordFreq.get(clean) || 0) + 1);
                }
            }
        }
        return Array.from(wordFreq.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10)
            .map(([word]) => word);
    }
    /**
     * Identify patterns in worst-performing queries
     */
    identifyWorstPatterns(worstQueries) {
        const patterns = [];
        if (worstQueries.every(q => q.duration_ms > 30000)) {
            patterns.push('Very long execution time (>30s)');
        }
        if (worstQueries.every(q => q.facts_extracted < 5)) {
            patterns.push('Low fact extraction (<5 facts)');
        }
        if (worstQueries.every(q => q.pages_scraped < 2)) {
            patterns.push('Very few pages scraped');
        }
        if (worstQueries.every(q => q.quality_score < 30)) {
            patterns.push('Consistently low quality scores');
        }
        // Analyze query characteristics
        const avgLength = worstQueries.reduce((sum, q) => sum + q.query.length, 0) / worstQueries.length;
        if (avgLength < 10) {
            patterns.push('Queries too short (<10 words)');
        }
        else if (avgLength > 40) {
            patterns.push('Queries too long (>40 words)');
        }
        return patterns.slice(0, 3);
    }
    /**
     * Generate suggested next queries based on keywords
     */
    generateSuggestedQueries(keywords) {
        const suggestions = [];
        // Combine top keywords into new queries
        if (keywords.length >= 2) {
            suggestions.push(`${keywords[0]} ${keywords[1]} analysis`);
            suggestions.push(`${keywords[1]} vs ${keywords[2] || keywords[0]}`);
        }
        if (keywords.length >= 3) {
            suggestions.push(`${keywords[0]} ${keywords[2]} trends`);
        }
        // Add generic follow-ups
        suggestions.push(`${keywords[0] || 'market'} trends 2025`);
        suggestions.push(`${keywords[0] || 'industry'} challenges`);
        return suggestions.filter((s, i, a) => a.indexOf(s) === i).slice(0, 5); // Unique, top 5
    }
    /**
     * Get the next suggested query
     */
    getSuggestedNextQuery() {
        const pattern = this.patterns.get('current');
        return pattern?.suggestedQueries[0] || null;
    }
    /**
     * Get human-readable performance report
     */
    getReport() {
        if (this.metrics.length === 0) {
            return 'No queries recorded yet.';
        }
        const pattern = this.patterns.get('current');
        let report = '📊 Query Performance Summary\n';
        report += `═══════════════════════════════════\n`;
        report += `Total Queries: ${this.metrics.length}\n`;
        report += `Avg Quality Score: ${(this.metrics.reduce((sum, m) => sum + m.quality_score, 0) / this.metrics.length).toFixed(1)}/100\n`;
        const avgDuration = this.metrics.reduce((sum, m) => sum + m.duration_ms, 0) / this.metrics.length;
        report += `Avg Duration: ${Math.round(avgDuration / 1000)}s\n`;
        const totalFacts = this.metrics.reduce((sum, m) => sum + m.facts_extracted, 0);
        report += `Total Facts Extracted: ${totalFacts}\n\n`;
        if (pattern) {
            report += '🎯 Best Performing Keywords:\n';
            pattern.bestKeywords.forEach(kw => {
                report += `   • ${kw}\n`;
            });
            report += `\n📏 Optimal Query Length: ${pattern.bestLength} words\n`;
            if (pattern.bestSections.length > 0) {
                report += `\n📂 Best Sections:\n`;
                pattern.bestSections.forEach(sec => {
                    report += `   • ${sec}\n`;
                });
            }
            if (pattern.worstPatterns.length > 0) {
                report += `\n⚠️  Patterns to Avoid:\n`;
                pattern.worstPatterns.forEach(pat => {
                    report += `   • ${pat}\n`;
                });
            }
            if (pattern.suggestedQueries.length > 0) {
                report += `\n💡 Suggested Next Queries:\n`;
                pattern.suggestedQueries.slice(0, 3).forEach((q, i) => {
                    report += `   ${i + 1}. "${q}"\n`;
                });
            }
        }
        return report;
    }
    /**
     * Get all metrics (for export/analysis)
     */
    getAllMetrics() {
        return [...this.metrics];
    }
    /**
     * Get top N queries by quality score
     */
    getTopQueries(n = 5) {
        return [...this.metrics].sort((a, b) => b.quality_score - a.quality_score).slice(0, n);
    }
    /**
     * Get bottom N queries by quality score
     */
    getBottomQueries(n = 5) {
        return [...this.metrics].sort((a, b) => a.quality_score - b.quality_score).slice(0, n);
    }
    /**
     * Export metrics as JSON
     */
    exportJSON() {
        return JSON.stringify({
            summary: {
                totalQueries: this.metrics.length,
                avgQualityScore: this.metrics.reduce((sum, m) => sum + m.quality_score, 0) / Math.max(1, this.metrics.length),
                avgDurationMs: Math.round(this.metrics.reduce((sum, m) => sum + m.duration_ms, 0) / Math.max(1, this.metrics.length)),
                totalFactsExtracted: this.metrics.reduce((sum, m) => sum + m.facts_extracted, 0),
            },
            patterns: this.patterns.get('current'),
            metrics: this.metrics,
        }, null, 2);
    }
}
//# sourceMappingURL=queryMetrics.js.map