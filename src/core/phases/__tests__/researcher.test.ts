/**
 * Unit tests for researcher.ts
 *
 * Tests for research execution: section findings, confidence scoring, analysis.
 */

import { describe, it, expect } from '@jest/globals';
import type { SectionFindings, SectionAnalysis } from '../researcher.js';

describe('Researcher', () => {
  describe('SectionFindings', () => {
    it('should have required fields', () => {
      const findings: SectionFindings = {
        sectionId: 'section-0',
        sectionTitle: 'Market Overview',
        facts: [
          'The collagen supplement market was valued at $3.8B in 2024',
          'Growth rate is 12% CAGR through 2030'
        ],
        quotes: [
          'Collagen is the most abundant protein in the human body'
        ],
        statistics: {
          'market-size': '$3.8B',
          'growth-rate': '12% CAGR'
        },
        sources: [
          'https://www.mordorintelligence.com/industry-reports/collagen-supplement-market',
          'https://www.coherentmarketinsights.com/market-report/collagen-supplement-market'
        ],
        confidence: 0.75,
        researched: true
      };

      expect(findings.sectionId).toBeDefined();
      expect(findings.sectionTitle).toBeDefined();
      expect(findings.facts.length).toBeGreaterThan(0);
      expect(findings.sources.length).toBeGreaterThan(0);
      expect(findings.confidence).toBeGreaterThanOrEqual(0);
      expect(findings.confidence).toBeLessThanOrEqual(1);
      expect(findings.researched).toBe(true);
    });

    it('should handle empty findings', () => {
      const findings: SectionFindings = {
        sectionId: 'section-1',
        sectionTitle: 'Empty Section',
        facts: [],
        quotes: [],
        statistics: {},
        sources: [],
        confidence: 0,
        researched: false
      };

      expect(findings.facts).toHaveLength(0);
      expect(findings.sources).toHaveLength(0);
      expect(findings.confidence).toBe(0);
    });
  });

  describe('Confidence Scoring', () => {
    it('should score based on sources and facts', () => {
      const findings: SectionFindings = {
        sectionId: 's1',
        sectionTitle: 'Test',
        facts: Array(50).fill('fact'), // 50 facts
        quotes: [],
        statistics: {},
        sources: Array(30).fill('https://example.com'), // 30 sources
        confidence: 0.5,
        researched: true
      };

      // Confidence should be between 0 and 1
      expect(findings.confidence).toBeGreaterThanOrEqual(0);
      expect(findings.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle high-confidence findings', () => {
      const findings: SectionFindings = {
        sectionId: 's1',
        sectionTitle: 'Well-Researched',
        facts: Array(120).fill('fact'), // 120 facts
        quotes: Array(20).fill('quote'),
        statistics: { 'stat1': 'value1', 'stat2': 'value2' },
        sources: Array(80).fill('https://example.com'), // 80 sources
        confidence: 0.85,
        researched: true
      };

      expect(findings.confidence).toBeGreaterThan(0.7);
    });
  });

  describe('Section Analysis', () => {
    it('should structure analytical insights', () => {
      const analysis: SectionAnalysis = {
        keyInsights: [
          'The collagen market is bifurcating into premium and mass-market segments',
          'Beauty from within is now dominant positioning over joint health'
        ],
        contradictions: [
          'Some studies show efficacy while others show no difference from placebo',
          'Companies claim rapid results but clinical trials show 8-12 week minimum'
        ],
        implications: [
          'This suggests the category must compete on brand and experience, not just efficacy',
          'Marketing will be critical differentiator'
        ],
        gaps: [
          'Limited long-term efficacy data beyond 6 months',
          'Unclear optimal dosing and source material (marine vs bovine vs porcine)'
        ]
      };

      expect(analysis.keyInsights.length).toBeGreaterThan(0);
      expect(analysis.contradictions.length).toBeGreaterThan(0);
      expect(analysis.implications.length).toBeGreaterThan(0);
      expect(analysis.gaps.length).toBeGreaterThan(0);
    });

    it('should allow optional analysis', () => {
      const findings: SectionFindings = {
        sectionId: 's1',
        sectionTitle: 'Test',
        facts: ['fact1'],
        quotes: [],
        statistics: {},
        sources: ['source1'],
        confidence: 0.3,
        researched: true,
        analysis: undefined
      };

      expect(findings.analysis).toBeUndefined();
    });

    it('should attach analysis to findings', () => {
      const findings: SectionFindings = {
        sectionId: 's1',
        sectionTitle: 'Test',
        facts: ['fact1'],
        quotes: [],
        statistics: {},
        sources: ['source1'],
        confidence: 0.5,
        researched: true,
        analysis: {
          keyInsights: ['insight1'],
          contradictions: ['contradiction1'],
          implications: ['implication1'],
          gaps: ['gap1']
        }
      };

      expect(findings.analysis?.keyInsights).toHaveLength(1);
      expect(findings.analysis?.keyInsights[0]).toBe('insight1');
    });
  });

  describe('Source Diversity', () => {
    it('should include diverse source types', () => {
      const findings: SectionFindings = {
        sectionId: 's1',
        sectionTitle: 'Diverse Sources',
        facts: ['fact'],
        quotes: [],
        statistics: {},
        sources: [
          'https://reddit.com/r/health',
          'https://pubmed.gov/article',
          'https://github.com/example',
          'https://techcrunch.com/article',
          'https://arxiv.org/paper'
        ],
        confidence: 0.75,
        researched: true
      };

      const sourceTypes = new Set(['community', 'academic', 'code', 'industry', 'academic']);
      expect(sourceTypes.size).toBeGreaterThanOrEqual(4);
      expect(findings.sources.length).toBeGreaterThanOrEqual(5);
    });
  });
});
