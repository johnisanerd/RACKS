#!/usr/bin/env ts-node
/**
 * Run RACKS Diagnostics
 * Execute all 7 diagnostic agents and collect issues
 */

import { SubagentPool } from '../subagents/pool.js';
import { runRACKSDiagnostics } from '../agents/diagnosticsRunner.js';

async function main() {
  console.log('\n');
  console.log('╔════════════════════════════════════════╗');
  console.log('║  🤖 RACKS COMPREHENSIVE DIAGNOSTICS   ║');
  console.log('║     7 Parallel Agents Analysis        ║');
  console.log('╚════════════════════════════════════════╝\n');

  const pool = new SubagentPool(9);

  try {
    const result = await runRACKSDiagnostics(pool);

    // Save detailed report
    const reportPath = './diagnostic-report.json';
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);
    console.log(`📊 Issues to fix: ${result.issues.length + result.bugs.length + result.optimizations.length}`);

    // Action items
    console.log('\n🎯 RECOMMENDED ACTIONS (Priority Order):');
    console.log('═'.repeat(50) + '\n');

    if (result.bugs.length > 0) {
      console.log(`1️⃣  FIX BUGS (${result.bugs.length} items)\n`);
      result.bugs.slice(0, 3).forEach((b, i) => {
        console.log(`   ${String.fromCharCode(65 + i)}) ${b}`);
      });
    }

    if (result.issues.length > 0) {
      console.log(`\n2️⃣  ADDRESS RESEARCH ISSUES (${result.issues.length} items)\n`);
      result.issues.slice(0, 3).forEach((i, idx) => {
        console.log(`   ${String.fromCharCode(65 + idx)}) ${i}`);
      });
    }

    if (result.optimizations.length > 0) {
      console.log(`\n3️⃣  IMPLEMENT OPTIMIZATIONS (${result.optimizations.length} items)\n`);
      result.optimizations.slice(0, 3).forEach((o, idx) => {
        console.log(`   ${String.fromCharCode(65 + idx)}) ${o}`);
      });
    }

    console.log('\n' + '═'.repeat(50));
    console.log('✅ Diagnostic phase complete');
    console.log('\nNext: npx ts-node src/cli/fixBugsAuto.ts\n');
  } catch (error) {
    console.error('❌ Diagnostic failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main().catch(console.error);
