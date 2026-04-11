/**
 * Multi-Stage Summarization Service
 * Efficiently summarizes thousands of sources through hierarchical compression
 */
export interface SummaryLevel {
    level: 'source' | 'chunk' | 'section' | 'synthesis';
    content: string;
    keyPoints: string[];
    confidence: number;
    tokensUsed: number;
    sourceCount: number;
}
export interface HierarchicalSummary {
    query: string;
    levels: SummaryLevel[];
    finalSynthesis: string;
    topics: string[];
    totalTokens: number;
    compression: number;
}
export declare class SummarizationService {
    private sourceModel;
    private synthesisModel;
    /**
     * Stage 1: Summarize individual sources (1-3 sentences each)
     */
    summarizeSources(sources: Array<{
        id: string;
        content: string;
    }>): Promise<Array<{
        id: string;
        summary: string;
    }>>;
    /**
     * Stage 2: Chunk summaries and re-summarize (abstraction layer)
     */
    chunkAndReSummarize(sourceSummaries: Array<{
        id: string;
        summary: string;
    }>, chunkSize?: number): Promise<Array<{
        chunk: number;
        summary: string;
    }>>;
    /**
     * Stage 3: Synthesize across all chunks into final summary
     */
    synthesizeHierarchy(chunkSummaries: Array<{
        chunk: number;
        summary: string;
    }>, query: string): Promise<{
        synthesis: string;
        keyPoints: string[];
    }>;
    /**
     * Full pipeline: Source → Chunk → Synthesis
     */
    hierarchicalSummarize(sources: Array<{
        id: string;
        content: string;
    }>, query: string): Promise<HierarchicalSummary>;
    /**
     * Extract topics from synthesis (keyword extraction)
     */
    extractTopics(text: string, topN?: number): string[];
    /**
     * Generate final report summary with confidence metrics
     */
    generateReportSummary(summary: HierarchicalSummary): string;
}
export declare const summarizationService: SummarizationService;
//# sourceMappingURL=summarizationService.d.ts.map