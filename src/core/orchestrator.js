/**
 * Deep Research Orchestrator — Thin Coordinator
 *
 * Orchestrates the research workflow:
 * 1. PLANNING: Decompose question into sections (planner.ts)
 * 2. RESEARCH: Deploy subagents per section (researcher.ts)
 * 3. REFLECTION: Analyze gaps and decide if more research is needed (reflector.ts)
 * 4. SYNTHESIS: Generate final report (synthesizer.ts)
 *
 * This file is the main coordinator — it delegates to phase modules.
 */
import { context1Service } from '../services/context1Service.js';
import { storageService } from '../services/storageService.js';
import { SubagentPool } from '../subagents/pool.js';
import { createLogger } from '../utils/logger.js';
import { liveDisplay } from '../utils/liveDisplay.js';
// Phase modules
import { planResearch, generateSearchQueries } from './phases/planner.js';
import { researchSection } from './phases/researcher.js';
import { analyzeGaps, shouldContinueResearch, calculateCoverage, calculateConfidence } from './phases/reflector.js';
import { synthesizeReport } from './phases/synthesizer.js';
const log = createLogger('deepResearchOrchestrator');
export const STANDARD_RESEARCH_CONFIG = {
    maxIterations: 12,
    sourcesPerSection: 500,
    coverageThreshold: 0.80,
    maxParallelAgents: 7,
    timeoutMs: 2 * 60 * 60 * 1000
};
export { generateSearchQueries };
// ─────────────────────────────────────────────────────────────
// ORCHESTRATOR
// ─────────────────────────────────────────────────────────────
export class DeepResearchOrchestrator {
    constructor(configOverrides) {
        this.startTime = 0;
        this.config = { ...STANDARD_RESEARCH_CONFIG, ...configOverrides };
        this.agentPool = new SubagentPool(this.config.maxParallelAgents);
    }
    /**
     * Main orchestration loop: Plan → Research → Reflect → Loop → Synthesize
     */
    async orchestrate(task, onProgress) {
        this.startTime = Date.now();
        log.info(`Starting research orchestration for task: ${task.id}`);
        log.info(`Config: ${JSON.stringify(this.config)}`);
        liveDisplay.updateHeader({
            question: task.question,
            iteration: 0,
            maxIterations: this.config.maxIterations,
            coveragePct: 0,
            readyScore: 0,
            sourcesTotal: 0,
            activeAgents: 0,
            maxAgents: this.config.maxParallelAgents,
            elapsedMs: 0
        });
        // Initialize storage for this task
        try {
            await storageService.initTask(task.id);
            await storageService.updateManifest(task.id, { question: task.question });
        }
        catch (err) {
            log.warn(`Storage init failed for task ${task.id}:`, err);
        }
        // ─────────────────────────────────────────────────────────────
        // PHASE 1: PLAN
        // ─────────────────────────────────────────────────────────────
        liveDisplay.logEvent('  Planning research structure...');
        const plan = await planResearch(task.question, this.config.sourcesPerSection);
        log.info(`Created plan with ${plan.sections.length} sections`);
        const state = {
            plan,
            findings: new Map(),
            iteration: 0,
            coverage: 0,
            confidence: 0,
            readyScore: 0,
            gaps: []
        };
        // ─────────────────────────────────────────────────────────────
        // PHASE 2-4: RESEARCH LOOP
        // ─────────────────────────────────────────────────────────────
        let previousReadyScore = 0;
        let plateauCount = 0;
        for (let i = 1; i <= this.config.maxIterations; i++) {
            state.iteration = i;
            log.info(`Iteration ${i}/${this.config.maxIterations}`);
            liveDisplay.updateHeader({ iteration: i, elapsedMs: Date.now() - this.startTime });
            liveDisplay.logEvent(`\n  === Iteration ${i}/${this.config.maxIterations} ===`);
            // Check time limit — reserve 120s for synthesis
            const synthesisReserve = 120000;
            const researchBudget = (this.config.timeoutMs ?? Infinity) - synthesisReserve;
            if (Date.now() - this.startTime > researchBudget) {
                log.warn(`Research budget exhausted — reserving time for synthesis`);
                liveDisplay.logEvent('  Time limit reached — writing report...');
                break;
            }
            // Research all sections in parallel
            liveDisplay.updateHeader({ activeAgents: plan.sections.length });
            const sectionResults = await Promise.all(plan.sections.map(async (section) => {
                // Generate queries for this section
                const existingFacts = Array.from(state.findings.values())
                    .flatMap(f => f.facts.slice(0, 2))
                    .slice(0, 10);
                const queries = await generateSearchQueries(section, existingFacts);
                // Research the section
                return researchSection(section, this.agentPool, queries, task.id);
            }));
            // Store results in state
            sectionResults.forEach((findings, index) => {
                state.findings.set(plan.sections[index].id, findings);
            });
            liveDisplay.updateHeader({ activeAgents: 0 });
            // Evaluate coverage & confidence
            state.coverage = calculateCoverage(plan, state.findings) * 100;
            state.confidence = calculateConfidence(plan, state.findings);
            state.readyScore = (state.coverage / 100) * state.confidence;
            const totalSources = Array.from(state.findings.values()).reduce((sum, f) => sum + f.sources.length, 0);
            liveDisplay.updateHeader({
                coveragePct: state.coverage,
                readyScore: state.readyScore,
                sourcesTotal: totalSources,
                elapsedMs: Date.now() - this.startTime
            });
            log.info(`Coverage: ${state.coverage.toFixed(0)}% | Confidence: ${state.confidence.toFixed(2)} | Ready: ${state.readyScore.toFixed(2)}`);
            // Check termination conditions
            if (state.readyScore >= this.config.coverageThreshold) {
                log.info(`Ready score (${state.readyScore.toFixed(2)}) exceeds threshold (${this.config.coverageThreshold})`);
                liveDisplay.logEvent(`  Coverage threshold met — ready score ${state.readyScore.toFixed(2)} >= ${this.config.coverageThreshold}`);
                break;
            }
            // Plateau detection
            if (Math.abs(state.readyScore - previousReadyScore) < 0.01) {
                plateauCount++;
                if (plateauCount >= 2) {
                    log.warn(`Plateau detected (< 1% improvement for 2 iterations)`);
                    liveDisplay.logEvent('  Plateau detected — no improvement in last 2 iterations, stopping early');
                    break;
                }
            }
            else {
                plateauCount = 0;
            }
            previousReadyScore = state.readyScore;
            // Emit progress callback
            if (onProgress) {
                onProgress(state);
            }
            // Gap analysis (if not final iteration)
            if (i < this.config.maxIterations) {
                state.gaps = await analyzeGaps(plan, state.findings);
                log.info(`Identified ${state.gaps.length} gaps`);
                // Decide if should continue
                if (!shouldContinueResearch(plan, state.findings, state.gaps, i, this.config.maxIterations, this.config.coverageThreshold)) {
                    log.info('Termination condition met');
                    break;
                }
            }
        }
        // ─────────────────────────────────────────────────────────────
        // PHASE 5: SYNTHESIS
        // ─────────────────────────────────────────────────────────────
        const totalSources = Array.from(state.findings.values()).reduce((n, f) => n + f.sources.length, 0);
        liveDisplay.setAgentStatus('Synthesis', `Synthesizing ${totalSources} sources into report...`);
        liveDisplay.logEvent(`\n  Research complete — ready score: ${state.readyScore.toFixed(2)}, ${state.iteration} iteration(s)`);
        log.info(`Research complete. Ready score: ${state.readyScore.toFixed(2)}, Iterations: ${state.iteration}`);
        // Flush any pending embeddings so semantic search works in synthesis
        await context1Service.flush();
        // Generate final report
        try {
            const report = await synthesizeReport(state, task.id);
            state.report = report;
        }
        catch (err) {
            log.warn('Synthesis failed:', err);
            // Fallback: generate minimal report
            const totalFacts = Array.from(state.findings.values()).reduce((n, f) => n + f.facts.length, 0);
            state.report = `# Research Report: ${task.question}

**Generated:** ${new Date().toISOString()}
**Status:** Synthesis failed, showing gathered findings
**Sections:** ${state.plan.sections.length}
**Total Facts:** ${totalFacts}
**Total Sources:** ${totalSources}
**Coverage:** ${state.coverage.toFixed(0)}%

## Findings Summary

${Array.from(state.findings.entries())
                .filter(([_, f]) => f.researched)
                .map(([_, f]) => `### ${f.sectionTitle}\n\n- **Facts:** ${f.facts.length}\n- **Sources:** ${f.sources.length}`)
                .join('\n\n')}

*Note: Full section synthesis was unavailable; see detailed findings in structured data.*`;
        }
        liveDisplay.clearAgent('Synthesis');
        return state;
    }
    /**
     * Close the agent pool and clean up resources.
     */
    close() {
        this.agentPool.close();
    }
}
//# sourceMappingURL=orchestrator.js.map