/**
 * PHASE 2: Research Execution
 *
 * Deploys subagents to research each section in parallel.
 * Combines findings, reasons about them, and indexes results.
 */

import { SubagentPool } from '../../subagents/pool.js';
import { ollamaService } from '../../services/ollama.js';
import { context1Service } from '../../services/context1Service.js';
import { youtubeVideoQueue } from '../../services/youtubeTranscriptService.js';
import { storageService } from '../../services/storageService.js';
import { createLogger } from '../../utils/logger.js';
import { liveDisplay } from '../../utils/liveDisplay.js';
import { getModel } from '../../config/models.js';
import { assessNeedForYouTube } from '../../utils/youtubeSelectionLogic.js';
import pLimit from 'p-limit';
import type { ResearchSection } from './planner.js';

const log = createLogger('researcher');

// Concurrency limit for reasoning calls
const reasoningLimit = pLimit(3);

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface SectionAnalysis {
  keyInsights: string[];
  contradictions: string[];
  implications: string[];
  gaps: string[];
}

export interface ConfidenceDetails {
  score: number;                 // 0-1 raw score
  level: 'very_low' | 'low' | 'medium' | 'high' | 'very_high';
  sourcesCount: number;
  factsCount: number;
  sourceTypes: string[];         // ['community', 'academic', 'industry', 'code']
  contradictions: number;
  gaps: number;
  reason: string;                // Human-readable explanation
  hasCustomerVoice: boolean;     // Actual quotes from real customers?
  hasExpertVoice: boolean;       // Expert/authority opinions?
}

export interface SectionFindings {
  sectionId: string;
  sectionTitle: string;
  facts: string[];
  quotes: string[];
  statistics: Record<string, string>;
  sources: string[];
  confidence: number;
  confidenceDetails?: ConfidenceDetails;
  researched: boolean;
  analysis?: SectionAnalysis;
}

// ─────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────

/**
 * Parse JSON with robust error handling (same as planner).
 */
function parseJson<T>(raw: string): T {
  if (!raw || raw.length === 0) {
    throw new SyntaxError('parseJson: empty input');
  }

  try {
    const parsed = JSON.parse(raw);
    if (parsed !== null && parsed !== undefined) return parsed as T;
  } catch {}

  const fenceStripped = raw
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/```\s*$/m, '')
    .replace(/^[\s\n]+/, '')
    .replace(/[\s\n]+$/, '')
    .trim();

  if (fenceStripped.length > 0) {
    try {
      const parsed = JSON.parse(fenceStripped);
      if (parsed !== null && parsed !== undefined) return parsed as T;
    } catch {}
  }

  const greedyArray = raw.match(/\[\s*[\s\S]*\s*\]/);
  if (greedyArray) {
    try {
      return JSON.parse(greedyArray[0]) as T;
    } catch {}
  }

  const greedyObj = raw.match(/\{\s*[\s\S]*\s*\}/);
  if (greedyObj) {
    try {
      return JSON.parse(greedyObj[0]) as T;
    } catch {}
  }

  const lastArray = raw.match(/(\[\s*[\s\S]*?\s*\])\s*$/);
  if (lastArray) {
    try {
      return JSON.parse(lastArray[1]) as T;
    } catch {}
  }

  const lastObj = raw.match(/(\{\s*[\s\S]*?\s*\})\s*$/);
  if (lastObj) {
    try {
      return JSON.parse(lastObj[1]) as T;
    } catch {}
  }

  log.error(`parseJson failed. Input (first 500 chars): ${raw.substring(0, 500)}`);
  throw new SyntaxError(`parseJson: no valid JSON found in response (length=${raw.length})`);
}

/**
 * Categorize source URL by domain type.
 */
function categorizeSource(url: string): string {
  if (url.includes('reddit.com')) return 'community';
  if (url.includes('pubmed.gov') || url.includes('arxiv.org')) return 'academic';
  if (url.includes('github.com')) return 'code';
  return 'industry';
}

// ─────────────────────────────────────────────────────────────
// CONFIDENCE SCORING
// ─────────────────────────────────────────────────────────────

/**
 * Score confidence of findings and return a detailed breakdown.
 * Stricter scoring: requires high bar across all dimensions.
 * Backward-compatible: callers that only need the number use `.score`.
 */
function scoreConfidence(findings: SectionFindings): ConfidenceDetails {
  const sourcesCount = findings.sources.length;
  const factsCount   = findings.facts.length;

  // Source volume — STRICT: 30 sources for 0.5, 75+ for 1.0
  const sourcesScore = Math.min(sourcesCount / 75, 1);

  // Fact density — STRICT: 100+ facts needed for high confidence
  const factsScore = Math.min(factsCount / 100, 1);

  // Source diversity (unique types) — must have 5+ types for full score
  const sourceTypeSet = new Set(findings.sources.map(s => categorizeSource(s)));
  const sourceTypes   = Array.from(sourceTypeSet);
  const diversityScore = Math.min(sourceTypes.length / 5, 1);

  // Contradiction / gap penalties
  const contradictions     = (findings.analysis?.contradictions || []).length;
  const gaps               = (findings.analysis?.gaps || []).length;
  const contradictionPenalty = Math.min(contradictions * 0.1, 0.5);
  const gapPenalty           = Math.min(gaps * 0.05, 0.4);

  // Weighted composition
  const baseScore  = sourcesScore * 0.35 + factsScore * 0.4 + diversityScore * 0.25;
  const finalScore = Math.min(Math.max(baseScore - contradictionPenalty - gapPenalty, 0), 1.0);

  // Confidence level bucket
  let level: ConfidenceDetails['level'];
  if      (finalScore >= 0.8) level = 'very_high';
  else if (finalScore >= 0.6) level = 'high';
  else if (finalScore >= 0.4) level = 'medium';
  else if (finalScore >= 0.2) level = 'low';
  else                        level = 'very_low';

  // Voice detection (look at quotes array and facts for signals)
  const allText = [...findings.facts, ...findings.quotes].join(' ').toLowerCase();
  const hasCustomerVoice = findings.quotes.length > 0
    || /\b(customer|buyer|user|reviewer|bought|purchased)\b/.test(allText);
  const hasExpertVoice   = sourceTypes.includes('academic')
    || /\b(expert|study|research|doctor|professor|published|journal)\b/.test(allText);

  // Build human-readable reason
  const problems: string[] = [];
  const strengths: string[] = [];

  if (sourcesCount < 10)   problems.push(`only ${sourcesCount} sources`);
  else if (sourcesCount >= 50) strengths.push(`${sourcesCount} sources`);
  else                         strengths.push(`${sourcesCount} sources`);

  if (!hasCustomerVoice)   problems.push('no customer quotes found');
  else                     strengths.push('strong customer voice');

  if (!hasExpertVoice && level !== 'very_high') problems.push('missing academic/expert sources');
  else if (hasExpertVoice) strengths.push('expert sources present');

  if (sourceTypes.length < 2) problems.push('low source diversity');
  else if (sourceTypes.length >= 4) strengths.push('diverse source types');

  if (contradictions > 0)  problems.push(`${contradictions} contradiction${contradictions > 1 ? 's' : ''} need resolution`);
  if (gaps > 2)            problems.push(`${gaps} research gaps remain`);

  let reason: string;
  if (level === 'very_low' || level === 'low') {
    reason = `Weak: ${problems.join(', ') || 'insufficient data'}`;
  } else if (level === 'medium') {
    const detail = [...strengths, ...problems].join(', ');
    reason = `Medium: ${detail}`;
  } else {
    reason = `${level === 'very_high' ? 'Very high' : 'High'}: ${strengths.join(', ')}${problems.length > 0 ? `, but ${problems.join(', ')}` : ''}`;
  }

  return {
    score: finalScore,
    level,
    sourcesCount,
    factsCount,
    sourceTypes,
    contradictions,
    gaps,
    reason,
    hasCustomerVoice,
    hasExpertVoice
  };
}

// ─────────────────────────────────────────────────────────────
// REASONING LAYER
// ─────────────────────────────────────────────────────────────

/**
 * Reasoning layer: derive insights, find contradictions, identify gaps.
 * Transforms raw facts into meaningful analysis.
 */
async function reasonAboutFindings(
  section: ResearchSection,
  findings: SectionFindings
): Promise<SectionAnalysis | null> {
  const PLANNING_MODEL = getModel('planning');

  // Sample representatively across the fact list
  const step = Math.max(1, Math.floor(findings.facts.length / 30));
  const sampledFacts = findings.facts
    .filter((_, i) => i % step === 0)
    .slice(0, 30)
    .map((f, i) => `${i + 1}. ${f}`)
    .join('\n');

  const prompt = `You are a senior research analyst. You have collected ${findings.facts.length} facts from ${findings.sources.length} sources about: "${section.title}"

Research question context: ${section.description}
Key questions being answered: ${section.keyQuestions.join('; ')}

FACTS COLLECTED (representative sample):
${sampledFacts}

Your job is NOT to summarize these facts. Your job is to REASON about them:

1. KEY INSIGHTS: What non-obvious conclusions can be drawn? What patterns emerge across multiple sources? What does the data collectively point to that no single source explicitly states?

2. CONTRADICTIONS: Where do sources disagree? What claims conflict with each other? What are the tensions in this field?

3. IMPLICATIONS: Given these findings, what does this mean for someone building/deploying this? What are the practical consequences?

4. GAPS: What important questions remain unanswered? What did the research NOT find that we'd expect to find?

Return JSON only:
{
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "contradictions": ["contradiction 1", "contradiction 2"],
  "implications": ["implication 1", "implication 2", "implication 3"],
  "gaps": ["gap 1", "gap 2"]
}`;

  const response = await ollamaService.generateStream(prompt, PLANNING_MODEL, {
    temperature: 0.4,
    num_ctx: 8192,
    num_predict: 1024
  });

  try {
    return parseJson<SectionAnalysis>(response);
  } catch {
    log.warn(`Failed to parse reasoning output for section ${section.id}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// RESEARCH EXECUTION
// ─────────────────────────────────────────────────────────────

/**
 * Research a single section using parallel subagents.
 * Combines findings, reasons about them, indexes results, and handles YouTube videos.
 */
export async function researchSection(
  section: ResearchSection,
  pool: SubagentPool,
  queries: string[],
  taskId?: string,
  metricsTracker?: any  // QueryPerformanceTracker, kept as any to avoid circular deps
): Promise<SectionFindings> {
  log.info(`Researching section: ${section.title}`);
  const sectionAgentId = `[${section.title.slice(0, 16)}...]`;
  liveDisplay.setAgentStatus(sectionAgentId, `Executing ${queries.length} queries...`);

  // Submit ALL subagent queries simultaneously
  const queryStartTime = Date.now();
  const subagentPromises = queries.map((query) =>
    pool.submit({
      role: 'researcher',
      task: `Research: ${query}`,
      query,
      context: section.description,
      maxSteps: 5
    })
  );

  const results = await Promise.all(subagentPromises);
  const queryDuration = Date.now() - queryStartTime;

  // Aggregate findings from all subagents
  const sourceSet = new Set<string>();
  const findings: SectionFindings = {
    sectionId: section.id,
    sectionTitle: section.title,
    facts: [],
    quotes: [],
    statistics: {},
    sources: [],
    confidence: 0,
    researched: true
  };

  for (const result of results) {
    if (result.success) {
      findings.facts.push(...(result.facts || []));
      findings.quotes.push(...(result.quotes || []));
      Object.assign(findings.statistics, result.statistics || {});
      (result.sources || []).forEach(s => sourceSet.add(s));
    }
  }

  findings.sources = Array.from(sourceSet);

  // ── Record query metrics (if tracker provided) ──────────────────────
  if (metricsTracker) {
    const avgQueryDuration = queryDuration / queries.length;
    const factsPerSecond = findings.facts.length / (queryDuration / 1000);

    for (let i = 0; i < queries.length; i++) {
      metricsTracker.recordQuery({
        queryId: `${section.id}-query-${i}`,
        timestamp: Date.now(),
        query: queries[i],
        section: section.title,

        // Execution metrics
        duration_ms: Math.round(avgQueryDuration),
        wayfarer_calls: 5,  // Approximate
        wayfarer_success_rate: 0.85,  // Estimate
        pages_scraped: 6,

        // Output quality
        facts_extracted: Math.round(findings.facts.length / queries.length),
        facts_unique: Math.round(findings.facts.length * 0.8 / queries.length),  // Estimate dedup
        facts_per_second: Math.round(factsPerSecond * 100) / 100,
        dedup_rate: 0.2,  // Estimate 20% were duplicates

        // Impact
        coverage_delta: 0.05,  // Rough estimate
        confidence_delta: 0.02,
        quality_score: Math.round(
          (findings.facts.length / 10) *  // Fact count (normalized)
          (findings.sources.length / 5) *  // Source count (normalized)
          100
        ),

        // Cost
        model_tokens_used: Math.round(queries[i].length * 10),  // Rough estimate
      });
    }
  }

  // Smart YouTube selection — only queue when there's a real research gap
  const ytUrls = findings.sources.filter(url =>
    /youtube\.com\/watch|youtu\.be\//.test(url)
  );

  if (ytUrls.length > 0) {
    // Ask the gap detector: does this section actually need YouTube?
    const ytDecision = assessNeedForYouTube(
      { id: section.id, title: section.title, description: section.description },
      { confidence: findings.confidence, facts: findings.facts, sources: findings.sources }
    );

    if (ytDecision.needed) {
      log.info(`YouTube approved for "${section.title}" — gap: ${ytDecision.reason || 'detected'}`);
      liveDisplay.logEvent(`    YouTube: ${ytUrls.length} video(s) queued — ${ytDecision.reason}`);
      for (const url of ytUrls) {
        youtubeVideoQueue.enqueue(url, section.title);
      }
      const status = youtubeVideoQueue.getQueueStatus();
      log.info(`Queue status: ${status.queued} queued, ${status.processing} processing`);
    } else {
      log.info(`YouTube skipped for "${section.title}" — ${ytDecision.reason || 'section already well-covered'}`);
      liveDisplay.logEvent(`    YouTube: skipped (${ytDecision.reason || 'sufficient coverage'})`);
    }
  }

  // Score confidence — store full details and backward-compat numeric field
  const confidenceDetails = scoreConfidence(findings);
  findings.confidenceDetails = confidenceDetails;
  findings.confidence = confidenceDetails.score;

  // Reasoning layer
  if (findings.facts.length >= 5) {
    try {
      liveDisplay.setAgentStatus(sectionAgentId, `Reasoning across ${findings.facts.length} facts...`);
      const analysis = await reasoningLimit(() => reasonAboutFindings(section, findings));
      if (analysis) {
        findings.analysis = analysis;
        findings.facts.unshift(...analysis.keyInsights.map(i => `[INSIGHT] ${i}`));
        if (analysis.contradictions.length > 0) {
          findings.facts.push(...analysis.contradictions.map(c => `[CONTRADICTION] ${c}`));
        }
      }
    } catch (err) {
      log.warn(`Reasoning step failed for section ${section.id}:`, err);
    }
  }

  // Index facts into vector DB in batches (max 10 at a time to avoid overwhelming the service)
  const BATCH_SIZE = 10;
  for (let i = 0; i < findings.facts.length; i += BATCH_SIZE) {
    const batch = findings.facts.slice(i, Math.min(i + BATCH_SIZE, findings.facts.length));
    try {
      await Promise.all(
        batch.map((fact, batchIndex) =>
          context1Service.indexContent(
            `${section.id}-fact-${i + batchIndex}`,
            fact,
            'web',
            { section: section.title, confidence: findings.confidence }
          )
        )
      );
    } catch (err) {
      log.warn(`Failed to index batch of facts for section ${section.id}:`, err);
      // Continue with next batch despite partial failures
    }
  }

  // Persist findings
  if (taskId) {
    try {
      await storageService.saveFindings(taskId, section.id, findings);
    } catch (err) {
      log.warn(`Failed to persist findings for ${section.id}:`, err);
    }
  }

  liveDisplay.clearAgent(sectionAgentId);
  liveDisplay.logEvent(
    `  + Section "${section.title}" — ${findings.sources.length} sources, confidence: ${findings.confidence.toFixed(2)}`
  );

  return findings;
}
