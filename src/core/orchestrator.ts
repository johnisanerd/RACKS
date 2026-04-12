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
import { planResearch, generateSearchQueries, type ResearchPlan, type ResearchSection } from './phases/planner.js';
import { researchSection, type SectionFindings } from './phases/researcher.js';
import { analyzeGaps, shouldContinueResearch, calculateCoverage, calculateConfidence } from './phases/reflector.js';
import { synthesizeReport, type ResearchState } from './phases/synthesizer.js';
import { generateMarketingPlan } from './marketingResearch.js';
import { searchDuringResearch, isContext1Available } from '../services/context1ProductionHarness.js';

import type { ResearchTask } from './taskQueue.js';
import type { IntakeAnswers } from '../cli/commands/intake.js';

const log = createLogger('deepResearchOrchestrator');

// ─────────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────────

export interface ResearchConfig {
  maxIterations: number;
  sourcesPerSection: number;
  coverageThreshold: number;
  maxParallelAgents: number;
  timeoutMs?: number;
}

export const STANDARD_RESEARCH_CONFIG: ResearchConfig = {
  maxIterations: 12,
  sourcesPerSection: 500,
  coverageThreshold: 0.80,
  maxParallelAgents: 7,
  timeoutMs: 2 * 60 * 60 * 1000
};

// Plateau detection threshold: stop if ready score improves by less than 1% for 2 consecutive iterations
export const PLATEAU_IMPROVEMENT_THRESHOLD = 0.01;
export const PLATEAU_ITERATIONS_BEFORE_STOP = 2;

// ─────────────────────────────────────────────────────────────
// EXPORTS (for backward compatibility with CLI)
// ─────────────────────────────────────────────────────────────

// Re-export types and utilities
export type { ResearchSection, ResearchPlan } from './phases/planner.js';
export type { SectionFindings } from './phases/researcher.js';
export type { ResearchState } from './phases/synthesizer.js';
export { generateSearchQueries };

// ─────────────────────────────────────────────────────────────
// ORCHESTRATOR
// ─────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────
// MARKETING RESEARCH DETECTION
// ─────────────────────────────────────────────────────────────

/**
 * Detect if a question is marketing/brand research.
 * Routes to the 5-step marketing plan instead of generic LLM planning.
 */
function isMarketingResearch(question: string, intake?: IntakeAnswers): boolean {
  // If intake provided brand URL, product name, or audience — it's marketing research
  if (intake?.brandUrl || intake?.productName || intake?.targetAudience) return true;

  // Keyword heuristics
  const marketingKeywords = [
    'marketing', 'brand', 'competitor', 'customer', 'audience', 'supplement',
    'product', 'advertising', 'creative', 'ad copy', 'positioning', 'market research',
    'desire', 'objection', 'amazon review', 'identity', 'buyer', 'purchase',
    'sell', 'campaign', 'target market', 'demographic', 'consumer'
  ];

  const lq = question.toLowerCase();
  return marketingKeywords.some(kw => lq.includes(kw));
}

export class DeepResearchOrchestrator {
  private config: ResearchConfig;
  private agentPool: SubagentPool;
  private startTime: number = 0;
  private intake?: IntakeAnswers;

  constructor(configOverrides?: Partial<ResearchConfig>, intake?: IntakeAnswers) {
    this.config = { ...STANDARD_RESEARCH_CONFIG, ...configOverrides };
    this.agentPool = new SubagentPool(this.config.maxParallelAgents);
    this.intake = intake;
  }

  /**
   * Main orchestration loop: Plan → Research → Reflect → Loop → Synthesize
   */
  async orchestrate(
    task: ResearchTask,
    onProgress?: (state: ResearchState) => void
  ): Promise<ResearchState> {
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
    } catch (err) {
      log.warn(`Storage init failed for task ${task.id}:`, err);
    }

    // ─────────────────────────────────────────────────────────────
    // PHASE 1: PLAN
    // ─────────────────────────────────────────────────────────────

    liveDisplay.logEvent('  Planning research structure...');

    let plan: ResearchPlan;

    if (isMarketingResearch(task.question, this.intake)) {
      // Marketing research: use the 5-step PDF workflow
      liveDisplay.logEvent('  Detected marketing research — using 5-step marketing workflow');
      log.info('Using marketing research plan (brand_analysis → desire → competitor → identity → amazon)');

      const { sections, researchStrategy } = generateMarketingPlan(
        task.question,
        this.intake?.brandUrl,
        this.intake?.targetAudience,
        undefined  // all 5 sections
      );

      plan = {
        question: task.question,
        sections,
        researchStrategy,
        totalEstimatedSources: sections.length * this.config.sourcesPerSection,
      };

      liveDisplay.logEvent(`  Strategy: ${researchStrategy}`);
    } else {
      // Generic research: LLM-generated plan
      plan = await planResearch(task.question, this.config.sourcesPerSection);
    }
    log.info(`Created plan with ${plan.sections.length} sections`);

    const state: ResearchState = {
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
      const synthesisReserve = 120_000;
      const researchBudget = (this.config.timeoutMs ?? Infinity) - synthesisReserve;
      if (Date.now() - this.startTime > researchBudget) {
        log.warn(`Research budget exhausted — reserving time for synthesis`);
        liveDisplay.logEvent('  Time limit reached — writing report...');
        break;
      }

      // Research all sections in parallel
      liveDisplay.updateHeader({ activeAgents: plan.sections.length });

      // Build Context-1 corpus from gathered findings (for query enrichment)
      const c1Corpus = Array.from(state.findings.entries()).map(([sectionId, f]) => ({
        url: f.sources[0] || `findings://${sectionId}`,
        title: f.sectionTitle,
        content: f.facts.slice(0, 40).map((fact, j) => `${j + 1}. ${fact}`).join('\n'),
      })).filter(doc => doc.content.length > 0);

      const c1Available = c1Corpus.length > 0 && await isContext1Available();

      const sectionResults = await Promise.allSettled(
        plan.sections.map(async (section) => {
          let existingFacts: string[];

          // Use Context-1 for smarter existing-facts context (only from iteration 2 on)
          if (c1Available && i > 1) {
            try {
              const retrieved = await searchDuringResearch(
                section.description,
                c1Corpus,
                { maxChunks: 6, maxSteps: 3 }
              );
              existingFacts = retrieved.chunks
                .map(c => c.content)
                .flatMap(text => text.split('\n').filter(l => /^\d+\./.test(l)))
                .slice(0, 10);
              if (existingFacts.length > 0) {
                log.info(`C1 retrieved ${existingFacts.length} relevant existing facts for section "${section.title}"`);
              }
            } catch (err) {
              log.warn(`C1 search failed for section "${section.title}", falling back to direct facts:`, err);
              existingFacts = Array.from(state.findings.values())
                .flatMap(f => f.facts.slice(0, 2))
                .slice(0, 10);
            }
          } else {
            // Before we have a corpus, or C1 not available — use direct facts
            existingFacts = Array.from(state.findings.values())
              .flatMap(f => f.facts.slice(0, 2))
              .slice(0, 10);
          }

          let queries: string[];
          try {
            queries = await generateSearchQueries(section, existingFacts);
          } catch (err) {
            log.warn(`Failed to generate search queries for section "${section.title}":`, err);
            queries = [section.title]; // Fallback to section title as query
          }

          // Research the section
          return researchSection(section, this.agentPool, queries, task.id);
        })
      );

      // Store results in state, handle settled promises
      sectionResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          state.findings.set(plan.sections[index].id, result.value);
        } else {
          log.warn(`Section "${plan.sections[index].title}" research failed:`, result.reason);
          // Keep existing findings for this section if available
          if (!state.findings.has(plan.sections[index].id)) {
            state.findings.set(plan.sections[index].id, {
              sectionId: plan.sections[index].id,
              sectionTitle: plan.sections[index].title,
              facts: [],
              quotes: [],
              statistics: {},
              sources: [],
              confidence: 0,
              researched: false
            });
          }
        }
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
      if (Math.abs(state.readyScore - previousReadyScore) < PLATEAU_IMPROVEMENT_THRESHOLD) {
        plateauCount++;
        if (plateauCount >= PLATEAU_ITERATIONS_BEFORE_STOP) {
          log.warn(`Plateau detected (< ${(PLATEAU_IMPROVEMENT_THRESHOLD * 100).toFixed(0)}% improvement for ${PLATEAU_ITERATIONS_BEFORE_STOP} iterations)`);
          liveDisplay.logEvent(`  Plateau detected — no improvement in last ${PLATEAU_ITERATIONS_BEFORE_STOP} iterations, stopping early`);
          break;
        }
      } else {
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
    } catch (err) {
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
  close(): void {
    this.agentPool.close();
  }
}
