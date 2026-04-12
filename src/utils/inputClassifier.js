/**
 * Input Classifier — Detect whether input is a web query, codebase path, or code snippet
 *
 * Three types:
 * 1. web_query — Regular research question ("What are trends in...")
 * 2. codebase — File/directory path ("/Users/mk/project", "./src", ".")
 * 3. snippet — Multi-line code fragment with function/class/const definitions
 */
import * as fs from 'fs';
import * as path from 'path';
const CODE_KEYWORDS = [
    'function', 'const', 'let', 'var', 'class', 'interface', 'type',
    'async', 'await', 'import', 'export', 'return', 'if', 'for',
    'def', 'class:', 'async def' // Python
];
const LANGUAGE_EXTENSIONS = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.java': 'java',
    '.cs': 'csharp',
    '.cpp': 'cpp',
    '.c': 'c',
    '.rb': 'ruby',
    '.php': 'php',
};
/**
 * Classify input as web query, codebase, or code snippet
 */
export function classifyInput(input) {
    // Trim whitespace
    const trimmed = input.trim();
    // Check for codebase path (file/directory)
    if (isFilePath(trimmed)) {
        const classification = classifyAsCodebase(trimmed);
        if (classification)
            return classification;
    }
    // Check for multi-line code snippet
    if (trimmed.includes('\n')) {
        const snippetClassification = classifyAsSnippet(trimmed);
        if (snippetClassification)
            return snippetClassification;
    }
    // Default: web query
    return {
        type: 'web_query',
        value: trimmed,
        isLocal: false,
    };
}
/**
 * Check if input looks like a file path
 */
function isFilePath(input) {
    // Absolute paths: /Users/..., C:\Users\...
    if (/^[/~]/.test(input) || /^[A-Z]:/.test(input))
        return true;
    // Relative paths: ./, ../, or standard paths like src/components
    if (/^\.{1,2}\//.test(input) || /^\.{1,2}\\/.test(input))
        return true;
    // Current directory: .
    if (input === '.')
        return true;
    // Paths without slashes but looking directory-like: src, components, etc.
    // Only if they don't contain query-like characters
    if (!input.includes('?') && !input.includes(' ') && /^[a-zA-Z_.-]+$/.test(input)) {
        const stats = tryAccessPath(input);
        if (stats)
            return true;
    }
    return false;
}
/**
 * Attempt to access a path and return its stats, or null if not found
 */
function tryAccessPath(filePath) {
    try {
        const stats = fs.statSync(filePath);
        return stats;
    }
    catch {
        return null;
    }
}
/**
 * Classify input as codebase (file or directory)
 */
function classifyAsCodebase(input) {
    try {
        // Resolve to absolute path
        const resolvedPath = path.resolve(input);
        const stats = fs.statSync(resolvedPath);
        if (stats.isDirectory()) {
            return {
                type: 'codebase',
                value: resolvedPath,
                isLocal: true,
                isDirectory: true,
                filePath: resolvedPath,
            };
        }
        if (stats.isFile()) {
            const ext = path.extname(input);
            const language = LANGUAGE_EXTENSIONS[ext.toLowerCase()];
            return {
                type: 'codebase',
                value: resolvedPath,
                isLocal: true,
                isFile: true,
                filePath: resolvedPath,
                language: language,
            };
        }
    }
    catch {
        // Path doesn't exist or can't be accessed
        return null;
    }
    return null;
}
/**
 * Classify input as code snippet (multi-line code with keywords)
 */
function classifyAsSnippet(input) {
    // Must be multi-line
    if (!input.includes('\n'))
        return null;
    // Count code keywords
    const keywordMatches = CODE_KEYWORDS.filter(kw => new RegExp(`\\b${kw}\\b`, 'i').test(input));
    // Must have at least 1 keyword to be considered code
    if (keywordMatches.length === 0)
        return null;
    // Detect language from keywords
    let language = 'unknown';
    if (/^def\s+|^class\s+|^async def/.test(input.trim())) {
        language = 'python';
    }
    else if (/^import\s+|^export\s+|function\s+|const\s+|let\s+/.test(input)) {
        // Check for TypeScript markers
        if (/:[\s\w\[\]<>|&\(\){}]*[,;]|interface\s+|type\s+|as\s+const/.test(input)) {
            language = 'typescript';
        }
        else {
            language = 'javascript';
        }
    }
    else if (/^class\s+|^func\s+|^var\s+/.test(input)) {
        language = 'go';
    }
    else if (/^fn\s+|^pub\s+fn\s+/.test(input)) {
        language = 'rust';
    }
    return {
        type: 'snippet',
        value: input,
        isLocal: true,
        language: language,
    };
}
/**
 * Scan directory for code files recursively
 * Returns array of .ts/.tsx/.js/.jsx files (up to maxDepth)
 */
export function scanCodebaseFiles(dirPath, maxDepth = 10, currentDepth = 0, maxFiles = 500) {
    const files = [];
    if (currentDepth >= maxDepth || files.length >= maxFiles) {
        return files;
    }
    try {
        const entries = fs.readdirSync(dirPath, { withFileTypes: true });
        for (const entry of entries) {
            if (files.length >= maxFiles)
                break;
            // Skip node_modules, .git, dist, build, etc.
            if (['node_modules', '.git', '.venv', 'venv', 'dist', 'build', '.next', 'out'].includes(entry.name)) {
                continue;
            }
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                files.push(...scanCodebaseFiles(fullPath, maxDepth, currentDepth + 1, maxFiles - files.length));
            }
            else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                // Only include code files
                if (['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs', '.java', '.cs', '.rb', '.php'].includes(ext)) {
                    files.push(fullPath);
                }
            }
        }
    }
    catch (err) {
        // Permission denied or other errors — skip
    }
    return files;
}
/**
 * Detect language from code content
 */
export function detectLanguage(code) {
    if (/\bdef\b|\bclass\b|^import |^from /.test(code))
        return 'python';
    if (/\binterface\b|\btype\b|:\s*string|\bas const/.test(code))
        return 'typescript';
    if (/\bfunction\b|\bconst\b|\blet\b|\bvar\b/.test(code))
        return 'javascript';
    if (/\bfn\s+|pub fn|async fn/.test(code))
        return 'rust';
    if (/\bpackage\b|\bimport\b|class\b/.test(code))
        return 'java';
    return 'unknown';
}
//# sourceMappingURL=inputClassifier.js.map