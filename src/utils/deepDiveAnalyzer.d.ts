/**
 * Deep Dive Analyzer
 *
 * Analyzes a single source (GitHub repo, documentation site, database) deeply.
 * Extracts structure, code patterns, key files, architecture, and creates
 * comprehensive report on that specific source.
 */
export interface SourceAnalysis {
    url: string;
    type: 'github' | 'documentation' | 'api' | 'database' | 'other';
    title: string;
    structure: {
        files: string[];
        directories: string[];
        keyFiles: string[];
    };
    content: {
        readme: string;
        codeSnippets: string[];
        documentation: string[];
        patterns: string[];
    };
    insights: {
        architecture: string;
        keyTechnologies: string[];
        patterns: string[];
        bestPractices: string[];
        gaps: string[];
    };
    summary: string;
}
/**
 * Deep dive into a single source
 */
export declare function analyzeSingleSource(sourceUrl: string): Promise<SourceAnalysis>;
/**
 * Format analysis for CLI display
 */
export declare function formatAnalysisForDisplay(analysis: SourceAnalysis): string;
//# sourceMappingURL=deepDiveAnalyzer.d.ts.map