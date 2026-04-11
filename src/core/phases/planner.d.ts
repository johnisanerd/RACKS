/**
 * PHASE 1: Research Planning
 *
 * Decomposes a research question into logical sections/subtopics.
 * Each section becomes a unit of research that can be assigned to subagents.
 */
export interface ResearchSection {
    id: string;
    title: string;
    description: string;
    keyQuestions: string[];
    priority: 'high' | 'medium' | 'low';
}
export interface ResearchPlan {
    question: string;
    sections: ResearchSection[];
    totalEstimatedSources: number;
    researchStrategy: string;
}
/**
 * Decompose a research question into logical sections.
 * Each section represents a distinct topic that requires research.
 */
export declare function planResearch(question: string, sourcesPerSection?: number): Promise<ResearchPlan>;
/**
 * Generate targeted search queries for a specific section.
 * Includes validation to ensure queries are relevant.
 */
export declare function generateSearchQueries(section: ResearchSection, existingFacts?: string[]): Promise<string[]>;
//# sourceMappingURL=planner.d.ts.map