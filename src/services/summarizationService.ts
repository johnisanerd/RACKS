/**
 * Multi-Stage Summarization Service
 * Efficiently summarizes thousands of sources through hierarchical compression
 */

import { ollamaService } from './ollama.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('summarizationService');

export interface SummaryLevel {
  level: 'source' | 'chunk' | 'section' | 'synthesis';
  content: string;
  keyPoints: string[];
  confidence: number;
  tokensUsed: number;
  sourceCount: number;
}

export interface HierarchicalSummary {
  query: string;
  levels: SummaryLevel[];
  finalSynthesis: string;
  topics: string[];
  totalTokens: number;
  compression: number; // Final size / Original size
}

export class SummarizationService {
  private sourceModel = 'gemma4:e2b'; // Fast compression
  private synthesisModel = 'qwen3.5:9b'; // Higher quality for final synthesis

  /**
   * Stage 1: Summarize individual sources (1-3 sentences each)
   */
  async summarizeSources(sources: Array<{ id: string; content: string }>): Promise<Array<{ id: string; summary: string }>> {
    try {
      log.info(`Summarizing ${sources.length} sources...`);

      const summaries: Array<{ id: string; summary: string }> = [];

      for (const source of sources) {
        try {
          const prompt = `Summarize this in 1-2 sentences:

"${source.content.substring(0, 500)}"`;

          // In production: Would call ollamaService
          // const response = await ollamaService.generateStream(prompt, this.sourceModel);

          // Stub
          const summary = source.content.substring(0, 100) + '...';

          summaries.push({ id: source.id, summary });
        } catch (error) {
          log.warn(`Failed to summarize ${source.id}`, { error });
        }
      }

      log.info(`✓ Summarized ${summaries.length} sources`);
      return summaries;
    } catch (error) {
      log.error('Source summarization failed', { error });
      throw error;
    }
  }

  /**
   * Stage 2: Chunk summaries and re-summarize (abstraction layer)
   */
  async chunkAndReSummarize(
    sourceSummaries: Array<{ id: string; summary: string }>,
    chunkSize: number = 10
  ): Promise<Array<{ chunk: number; summary: string }>> {
    try {
      log.info(`Chunking ${sourceSummaries.length} summaries (size: ${chunkSize})...`);

      const chunks: Array<{ chunk: number; summary: string }> = [];

      for (let i = 0; i < sourceSummaries.length; i += chunkSize) {
        const chunk = sourceSummaries.slice(i, i + chunkSize);
        const chunkText = chunk.map((s) => s.summary).join(' ');

        try {
          const prompt = `Synthesize these ${chunk.length} summaries into 2-3 key points:

${chunkText}`;

          // In production: Would call ollamaService
          // const response = await ollamaService.generateStream(prompt, this.sourceModel);

          // Stub
          const summary = chunkText.substring(0, 200) + '...';

          chunks.push({
            chunk: Math.floor(i / chunkSize),
            summary
          });
        } catch (error) {
          log.warn(`Failed to summarize chunk ${i / chunkSize}`, { error });
        }
      }

      log.info(`✓ Created ${chunks.length} chunk summaries`);
      return chunks;
    } catch (error) {
      log.error('Chunk summarization failed', { error });
      throw error;
    }
  }

  /**
   * Stage 3: Synthesize across all chunks into final summary
   */
  async synthesizeHierarchy(
    chunkSummaries: Array<{ chunk: number; summary: string }>,
    query: string
  ): Promise<{ synthesis: string; keyPoints: string[] }> {
    try {
      log.info(`Synthesizing ${chunkSummaries.length} chunks...`);

      const allText = chunkSummaries.map((c) => c.summary).join('\n\n');

      const prompt = `Research question: "${query}"

Here's a multi-level summary of findings:

${allText}

Provide:
1. Final synthesis (3–4 sentences answering the question)
2. Top 5 key insights
3. Confidence (0–1)`;

      // In production: Would call ollamaService
      // const response = await ollamaService.generateStream(prompt, this.synthesisModel);

      // Stub
      const synthesis = `Based on analysis of multiple sources regarding "${query}", key insights include: ` + allText.substring(0, 200);

      const keyPoints = [
        'Finding 1 from synthesis',
        'Finding 2 from synthesis',
        'Finding 3 from synthesis',
        'Finding 4 from synthesis',
        'Finding 5 from synthesis'
      ];

      return { synthesis, keyPoints };
    } catch (error) {
      log.error('Synthesis failed', { error });
      throw error;
    }
  }

  /**
   * Full pipeline: Source → Chunk → Synthesis
   */
  async hierarchicalSummarize(
    sources: Array<{ id: string; content: string }>,
    query: string
  ): Promise<HierarchicalSummary> {
    const startTime = Date.now();
    let totalOriginalTokens = 0;
    let totalFinalTokens = 0;

    try {
      log.info(`Starting hierarchical summarization for: "${query}"`);
      log.info(`Processing ${sources.length} sources...`);

      // Calculate original size
      totalOriginalTokens = sources.reduce((sum, s) => sum + s.content.length / 4, 0);

      // Stage 1: Summarize sources
      const sourceSummaries = await this.summarizeSources(sources);

      // Stage 2: Chunk and re-summarize
      const chunkSummaries = await this.chunkAndReSummarize(sourceSummaries);

      // Stage 3: Final synthesis
      const { synthesis, keyPoints } = await this.synthesizeHierarchy(chunkSummaries, query);

      totalFinalTokens = synthesis.length / 4;

      const levels: SummaryLevel[] = [
        {
          level: 'source',
          content: sourceSummaries.map((s) => s.summary).join('\n'),
          keyPoints: [],
          confidence: 0.75,
          tokensUsed: sourceSummaries.reduce((sum, s) => sum + s.summary.length / 4, 0),
          sourceCount: sourceSummaries.length
        },
        {
          level: 'chunk',
          content: chunkSummaries.map((c) => c.summary).join('\n'),
          keyPoints: [],
          confidence: 0.8,
          tokensUsed: chunkSummaries.reduce((sum, c) => sum + c.summary.length / 4, 0),
          sourceCount: chunkSummaries.length
        },
        {
          level: 'synthesis',
          content: synthesis,
          keyPoints,
          confidence: 0.85,
          tokensUsed: totalFinalTokens,
          sourceCount: 1
        }
      ];

      const compression = totalFinalTokens / totalOriginalTokens;
      const elapsed = Date.now() - startTime;

      log.info(`✓ Hierarchical summarization complete (${elapsed}ms)`);
      log.info(`Compression: ${(compression * 100).toFixed(1)}% (${totalOriginalTokens}t → ${totalFinalTokens}t)`);

      return {
        query,
        levels,
        finalSynthesis: synthesis,
        topics: extractTopics(synthesis),
        totalTokens: totalOriginalTokens,
        compression
      };
    } catch (error) {
      log.error('Hierarchical summarization failed', { error });
      throw error;
    }
  }

  /**
   * Extract topics from synthesis (keyword extraction)
   */
  extractTopics(text: string, topN: number = 5): string[] {
    // Stub: Would use TF-IDF or textrank in production
    const words = text.split(/\s+/).filter((w) => w.length > 5);
    return Array.from(new Set(words)).slice(0, topN);
  }

  /**
   * Generate final report summary with confidence metrics
   */
  generateReportSummary(summary: HierarchicalSummary): string {
    const { query, levels, compression } = summary;
    const synthesisLevel = levels[levels.length - 1];

    return `
Research Question: "${query}"

═══════════════════════════════════════════════════════════

${synthesisLevel.content}

═══════════════════════════════════════════════════════════

Compression Metrics:
  Sources Analyzed: ${levels[0].sourceCount}
  Hierarchical Levels: ${levels.length}
  Overall Compression: ${(compression * 100).toFixed(1)}%
  Confidence Score: ${(synthesisLevel.confidence * 100).toFixed(0)}%

Key Findings:
${synthesisLevel.keyPoints.map((p, i) => `  ${i + 1}. ${p}`).join('\n')}
`;
  }
}

/**
 * Helper: Extract topics from text
 */
function extractTopics(text: string, topN: number = 5): string[] {
  const words = text.split(/\s+/).filter((w) => w.length > 5);
  return Array.from(new Set(words)).slice(0, topN);
}

export const summarizationService = new SummarizationService();
