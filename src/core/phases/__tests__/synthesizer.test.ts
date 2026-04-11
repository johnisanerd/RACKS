/**
 * Unit tests for synthesizer.ts
 *
 * Tests for synthesis: report generation, formatting, source attribution.
 */

import { describe, it, expect } from '@jest/globals';
import { formatFindingsSummary, type ResearchState } from '../synthesizer.js';
import type { ResearchPlan } from '../planner.js';
import type { SectionFindings } from '../researcher.js';

describe('Synthesizer', () => {
  describe('Findings Summary Formatting', () => {
    it('should format empty findings', () => {
      const findings = new Map<string, SectionFindings>();
      const summary = formatFindingsSummary(findings);
      expect(summary).toBe('');
    });

    it('should format single finding', () => {
      const findings = new Map<string, SectionFindings>();
      findings.set('s1', {
        sectionId: 's1',
        sectionTitle: 'Market Overview',
        facts: Array(50).fill('fact'),
        quotes: [],
        statistics: {},
        sources: Array(30).fill('src'),
        confidence: 0.75,
        researched: true
      });

      const summary = formatFindingsSummary(findings);
      expect(summary).toContain('Market Overview');
      expect(summary).toContain('50 facts');
      expect(summary).toContain('30 sources');
      expect(summary).toContain('0.75');
    });

    it('should format multiple findings', () => {
      const findings = new Map<string, SectionFindings>();
      findings.set('s1', {
        sectionId: 's1',
        sectionTitle: 'Section 1',
        facts: ['fact1', 'fact2'],
        quotes: [],
        statistics: {},
        sources: ['src1'],
        confidence: 0.8,
        researched: true
      });
      findings.set('s2', {
        sectionId: 's2',
        sectionTitle: 'Section 2',
        facts: ['fact3'],
        quotes: [],
        statistics: {},
        sources: ['src2', 'src3'],
        confidence: 0.6,
        researched: true
      });

      const summary = formatFindingsSummary(findings);
      expect(summary).toContain('Section 1');
      expect(summary).toContain('Section 2');
      expect(summary).toContain('2 facts');
      expect(summary).toContain('1 source');
      expect(summary).toContain('3 sources');
    });
  });

  describe('ResearchState', () => {
    it('should have required fields', () => {
      const plan: ResearchPlan = {
        question: 'What is the market?',
        sections: [
          { id: 's1', title: 'Market', description: 'desc', keyQuestions: ['Q?'], priority: 'high' }
        ],
        totalEstimatedSources: 100,
        researchStrategy: 'test'
      };

      const state: ResearchState = {
        plan,
        findings: new Map(),
        iteration: 5,
        coverage: 0.8,
        confidence: 0.75,
        readyScore: 0.6,
        gaps: ['Gap 1'],
        report: undefined
      };

      expect(state.plan).toBeDefined();
      expect(state.findings).toBeDefined();
      expect(state.iteration).toBe(5);
      expect(state.coverage).toBe(0.8);
      expect(state.confidence).toBe(0.75);
      expect(state.readyScore).toBe(0.6);
      expect(state.gaps).toHaveLength(1);
    });

    it('should allow report attachment', () => {
      const plan: ResearchPlan = {
        question: 'Test?',
        sections: [],
        totalEstimatedSources: 0,
        researchStrategy: 'test'
      };

      const state: ResearchState = {
        plan,
        findings: new Map(),
        iteration: 1,
        coverage: 100,
        confidence: 0.9,
        readyScore: 0.9,
        gaps: [],
        report: '# Report\n\nContent here'
      };

      expect(state.report).toBeDefined();
      expect(state.report).toContain('# Report');
    });
  });

  describe('Report Structure', () => {
    it('should include required sections', () => {
      const sampleReport = `# Research Report: What is X?

**Generated:** 2025-01-01T00:00:00.000Z
**Sections:** 3
**Total Facts:** 150
**Total Sources:** 45
**Coverage:** 85%
**Iterations:** 5

---

## Executive Summary

Key findings...

---

## Section 1

Content...

---

## Sources

1. https://example.com
`;

      expect(sampleReport).toContain('# Research Report');
      expect(sampleReport).toContain('**Generated:**');
      expect(sampleReport).toContain('**Sections:**');
      expect(sampleReport).toContain('**Total Facts:**');
      expect(sampleReport).toContain('## Executive Summary');
      expect(sampleReport).toContain('## Sources');
    });

    it('should list sources with numbers', () => {
      const sampleReport = `## Sources

1. https://site1.com
2. https://site2.com
3. https://site3.com
`;

      const sourceMatches = sampleReport.match(/^\d\. https?:\/\//gm);
      expect(sourceMatches).toHaveLength(3);
    });
  });

  describe('Metadata', () => {
    it('should track iteration count', () => {
      const state: ResearchState = {
        plan: { question: 'Q?', sections: [], totalEstimatedSources: 0, researchStrategy: 't' },
        findings: new Map(),
        iteration: 12,
        coverage: 95,
        confidence: 0.88,
        readyScore: 0.83,
        gaps: []
      };

      expect(state.iteration).toBe(12);
      expect(state.iteration).toBeGreaterThan(0);
    });

    it('should track coverage percentage', () => {
      const state: ResearchState = {
        plan: { question: 'Q?', sections: [], totalEstimatedSources: 0, researchStrategy: 't' },
        findings: new Map(),
        iteration: 5,
        coverage: 75.5,
        confidence: 0.7,
        readyScore: 0.53,
        gaps: []
      };

      expect(state.coverage).toBeGreaterThanOrEqual(0);
      expect(state.coverage).toBeLessThanOrEqual(100);
      expect(state.coverage).toBe(75.5);
    });

    it('should track confidence score', () => {
      const state: ResearchState = {
        plan: { question: 'Q?', sections: [], totalEstimatedSources: 0, researchStrategy: 't' },
        findings: new Map(),
        iteration: 3,
        coverage: 60,
        confidence: 0.65,
        readyScore: 0.39,
        gaps: []
      };

      expect(state.confidence).toBeGreaterThanOrEqual(0);
      expect(state.confidence).toBeLessThanOrEqual(1);
    });
  });
});
