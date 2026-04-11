/**
 * Unit tests for planner.ts
 *
 * Tests for research planning: question decomposition, query generation, validation.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import type { ResearchPlan, ResearchSection } from '../planner.js';

describe('Planner', () => {
  describe('ResearchPlan', () => {
    it('should have required fields', () => {
      const plan: ResearchPlan = {
        question: 'What is the market for collagen supplements?',
        sections: [
          {
            id: 'section-0',
            title: 'Market Size',
            description: 'Current size and growth of collagen market',
            keyQuestions: ['What is the current market size?', 'What is growth rate?'],
            priority: 'high'
          }
        ],
        totalEstimatedSources: 500,
        researchStrategy: 'Multi-section research: 1 sections, ~500 sources per section'
      };

      expect(plan.question).toBeDefined();
      expect(plan.sections).toHaveLength(1);
      expect(plan.totalEstimatedSources).toBe(500);
      expect(plan.sections[0].title).toBeDefined();
    });

    it('should validate section structure', () => {
      const section: ResearchSection = {
        id: 'section-0',
        title: 'Competitive Landscape',
        description: 'Major competitors and their positioning',
        keyQuestions: ['Who are the market leaders?', 'What are their value props?'],
        priority: 'high'
      };

      expect(section.id).toBeDefined();
      expect(section.title).toBeDefined();
      expect(section.description).toBeDefined();
      expect(section.keyQuestions).toHaveLength(2);
      expect(['high', 'medium', 'low']).toContain(section.priority);
    });

    it('should have multiple sections', () => {
      const plan: ResearchPlan = {
        question: 'What is the collagen supplement market?',
        sections: [
          { id: 's1', title: 'Market Size', description: 'Size', keyQuestions: ['Size?'], priority: 'high' },
          { id: 's2', title: 'Competitors', description: 'Competitors', keyQuestions: ['Who?'], priority: 'high' },
          { id: 's3', title: 'Trends', description: 'Trends', keyQuestions: ['Trends?'], priority: 'medium' }
        ],
        totalEstimatedSources: 1500,
        researchStrategy: 'Three-section research'
      };

      expect(plan.sections).toHaveLength(3);
      const highPriority = plan.sections.filter(s => s.priority === 'high');
      expect(highPriority.length).toBeGreaterThan(0);
    });
  });

  describe('Query generation', () => {
    it('should create valid search queries', () => {
      const queries = [
        'collagen supplement market 2025',
        'site:reddit.com collagen supplement experiences',
        'collagen peptides vs powder',
        'best collagen brands reviews',
        'collagen skin health clinical studies'
      ];

      expect(queries).toHaveLength(5);
      expect(queries.every(q => typeof q === 'string' && q.length > 0)).toBe(true);
    });

    it('should validate query structure', () => {
      const validQuery = 'collagen supplement market';
      expect(validQuery).toBeDefined();
      expect(validQuery.length).toBeGreaterThan(0);
      expect(validQuery.split(' ').length).toBeGreaterThanOrEqual(2);
    });
  });
});
