/**
 * Input Classifier — Detect whether input is a web query, codebase path, or code snippet
 *
 * Three types:
 * 1. web_query — Regular research question ("What are trends in...")
 * 2. codebase — File/directory path ("/Users/mk/project", "./src", ".")
 * 3. snippet — Multi-line code fragment with function/class/const definitions
 */
export interface InputClassification {
    type: 'web_query' | 'codebase' | 'snippet';
    value: string;
    isLocal: boolean;
    language?: string;
    isFile?: boolean;
    isDirectory?: boolean;
    filePath?: string;
}
/**
 * Classify input as web query, codebase, or code snippet
 */
export declare function classifyInput(input: string): InputClassification;
/**
 * Scan directory for code files recursively
 * Returns array of .ts/.tsx/.js/.jsx files (up to maxDepth)
 */
export declare function scanCodebaseFiles(dirPath: string, maxDepth?: number, currentDepth?: number, maxFiles?: number): string[];
/**
 * Detect language from code content
 */
export declare function detectLanguage(code: string): string;
//# sourceMappingURL=inputClassifier.d.ts.map