/**
 * Unit tests for reflector.ts
 *
 * Tests for reflection: gap analysis, coverage calculation, termination logic.
 */
import { describe, it, expect } from '@jest/globals';
import { calculateCoverage, calculateConfidence, shouldContinueResearch } from '../reflector.js';
describe('Reflector', () => {
    describe('Coverage Calculation', () => {
        it('should calculate zero coverage with no findings', () => {
            const plan = {
                question: 'Test?',
                sections: [
                    { id: 's1', title: 'Section 1', description: 'desc', keyQuestions: [], priority: 'high' },
                    { id: 's2', title: 'Section 2', description: 'desc', keyQuestions: [], priority: 'high' }
                ],
                totalEstimatedSources: 100,
                researchStrategy: 'test'
            };
            const findings = new Map();
            const coverage = calculateCoverage(plan, findings);
            expect(coverage).toBe(0);
        });
        it('should calculate partial coverage', () => {
            const plan = {
                question: 'Test?',
                sections: [
                    { id: 's1', title: 'Section 1', description: 'desc', keyQuestions: [], priority: 'high' },
                    { id: 's2', title: 'Section 2', description: 'desc', keyQuestions: [], priority: 'high' },
                    { id: 's3', title: 'Section 3', description: 'desc', keyQuestions: [], priority: 'high' }
                ],
                totalEstimatedSources: 100,
                researchStrategy: 'test'
            };
            const findings = new Map();
            findings.set('s1', {
                sectionId: 's1',
                sectionTitle: 'Section 1',
                facts: ['fact'],
                quotes: [],
                statistics: {},
                sources: ['src1'],
                confidence: 0.5,
                researched: true
            });
            findings.set('s2', {
                sectionId: 's2',
                sectionTitle: 'Section 2',
                facts: [],
                quotes: [],
                statistics: {},
                sources: [],
                confidence: 0,
                researched: false
            });
            const coverage = calculateCoverage(plan, findings);
            expect(coverage).toBe(1 / 3); // 1 out of 3 sections researched
        });
        it('should calculate full coverage', () => {
            const plan = {
                question: 'Test?',
                sections: [
                    { id: 's1', title: 'Section 1', description: 'desc', keyQuestions: [], priority: 'high' },
                    { id: 's2', title: 'Section 2', description: 'desc', keyQuestions: [], priority: 'high' }
                ],
                totalEstimatedSources: 100,
                researchStrategy: 'test'
            };
            const findings = new Map();
            for (const section of plan.sections) {
                findings.set(section.id, {
                    sectionId: section.id,
                    sectionTitle: section.title,
                    facts: ['fact'],
                    quotes: [],
                    statistics: {},
                    sources: ['src'],
                    confidence: 0.8,
                    researched: true
                });
            }
            const coverage = calculateCoverage(plan, findings);
            expect(coverage).toBe(1);
        });
    });
    describe('Confidence Calculation', () => {
        it('should calculate zero confidence with no findings', () => {
            const plan = {
                question: 'Test?',
                sections: [
                    { id: 's1', title: 'Section 1', description: 'desc', keyQuestions: [], priority: 'high' }
                ],
                totalEstimatedSources: 100,
                researchStrategy: 'test'
            };
            const findings = new Map();
            const confidence = calculateConfidence(plan, findings);
            expect(confidence).toBe(0);
        });
        it('should calculate average confidence', () => {
            const plan = {
                question: 'Test?',
                sections: [
                    { id: 's1', title: 'Section 1', description: 'desc', keyQuestions: [], priority: 'high' },
                    { id: 's2', title: 'Section 2', description: 'desc', keyQuestions: [], priority: 'high' }
                ],
                totalEstimatedSources: 100,
                researchStrategy: 'test'
            };
            const findings = new Map();
            findings.set('s1', {
                sectionId: 's1',
                sectionTitle: 'S1',
                facts: [],
                quotes: [],
                statistics: {},
                sources: [],
                confidence: 0.8,
                researched: true
            });
            findings.set('s2', {
                sectionId: 's2',
                sectionTitle: 'S2',
                facts: [],
                quotes: [],
                statistics: {},
                sources: [],
                confidence: 0.6,
                researched: true
            });
            const confidence = calculateConfidence(plan, findings);
            expect(confidence).toBe(0.7); // (0.8 + 0.6) / 2
        });
    });
    describe('Termination Logic', () => {
        it('should continue with gaps', () => {
            const plan = {
                question: 'Test?',
                sections: [
                    { id: 's1', title: 'Section 1', description: 'desc', keyQuestions: [], priority: 'high' }
                ],
                totalEstimatedSources: 100,
                researchStrategy: 'test'
            };
            const findings = new Map();
            findings.set('s1', {
                sectionId: 's1',
                sectionTitle: 'S1',
                facts: [],
                quotes: [],
                statistics: {},
                sources: [],
                confidence: 0.5,
                researched: true
            });
            const gaps = ['Gap 1', 'Gap 2'];
            const shouldContinue = shouldContinueResearch(plan, findings, gaps, 1, 10, 0.8);
            expect(shouldContinue).toBe(true);
        });
        it('should stop at max iterations', () => {
            const plan = {
                question: 'Test?',
                sections: [
                    { id: 's1', title: 'Section 1', description: 'desc', keyQuestions: [], priority: 'high' }
                ],
                totalEstimatedSources: 100,
                researchStrategy: 'test'
            };
            const findings = new Map();
            const gaps = [];
            const shouldContinue = shouldContinueResearch(plan, findings, gaps, 10, 10, 0.8);
            expect(shouldContinue).toBe(false);
        });
        it('should stop when threshold met with no gaps', () => {
            const plan = {
                question: 'Test?',
                sections: [
                    { id: 's1', title: 'Section 1', description: 'desc', keyQuestions: [], priority: 'high' }
                ],
                totalEstimatedSources: 100,
                researchStrategy: 'test'
            };
            const findings = new Map();
            findings.set('s1', {
                sectionId: 's1',
                sectionTitle: 'S1',
                facts: Array(100).fill('fact'),
                quotes: [],
                statistics: {},
                sources: Array(80).fill('src'),
                confidence: 0.8,
                researched: true
            });
            const gaps = [];
            const shouldContinue = shouldContinueResearch(plan, findings, gaps, 3, 10, 0.8);
            expect(shouldContinue).toBe(false);
        });
        it('should continue below coverage threshold', () => {
            const plan = {
                question: 'Test?',
                sections: [
                    { id: 's1', title: 'Section 1', description: 'desc', keyQuestions: [], priority: 'high' },
                    { id: 's2', title: 'Section 2', description: 'desc', keyQuestions: [], priority: 'high' }
                ],
                totalEstimatedSources: 100,
                researchStrategy: 'test'
            };
            const findings = new Map();
            findings.set('s1', {
                sectionId: 's1',
                sectionTitle: 'S1',
                facts: [],
                quotes: [],
                statistics: {},
                sources: [],
                confidence: 0.5,
                researched: false // Not researched
            });
            const gaps = [];
            const shouldContinue = shouldContinueResearch(plan, findings, gaps, 1, 10, 0.8);
            expect(shouldContinue).toBe(true);
        });
    });
});
//# sourceMappingURL=reflector.test.js.map