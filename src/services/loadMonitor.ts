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
import { createLogger } from '../utils/logger.js';

const log = createLogger('loadMonitor');

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
  circuitBreakerThreshold: number; // 0-1
  circuitBreakerWindow: number;
}

interface ModelLoadState {
  current: number;
  queued: number;
  completed: number;
  failed: number;
  estimatedMemoryUsed: number;
  circuitBreakerOpen: boolean;
  lastErrorTime: number;
  errorCountInWindow: number; // Only errors in current window
}

interface WaitingTask {
  modelKey: string;
  priority: 'high' | 'normal' | 'low';
  resolve: () => void;
  reject: (error: Error) => void;
  timeoutHandle: NodeJS.Timeout;
}

export class LoadMonitor extends EventEmitter {
  private config: LoadMonitorConfig;
  private modelStates: Record<string, ModelLoadState> = {};
  private waitingTasks: WaitingTask[] = [];
  private globalCurrent = 0;
  private totalMemoryUsed = 0;

  constructor(config: LoadMonitorConfig) {
    super();
    this.validateConfig(config);
    this.config = config;

    // Initialize model states
    for (const modelConfig of config.models) {
      this.modelStates[modelConfig.model] = {
        current: 0,
        queued: 0,
        completed: 0,
        failed: 0,
        estimatedMemoryUsed: 0,
        circuitBreakerOpen: false,
        lastErrorTime: 0,
        errorCountInWindow: 0
      };
    }

    log.info(
      `Load monitor initialized: ${config.models.length} models, ` +
      `${config.globalMaxConcurrency} global max, ${config.totalGPUMemoryMB}MB GPU`
    );
  }

  private validateConfig(config: LoadMonitorConfig): void {
    if (config.globalMaxConcurrency < 1) {
      throw new Error('globalMaxConcurrency must be >= 1');
    }
    if (config.circuitBreakerThreshold < 0 || config.circuitBreakerThreshold > 1) {
      throw new Error('circuitBreakerThreshold must be 0-1');
    }
    if (config.totalGPUMemoryMB < 1000) {
      throw new Error('totalGPUMemoryMB must be >= 1000');
    }
    for (const model of config.models) {
      if (model.maxConcurrency < 1) {
        throw new Error(`Model ${model.model} maxConcurrency must be >= 1`);
      }
    }
  }

  async checkAvailability(modelKey: string): Promise<{ available: boolean; reason?: string }> {
    const modelConfig = this.config.models.find(m => m.model === modelKey);
    if (!modelConfig) {
      return { available: false, reason: `Unknown model: ${modelKey}` };
    }

    const state = this.modelStates[modelKey];

    // Check circuit breaker
    if (state.circuitBreakerOpen) {
      const shouldResetCircuit = Date.now() - state.lastErrorTime > this.config.circuitBreakerWindow;
      if (shouldResetCircuit) {
        state.circuitBreakerOpen = false;
        state.errorCountInWindow = 0;
        log.info(`Circuit breaker auto-recovered for ${modelKey}`);
      } else {
        return { available: false, reason: `Circuit breaker open for ${modelKey}` };
      }
    }

    // Check per-model concurrency
    if (state.current >= modelConfig.maxConcurrency) {
      return { available: false, reason: `${modelKey} at capacity (${state.current}/${modelConfig.maxConcurrency})` };
    }

    // Check global concurrency
    if (this.globalCurrent >= this.config.globalMaxConcurrency) {
      return { available: false, reason: `Global limit (${this.globalCurrent}/${this.config.globalMaxConcurrency})` };
    }

    // Check GPU memory
    if (this.totalMemoryUsed + modelConfig.estimatedMemoryMB > this.config.totalGPUMemoryMB) {
      return {
        available: false,
        reason: `Insufficient GPU memory (${this.totalMemoryUsed}/${this.config.totalGPUMemoryMB}MB)`
      };
    }

    return { available: true };
  }

  async acquireSlot(
    modelKey: string,
    maxWaitMs: number = 60_000,
    priority: 'high' | 'normal' | 'low' = 'normal'
  ): Promise<void> {
    const modelConfig = this.config.models.find(m => m.model === modelKey);
    if (!modelConfig) {
      throw new Error(`Unknown model: ${modelKey}`);
    }

    // Check immediately
    const check = await this.checkAvailability(modelKey);
    if (check.available) {
      this.acquireSlotImmediate(modelKey, modelConfig);
      return;
    }

    // Wait for availability
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      let timeoutHandle: NodeJS.Timeout;

      const attemptAcquire = async () => {
        // Check timeout
        if (Date.now() - startTime > maxWaitMs) {
          this.waitingTasks = this.waitingTasks.filter(t => t.resolve !== resolve);
          reject(new Error(
            `Timeout waiting for ${modelKey} slot after ${maxWaitMs}ms (queue: ${this.modelStates[modelKey].queued})`
          ));
          return;
        }

        // Try to acquire
        const check = await this.checkAvailability(modelKey);
        if (check.available) {
          this.acquireSlotImmediate(modelKey, modelConfig);
          this.waitingTasks = this.waitingTasks.filter(t => t.resolve !== resolve);
          resolve();
          this.emit('slotAcquired', { modelKey });
          return;
        }

        // Schedule next attempt with exponential backoff (max 5s)
        const backoffMs = Math.min(5000, 100 * Math.pow(1.5, (Date.now() - startTime) / 1000));
        timeoutHandle = setTimeout(attemptAcquire, backoffMs);
      };

      // Add to waiting list
      const task: WaitingTask = { modelKey, priority, resolve, reject, timeoutHandle: null as any };
      this.waitingTasks.push(task);
      this.modelStates[modelKey].queued++;

      // Sort waiting tasks by priority
      this.waitingTasks.sort((a, b) => {
        const priorityOrder = { high: 0, normal: 1, low: 2 };
        return priorityOrder[a.priority] - priorityOrder[b.priority];
      });

      timeoutHandle = setTimeout(attemptAcquire, 100);
      task.timeoutHandle = timeoutHandle;
    });
  }

  private acquireSlotImmediate(modelKey: string, modelConfig: ModelLoadConfig): void {
    const state = this.modelStates[modelKey];
    state.current++;
    state.estimatedMemoryUsed += modelConfig.estimatedMemoryMB;
    this.totalMemoryUsed += modelConfig.estimatedMemoryMB;
    this.globalCurrent++;
    this.emit('slotAcquiredImmediate', { modelKey, current: state.current });
  }

  releaseSlot(modelKey: string, success: boolean = true): void {
    const modelConfig = this.config.models.find(m => m.model === modelKey);
    if (!modelConfig) {
      log.warn(`Release slot called for unknown model: ${modelKey}`);
      return;
    }

    const state = this.modelStates[modelKey];
    state.current = Math.max(0, state.current - 1);
    state.estimatedMemoryUsed = Math.max(0, state.estimatedMemoryUsed - modelConfig.estimatedMemoryMB);
    this.totalMemoryUsed = Math.max(0, this.totalMemoryUsed - modelConfig.estimatedMemoryMB);
    this.globalCurrent = Math.max(0, this.globalCurrent - 1);

    if (success) {
      state.completed++;
    } else {
      state.failed++;
      state.lastErrorTime = Date.now();
      state.errorCountInWindow++;

      // Check if should open circuit breaker
      const totalTasksInWindow = state.failed;
      if (totalTasksInWindow > 0) {
        const errorRate = state.errorCountInWindow / Math.max(1, state.failed + state.completed);
        if (errorRate > this.config.circuitBreakerThreshold) {
          state.circuitBreakerOpen = true;
          log.warn(
            `Circuit breaker opened for ${modelKey} (error rate: ${(errorRate * 100).toFixed(1)}%)`
          );
          this.emit('circuitBreakerOpened', { modelKey, errorRate });
        }
      }
    }

    // Clean up old error count after window expires
    if (Date.now() - state.lastErrorTime > this.config.circuitBreakerWindow) {
      state.errorCountInWindow = 0;
    }

    // Notify waiting tasks
    this.emit('slotReleased', { modelKey });
    this.processWaitingTasks();
  }

  private processWaitingTasks(): void {
    for (let i = this.waitingTasks.length - 1; i >= 0; i--) {
      const task = this.waitingTasks[i];
      const check = this.checkAvailabilitySync(task.modelKey);

      if (check.available) {
        clearTimeout(task.timeoutHandle);
        const modelConfig = this.config.models.find(m => m.model === task.modelKey)!;
        this.acquireSlotImmediate(task.modelKey, modelConfig);
        task.resolve();
        this.waitingTasks.splice(i, 1);
        this.modelStates[task.modelKey].queued--;
      }
    }
  }

  private checkAvailabilitySync(modelKey: string): { available: boolean } {
    const modelConfig = this.config.models.find(m => m.model === modelKey);
    if (!modelConfig) return { available: false };

    const state = this.modelStates[modelKey];

    if (state.circuitBreakerOpen) return { available: false };
    if (state.current >= modelConfig.maxConcurrency) return { available: false };
    if (this.globalCurrent >= this.config.globalMaxConcurrency) return { available: false };
    if (this.totalMemoryUsed + modelConfig.estimatedMemoryMB > this.config.totalGPUMemoryMB) {
      return { available: false };
    }

    return { available: true };
  }

  getStatus(): {
    global: { current: number; max: number; queue: number };
    models: Record<string, { current: number; max: number; queue: number; memory: number; circuitOpen: boolean }>;
  } {
    const snapshot = this.createSnapshot();
    const models: Record<string, any> = {};

    for (const modelKey of Object.keys(this.modelStates)) {
      const config = this.config.models.find(m => m.model === modelKey)!;
      const state = snapshot[modelKey];
      models[modelKey] = {
        current: state.current,
        max: config.maxConcurrency,
        queue: state.queued,
        memory: state.estimatedMemoryUsed,
        circuitOpen: state.circuitBreakerOpen
      };
    }

    return {
      global: {
        current: this.globalCurrent,
        max: this.config.globalMaxConcurrency,
        queue: this.waitingTasks.length
      },
      models
    };
  }

  private createSnapshot(): Record<string, ModelLoadState> {
    const snapshot: Record<string, ModelLoadState> = {};
    for (const [key, state] of Object.entries(this.modelStates)) {
      snapshot[key] = { ...state };
    }
    return snapshot;
  }

  getReport(): string {
    const status = this.getStatus();
    const now = new Date().toISOString();

    let report = `\n📊 Load Monitor Status (${now})\n`;
    report += `Global: ${status.global.current}/${status.global.max} concurrent (queue: ${status.global.queue})\n`;
    report += `\nPer-Model:\n`;

    for (const [modelKey, stats] of Object.entries(status.models)) {
      const circuit = stats.circuitOpen ? '🔴' : '🟢';
      report += `  ${circuit} ${modelKey}: ${stats.current}/${stats.max} (queue: ${stats.queue}, memory: ${stats.memory}MB)\n`;
    }

    return report;
  }

  resetCircuitBreaker(modelKey: string): void {
    const state = this.modelStates[modelKey];
    if (state) {
      state.circuitBreakerOpen = false;
      state.errorCountInWindow = 0;
      log.info(`Circuit breaker reset for ${modelKey}`);
      this.emit('circuitBreakerReset', { modelKey });
    }
  }
}

let globalLoadMonitor: LoadMonitor | null = null;

export function initializeLoadMonitor(config: LoadMonitorConfig): LoadMonitor {
  globalLoadMonitor = new LoadMonitor(config);
  return globalLoadMonitor;
}

export function getLoadMonitor(): LoadMonitor {
  if (!globalLoadMonitor) {
    throw new Error('Load monitor not initialized. Call initializeLoadMonitor first.');
  }
  return globalLoadMonitor;
}
