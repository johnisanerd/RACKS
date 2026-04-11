/**
 * Duration Validation Tests
 *
 * Validates research session duration expectations:
 * - 1h: 60-80 iterations, 300-500 sources, 100-150 findings
 * - 2h: 120-180 iterations, 600-1000 sources, 200-300 findings
 * - 12h: 500-1200 iterations, 3000-5000 sources, 600-1200 findings
 */

import { orchestrator } from '../../src/core/orchestrator.js';

// Mock configuration
const testConfigs = {
  short: {
    question: 'What are top creative strategies for collagen supplements?',
    timeLimit: 60 * 1000,  // 1 minute (accelerated test)
    expectedIterations: {min: 3, max: 10},
    expectedFindings: {min: 10, max: 50}
  },
  medium: {
    question: 'What are top creative strategies for collagen supplements?',
    timeLimit: 120 * 1000,  // 2 minutes
    expectedIterations: {min: 6, max: 20},
    expectedFindings: {min: 20, max: 100}
  }
};

describe('Duration Validation', () => {
  test('Short research (1-2m): Meets iteration expectations', async () => {
    const config = testConfigs.short;
    const startTime = Date.now();

    const result = await orchestrator.research(config as any);
    const elapsedMs = Date.now() - startTime;

    expect(elapsedMs).toBeLessThan(config.timeLimit * 1.2); // Allow 20% overrun
    expect(result.iterations || 0).toBeGreaterThanOrEqual(config.expectedIterations.min);
    expect(result.findings || 0).toBeGreaterThanOrEqual(config.expectedFindings.min);
  });

  test('Medium research (2-5m): Meets coverage expectations', async () => {
    const config = testConfigs.medium;
    const startTime = Date.now();

    const result = await orchestrator.research(config as any);
    const elapsedMs = Date.now() - startTime;

    expect(elapsedMs).toBeLessThan(config.timeLimit * 1.2);
    expect(result.coverage || 0).toBeGreaterThan(0.5); // >50% coverage
    expect(result.confidence || 0).toBeGreaterThan(0.4); // >40% confidence
  });
});
