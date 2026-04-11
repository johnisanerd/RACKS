/**
 * Error Context — Enhanced error information and recovery tracking
 *
 * Provides detailed error context, stack traces, and recovery options.
 */

import { ResearchError } from './errors.js';
import { createLogger } from './logger.js';

const log = createLogger('error-context');

/**
 * Enhanced error with context information
 */
export interface ErrorContext {
  message: string;
  code?: string;
  context?: string;
  timestamp: Date;
  retryable: boolean;
  attemptNumber?: number;
  maxAttempts?: number;
  lastError?: Error;
  stackTrace?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Error context tracker for recovery
 */
export class ErrorContextTracker {
  private errors: ErrorContext[] = [];
  private readonly maxErrors = 100;

  /**
   * Track an error with context
   */
  track(error: unknown, context?: string): ErrorContext {
    const ctx: ErrorContext = {
      message: error instanceof Error ? error.message : String(error),
      context,
      timestamp: new Date(),
      retryable: error instanceof ResearchError ? error.retryable : true,
      stackTrace: error instanceof Error ? error.stack : undefined,
    };

    this.errors.push(ctx);

    // Keep only recent errors
    if (this.errors.length > this.maxErrors) {
      this.errors = this.errors.slice(-this.maxErrors);
    }

    return ctx;
  }

  /**
   * Get error pattern analysis
   */
  analyzePattern(): {
    mostCommonError: string | null;
    retryablePercentage: number;
    errorFrequency: Map<string, number>;
    recentErrors: ErrorContext[];
  } {
    const frequency = new Map<string, number>();
    let retryableCount = 0;

    for (const err of this.errors) {
      frequency.set(err.message, (frequency.get(err.message) || 0) + 1);
      if (err.retryable) retryableCount++;
    }

    const mostCommon = frequency.size > 0
      ? Array.from(frequency.entries()).sort((a, b) => b[1] - a[1])[0][0]
      : null;

    return {
      mostCommonError: mostCommon,
      retryablePercentage: this.errors.length > 0 ? (retryableCount / this.errors.length) * 100 : 0,
      errorFrequency: frequency,
      recentErrors: this.errors.slice(-10)
    };
  }

  /**
   * Clear error history
   */
  clear(): void {
    this.errors = [];
  }

  /**
   * Get all errors
   */
  getAll(): ErrorContext[] {
    return [...this.errors];
  }
}

/**
 * State recovery helper
 */
export class StateRecovery {
  private savePoints = new Map<string, unknown>();

  /**
   * Save a checkpoint
   */
  save(key: string, state: unknown): void {
    this.savePoints.set(key, JSON.parse(JSON.stringify(state)));
  }

  /**
   * Restore from checkpoint
   */
  restore(key: string): unknown | null {
    return this.savePoints.get(key) || null;
  }

  /**
   * Has checkpoint
   */
  has(key: string): boolean {
    return this.savePoints.has(key);
  }

  /**
   * Clear checkpoint
   */
  clear(key?: string): void {
    if (key) {
      this.savePoints.delete(key);
    } else {
      this.savePoints.clear();
    }
  }

  /**
   * Get all checkpoints
   */
  getCheckpoints(): Map<string, unknown> {
    return new Map(this.savePoints);
  }
}

/**
 * Error recovery strategy
 */
export enum RecoveryStrategy {
  RETRY = 'retry',
  FALLBACK = 'fallback',
  SKIP = 'skip',
  ABORT = 'abort'
}

/**
 * Determine recovery strategy based on error type
 */
export function determineRecoveryStrategy(error: unknown): RecoveryStrategy {
  if (error instanceof ResearchError) {
    if (error.retryable) {
      return RecoveryStrategy.RETRY;
    }
    return RecoveryStrategy.FALLBACK;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // Transient errors - retry
    if (message.includes('timeout') || message.includes('econnrefused') || message.includes('enotfound')) {
      return RecoveryStrategy.RETRY;
    }

    // Fatal errors - abort
    if (message.includes('fatal') || message.includes('abort')) {
      return RecoveryStrategy.ABORT;
    }

    // Default to fallback
    return RecoveryStrategy.FALLBACK;
  }

  return RecoveryStrategy.FALLBACK;
}

/**
 * Error severity classification
 */
export enum ErrorSeverity {
  LOW = 'low',       // Can be ignored
  MEDIUM = 'medium', // Should be handled
  HIGH = 'high',     // Must be addressed
  CRITICAL = 'critical' // System must stop
}

/**
 * Classify error severity
 */
export function classifyErrorSeverity(error: unknown): ErrorSeverity {
  if (error instanceof ResearchError) {
    if (error.code.includes('CRITICAL') || error.code.includes('FATAL')) {
      return ErrorSeverity.CRITICAL;
    }

    if (error.code.includes('SYNTHESIS') || error.code.includes('ORCHESTRATOR')) {
      return ErrorSeverity.HIGH;
    }

    if (error.retryable) {
      return ErrorSeverity.MEDIUM;
    }

    return ErrorSeverity.LOW;
  }

  return ErrorSeverity.MEDIUM;
}

/**
 * Global error tracker
 */
export const errorContextTracker = new ErrorContextTracker();
export const stateRecovery = new StateRecovery();
