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
import * as fs from 'fs';
import * as path from 'path';
import { createLogger } from '../utils/logger.js';
import { scanCodebaseFiles } from '../utils/inputClassifier.js';
import { analyzeCode } from '../utils/codeParser.js';
const log = createLogger('codebaseAnalyzer');
/**
 * Analyze a codebase (directory or file)
 */
export async function analyzeCodebase(sourcePath, pool, maxFiles = 200) {
    log.info(`Starting codebase analysis: ${sourcePath}`);
    // Resolve path
    const resolvedPath = path.resolve(sourcePath);
    const stats = fs.statSync(resolvedPath);
    // Get list of code files
    let files;
    if (stats.isDirectory()) {
        files = scanCodebaseFiles(resolvedPath, 10, 0, maxFiles);
    }
    else if (stats.isFile()) {
        files = [resolvedPath];
    }
    else {
        throw new Error(`Invalid path: ${sourcePath}`);
    }
    log.info(`Found ${files.length} code files`);
    // Parse files (sequentially for now; could parallelize with pool)
    const fileAnalyses = new Map();
    const allFunctions = [];
    const fileInfos = [];
    for (const filePath of files) {
        try {
            const code = fs.readFileSync(filePath, 'utf-8');
            const structure = analyzeCode(code);
            fileAnalyses.set(filePath, structure);
            // Create FileInfo
            const fileInfo = {
                path: filePath.replace(resolvedPath, ''),
                language: structure.language,
                lines: structure.totalLines,
                exports: structure.exports,
                imports: structure.imports.map(i => i.module),
                functions: structure.functions.length,
                classes: structure.classes.length,
                complexity: structure.functions.length > 0
                    ? structure.functions.reduce((sum, f) => sum + (f.calls.length || 1), 0) / structure.functions.length
                    : 0,
            };
            fileInfos.push(fileInfo);
            // Extract function info
            for (const func of structure.functions) {
                allFunctions.push({
                    name: func.name,
                    file: filePath,
                    params: func.params,
                    calls: func.calls,
                    exports: func.isExported,
                });
            }
        }
        catch (err) {
            log.warn(`Failed to parse ${filePath}:`, err);
        }
    }
    // Build dependency graph
    const dependencies = buildDependencyGraph(fileAnalyses, resolvedPath);
    // Detect architecture
    const architecture = detectArchitecture(fileInfos, dependencies);
    // Calculate metrics
    const complexity = calculateComplexityMetrics(fileAnalyses, allFunctions);
    // Generate summary
    const summary = generateCodebaseSummary(resolvedPath, fileInfos, allFunctions, architecture);
    return {
        rootPath: resolvedPath,
        files: fileInfos,
        allFunctions,
        dependencies,
        architecture,
        complexity,
        summary,
    };
}
/**
 * Build dependency graph between files
 */
function buildDependencyGraph(fileAnalyses, rootPath) {
    const edges = [];
    const fileMap = new Map(); // module → filePath
    // Build reverse map of imports to files
    for (const [filePath, structure] of fileAnalyses) {
        for (const item of structure.exports) {
            fileMap.set(item, filePath);
        }
        // Also track by filename
        const basename = path.basename(filePath, path.extname(filePath));
        fileMap.set(basename, filePath);
    }
    // Track dependencies
    for (const [filePath, structure] of fileAnalyses) {
        for (const imp of structure.imports) {
            // Try to resolve import to a file
            const resolvedFile = resolveImportPath(imp.module, filePath, rootPath, fileAnalyses);
            if (resolvedFile && resolvedFile !== filePath) {
                edges.push({
                    from: filePath,
                    to: resolvedFile,
                    type: 'import',
                    items: imp.items,
                });
            }
        }
        // Track function calls between files
        for (const func of structure.functions) {
            for (const call of func.calls) {
                // Find if this function is defined in another file
                const targetFile = Array.from(fileAnalyses.entries()).find(([file, s]) => file !== filePath && s.exports.includes(call));
                if (targetFile) {
                    edges.push({
                        from: filePath,
                        to: targetFile[0],
                        type: 'call',
                        items: [call],
                    });
                }
            }
        }
    }
    return edges;
}
/**
 * Attempt to resolve an import path to an actual file
 */
function resolveImportPath(importPath, fromFile, rootPath, fileAnalyses) {
    // Skip node_modules and external imports
    if (importPath.includes('node_modules') || importPath.startsWith('@')) {
        return null;
    }
    // Try relative path
    const fromDir = path.dirname(fromFile);
    const possiblePaths = [
        path.join(fromDir, importPath + '.ts'),
        path.join(fromDir, importPath + '.tsx'),
        path.join(fromDir, importPath + '.js'),
        path.join(fromDir, importPath + '.py'),
        path.join(fromDir, importPath, 'index.ts'),
        path.join(rootPath, importPath + '.ts'),
        path.join(rootPath, importPath + '.tsx'),
    ];
    for (const possiblePath of possiblePaths) {
        if (fileAnalyses.has(possiblePath)) {
            return possiblePath;
        }
    }
    return null;
}
/**
 * Detect architecture pattern from codebase structure
 */
function detectArchitecture(files, dependencies) {
    const patterns = [];
    // Check for layered architecture (src/services, src/components, etc.)
    const directoryCounts = new Map();
    for (const file of files) {
        const dir = path.dirname(file.path).split('/')[0] || 'root';
        directoryCounts.set(dir, (directoryCounts.get(dir) || 0) + 1);
    }
    if (directoryCounts.size > 3) {
        patterns.push({
            type: 'Layered/Modular Architecture',
            confidence: 0.8,
            description: `Clear separation with ${directoryCounts.size} distinct directories`,
        });
    }
    // Check for MVC
    const hasMVC = files.some(f => f.path.includes('controller') || f.path.includes('Controller')) &&
        files.some(f => f.path.includes('view') || f.path.includes('View')) &&
        files.some(f => f.path.includes('model') || f.path.includes('Model'));
    if (hasMVC) {
        patterns.push({
            type: 'MVC Architecture',
            confidence: 0.9,
            description: 'Classic Model-View-Controller pattern detected',
        });
    }
    // Check for service-oriented
    const serviceCount = files.filter(f => f.path.includes('service') || f.path.includes('Service')).length;
    if (serviceCount > 3) {
        patterns.push({
            type: 'Service-Oriented Architecture',
            confidence: 0.75,
            description: `${serviceCount} service files detected`,
        });
    }
    // Check for monolithic (few, large files)
    if (files.length < 20 && files.some(f => f.lines > 500)) {
        patterns.push({
            type: 'Monolithic',
            confidence: 0.7,
            description: 'Fewer, larger files suggest monolithic structure',
        });
    }
    // Check for component-based (React, Vue, etc.)
    const componentCount = files.filter(f => f.path.includes('component') || f.path.includes('Component') || f.path.endsWith('.tsx')).length;
    if (componentCount > 10) {
        patterns.push({
            type: 'Component-Based (UI)',
            confidence: 0.85,
            description: `${componentCount} component files detected`,
        });
    }
    return patterns;
}
/**
 * Calculate complexity metrics
 */
function calculateComplexityMetrics(fileAnalyses, allFunctions) {
    const totalLines = Array.from(fileAnalyses.values()).reduce((sum, s) => sum + s.totalLines, 0);
    const complexities = allFunctions.map(f => f.calls.length || 1);
    return {
        averageComplexity: complexities.length > 0 ? complexities.reduce((a, b) => a + b) / complexities.length : 0,
        maxComplexity: complexities.length > 0 ? Math.max(...complexities) : 0,
        totalLines,
        fileCount: fileAnalyses.size,
    };
}
/**
 * Generate human-readable codebase summary
 */
function generateCodebaseSummary(rootPath, files, functions, architecture) {
    let summary = `# Code Analysis: ${path.basename(rootPath)}\n\n`;
    summary += `## Architecture Overview\n`;
    summary += `- **Files:** ${files.length} code files\n`;
    summary += `- **Functions/Methods:** ${functions.length}\n`;
    summary += `- **Total Lines:** ${files.reduce((sum, f) => sum + f.lines, 0)}\n`;
    const languages = [...new Set(files.map(f => f.language))];
    summary += `- **Languages:** ${languages.join(', ')}\n\n`;
    if (architecture.length > 0) {
        summary += `## Detected Patterns\n`;
        architecture.forEach(arch => {
            summary += `- **${arch.type}** (${(arch.confidence * 100).toFixed(0)}%): ${arch.description}\n`;
        });
        summary += '\n';
    }
    // List top files
    const topFiles = files.sort((a, b) => b.functions - a.functions).slice(0, 5);
    if (topFiles.length > 0) {
        summary += `## Top Components\n`;
        topFiles.forEach(file => {
            summary += `- **${path.basename(file.path)}** (${file.functions} functions, ${file.lines} lines)\n`;
        });
    }
    return summary;
}
//# sourceMappingURL=codebaseAnalyzer.js.map