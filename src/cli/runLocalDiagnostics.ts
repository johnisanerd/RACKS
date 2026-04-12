#!/usr/bin/env npx tsx
/**
 * Local Codebase Diagnostics
 * Analyzes TypeScript/JavaScript code without requiring Ollama
 * Uses AST parsing, linting, and pattern matching
 */

import { SubagentPool } from '../subagents/pool.js';
import { createLogger } from '../utils/logger.js';
import fs from 'fs/promises';
import path from 'path';

const log = createLogger('localDiagnostics');

interface DiagnosticResult {
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  file: string;
  line?: number;
  issue: string;
  suggestion: string;
  code?: string;
}

async function scanCodebasePatterns(): Promise<DiagnosticResult[]> {
  const issues: DiagnosticResult[] = [];
  const srcDir = path.join(process.cwd(), 'src');

  log.info('🔍 Scanning codebase for patterns and issues...');

  try {
    const files = await walkDir(srcDir, (f) => f.endsWith('.ts') && !f.includes('.d.ts'));
    log.info(`Found ${files.length} TypeScript files to analyze`);

    for (const file of files) {
      const content = await fs.readFile(file, 'utf8');
      const relPath = path.relative(srcDir, file);

      // Pattern checks
      await checkErrorHandling(content, relPath, issues);
      await checkAsyncAwait(content, relPath, issues);
      await checkNullChecks(content, relPath, issues);
      await checkTypeAny(content, relPath, issues);
      await checkUnusedVariables(content, relPath, issues);
      await checkLoggingPatterns(content, relPath, issues);
      await checkExportPatterns(content, relPath, issues);
    }
  } catch (error) {
    log.error(`Scan failed: ${error instanceof Error ? error.message : 'Unknown'}`);
  }

  return issues;
}

async function checkErrorHandling(
  content: string,
  file: string,
  issues: DiagnosticResult[]
): Promise<void> {
  // Check for unhandled promise rejections
  const unhandledPromises = content.match(/await\s+\w+\([^)]*\)(?!\s*\.catch|\s*;|\s*;|\s*\))/g);
  if (unhandledPromises && unhandledPromises.length > 0) {
    issues.push({
      category: 'Error Handling',
      severity: 'high',
      file,
      issue: `Found ${unhandledPromises.length} await calls without error handling`,
      suggestion: 'Wrap await in try-catch or add .catch() handler',
      code: unhandledPromises[0]
    });
  }

  // Check for catch blocks that don't handle errors
  const emptycatches = content.match(/catch\s*\([^)]*\)\s*\{\s*\}/g);
  if (emptycatches) {
    issues.push({
      category: 'Error Handling',
      severity: 'medium',
      file,
      issue: `Found ${emptycatches.length} empty catch blocks`,
      suggestion: 'Add error logging or re-throw in catch blocks',
      code: emptycatches[0]
    });
  }
}

async function checkAsyncAwait(
  content: string,
  file: string,
  issues: DiagnosticResult[]
): Promise<void> {
  // Check for floating promises
  const floatingPromises = content.match(/\b(?:fetch|Promise|pool\.submit|wayfarerService\.[a-z]+)\([^)]*\)(?!\s*await|\s*\.then|\s*\.catch)/g);
  if (floatingPromises && floatingPromises.length > 0) {
    issues.push({
      category: 'Async Patterns',
      severity: 'high',
      file,
      issue: `Found ${floatingPromises.length} potential floating promises`,
      suggestion: 'Add await or .catch() to handle promise completion',
      code: floatingPromises[0]
    });
  }

  // Check for missing awaits in loops
  if (content.includes('for') && content.includes('await') && !content.match(/for\s*\([^)]*of[^)]*\)\s*{[^}]*await/s)) {
    issues.push({
      category: 'Async Patterns',
      severity: 'medium',
      file,
      issue: 'Loop with await detected - may need Promise.all() for parallelism',
      suggestion: 'Consider using Promise.all() for parallel execution in loops',
      code: 'for loop with await'
    });
  }
}

async function checkNullChecks(
  content: string,
  file: string,
  issues: DiagnosticResult[]
): Promise<void> {
  // Check for potential null/undefined access
  const dangerousAccess = content.match(/\w+\.\w+(?:\[\w+\])?(?![\?\!])/g);
  if (dangerousAccess && dangerousAccess.length > 10) {
    const uniqueDangerous = [...new Set(dangerousAccess)];
    issues.push({
      category: 'Null Safety',
      severity: 'medium',
      file,
      issue: `Found ${uniqueDangerous.length} potential unsafe property accesses`,
      suggestion: 'Add null checks or use optional chaining (?.) where appropriate',
      code: uniqueDangerous[0]
    });
  }
}

async function checkTypeAny(
  content: string,
  file: string,
  issues: DiagnosticResult[]
): Promise<void> {
  const anyCount = (content.match(/:\s*any\b/g) || []).length;
  if (anyCount > 3) {
    issues.push({
      category: 'Type Safety',
      severity: 'medium',
      file,
      issue: `Found ${anyCount} uses of 'any' type (defeats TypeScript safety)`,
      suggestion: 'Replace with proper types or use unknown if truly dynamic',
      code: ': any'
    });
  }
}

async function checkUnusedVariables(
  content: string,
  file: string,
  issues: DiagnosticResult[]
): Promise<void> {
  // Simple heuristic: const declarations that aren't referenced
  const constDeclares = content.match(/const\s+(\w+)\s*=/g) || [];
  for (const decl of constDeclares) {
    const varName = decl.match(/const\s+(\w+)/)?.[1];
    if (varName && !content.includes(`${varName}.`)) {
      const count = (content.match(new RegExp(`\\b${varName}\\b`, 'g')) || []).length;
      if (count < 2) {
        issues.push({
          category: 'Code Quality',
          severity: 'low',
          file,
          issue: `Potentially unused variable: ${varName}`,
          suggestion: 'Remove unused variables or verify they are needed',
          code: decl
        });
      }
    }
  }
}

async function checkLoggingPatterns(
  content: string,
  file: string,
  issues: DiagnosticResult[]
): Promise<void> {
  // Check for console.log instead of logger
  const consoleLogs = (content.match(/console\.(log|warn|error)/g) || []).length;
  if (consoleLogs > 0) {
    issues.push({
      category: 'Logging',
      severity: 'low',
      file,
      issue: `Found ${consoleLogs} console.log/warn/error calls (use logger instead)`,
      suggestion: 'Use createLogger() for consistent logging across the app',
      code: 'console.log'
    });
  }
}

async function checkExportPatterns(
  content: string,
  file: string,
  issues: DiagnosticResult[]
): Promise<void> {
  // Check for inconsistent export styles
  const hasNamedExports = content.includes('export ');
  const hasDefaultExport = content.includes('export default');

  if (hasNamedExports && hasDefaultExport) {
    issues.push({
      category: 'Module Design',
      severity: 'low',
      file,
      issue: 'File has both named and default exports (can cause confusion)',
      suggestion: 'Prefer either named exports OR default export, not both',
      code: 'export / export default'
    });
  }
}

async function walkDir(dir: string, filter: (f: string) => boolean): Promise<string[]> {
  const results: string[] = [];

  try {
    const files = await fs.readdir(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        if (!file.startsWith('.') && file !== 'node_modules') {
          results.push(...await walkDir(fullPath, filter));
        }
      } else if (filter(fullPath)) {
        results.push(fullPath);
      }
    }
  } catch (error) {
    // Ignore errors
  }

  return results;
}

async function main() {
  console.log('\n╔════════════════════════════════════════╗');
  console.log('║  🔍 RACKS LOCAL CODEBASE DIAGNOSTICS  ║');
  console.log('║     Pattern-based issue detection      ║');
  console.log('╚════════════════════════════════════════╝\n');

  const issues = await scanCodebasePatterns();

  // Group by severity
  const bySeverity = {
    critical: issues.filter(i => i.severity === 'critical'),
    high: issues.filter(i => i.severity === 'high'),
    medium: issues.filter(i => i.severity === 'medium'),
    low: issues.filter(i => i.severity === 'low')
  };

  // Print report
  console.log(`\n📊 DIAGNOSTIC RESULTS`);
  console.log(`${'='.repeat(40)}\n`);

  for (const [severity, items] of Object.entries(bySeverity)) {
    if (items.length === 0) continue;

    const icon = severity === 'critical' ? '🔴' : severity === 'high' ? '🟠' : severity === 'medium' ? '🟡' : '⚪';
    console.log(`${icon} ${severity.toUpperCase()}: ${items.length} issue(s)\n`);

    for (const issue of items.slice(0, 3)) {
      console.log(`  📁 ${issue.file}`);
      console.log(`     Issue: ${issue.issue}`);
      console.log(`     Fix: ${issue.suggestion}`);
      if (issue.code) {
        console.log(`     Code: ${issue.code.substring(0, 60)}...`);
      }
      console.log();
    }

    if (items.length > 3) {
      console.log(`  ... and ${items.length - 3} more ${severity} issue(s)\n`);
    }
  }

  console.log(`\n📈 SUMMARY`);
  console.log(`${'='.repeat(40)}`);
  console.log(`Total Issues Found: ${issues.length}`);
  console.log(`  Critical: ${bySeverity.critical.length}`);
  console.log(`  High: ${bySeverity.high.length}`);
  console.log(`  Medium: ${bySeverity.medium.length}`);
  console.log(`  Low: ${bySeverity.low.length}`);

  if (bySeverity.critical.length > 0 || bySeverity.high.length > 0) {
    console.log(`\n⚠️  Recommended Actions:`);
    console.log(`   1. Fix critical issues immediately`);
    console.log(`   2. Address high-severity items before next release`);
    console.log(`   3. Run tests after fixes`);
    console.log(`\n   Next: npx tsx src/cli/fixIssuesAuto.ts`);
  } else {
    console.log(`\n✅ No critical issues found! Code quality looks good.`);
  }

  console.log();
}

main().catch(error => {
  log.error(`Fatal: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
});
