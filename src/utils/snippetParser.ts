/**
 * Snippet Parser — Analyze partial code fragments
 *
 * Handles incomplete code snippets by:
 * - Detecting code structure (functions, classes, etc.)
 * - Identifying missing imports/context
 * - Suggesting improvements
 * - Calculating complexity on partial code
 */

import { analyzeCode, extractFunctions, extractClasses, extractImports } from './codeParser.js';

export interface CodeSnippet {
  content: string;
  language: string;
  startLine?: number;  // In original file, if known
  endLine?: number;
  context?: string;    // File name or context hint
}

export interface SnippetAnalysis {
  summary: string;
  functions: string[];
  classes: string[];
  identifiers: string[];  // Variables, functions referenced
  imports: string[];
  possibleIssues: string[];
  suggestions: string[];
  relatedPatterns: string[];
  complexity: {
    cyclomatic: number;
    cognitive: number;
    lines: number;
  };
  confidence: number;  // 0-1: how confident is the analysis?
}

/**
 * Analyze a code snippet (partial code)
 */
export function analyzeSnippet(snippet: CodeSnippet): SnippetAnalysis {
  const code = snippet.content;
  const language = snippet.language || 'typescript';

  // Extract structure
  const functions = extractFunctions(code, language);
  const classes = extractClasses(code, language);
  const imports = extractImports(code, language);

  // Extract identifiers (variables, parameters, etc.)
  const identifiers = extractIdentifiers(code, language);

  // Detect issues
  const issues = detectIssues(code, functions, classes, imports, identifiers, language);

  // Get suggestions
  const suggestions = getSuggestions(code, functions, classes, issues, language);

  // Detect patterns
  const patterns = detectPatterns(code, language);

  // Calculate complexity
  const complexity = calculateSnippetComplexity(code);

  // Confidence score (0-1)
  // Higher confidence if: has imports, exports, or clear structure
  let confidence = 0.5;
  if (imports.length > 0) confidence += 0.1;
  if (functions.length > 0 || classes.length > 0) confidence += 0.2;
  if (issues.length === 0) confidence += 0.2;

  return {
    summary: generateSummary(code, functions, classes, language),
    functions: functions.map(f => f.name),
    classes: classes.map(c => c.name),
    identifiers: Array.from(identifiers),
    imports: imports.map(i => i.module),
    possibleIssues: issues,
    suggestions,
    relatedPatterns: patterns,
    complexity,
    confidence: Math.min(1, confidence),
  };
}

/**
 * Extract all identifiers referenced in code
 */
function extractIdentifiers(code: string, language: string): Set<string> {
  const identifiers = new Set<string>();

  // Match variable/function names: word followed by ( or =
  const varPattern = /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*(?:=|:|\(|\.)/g;
  let match;

  while ((match = varPattern.exec(code)) !== null) {
    const name = match[1];

    // Skip keywords
    if (!['if', 'for', 'while', 'switch', 'function', 'class', 'const', 'let', 'var', 'async', 'await', 'return', 'throw', 'new', 'this', 'super', 'import', 'export', 'from', 'as', 'interface', 'type', 'enum', 'extends', 'implements'].includes(name)) {
      identifiers.add(name);
    }
  }

  return identifiers;
}

/**
 * Detect potential issues in code snippet
 */
function detectIssues(
  code: string,
  functions: any[],
  classes: any[],
  imports: any[],
  identifiers: Set<string>,
  language: string
): string[] {
  const issues: string[] = [];

  // Check for undefined variables
  const importedModules = new Set(imports.map(i => i.module));
  const importedItems = new Set(imports.flatMap(i => i.items));

  // Check for missing imports
  const commonLibraries = {
    'react': ['useState', 'useEffect', 'useCallback', 'useMemo', 'useContext'],
    'lodash': ['map', 'filter', 'reduce', 'debounce', 'throttle'],
    '@angular/core': ['Component', 'Injectable', 'Input', 'Output'],
    'express': ['Router', 'Request', 'Response'],
  };

  for (const [lib, items] of Object.entries(commonLibraries)) {
    for (const item of items) {
      if (code.includes(item) && !importedItems.has(item)) {
        issues.push(`Missing import: ${item} from ${lib}`);
      }
    }
  }

  // Check for unclosed braces/brackets
  const openBraces = (code.match(/\{/g) || []).length;
  const closeBraces = (code.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    issues.push(`Unmatched braces: ${openBraces} open, ${closeBraces} closed`);
  }

  // TypeScript specific
  if (language === 'typescript') {
    // Check for missing type annotations
    if (/const\s+\w+\s*=/.test(code) && !/:/.test(code)) {
      issues.push('Missing TypeScript type annotations');
    }

    // Check for implicit any
    if (/function\s+\w+\s*\([^)]*\)\s*\{/.test(code) && !/:/.test(code)) {
      issues.push('Function parameters missing type annotations');
    }
  }

  // Check for console.log (often debug code)
  if (code.includes('console.log')) {
    issues.push('Contains console.log (likely debug code)');
  }

  // Check for empty functions
  if (/function\s+\w+\s*\([^)]*\)\s*\{\s*\}/.test(code)) {
    issues.push('Found empty function');
  }

  return issues;
}

/**
 * Get improvement suggestions
 */
function getSuggestions(
  code: string,
  functions: any[],
  classes: any[],
  issues: string[],
  language: string
): string[] {
  const suggestions: string[] = [];

  // If long function, suggest breaking it up
  const functionLength = code.split('\n').length;
  if (functionLength > 50) {
    suggestions.push('Consider breaking large function into smaller, focused functions');
  }

  // If no comments, suggest adding documentation
  if (!code.includes('//') && !code.includes('/*')) {
    suggestions.push('Add comments/JSDoc to explain complex logic');
  }

  // Suggest destructuring if importing many items
  if (code.includes('const x = obj.') || code.includes('this.')) {
    suggestions.push('Consider destructuring to reduce verbosity');
  }

  // Suggest error handling if calling external functions
  if (/\.then\(|async\s+|fetch\(|\.catch/.test(code) && !code.includes('try') && !code.includes('catch')) {
    suggestions.push('Add error handling for async operations');
  }

  // Suggest variable naming improvements
  if (/\b[a-z]\b|\b[a-z]{1,2}\b/.test(code)) {
    suggestions.push('Use more descriptive variable names (avoid single letters)');
  }

  // TypeScript specific
  if (language === 'typescript') {
    if (/:any\b/g.test(code)) {
      suggestions.push('Replace "any" types with specific types for better type safety');
    }

    if (!code.includes('interface ') && !code.includes('type ')) {
      suggestions.push('Consider defining TypeScript interfaces for complex objects');
    }
  }

  return suggestions.slice(0, 5);  // Top 5 suggestions
}

/**
 * Detect design patterns in code
 */
function detectPatterns(code: string, language: string): string[] {
  const patterns: string[] = [];

  // Factory pattern
  if (/function\s+create\w+|class\s+\w+Factory/.test(code)) {
    patterns.push('Factory Pattern');
  }

  // Singleton pattern
  if (/instance\s*=\s*null|getInstance/.test(code)) {
    patterns.push('Singleton Pattern');
  }

  // Observable/Promise pattern
  if (/subscribe|Observable|Promise|async\s+await/.test(code)) {
    patterns.push('Async/Observable Pattern');
  }

  // MVC/Component pattern
  if (/class\s+\w+(Component|Controller|View)/.test(code)) {
    patterns.push('MVC/Component Architecture');
  }

  // Higher-order function
  if (/return\s+function|return\s+\(/.test(code)) {
    patterns.push('Higher-Order Function');
  }

  // Decorator pattern
  if (/@\w+/.test(code)) {
    patterns.push('Decorator Pattern');
  }

  return patterns;
}

/**
 * Calculate complexity metrics for snippet
 */
interface SnippetComplexity {
  cyclomatic: number;
  cognitive: number;
  lines: number;
}

function calculateSnippetComplexity(code: string): SnippetComplexity {
  const lines = code.split('\n').length;

  // Cyclomatic complexity: count decision points
  const decisions = (code.match(/\bif\b|\belse\b|\bfor\b|\bwhile\b|\bswitch\b|\bcatch\b|\?.*?:/g) || []).length;
  const cyclomatic = Math.max(1, decisions + 1);

  // Cognitive complexity: similar but weights nested structures higher
  const nestedLevels = Math.max(...code.split('\n').map(line => (line.match(/[{]/g) || []).length)) || 1;
  const cognitive = cyclomatic + nestedLevels;

  return {
    cyclomatic,
    cognitive,
    lines,
  };
}

/**
 * Generate summary of code snippet
 */
function generateSummary(code: string, functions: any[], classes: any[], language: string): string {
  if (classes.length > 0) {
    return `TypeScript/JavaScript class definition with ${functions.length} methods`;
  }

  if (functions.length > 0) {
    const funcNames = functions.map(f => f.name).join(', ');
    return `Function${functions.length > 1 ? 's' : ''}: ${funcNames}`;
  }

  // Check what type of code
  if (code.includes('useState') || code.includes('useEffect')) {
    return 'React component or hook';
  }

  if (code.includes('interface') || code.includes('type')) {
    return 'TypeScript type definitions';
  }

  if (code.includes('export default') || code.includes('module.exports')) {
    return 'Module export';
  }

  return `Code snippet in ${language}`;
}

/**
 * Find related files that might contain context for this snippet
 */
export async function findRelatedFiles(snippet: CodeSnippet, searchDir: string = '.'): Promise<string[]> {
  // This would require actual file system access
  // For now, return empty array — caller can provide context
  return [];
}
