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
  calls: string[];  // Functions this calls
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
export function extractFunctions(code: string, language: string = 'typescript'): FunctionInfo[] {
  const functions: FunctionInfo[] = [];
  const lines = code.split('\n');

  if (language === 'python') {
    // Python: def name(...):
    const defPattern = /^(\s*)def\s+(\w+)\s*\((.*?)\).*?:/gm;
    let match;

    while ((match = defPattern.exec(code)) !== null) {
      const lineNum = code.substring(0, match.index).split('\n').length;
      const indent = match[1].length;
      const name = match[2];
      const paramsStr = match[3];

      // Parse parameters
      const params = paramsStr
        .split(',')
        .map(p => p.trim())
        .filter(p => p && p !== 'self')
        .map(p => p.split(':')[0].trim());

      // Check for docstring
      const docstringMatch = code.substring(match.index).match(/"""([\s\S]*?)"""|'''([\s\S]*?)'''/);
      const docstring = docstringMatch ? (docstringMatch[1] || docstringMatch[2]).trim() : undefined;

      functions.push({
        name,
        type: 'function',
        line: lineNum,
        params,
        isAsync: false,
        isExported: false,
        docstring,
        calls: extractCalls(code, name),
      });
    }
  } else {
    // TypeScript/JavaScript
    // Standard function
    const funcPattern = /^(export\s+)?(async\s+)?function\s+(\w+)\s*\((.*?)\)(?:\s*:\s*([\w\[\]<>|&\s,]+))?\s*\{/gm;
    let match;

    while ((match = funcPattern.exec(code)) !== null) {
      const lineNum = code.substring(0, match.index).split('\n').length;
      const isExported = !!match[1];
      const isAsync = !!match[2];
      const name = match[3];
      const paramsStr = match[4];
      const returnType = match[5]?.trim();

      const params = parseParams(paramsStr);

      functions.push({
        name,
        type: 'function',
        line: lineNum,
        params,
        returnType,
        isAsync,
        isExported,
        calls: extractCalls(code, name),
      });
    }

    // Arrow function: const name = () => { } or const name = async () => { }
    const arrowPattern = /(export\s+)?(const|let|var)\s+(\w+)\s*=\s*(async\s+)?\([^)]*\)\s*=>\s*({|\()/gm;
    while ((match = arrowPattern.exec(code)) !== null) {
      const lineNum = code.substring(0, match.index).split('\n').length;
      const isExported = !!match[1];
      const isAsync = !!match[4];
      const name = match[3];

      functions.push({
        name,
        type: 'arrow',
        line: lineNum,
        params: [],
        isAsync,
        isExported,
        calls: extractCalls(code, name),
      });
    }
  }

  return functions.sort((a, b) => a.line - b.line);
}

/**
 * Parse code and extract all classes
 */
export function extractClasses(code: string, language: string = 'typescript'): ClassInfo[] {
  const classes: ClassInfo[] = [];

  if (language === 'python') {
    // Python: class Name:, class Name(Parent):
    const classPattern = /^class\s+(\w+)(?:\s*\((.*?)\))?:/gm;
    let match;

    while ((match = classPattern.exec(code)) !== null) {
      const lineNum = code.substring(0, match.index).split('\n').length;
      const name = match[1];
      const extends_ = match[2]?.trim();

      classes.push({
        name,
        line: lineNum,
        methods: [],
        properties: [],
        extends: extends_,
        isExported: false,
      });
    }
  } else {
    // TypeScript/JavaScript: class Name { }, class Name extends Parent { }
    const classPattern = /(export\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?(?:\s+implements\s+([\w,\s]+))?\s*\{/gm;
    let match;

    while ((match = classPattern.exec(code)) !== null) {
      const lineNum = code.substring(0, match.index).split('\n').length;
      const isExported = !!match[1];
      const name = match[2];
      const extends_ = match[3];
      const implements_ = match[4]?.split(',').map(s => s.trim());

      classes.push({
        name,
        line: lineNum,
        methods: [],
        properties: [],
        extends: extends_,
        implements: implements_,
        isExported,
      });
    }
  }

  return classes.sort((a, b) => a.line - b.line);
}

/**
 * Parse code and extract all imports
 */
export function extractImports(code: string, language: string = 'typescript'): ImportInfo[] {
  const imports: ImportInfo[] = [];

  if (language === 'python') {
    // Python: import module, from module import items
    const importPattern = /^(import|from)\s+(\S+)(?:\s+import\s+(.+))?/gm;
    let match;

    while ((match = importPattern.exec(code)) !== null) {
      const lineNum = code.substring(0, match.index).split('\n').length;
      const type = match[1];
      const module = match[2];
      const itemsStr = match[3];

      if (type === 'import') {
        imports.push({
          module,
          items: [],
          isDefault: true,
          line: lineNum,
        });
      } else if (itemsStr) {
        const items = itemsStr.split(',').map(s => s.trim().split(' as ')[0]);
        imports.push({
          module,
          items,
          isDefault: false,
          line: lineNum,
        });
      }
    }
  } else {
    // TypeScript/JavaScript
    // import { A, B } from 'module'
    const namedPattern = /import\s+\{\s*([^}]+)\s*\}\s+from\s+['"](.*?)['"]/gm;
    let match;

    while ((match = namedPattern.exec(code)) !== null) {
      const lineNum = code.substring(0, match.index).split('\n').length;
      const itemsStr = match[1];
      const module = match[2];

      const items = itemsStr
        .split(',')
        .map(s => s.trim().split(' as ')[0].trim())
        .filter(s => s);

      imports.push({
        module,
        items,
        isDefault: false,
        line: lineNum,
      });
    }

    // import * as NS from 'module'
    const starPattern = /import\s+\*\s+as\s+(\w+)\s+from\s+['"](.*?)['"]/gm;
    while ((match = starPattern.exec(code)) !== null) {
      const lineNum = code.substring(0, match.index).split('\n').length;
      const name = match[1];
      const module = match[2];

      imports.push({
        module,
        items: [name],
        isDefault: false,
        line: lineNum,
      });
    }

    // import Default from 'module'
    const defaultPattern = /import\s+(\w+)\s+from\s+['"](.*?)['"]/gm;
    while ((match = defaultPattern.exec(code)) !== null) {
      const lineNum = code.substring(0, match.index).split('\n').length;
      const name = match[1];
      const module = match[2];

      // Skip if already matched as named import
      if (!imports.some(i => i.module === module && i.line === lineNum)) {
        imports.push({
          module,
          items: [name],
          isDefault: true,
          line: lineNum,
        });
      }
    }
  }

  return imports.sort((a, b) => a.line - b.line);
}

/**
 * Parse function parameters
 */
function parseParams(paramsStr: string): string[] {
  if (!paramsStr.trim()) return [];

  return paramsStr
    .split(',')
    .map(p => {
      const trimmed = p.trim();
      // Extract just the param name (before : or =)
      return trimmed.split(/[:\=]/)[0].trim();
    })
    .filter(p => p && p !== '...');
}

/**
 * Extract function calls within code (simple regex-based)
 */
function extractCalls(code: string, currentFunc: string): string[] {
  const calls = new Set<string>();

  // Match function calls: funcName(...)
  const callPattern = /(\w+)\s*\(/g;
  let match;

  while ((match = callPattern.exec(code)) !== null) {
    const name = match[1];

    // Exclude keywords and common built-ins
    if (!['if', 'for', 'while', 'switch', 'catch', 'function', 'class', 'return'].includes(name)) {
      calls.add(name);
    }
  }

  // Remove calls to self
  calls.delete(currentFunc);

  return Array.from(calls);
}

/**
 * Calculate complexity metrics
 */
export interface ComplexityMetrics {
  lines: number;
  functions: number;
  classes: number;
  averageFunctionLength: number;
  cyclomaticComplexity: number;  // Rough estimate
}

export function calculateComplexity(code: string): ComplexityMetrics {
  const lines = code.split('\n').length;
  const functions = (code.match(/function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(/g) || []).length;
  const classes = (code.match(/class\s+\w+/g) || []).length;
  const avgFuncLength = lines / Math.max(functions, 1);

  // Rough cyclomatic complexity: count decision points
  const decisions = (code.match(/\bif\b|\belse\b|\bfor\b|\bwhile\b|\bswitch\b|\bcatch\b|\?\s*:/g) || []).length;
  const cyclomaticComplexity = Math.max(1, Math.floor(decisions / Math.max(functions, 1)));

  return {
    lines,
    functions,
    classes,
    averageFunctionLength: Math.round(avgFuncLength),
    cyclomaticComplexity,
  };
}

/**
 * Full code structure analysis
 */
export function analyzeCode(code: string, language: string = 'typescript'): CodeStructure {
  const functions = extractFunctions(code, language);
  const classes = extractClasses(code, language);
  const imports = extractImports(code, language);

  // Extract exports
  const exports = [
    ...functions.filter(f => f.isExported).map(f => f.name),
    ...classes.filter(c => c.isExported).map(c => c.name),
  ];

  const lines = code.split('\n').length;

  return {
    language,
    totalLines: lines,
    functions,
    classes,
    imports,
    exports,
  };
}
