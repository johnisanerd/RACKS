#!/usr/bin/env node
/**
 * Deep Research Harness — Enterprise-grade research automation
 *
 * Features:
 * - Recursive topic decomposition
 * - Context-1 multi-hop retrieval
 * - Time-based research adaptation (10min vs 40min = different strategies)
 * - Horizontal scaling via subagents (up to 10 parallel research workers)
 * - Confidence-based termination (coverage × confidence > threshold)
 * - Beautiful CLI with persistent header + real-time progress
 * - Daemon + interactive modes
 * - Final structured documents (PDF, JSON, Markdown)
 */
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
type ScheduleType = 'now' | 'at_time' | 'time_window' | 'cron';
interface ResearchTask {
    id: string;
    name: string;
    question: string;
    status: TaskStatus;
    scheduleType: ScheduleType;
    scheduledTime?: number;
    timeWindow?: {
        start: number;
        end: number;
    };
    cronExpression?: string;
    createdAt: number;
    startedAt?: number;
    completedAt?: number;
    progressPercent?: number;
    currentIteration?: number;
    maxIterations?: number;
    readyScore?: number;
    reportPath?: string;
    errorMessage?: string;
}
export { ResearchTask };
//# sourceMappingURL=cli.d.ts.map