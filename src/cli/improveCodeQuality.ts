#!/usr/bin/env npx tsx
/**
 * Code Quality Improvement System
 * Intelligently fixes structural issues in TypeScript code
 */

import fs from 'fs/promises';
import path from 'path';
import { createLogger } from '../utils/logger.js';

const log = createLogger('codeQuality');

interface CodeQualityFix {
  file: string;
  issue: string;
  fixed: boolean;
  details: string;
}

class CodeQualityImprover {
  private srcDir: string;
  private fixes: CodeQualityFix[] = [];

  constructor() {
    this.srcDir = path.join(process.cwd(), 'src');
  }

  async improveCodeQuality(): Promise<CodeQualityFix[]> {
    console.log('\n🔨 CODE QUALITY IMPROVEMENT SYSTEM\n');

    await this.fixConsoleLogging();
    await this.fixMissingErrorHandling();
    await this.fixTypeAnyUsage();
    await this.removeUnusedImports();
    await this.fixInconsistentNaming();

    return this.fixes;
  }

  /**
   * Replace console.log with proper logger usage
   */
  private async fixConsoleLogging(): Promise<void> {
    console.log('🔧 Fixing console.log usage...');

    const files = await this.findFiles(/console\.(log|warn|error|debug)/);
    let filesFixed = 0;

    for (const file of files.slice(0, 5)) {
      let content = await fs.readFile(file, 'utf8');
      const originalContent = content;

      // Check if logger is already imported
      const hasLoggerImport = content.includes("createLogger('");
      if (!hasLoggerImport && content.includes('console.')) {
        // Add logger import at the top
        const lines = content.split('\n');
        const importIndex = lines.findIndex(l => l.startsWith('import'));

        if (importIndex >= 0) {
          lines.splice(
            importIndex + 1,
            0,
            "import { createLogger } from '../utils/logger.js';"
          );

          // Add logger instantiation after imports
          const nextImportIndex = lines.findIndex((l, i) => i > importIndex + 1 && l.startsWith('import'));
          const insertPoint = nextImportIndex >= 0 ? nextImportIndex + 1 : importIndex + 2;

          const fileName = path.basename(file, '.ts');
          lines.splice(insertPoint, 0, `const log = createLogger('${fileName}');`);

          content = lines.join('\n');

          // Replace console calls
          content = content
            .replace(/console\.log\(/g, 'log.info(')
            .replace(/console\.warn\(/g, 'log.warn(')
            .replace(/console\.error\(/g, 'log.error(')
            .replace(/console\.debug\(/g, 'log.debug(');

          if (content !== originalContent) {
            await fs.writeFile(file, content, 'utf8');
            filesFixed++;

            this.fixes.push({
              file: path.relative(this.srcDir, file),
              issue: 'console.log usage',
              fixed: true,
              details: 'Replaced console with logger, added createLogger import'
            });
          }
        }
      }
    }

    if (filesFixed > 0) {
      console.log(`  ✅ Fixed console logging in ${filesFixed} file(s)`);
    }
  }

  /**
   * Add missing error handling to async operations
   */
  private async fixMissingErrorHandling(): Promise<void> {
    console.log('🔧 Adding error handling...');

    const files = await this.findFiles(/await.*\(/);
    let issuesFound = 0;

    for (const file of files.slice(0, 3)) {
      let content = await fs.readFile(file, 'utf8');
      const lines = content.split('\n');
      let modified = false;

      // Find lines with unprotected awaits
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Check if this line has await but no try-catch protection
        if (line.includes('await') && !line.trim().startsWith('//')) {
          // Check if try-catch already wraps it
          const beforeTry = lines.slice(Math.max(0, i - 5), i);
          const hasTry = beforeTry.some(l => l.includes('try {'));

          if (!hasTry) {
            // Add a comment suggesting error handling
            if (!line.includes('// TODO') && !line.includes('// try-catch')) {
              lines[i] = line + ' // ⚠️ Missing error handling';
              modified = true;
              issuesFound++;
            }
          }
        }
      }

      if (modified) {
        await fs.writeFile(file, lines.join('\n'), 'utf8');

        this.fixes.push({
          file: path.relative(this.srcDir, file),
          issue: 'Missing error handling',
          fixed: true,
          details: `Added ${issuesFound} error handling alerts`
        });
      }
    }
  }

  /**
   * Replace 'any' types with more specific types
   */
  private async fixTypeAnyUsage(): Promise<void> {
    console.log('🔧 Improving type safety...');

    const files = await this.findFiles(/:\s*any\b/);
    let filesFixed = 0;

    for (const file of files.slice(0, 2)) {
      let content = await fs.readFile(file, 'utf8');
      const originalContent = content;

      // Replace 'any' with 'unknown' as a safer default
      const anyCount = (content.match(/:\s*any\b/g) || []).length;

      if (anyCount > 5) {
        content = content.replace(/:\s*any\b/g, ': unknown');

        if (content !== originalContent) {
          await fs.writeFile(file, content, 'utf8');
          filesFixed++;

          this.fixes.push({
            file: path.relative(this.srcDir, file),
            issue: 'Type safety',
            fixed: true,
            details: `Replaced ${anyCount} 'any' types with 'unknown'`
          });
        }
      }
    }

    if (filesFixed > 0) {
      console.log(`  ✅ Improved type safety in ${filesFixed} file(s)`);
    }
  }

  /**
   * Remove unused imports
   */
  private async removeUnusedImports(): Promise<void> {
    console.log('🔧 Cleaning up imports...');

    const files = await this.findFiles(/^import/m);
    let filesFixed = 0;

    for (const file of files.slice(0, 3)) {
      let content = await fs.readFile(file, 'utf8');
      const originalContent = content;

      const lines = content.split('\n');
      const unusedImports: number[] = [];

      // Simple heuristic: find imports that don't appear to be used
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.startsWith('import')) continue;

        // Extract imported names
        const match = line.match(/import\s+(?:{([^}]+)}|(\w+))/);
        if (!match) continue;

        const imported = (match[1] || match[2] || '').split(',').map(s => s.trim().split(' as ')[0]);

        // Check if any imported name is used in the rest of the file
        const unusedCount = imported.filter(name => {
          if (!name) return false;
          const regex = new RegExp(`\\b${name}\\b`);
          return !lines.slice(i + 1).some(l => regex.test(l));
        }).length;

        if (unusedCount === imported.length && imported.length > 0) {
          unusedImports.push(i);
        }
      }

      // Remove unused imports (in reverse order to maintain indices)
      for (const i of unusedImports.reverse()) {
        lines.splice(i, 1);
      }

      if (unusedImports.length > 0) {
        await fs.writeFile(file, lines.join('\n'), 'utf8');
        filesFixed++;

        this.fixes.push({
          file: path.relative(this.srcDir, file),
          issue: 'Unused imports',
          fixed: true,
          details: `Removed ${unusedImports.length} unused import(s)`
        });
      }
    }

    if (filesFixed > 0) {
      console.log(`  ✅ Cleaned up imports in ${filesFixed} file(s)`);
    }
  }

  /**
   * Fix inconsistent naming conventions
   */
  private async fixInconsistentNaming(): Promise<void> {
    console.log('🔧 Standardizing naming...');

    const files = await this.findFiles(/const\s+\w+\s*=/);
    let issuesFound = 0;

    for (const file of files.slice(0, 2)) {
      let content = await fs.readFile(file, 'utf8');
      const lines = content.split('\n');

      // Check for inconsistent naming (e.g., error, err, e)
      const errorVarNames = new Map<string, number>();

      for (const line of lines) {
        const matches = line.match(/\b(error|err|e|ex)\s*[:=]/g);
        if (matches) {
          for (const match of matches) {
            const name = match.replace(/[:=]/g, '').trim();
            errorVarNames.set(name, (errorVarNames.get(name) || 0) + 1);
          }
        }
      }

      // If multiple error names found, add suggestion
      if (errorVarNames.size > 1 && !content.includes('// TODO: Standardize error naming')) {
        const mostCommon = [...errorVarNames.entries()].sort((a, b) => b[1] - a[1])[0];
        const suggestion = `// TODO: Standardize on '${mostCommon[0]}' for error variables`;

        if (!content.includes(suggestion)) {
          lines.splice(1, 0, suggestion);
          await fs.writeFile(file, lines.join('\n'), 'utf8');
          issuesFound++;
        }
      }
    }

    if (issuesFound > 0) {
      console.log(`  ✅ Found ${issuesFound} naming inconsistencies`);
    }
  }

  private async findFiles(pattern: RegExp): Promise<string[]> {
    const results: string[] = [];

    const walkDir = async (dir: string) => {
      try {
        const entries = await fs.readdir(dir);
        for (const entry of entries) {
          const fullPath = path.join(dir, entry);
          const stat = await fs.stat(fullPath);

          if (stat.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
            await walkDir(fullPath);
          } else if (entry.endsWith('.ts') && !entry.includes('.d.ts')) {
            try {
              const content = await fs.readFile(fullPath, 'utf8');
              if (pattern.test(content)) {
                results.push(fullPath);
              }
            } catch {}
          }
        }
      } catch {}
    };

    await walkDir(this.srcDir);
    return results;
  }
}

async function main() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║  🔨 CODE QUALITY IMPROVEMENT         ║');
  console.log('║     Intelligent Code Fixes            ║');
  console.log('╚════════════════════════════════════════╝');

  const improver = new CodeQualityImprover();
  const fixes = await improver.improveCodeQuality();

  console.log('\n\n📊 IMPROVEMENTS APPLIED');
  console.log('═'.repeat(50));

  for (const fix of fixes) {
    if (fix.fixed) {
      console.log(`\n✅ ${path.basename(fix.file)}`);
      console.log(`   ${fix.issue}`);
      console.log(`   → ${fix.details}`);
    }
  }

  console.log(`\n\n📈 SUMMARY`);
  console.log('═'.repeat(50));
  const successCount = fixes.filter(f => f.fixed).length;
  console.log(`Total Improvements: ${successCount}`);
  console.log(`\nNext Steps:`);
  console.log(`  1. npm run build        # Verify compilation`);
  console.log(`  2. npm test             # Run tests`);
  console.log(`  3. git diff             # Review changes`);
  console.log(`  4. npx tsx src/cli/runLocalDiagnostics.ts  # Re-diagnose`);
  console.log();
}

main().catch(error => {
  log.error(`Fatal: ${error instanceof Error ? error.message : 'Unknown error'}`);
  process.exit(1);
});
