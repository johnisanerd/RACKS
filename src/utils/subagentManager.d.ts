/**
 * Subagent Manager — Horizontal scaling for parallel research
 * Manages a pool of worker threads for concurrent research tasks
 */
export interface SubagentTask {
    role: string;
    task: string;
    query: string;
    context: string;
    maxSteps: number;
}
export interface SubagentResult {
    success: boolean;
    taskId?: string;
    facts?: string[];
    quotes?: string[];
    statistics?: Record<string, string>;
    sources?: string[];
    error?: string;
}
export declare class SubagentPool {
    private concurrency;
    private limiter;
    private taskId;
    constructor(maxConcurrency?: number);
    /**
     * Submit a task to the pool
     */
    submit(task: SubagentTask): Promise<SubagentResult>;
    /**
     * Close the pool
     */
    close(): void;
}
//# sourceMappingURL=subagentManager.d.ts.map