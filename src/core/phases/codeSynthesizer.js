/**
 * Code Synthesizer — Generate markdown report from code analysis
 *
 * Transforms CodeAnalysis into a human-readable markdown report
 * with architecture overview, complexity analysis, and recommendations
 */
/**
 * Synthesize code analysis into markdown report
 */
export function synthesizeCodeReport(analysis, sourcePath) {
    let report = '';
    // Title and metadata
    report += `# Code Analysis Report: ${sourcePath}\n\n`;
    report += `**Generated:** ${new Date().toISOString()}\n`;
    report += `**Root Path:** ${analysis.rootPath}\n\n`;
    // Overview section
    report += generateOverviewSection(analysis);
    // Architecture section
    if (analysis.architecture.length > 0) {
        report += generateArchitectureSection(analysis);
    }
    // Files and complexity section
    report += generateFilesSection(analysis);
    // Dependencies section
    if (analysis.dependencies.length > 0) {
        report += generateDependenciesSection(analysis);
    }
    // Key insights
    report += generateInsightsSection(analysis);
    // Recommendations
    report += generateRecommendationsSection(analysis);
    return report;
}
/**
 * Generate overview section
 */
function generateOverviewSection(analysis) {
    let section = `## Overview\n\n`;
    const totalLines = analysis.complexity.totalLines;
    const fileCount = analysis.complexity.fileCount;
    const functionCount = analysis.allFunctions.length;
    section += `| Metric | Value |\n`;
    section += `|--------|-------|\n`;
    section += `| **Total Files** | ${fileCount} |\n`;
    section += `| **Total Lines** | ${totalLines.toLocaleString()} |\n`;
    section += `| **Functions/Methods** | ${functionCount} |\n`;
    section += `| **Avg Complexity** | ${analysis.complexity.averageComplexity.toFixed(1)} |\n`;
    section += `| **Max Complexity** | ${analysis.complexity.maxComplexity} |\n`;
    // Language breakdown
    const languages = new Map();
    for (const file of analysis.files) {
        languages.set(file.language, (languages.get(file.language) || 0) + 1);
    }
    section += `| **Languages** | ${Array.from(languages.entries()).map(([lang, count]) => `${lang} (${count})`).join(', ')} |\n\n`;
    return section;
}
/**
 * Generate architecture section
 */
function generateArchitectureSection(analysis) {
    let section = `## Architecture\n\n`;
    for (const pattern of analysis.architecture) {
        const confidence = `${(pattern.confidence * 100).toFixed(0)}%`;
        section += `### ${pattern.type}\n`;
        section += `**Confidence:** ${confidence}\n\n`;
        section += `${pattern.description}\n\n`;
    }
    return section;
}
/**
 * Generate files and complexity section
 */
function generateFilesSection(analysis) {
    let section = `## Components\n\n`;
    // Sort by complexity/functions
    const sorted = [...analysis.files].sort((a, b) => b.functions - a.functions);
    section += `| File | Functions | Classes | Lines | Complexity |\n`;
    section += `|------|-----------|---------|-------|------------|\n`;
    for (const file of sorted.slice(0, 20)) {
        const complexity = file.complexity.toFixed(1);
        section += `| \`${file.path}\` | ${file.functions} | ${file.classes} | ${file.lines} | ${complexity} |\n`;
    }
    if (sorted.length > 20) {
        section += `| ... and ${sorted.length - 20} more files | | | | |\n`;
    }
    section += '\n';
    return section;
}
/**
 * Generate dependencies section
 */
function generateDependenciesSection(analysis) {
    let section = `## Dependencies\n\n`;
    // Group by from file
    const dependencyMap = new Map();
    for (const edge of analysis.dependencies) {
        if (!dependencyMap.has(edge.from)) {
            dependencyMap.set(edge.from, new Map());
        }
        const toMap = dependencyMap.get(edge.from);
        const items = toMap.get(edge.to) || [];
        toMap.set(edge.to, [...items, ...edge.items]);
    }
    // Show top dependencies
    const topDeps = Array.from(dependencyMap.entries())
        .map(([from, toMap]) => ({ from, count: toMap.size }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
    section += `### Most Connected Files\n\n`;
    for (const dep of topDeps) {
        const toMap = dependencyMap.get(dep.from);
        if (toMap) {
            section += `- **${dep.from}** imports/calls from ${dep.count} other files\n`;
        }
    }
    section += '\n';
    return section;
}
/**
 * Generate insights section
 */
function generateInsightsSection(analysis) {
    let section = `## Key Insights\n\n`;
    // Identify hotspots (high complexity, high coupling)
    const hotspots = analysis.files
        .filter(f => f.complexity > analysis.complexity.averageComplexity * 1.5)
        .sort((a, b) => b.complexity - a.complexity)
        .slice(0, 5);
    if (hotspots.length > 0) {
        section += `### Complexity Hotspots\n\n`;
        section += `Files with above-average complexity (> ${(analysis.complexity.averageComplexity * 1.5).toFixed(1)}):\n\n`;
        for (const file of hotspots) {
            section += `- **${file.path}** (complexity: ${file.complexity.toFixed(1)}, ${file.functions} functions)\n`;
        }
        section += '\n';
    }
    // Identify isolated components
    const isolated = analysis.files.filter(f => {
        const incoming = analysis.dependencies.filter(d => d.to === f.path).length;
        const outgoing = analysis.dependencies.filter(d => d.from === f.path).length;
        return incoming === 0 && outgoing === 0;
    });
    if (isolated.length > 0 && isolated.length <= 5) {
        section += `### Independent Components\n\n`;
        section += `Components with no dependencies on/from other files:\n\n`;
        for (const file of isolated) {
            section += `- \`${file.path}\`\n`;
        }
        section += '\n';
    }
    return section;
}
/**
 * Generate recommendations section
 */
function generateRecommendationsSection(analysis) {
    let section = `## Recommendations\n\n`;
    const recommendations = [];
    // Check for large files
    const largeFiles = analysis.files.filter(f => f.lines > 500);
    if (largeFiles.length > 0) {
        recommendations.push(`Consider splitting large files (${largeFiles.length} files > 500 lines)`);
    }
    // Check for high complexity
    if (analysis.complexity.maxComplexity > 10) {
        recommendations.push('Some functions have high complexity — consider refactoring');
    }
    // Check for circular dependencies (simplified check)
    const hasCycles = analysis.dependencies.some(d1 => analysis.dependencies.some(d2 => d1.from === d2.to && d1.to === d2.from));
    if (hasCycles) {
        recommendations.push('Potential circular dependencies detected — review imports');
    }
    // Check for many dependencies
    if (analysis.dependencies.length > analysis.files.length * 5) {
        recommendations.push('High dependency count — consider reducing coupling');
    }
    // Architecture suggestions
    if (analysis.architecture.length === 0) {
        recommendations.push('No clear architecture pattern detected — consider establishing one');
    }
    // Export practices
    const heavyExports = analysis.files.filter(f => f.exports.length > 10);
    if (heavyExports.length > 3) {
        recommendations.push('Some files export many items — consider grouping related exports');
    }
    if (recommendations.length === 0) {
        section += `✅ **Overall Assessment:** Code structure appears well-organized.\n\n`;
    }
    else {
        for (let i = 0; i < recommendations.length; i++) {
            section += `${i + 1}. ${recommendations[i]}\n`;
        }
        section += '\n';
    }
    return section;
}
//# sourceMappingURL=codeSynthesizer.js.map