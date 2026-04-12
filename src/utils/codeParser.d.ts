/**
 * Code Parser — Extract functions, classes, imports, and structure from source code
 *
 * Uses regex-based parsing for speed. Handles:
 * - TypeScript/JavaScript: function declarations, arrow functions, classes
 * - Python: def functions, classes
 * - Basic import/export tracking
 */
export interface FunctionInfo {
    name: string;
    type: 'function' | 'arrow' | 'method' | 'lambda';
    line: number;
    params: string[];
    returnType?: string;
    docstring?: string;
    isAsync: boolean;
    isExported: boolean;
    calls: string[];
}
export interface ClassInfo {
    name: string;
    line: number;
    methods: string[];
    properties: string[];
    extends?: string;
    implements?: string[];
    isExported: boolean;
    docstring?: string;
}
export interface ImportInfo {
    module: string;
    items: string[];
    isDefault: boolean;
    line: number;
}
export interface CodeStructure {
    language: string;
    totalLines: number;
    functions: FunctionInfo[];
    classes: ClassInfo[];
    imports: ImportInfo[];
    exports: string[];
}
/**
 * Parse code and extract all functions
 */
export declare function extractFunctions(code: string, language?: string): FunctionInfo[];
/**
 * Parse code and extract all classes
 */
export declare function extractClasses(code: string, language?: string): ClassInfo[];
/**
 * Parse code and extract all imports
 */
export declare function extractImports(code: string, language?: string): ImportInfo[];
/**
 * Calculate complexity metrics
 */
export interface ComplexityMetrics {
    lines: number;
    functions: number;
    classes: number;
    averageFunctionLength: number;
    cyclomaticComplexity: number;
}
export declare function calculateComplexity(code: string): ComplexityMetrics;
/**
 * Full code structure analysis
 */
export declare function analyzeCode(code: string, language?: string): CodeStructure;
//# sourceMappingURL=codeParser.d.ts.map