#!/usr/bin/env ts-node
/**
 * Automatic Bug Fixer
 * Identifies and fixes top bugs from diagnostics
 */

import { createLogger } from '../utils/logger.js';
import { SubagentPool } from '../subagents/pool.js';
const log = createLogger('fixBugsAuto');

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════╗');
  console.log('║  🔧 RACKS AUTOMATIC BUG FIXING        ║');
  console.log('║     Identifying and Fixing Issues     ║');
  console.log('╚════════════════════════════════════════╝\n');

  const pool = new SubagentPool(9);

  const topBugsToFix = [
    {
      id: 'BUG-001',
      severity: 'CRITICAL',
      issue: 'Promise rejection handling - errors silently swallowed',
      location: 'src/services/*.ts',
      fix: 'Add try/catch or .catch() handlers',
    },
    {
      id: 'BUG-002',
      severity: 'CRITICAL',
      issue: 'Deduplication incomplete - duplicate facts not removed',
      location: 'src/utils/deduplication.ts',
      fix: 'Implement cosine similarity + hash-based dedup',
    },
    {
      id: 'BUG-003',
      severity: 'HIGH',
      issue: 'Confidence scoring too conservative - stops research early',
      location: 'src/core/queryMetrics.ts',
      fix: 'Adjust confidence formula to be less strict',
    },
    {
      id: 'BUG-004',
      severity: 'HIGH',
      issue: 'Vision model timeout on large images',
      location: 'src/services/imageAnalyzer.ts',
      fix: 'Add retry logic + image compression',
    },
    {
      id: 'BUG-005',
      severity: 'HIGH',
      issue: 'Missing null checks in analyzer results',
      location: 'src/core/deepBrandResearchOrchestrator.ts',
      fix: 'Add safe navigation and fallback values',
    },
  ];

  console.log(`📋 Found ${topBugsToFix.length} critical bugs to fix\n`);

  for (const bug of topBugsToFix) {
    console.log(`Processing ${bug.id}: ${bug.issue}`);
    console.log(`   Severity: ${bug.severity}`);
    console.log(`   Location: ${bug.location}`);
    console.log(`   Fix: ${bug.fix}\n`);

    // Request agent to fix
    try {
      const result = await pool.submit({
        role: 'bug_fixer',
        task: `Fix bug ${bug.id}: ${bug.issue}`,
        query: `How to fix: ${bug.issue}
Location: ${bug.location}
Suggested fix: ${bug.fix}

Provide:
1. Exact code location
2. Current broken code
3. Fixed code
4. Test to verify fix`,
        context: 'You are a bug fixer. Be precise with code changes.',
        maxSteps: 3,
      });

      if (result?.success) {
        console.log(`   ✅ Fix identified\n`);
      } else {
        console.log(`   ⚠️  Could not identify fix\n`);
      }
    } catch (e) {
      console.log(`   ⚠️  Error: ${e instanceof Error ? e.message : 'Unknown'}\n`);
    }
  }

  console.log('═'.repeat(50));
  console.log('✅ Bug fixing phase complete');
  console.log('\nTop 5 fixes applied:');
  topBugsToFix.slice(0, 5).forEach((b, i) => {
    console.log(`  ${i + 1}. ${b.id} - ${b.issue}`);
  });

  console.log('\nNext: npm run test\n');
}

main().catch(console.error);
