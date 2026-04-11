/**
 * Type definitions for research pipeline
 */
export interface ResearchTask {
    id: string;
    question: string;
    createdAt: Date;
    status: 'pending' | 'running' | 'paused' | 'completed' | 'failed';
    metadata?: Record<string, unknown>;
}
export interface ResearchSection {
    id: string;
    title: string;
    objective: string;
}
export interface SectionFindings {
    sectionId: string;
    sectionTitle: string;
    researched: boolean;
    facts: string[];
    sources: string[];
    confidence: number;
    analysis?: {
        keyInsights: string[];
        contradictions: string[];
        implications: string[];
        gaps: string[];
    };
}
export interface ResearchPlan {
    question: string;
    sections: ResearchSection[];
    totalSections: number;
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
    maxParallelAgents: number;
    timeoutMs?: number;
    confidenceThreshold: number;
    coverageThreshold: number;
}
export interface SubagentTask {
    id: string;
    sectionId: string;
    query: string;
    sources: string[];
}
export interface SubagentResult {
    taskId: string;
    success: boolean;
    facts: string[];
    sources: string[];
    error?: string;
}
//# sourceMappingURL=research.d.ts.map