/**
 * ENHANCED Planner — Adaptive Multi-Platform Query Generation
 *
 * Improvements:
 * 1. Contradiction-aware queries (if conflicting facts found, suggest resolution queries)
 * 2. Gap-aware queries (based on coverage %, generate more detailed queries)
 * 3. Platform-aware multi-source queries (TikTok, Reddit, Trustpilot, Amazon, YouTube)
 * 4. Cross-platform synthesis (if TikTok shows emotional need, query Amazon reviews for same need)
 * 5. Domain knowledge seeding (pre-populate queries with learnings from past research)
 * 6. Adaptive depth (low confidence = generate deeper, more specific queries)
 * 7. Related angle suggestions (after core coverage > 80%, suggest tangential topics)
 */
export interface ResearchSection {
    id: string;
    title: string;
    description: string;
    keyQuestions: string[];
    priority: 'high' | 'medium' | 'low';
    scope: 'core' | 'related';
}
export interface ResearchPlan {
    question: string;
    sections: ResearchSection[];
    totalEstimatedSources: number;
    researchStrategy: string;
}
export interface QueryContext {
    findings?: string[];
    gaps?: string[];
    contradictions?: Array<{
        fact1: string;
        fact2: string;
    }>;
    confidence?: number;
    platforms?: string[];
}
/**
 * Main export: generate section-specific queries with full context awareness
 */
export declare function generateSearchQueries(section: ResearchSection, existingFacts?: string[], context?: QueryContext): Promise<string[]>;
/**
 * Enhanced planning with gaps + contradictions
 */
export declare function planResearch(question: string, sourcesPerSection?: number): Promise<ResearchPlan>;
//# sourceMappingURL=plannerEnhanced.d.ts.map