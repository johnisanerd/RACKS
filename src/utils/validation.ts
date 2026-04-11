/**
 * Input Validation — Validate user input and configuration
 *
 * Provides type-safe validation for research questions, URLs, and configuration.
 */

import { ValidationError } from './errors.js';
import { createLogger } from './logger.js';

const log = createLogger('validation');

/**
 * Validate a research question
 */
export function validateResearchQuestion(question: string): void {
  if (!question || typeof question !== 'string') {
    throw new ValidationError('Research question is required', 'question');
  }

  const trimmed = question.trim();
  if (trimmed.length === 0) {
    throw new ValidationError('Research question cannot be empty', 'question');
  }

  if (trimmed.length < 10) {
    throw new ValidationError(
      'Research question should be at least 10 characters',
      'question'
    );
  }

  if (trimmed.length > 1000) {
    throw new ValidationError(
      'Research question cannot exceed 1000 characters',
      'question'
    );
  }

  // Check for basic question structure
  if (!['?', 'how', 'what', 'when', 'where', 'why', 'which', 'who', 'can', 'should', 'will'].some(word =>
    trimmed.toLowerCase().includes(word)
  )) {
    log.warn('Question does not appear to be phrased as a question');
  }
}

/**
 * Validate a URL
 */
export function validateUrl(url: string): void {
  if (!url || typeof url !== 'string') {
    throw new ValidationError('URL is required', 'url');
  }

  try {
    const parsed = new URL(url);
    if (!['http', 'https'].includes(parsed.protocol.slice(0, -1))) {
      throw new ValidationError(
        'URL must use http or https protocol',
        'url'
      );
    }
  } catch (err) {
    throw new ValidationError(
      `Invalid URL format: ${err instanceof Error ? err.message : String(err)}`,
      'url'
    );
  }
}

/**
 * Validate time duration (e.g., "5m", "2h", "30s")
 */
export function validateDuration(duration: string): number {
  if (!duration || typeof duration !== 'string') {
    throw new ValidationError('Duration is required', 'duration');
  }

  const match = duration.match(/^(\d+)([smh])$/);
  if (!match) {
    throw new ValidationError(
      'Duration must be in format: 30s, 5m, or 2h',
      'duration'
    );
  }

  const [, amount, unit] = match;
  const value = parseInt(amount, 10);

  if (value < 1) {
    throw new ValidationError('Duration must be at least 1 second', 'duration');
  }

  if (value > 1440) {
    throw new ValidationError('Duration cannot exceed 1440 minutes (24 hours)', 'duration');
  }

  // Convert to milliseconds
  const unitMs = { s: 1000, m: 60000, h: 3600000 };
  return value * unitMs[unit as 's' | 'm' | 'h'];
}

/**
 * Validate research depth preset
 */
export function validateResearchDepth(depth: string): 'sq' | 'qk' | 'nr' | 'ex' | 'mx' {
  const valid = ['sq', 'qk', 'nr', 'ex', 'mx'] as const;
  const normalized = depth?.toLowerCase();

  if (!normalized || !valid.includes(normalized)) {
    throw new ValidationError(
      `Research depth must be one of: ${valid.join(', ')}`,
      'depth'
    );
  }

  return normalized;
}

/**
 * Validate confidence threshold (0-1)
 */
export function validateConfidenceThreshold(threshold: number): void {
  if (typeof threshold !== 'number') {
    throw new ValidationError('Confidence threshold must be a number', 'threshold');
  }

  if (threshold < 0 || threshold > 1) {
    throw new ValidationError(
      'Confidence threshold must be between 0 and 1',
      'threshold'
    );
  }
}

/**
 * Validate coverage percentage (0-100)
 */
export function validateCoveragePercentage(coverage: number): void {
  if (typeof coverage !== 'number') {
    throw new ValidationError('Coverage must be a number', 'coverage');
  }

  if (coverage < 0 || coverage > 100) {
    throw new ValidationError(
      'Coverage must be between 0 and 100',
      'coverage'
    );
  }
}

/**
 * Validate number of parallel workers
 */
export function validateConcurrency(concurrency: number): void {
  if (typeof concurrency !== 'number') {
    throw new ValidationError('Concurrency must be a number', 'concurrency');
  }

  if (concurrency < 1 || concurrency > 100) {
    throw new ValidationError(
      'Concurrency must be between 1 and 100',
      'concurrency'
    );
  }
}

/**
 * Validate maximum iterations
 */
export function validateMaxIterations(iterations: number): void {
  if (typeof iterations !== 'number') {
    throw new ValidationError('Max iterations must be a number', 'iterations');
  }

  if (iterations < 1 || iterations > 1000) {
    throw new ValidationError(
      'Max iterations must be between 1 and 1000',
      'iterations'
    );
  }
}
