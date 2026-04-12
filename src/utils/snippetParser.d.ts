/**
 * Snippet Parser — Analyze partial code fragments
 *
 * Handles incomplete code snippets by:
 * - Detecting code structure (functions, classes, etc.)
 * - Identifying missing imports/context
 * - Suggesting improvements
 * - Calculating complexity on partial code
 */
export interface CodeSnippet {
    content: string;
    language: string;
    startLine?: number;
    endLine?: number;
    context?: string;
}
export interface SnippetAnalysis {
    summary: string;
    functions: string[];
    classes: string[];
    identifiers: string[];
    imports: string[];
    possibleIssues: string[];
    suggestions: string[];
    relatedPatterns: string[];
    complexity: {
        cyclomatic: number;
        cognitive: number;
        lines: number;
    };
    confidence: number;
}
/**
 * Analyze a code snippet (partial code)
 */
export declare function analyzeSnippet(snippet: CodeSnippet): SnippetAnalysis;
/**
 * Find related files that might contain context for this snippet
 */
export declare function findRelatedFiles(snippet: CodeSnippet, searchDir?: string): Promise<string[]>;
//# sourceMappingURL=snippetParser.d.ts.map