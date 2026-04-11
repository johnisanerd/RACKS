/**
 * PHASE 2: Research Execution
 *
 * Deploys subagents to research each section in parallel.
 * Combines findings, reasons about them, and indexes results.
 */
import { SubagentPool } from '../../subagents/pool.js';
import type { ResearchSection } from './planner.js';
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
/**
 * Research a single section using parallel subagents.
 * Combines findings, reasons about them, indexes results, and handles YouTube videos.
 */
export declare function researchSection(section: ResearchSection, pool: SubagentPool, queries: string[], taskId?: string): Promise<SectionFindings>;
//# sourceMappingURL=researcher.d.ts.map