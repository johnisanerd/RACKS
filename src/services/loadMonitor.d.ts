/**
 * Load Monitor — Prevent Ollama/Wayfarer overload
 *
 * Monitors:
 * - Model concurrency (never exceed per-model limits)
 * - Global concurrency (never exceed configured max)
 * - GPU memory availability
 * - Circuit breaker for model failures
 *
 * Uses EventEmitter for efficient notifications instead of polling
 */
import { EventEmitter } from 'events';
export interface ModelLoadConfig {
    model: string;
    maxConcurrency: number;
    estimatedMemoryMB: number;
    timeout: number;
}
export interface LoadMonitorConfig {
    models: ModelLoadConfig[];
    globalMaxConcurrency: number;
    totalGPUMemoryMB: number;
    circuitBreakerThreshold: number;
    circuitBreakerWindow: number;
}
export declare class LoadMonitor extends EventEmitter {
    private config;
    private modelStates;
    private waitingTasks;
    private globalCurrent;
    private totalMemoryUsed;
    constructor(config: LoadMonitorConfig);
    private validateConfig;
    checkAvailability(modelKey: string): Promise<{
        available: boolean;
        reason?: string;
    }>;
    acquireSlot(modelKey: string, maxWaitMs?: number, priority?: 'high' | 'normal' | 'low'): Promise<void>;
    private acquireSlotImmediate;
    releaseSlot(modelKey: string, success?: boolean): void;
    private processWaitingTasks;
    private checkAvailabilitySync;
    getStatus(): {
        global: {
            current: number;
            max: number;
            queue: number;
        };
        models: Record<string, {
            current: number;
            max: number;
            queue: number;
            memory: number;
            circuitOpen: boolean;
        }>;
    };
    private createSnapshot;
    getReport(): string;
    resetCircuitBreaker(modelKey: string): void;
}
export declare function initializeLoadMonitor(config: LoadMonitorConfig): LoadMonitor;
export declare function getLoadMonitor(): LoadMonitor;
//# sourceMappingURL=loadMonitor.d.ts.map