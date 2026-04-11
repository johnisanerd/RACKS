/**
 * Subagent Manager — Real parallel research workers
 * Each subagent: Wayfarer search → page extraction → Ollama compression → structured facts
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
     * Submit a real research task:
     *   1. Wayfarer /research → fetch + extract N pages
     *   2. For each page: Ollama compress → extract key facts
     *   3. Return structured findings
     */
    submit(task: SubagentTask): Promise<SubagentResult>;
    /**
     * Close the pool
     */
    close(): void;
}
//# sourceMappingURL=pool.d.ts.map