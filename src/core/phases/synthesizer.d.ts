/**
 * PHASE 5: Report Synthesis
 *
 * Transforms findings into a coherent research report.
 * Writes section summaries and generates an executive summary.
 */
import type { ResearchPlan } from './planner.js';
import type { SectionFindings } from './researcher.js';
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
/**
 * Synthesize research findings into a complete report.
 * Combines section summaries with an executive summary and bibliography.
 */
export declare function synthesizeReport(state: ResearchState, taskId?: string): Promise<string>;
/**
 * Format research findings as a simple text summary (for logging/display).
 */
export declare function formatFindingsSummary(findings: Map<string, SectionFindings>): string;
//# sourceMappingURL=synthesizer.d.ts.map