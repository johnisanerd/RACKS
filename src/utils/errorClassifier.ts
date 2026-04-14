/**
 * Error Classification Utility
 *
 * Classifies errors by type to determine proper handling strategy:
 * - Retryable: network timeouts, rate limits, temporary failures
 * - Network: connection errors, DNS failures, host unreachable
 * - Timeout: operation exceeded time limit
 * - Service: API/service returned error response
 */

export class ErrorClassifier {
  /**
   * Check if an error is retryable (transient failure)
   */
  static isRetryable(error: unknown): boolean {
    const err = this.normalize(error);

    // Network timeouts are retryable
    if (this.isTimeoutError(error)) return true;

    // Network errors are retryable
    if (this.isNetworkError(error)) return true;

    // Rate limiting is retryable
    if (err.code === 'RATE_LIMIT' || err.statusCode === 429) return true;

    // Temporarily unavailable
    if (err.code === 'SERVICE_UNAVAILABLE' || err.statusCode === 503) return true;

    // Server errors (5xx) are typically retryable
    if (err.statusCode && err.statusCode >= 500 && err.statusCode < 600) return true;

    return false;
  }

  /**
   * Check if an error is a network error
   */
  static isNetworkError(error: unknown): boolean {
    const err = this.normalize(error);

    const networkCodes = [
      'ECONNREFUSED',
      'ECONNRESET',
      'ENOTFOUND',
      'EHOSTUNREACH',
      'ETIMEDOUT',
      'ENETUNREACH',
      'EADDRINFO'
    ];

    if (networkCodes.includes(err.code)) return true;

    const networkMessages = [
      'network',
      'connection',
      'dns',
      'eai_again',
      'socket hang up',
      'end of file',
      'broken pipe'
    ];

    const message = (err.message || '').toLowerCase();
    return networkMessages.some(pattern => message.includes(pattern));
  }

  /**
   * Check if an error is a timeout error
   */
  static isTimeoutError(error: unknown): boolean {
    const err = this.normalize(error);

    const timeoutCodes = [
      'ETIMEDOUT',
      'ESOCKETTIMEDOUT',
      'ECONNABORTED',
      'ABORTERROR'
    ];

    if (timeoutCodes.includes(err.code)) return true;

    const message = (err.message || '').toLowerCase();
    return message.includes('timeout') || message.includes('timed out');
  }

  /**
   * Check if an error is a service error (API returned error)
   */
  static isServiceError(error: unknown): boolean {
    const err = this.normalize(error);

    // Has HTTP status code
    if (err.statusCode) return true;

    // Service-specific codes
    if (['OLLAMA_ERROR', 'WAYFARER_ERROR', 'CONTEXT1_ERROR'].includes(err.code)) {
      return true;
    }

    return false;
  }

  /**
   * Get error severity level
   */
  static getSeverity(error: unknown): 'critical' | 'error' | 'warn' {
    const err = this.normalize(error);

    // Critical: unrecoverable errors
    if (err.code === 'FATAL' || err.code === 'UNRECOVERABLE') return 'critical';

    // Warn: retryable errors
    if (this.isRetryable(error)) return 'warn';

    // Error: most service errors
    return 'error';
  }

  /**
   * Extract error context for logging
   */
  static getContext(error: unknown): Record<string, unknown> {
    const err = this.normalize(error);

    return {
      code: err.code,
      message: err.message,
      statusCode: err.statusCode,
      isNetworkError: this.isNetworkError(error),
      isTimeoutError: this.isTimeoutError(error),
      isServiceError: this.isServiceError(error),
      isRetryable: this.isRetryable(error),
      severity: this.getSeverity(error)
    };
  }

  /**
   * Normalize various error types to a standard shape
   */
  private static normalize(error: unknown): {
    code?: string;
    message: string;
    statusCode?: number;
    stack?: string;
  } {
    if (error instanceof Error) {
      return {
        code: (error as any).code,
        message: error.message,
        statusCode: (error as any).statusCode || (error as any).status,
        stack: error.stack
      };
    }

    if (typeof error === 'object' && error !== null) {
      return {
        code: (error as any).code,
        message: (error as any).message || String(error),
        statusCode: (error as any).statusCode || (error as any).status,
        stack: (error as any).stack
      };
    }

    return {
      message: String(error)
    };
  }
}
