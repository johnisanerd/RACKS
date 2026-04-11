/**
 * Deep Research Orchestrator — Planning + Research + Reflection Loop
 *
 * Architecture:
 * 1. PLANNING: Decompose question into logical sections/subtopics
 * 2. RESEARCH: For each section, spawn parallel subagents to research
 * 3. REFLECTION: Analyze coverage/gaps, decide if more research needed
 * 4. LOOP: Continue until coverage × confidence > threshold or time/iterations exhausted
 *
 * Key Insight: Don't just iterate blindly. Plan the structure, research
 * methodically per section, reflect on what's missing.
 */
import type { ResearchTask } from './taskQueue.js';
export interface ResearchSection {
    id: string;
    title: string;
    description: string;
    keyQuestions: string[];
    priority: 'high' | 'medium' | 'low';
}
export interface SectionAnalysis {
    keyInsights: string[];
    contradictions: string[];
    implications: string[];
    gaps: string[];
}
export interface SectionFindings {
    sectionId: string;
    sectionTitle: string;
    facts: string[];
    quotes: string[];
    statistics: Record<string, string>;
    sources: string[];
    confidence: number;
    researched: boolean;
    analysis?: SectionAnalysis;
}
export interface ResearchPlan {
    question: string;
    sections: ResearchSection[];
    totalEstimatedSources: number;
    researchStrategy: string;
}
export interface ResearchState {
    plan: ResearchPlan;
    findings: Map<string, SectionFindings>;
    iteration: number;
    coverage: number;
    confidence: number;
    readyScore: number;
    gaps: string[];
    report?: string;
}
export interface ResearchConfig {
    maxIterations: number;
    sourcesPerSection: number;
    coverageThreshold: number;
    maxParallelAgents: number;
    timeoutMs?: number;
}
declare const EXTRACTION_MODEL: string;
export { EXTRACTION_MODEL };
export declare const STANDARD_RESEARCH_CONFIG: ResearchConfig;
export declare class DeepResearchOrchestrator {
    private config;
    private agentPool;
    private startTime;
    constructor(configOverrides?: Partial<ResearchConfig>);
    /**
     * Decompose question into logical research sections
     */
    planResearch(question: string): Promise<ResearchPlan>;
    /**
     * Research a single section using parallel subagents.
     * All subagent queries fire simultaneously via Promise.all.
     * After aggregation, YouTube URLs found in sources are fetched in
     * parallel (concurrency capped at 3 via p-limit) and their transcript
     * summaries are appended as additional facts.
     */
    researchSection(section: ResearchSection, existingFindings: Map<string, SectionFindings>, taskId?: string): Promise<SectionFindings>;
    /**
     * Reasoning layer: given raw facts, derive insights, find contradictions,
     * and identify what the data actually means. This is what makes the difference
     * between fact-dumping and genuine research.
     */
    private reasonAboutFindings;
    /**
     * Generate and validate search queries for a section.
     * Tests queries against real search engines before deployment.
     * Ensures queries are relevant and not casting nets too wide.
     */
    private generateSearchQueries;
    /**
     * Score confidence of findings (0-1 scale) — STRICT MODE.
     * Much higher thresholds required for high confidence.
     * Based on: source count, fact density, source diversity, and contradiction analysis.
     */
    private scoreConfidence;
    private categorizeSource;
    /**
     * Analyze coverage and identify gaps
     */
    analyzeGaps(plan: ResearchPlan, findings: Map<string, SectionFindings>): Promise<string[]>;
    /**
     * Run reflection agent (Devil's Advocate, Depth Auditor, Coverage Checker).
     * Provides top-5 facts per section plus confidence score and source count
     * so the model has richer signal to detect gaps.
     */
    private runReflectionAgent;
    /**
     * Main orchestration loop: Plan -> Research -> Reflect -> Loop
     */
    orchestrate(task: ResearchTask, onProgress?: (state: ResearchState) => void): Promise<ResearchState>;
    /**
     * Synthesize all section findings into a final markdown report.
     * Uses hierarchical summarization: section summaries → final report.
     */
    synthesize(state: ResearchState, taskId?: string): Promise<string>;
    close(): void;
}
//# sourceMappingURL=orchestrator.d.ts.map