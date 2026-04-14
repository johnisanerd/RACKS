/**
 * Structured Logger Utility
 *
 * Provides structured logging with automatic context capture:
 * - Timestamps, trace IDs, service names
 * - Log levels: debug, info, warn, error
 * - Contextual metadata that persists across related logs
 * - Support for structured JSON output
 */

import { createLogger as createBaseLogger } from './logger.js';
import { ErrorClassifier } from './errorClassifier.js';

export interface LogContext {
  traceId?: string;
  service: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  [key: string]: unknown;
}

let globalTraceId = '';

/**
 * Generate or get current trace ID
 */
function getTraceId(): string {
  if (!globalTraceId) {
    globalTraceId = `trace_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
  return globalTraceId;
}

/**
 * Reset trace ID (typically at start of operation)
 */
export function resetTraceId(): void {
  globalTraceId = '';
}

/**
 * Set explicit trace ID
 */
export function setTraceId(id: string): void {
  globalTraceId = id;
}

/**
 * Create a structured logger for a service
 */
export function createStructuredLogger(serviceName: string) {
  const baseLogger = createBaseLogger(serviceName);

  return {
    debug: (message: string, metadata?: Record<string, unknown>) => {
      const context = buildContext('debug', serviceName, message, metadata);
      baseLogger.debug(formatLogMessage(context));
      emitLogEvent(context);
    },

    info: (message: string, metadata?: Record<string, unknown>) => {
      const context = buildContext('info', serviceName, message, metadata);
      baseLogger.info(formatLogMessage(context));
      emitLogEvent(context);
    },

    warn: (message: string, metadata?: Record<string, unknown>) => {
      const context = buildContext('warn', serviceName, message, metadata);
      baseLogger.warn(formatLogMessage(context));
      emitLogEvent(context);
    },

    error: (message: string, metadata?: Record<string, unknown>, error?: unknown) => {
      const errorContext = error ? ErrorClassifier.getContext(error) : {};
      const context = buildContext('error', serviceName, message, {
        ...metadata,
        ...errorContext
      });

      // Include stack trace if available
      if (error instanceof Error && error.stack) {
        context.stack = error.stack;
      }

      baseLogger.error(formatLogMessage(context));
      emitLogEvent(context);
    },

    /**
     * Log with operation context
     */
    operation: (operationName: string) => ({
      start: (metadata?: Record<string, unknown>) => {
        const startTime = Date.now();
        const context = buildContext('debug', serviceName, `Started: ${operationName}`, {
          operation: operationName,
          ...metadata
        });
        emitLogEvent(context);

        return {
          done: (metadata?: Record<string, unknown>) => {
            const duration = Date.now() - startTime;
            const doneContext = buildContext('info', serviceName, `Completed: ${operationName}`, {
              operation: operationName,
              duration,
              ...metadata
            });
            emitLogEvent(doneContext);
          },

          failed: (error: unknown, metadata?: Record<string, unknown>) => {
            const duration = Date.now() - startTime;
            const errorContext = ErrorClassifier.getContext(error);
            const failContext = buildContext('error', serviceName, `Failed: ${operationName}`, {
              operation: operationName,
              duration,
              ...metadata,
              ...errorContext
            });

            if (error instanceof Error && error.stack) {
              failContext.stack = error.stack;
            }

            emitLogEvent(failContext);
          }
        };
      }
    })
  };
}

/**
 * Build structured log context
 */
function buildContext(
  level: 'debug' | 'info' | 'warn' | 'error',
  service: string,
  message: string,
  metadata?: Record<string, unknown>
): LogContext {
  return {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    traceId: getTraceId(),
    ...metadata
  };
}

/**
 * Format log message for console output
 */
function formatLogMessage(context: LogContext): string {
  const { timestamp, level, service, message, traceId, ...rest } = context;

  const parts = [
    `[${timestamp}]`,
    `[${level.toUpperCase()}]`,
    `[${service}]`
  ];

  if (traceId) {
    parts.push(`[${traceId.slice(0, 8)}]`);
  }

  parts.push(message);

  const metadataKeys = Object.keys(rest);
  if (metadataKeys.length > 0) {
    const metadata = Object.entries(rest)
      .map(([k, v]) => `${k}=${typeof v === 'string' ? v : JSON.stringify(v)}`)
      .join(' ');
    parts.push(`{${metadata}}`);
  }

  return parts.join(' ');
}

/**
 * Emit log event (for telemetry/observability)
 */
function emitLogEvent(context: LogContext): void {
  // This is where you'd send logs to an observability service
  // For now, it's a no-op but provides the hook for future integration
  if (typeof window !== 'undefined' && (window as any).__logEvents) {
    (window as any).__logEvents(context);
  }
}
