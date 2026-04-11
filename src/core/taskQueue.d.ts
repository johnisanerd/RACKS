/**
 * Deep Research Task Queue — SQLite persistence + daemon management
 *
 * Handles:
 * - Task storage (pending → running → completed/failed)
 * - Task scheduling (now, time, window, cron)
 * - Queue operations (enqueue, dequeue, pause, resume)
 * - Checkpoint system (resume from interrupted tasks)
 */
import { EventEmitter } from 'events';
export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'paused';
export type ScheduleType = 'now' | 'at_time' | 'time_window' | 'cron';
export interface ResearchTask {
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
    timeoutMs?: number;
    progressPercent?: number;
    currentIteration?: number;
    maxIterations?: number;
    coverage?: number;
    confidence?: number;
    readyScore?: number;
    reportPath?: string;
    errorMessage?: string;
    checkpoint?: {
        iteration: number;
        findings: string;
        timestamp: number;
    };
}
export interface QueueStats {
    totalTasks: number;
    pending: number;
    running: number;
    completed: number;
    failed: number;
    cancelled: number;
    avgDuration: number;
}
export declare class DeepResearchTaskQueue extends EventEmitter {
    private db;
    private dbPath;
    constructor(dbPath?: string);
    private initSchema;
    /**
     * Create a new task
     */
    createTask(task: Partial<ResearchTask>): ResearchTask;
    /**
     * Get task by ID
     */
    getTask(id: string): ResearchTask | null;
    /**
     * List tasks with optional filtering
     */
    listTasks(filter?: {
        status?: TaskStatus;
        limit?: number;
    }): ResearchTask[];
    /**
     * Update task progress
     */
    updateProgress(id: string, progress: {
        progressPercent?: number;
        currentIteration?: number;
        coverage?: number;
        confidence?: number;
        readyScore?: number;
    }): void;
    /**
     * Set task status
     */
    setStatus(id: string, status: TaskStatus, options?: {
        errorMessage?: string;
        reportPath?: string;
    }): void;
    /**
     * Save checkpoint
     */
    saveCheckpoint(id: string, iteration: number, findings: string): void;
    /**
     * Get next pending task
     */
    getNextPendingTask(): ResearchTask | null;
    /**
     * Get statistics
     */
    getStats(): QueueStats;
    private generateTaskId;
    private rowToTask;
    /**
     * Close database connection
     */
    close(): void;
}
export declare const createTaskQueue: (dbPath?: string) => DeepResearchTaskQueue;
//# sourceMappingURL=taskQueue.d.ts.map