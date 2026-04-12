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
import { generateSearchQueries } from './phases/planner.js';
import { type ResearchState } from './phases/synthesizer.js';
import type { ResearchTask } from './taskQueue.js';
import type { IntakeAnswers } from '../cli/commands/intake.js';
export interface ResearchConfig {
    maxIterations: number;
    sourcesPerSection: number;
    coverageThreshold: number;
    maxParallelAgents: number;
    timeoutMs?: number;
}
export declare const STANDARD_RESEARCH_CONFIG: ResearchConfig;
export declare const PLATEAU_IMPROVEMENT_THRESHOLD = 0.01;
export declare const PLATEAU_ITERATIONS_BEFORE_STOP = 2;
export type { ResearchSection, ResearchPlan } from './phases/planner.js';
export type { SectionFindings } from './phases/researcher.js';
export type { ResearchState } from './phases/synthesizer.js';
export { generateSearchQueries };
export declare class DeepResearchOrchestrator {
    private config;
    private agentPool;
    private startTime;
    private intake?;
    constructor(configOverrides?: Partial<ResearchConfig>, intake?: IntakeAnswers);
    /**
     * Main orchestration loop: Plan → Research → Reflect → Loop → Synthesize
     */
    orchestrate(task: ResearchTask, onProgress?: (state: ResearchState) => void): Promise<ResearchState>;
    /**
     * Close the agent pool and clean up resources.
     */
    close(): void;
}
//# sourceMappingURL=orchestrator.d.ts.map