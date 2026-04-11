/**
 * PHASE 3: Reflection & Gap Analysis
 *
 * Analyzes coverage, identifies gaps, and determines if more research is needed.
 */
import type { ResearchPlan } from './planner.js';
import type { SectionFindings } from './researcher.js';
/**
 * Analyze coverage and identify gaps based on initial findings.
 * Returns list of gaps that should trigger additional research.
 */
export declare function analyzeGaps(plan: ResearchPlan, findings: Map<string, SectionFindings>): Promise<string[]>;
/**
 * Calculate overall research coverage (0-1 scale).
 */
export declare function calculateCoverage(plan: ResearchPlan, findings: Map<string, SectionFindings>): number;
/**
 * Calculate overall confidence across all sections.
 */
export declare function calculateConfidence(plan: ResearchPlan, findings: Map<string, SectionFindings>): number;
/**
 * Determine if research should continue based on coverage and confidence.
 */
export declare function shouldContinueResearch(plan: ResearchPlan, findings: Map<string, SectionFindings>, gaps: string[], iteration: number, maxIterations: number, coverageThreshold?: number): boolean;
//# sourceMappingURL=reflector.d.ts.map