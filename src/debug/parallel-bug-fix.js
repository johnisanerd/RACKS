/**
 * Parallel Bug Fix Orchestrator
 *
 * Deploys 3 subagents to fix bugs concurrently:
 * 1. JSON Extraction Robustness (fact extraction edge cases)
 * 2. Model Configuration Flexibility (remote/local switching)
 * 3. Error Resilience (cascade failure handling)
 */
import { SubagentPool } from '../subagents/pool.js';
import { createLogger } from '../utils/logger.js';
const log = createLogger('bug-fix-orchestrator');
const BUG_TASKS = [
    {
        id: 'bug-1-json-extraction',
        name: 'JSON Extraction Robustness',
        description: `Fix fact extraction in pool.ts to handle malformed LLM responses.
      - Implement multi-strategy JSON parsing (array, quoted strings, fallback)
      - Add comprehensive error logging for failed extractions
      - Test with real Wayfarer output samples
      - Ensure fallback facts are always created when extraction fails
      - File: src/subagents/pool.ts lines 123-150`,
        priority: 'critical',
        affectedFile: 'src/subagents/pool.ts',
    },
    {
        id: 'bug-2-model-config',
        name: 'Model Configuration Flexibility',
        description: `Make model registry support both local and remote Ollama seamlessly.
      - Add MODEL_SOURCE env var detection (local/remote)
      - Create model alias mapping for fallback models
      - Add validation that selected models exist before research starts
      - Generate helpful error messages when models unavailable
      - File: src/config/models.ts
      - Test: Verify qwen models work, gemma models work, fallbacks work`,
        priority: 'high',
        affectedFile: 'src/config/models.ts',
    },
    {
        id: 'bug-3-error-resilience',
        name: 'Cascade Failure Resilience',
        description: `Improve error handling so subagent failures don't cascade.
      - Add retry logic with exponential backoff for LLM calls
      - Implement circuit breaker pattern for failing models
      - Ensure partial results are preserved when some subagents fail
      - Add recovery mechanism to switch models if current one fails
      - File: src/core/phases/researcher.ts lines 298-410
      - Test: Simulate LLM timeout, network error, invalid response`,
        priority: 'high',
        affectedFile: 'src/core/phases/researcher.ts',
    },
];
export async function runParallelBugFix() {
    log.info('🐛 Parallel Bug Fix Orchestrator Starting');
    log.info(`Deploying ${BUG_TASKS.length} subagents to fix critical bugs\n`);
    const pool = new SubagentPool(3); // 3 concurrent subagents
    const bugFixPromises = BUG_TASKS.map((bug, index) => (async () => {
        log.info(`[Subagent ${index + 1}] Starting: ${bug.name} (Priority: ${bug.priority})`);
        const result = await pool.submit({
            role: 'bug-fixer',
            task: `Fix the following bug in RACKS codebase: ${bug.name}`,
            query: `Fix ${bug.name} in ${bug.affectedFile}:

${bug.description}

Requirements:
1. Read the affected file thoroughly
2. Understand the root cause
3. Implement a robust fix
4. Add inline comments explaining the fix
5. Ensure TypeScript compilation passes
6. Return a summary of changes made

Focus on code quality, error handling, and maintainability.`,
            context: `You are an expert bug fixer. Your role is to identify root causes and implement
        robust solutions that prevent similar bugs. Always add error logging and type safety.
        Priority: ${bug.priority}`,
            maxSteps: 8
        });
        if (result.success) {
            log.info(`✅ [Subagent ${index + 1}] ${bug.name} - FIXED`);
            return { bugId: bug.id, status: 'fixed', result };
        }
        else {
            log.warn(`⚠️  [Subagent ${index + 1}] ${bug.name} - PARTIAL (${result.error})`);
            return { bugId: bug.id, status: 'partial', result };
        }
    })());
    try {
        const results = await Promise.all(bugFixPromises);
        log.info('\n' + '='.repeat(60));
        log.info('🎯 BUG FIX RESULTS');
        log.info('='.repeat(60));
        const fixedCount = results.filter(r => r.status === 'fixed').length;
        const partialCount = results.filter(r => r.status === 'partial').length;
        results.forEach((result, idx) => {
            const bug = BUG_TASKS[idx];
            const status = result.status === 'fixed' ? '✅' : '⚠️ ';
            console.log(`\n${status} Bug ${idx + 1}: ${bug.name}`);
            console.log(`   Priority: ${bug.priority}`);
            console.log(`   File: ${bug.affectedFile}`);
            console.log(`   Status: ${result.status.toUpperCase()}`);
        });
        log.info('\n' + '='.repeat(60));
        log.info(`Summary: ${fixedCount} fixed, ${partialCount} partial`);
        log.info('Next: Run `npm run build` and `racks ask --depth sq` to test');
        log.info('='.repeat(60) + '\n');
    }
    catch (error) {
        log.error('Bug fix orchestration failed:', error);
        process.exit(1);
    }
    finally {
        pool.close();
    }
}
// Run if invoked directly
runParallelBugFix().catch(console.error);
//# sourceMappingURL=parallel-bug-fix.js.map