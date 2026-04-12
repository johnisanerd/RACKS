/**
 * Codebase Analyzer Agent
 *
 * Analyzes local code repositories to extract:
 * - Architecture overview
 * - Function/class relationships
 * - Import/dependency graphs
 * - Code complexity metrics
 * - Design patterns
 *
 * Runs in parallel using SubagentPool for file processing
 */
import { SubagentPool } from './pool.js';
export interface FileInfo {
    path: string;
    language: string;
    lines: number;
    exports: string[];
    imports: string[];
    functions: number;
    classes: number;
    complexity: number;
}
export interface FunctionInfo {
    name: string;
    file: string;
    params: string[];
    calls: string[];
    exports: boolean;
}
export interface DependencyEdge {
    from: string;
    to: string;
    type: 'import' | 'call';
    items: string[];
}
export interface ArchitecturePattern {
    type: string;
    confidence: number;
    description: string;
}
export interface CodeAnalysis {
    rootPath: string;
    files: FileInfo[];
    allFunctions: FunctionInfo[];
    dependencies: DependencyEdge[];
    architecture: ArchitecturePattern[];
    complexity: {
        averageComplexity: number;
        maxComplexity: number;
        totalLines: number;
        fileCount: number;
    };
    summary: string;
}
/**
 * Analyze a codebase (directory or file)
 */
export declare function analyzeCodebase(sourcePath: string, pool?: SubagentPool, maxFiles?: number): Promise<CodeAnalysis>;
//# sourceMappingURL=codebaseAnalyzer.d.ts.map