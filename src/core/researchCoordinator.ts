/**
 * Research Coordinator — Manages Parallel Web + Visual Research
 *
 * Orchestrates:
 * 1. Web Research (Wayfarer) — SearXNG + Playwright text scraping
 * 2. Visual Research (Browser Operator) — UI-TARS screenshot + vision analysis
 * 3. Parallel execution of both streams
 * 4. Deduplication across sources
 * 5. Fact synthesis + quality ranking
 *
 * Flow:
 * Query → [Web Researcher (Wayfarer) + Visual Researcher (Browser Op)] → Merged Findings
 */

import { createLogger } from '../utils/logger.js';
import { context1ServiceEnhanced } from '../services/context1ServiceEnhanced.js';
import { runVisualResearch } from '../subagents/visualResearchAgent.js';

const log = createLogger('researchCoordinator');

export interface ResearchQuery {
  query: string;
  section: string;  // "customer_desires", "competitor_positioning", etc.
  platforms: Array<'web' | 'tiktok' | 'amazon' | 'facebook' | 'trustpilot'>;
  depth: 'quick' | 'normal' | 'deep';
}

export interface MergedFindings {
  query: string;
  section: string;
  webFindings: WebFinding[];
  visualFindings: VisualFinding[];
  deduplicatedFacts: DedupFact[];
  confidence: number;
  sources: Map<string, number>;  // platform → count
  executionTime: number;
}

export interface WebFinding {
  id: string;
  content: string;
  source: string;
  url: string;
  platform: 'web';
  confidence: number;
  metadata: Record<string, any>;
}

export interface VisualFinding {
  id: string;
  content: string;
  source: string;
  platform: 'tiktok' | 'amazon' | 'trustpilot' | 'facebook';
  confidence: number;
  metadata: Record<string, any>;
}

export interface DedupFact {
  id: string;
  fact: string;
  sourceCount: number;
  sources: Array<{ platform: string; url?: string }>;
  confidence: number;  // Boosted by multi-source confirmation
}

/**
 * Execute research on query across web + selected visual platforms
 * Returns deduplicated, ranked findings
 */
export async function coordinateResearch(
  query: ResearchQuery,
  abortSignal?: AbortSignal
): Promise<MergedFindings> {
  const startTime = Date.now();
  log.info(`Coordinating research: "${query.query}" on platforms [${query.platforms.join(', ')}]`);

  const webFindings: WebFinding[] = [];
  const visualFindings: VisualFinding[] = [];
  const promises: Promise<void>[] = [];

  // Parallel execution: web + visual research simultaneously
  if (query.platforms.includes('web')) {
    promises.push(
      executeWebResearch(query).then(findings => {
        webFindings.push(...findings);
      }).catch(err => {
        log.warn(`Web research failed:`, err);
      })
    );
  }

  for (const platform of query.platforms) {
    if (platform === 'web') continue;  // Already handled above

    promises.push(
      executeVisualResearch(query, platform).then(findings => {
        visualFindings.push(...findings);
      }).catch(err => {
        log.warn(`Visual research failed for ${platform}:`, err);
      })
    );
  }

  // Wait for all parallel research to complete
  await Promise.all(promises);

  if (abortSignal?.aborted) {
    log.warn(`Research aborted for "${query.query}"`);
    return {
      query: query.query,
      section: query.section,
      webFindings: [],
      visualFindings: [],
      deduplicatedFacts: [],
      confidence: 0,
      sources: new Map(),
      executionTime: Date.now() - startTime
    };
  }

  // Deduplicate and merge findings
  const deduplicatedFacts = await deduplicateFindings(
    [...webFindings, ...visualFindings],
    query.section
  );

  // Calculate aggregate confidence
  const avgConfidence = deduplicatedFacts.length > 0
    ? deduplicatedFacts.reduce((sum, f) => sum + f.confidence, 0) / deduplicatedFacts.length
    : 0;

  // Count sources
  const sources = new Map<string, number>();
  for (const finding of [...webFindings, ...visualFindings]) {
    const count = sources.get(finding.source) || 0;
    sources.set(finding.source, count + 1);
  }

  const result: MergedFindings = {
    query: query.query,
    section: query.section,
    webFindings,
    visualFindings,
    deduplicatedFacts,
    confidence: avgConfidence,
    sources,
    executionTime: Date.now() - startTime
  };

  log.info(`Research complete: ${deduplicatedFacts.length} unique facts, ${result.sources.size} sources, ${result.executionTime}ms`);
  return result;
}

/**
 * Execute web research via Wayfarer
 */
async function executeWebResearch(query: ResearchQuery): Promise<WebFinding[]> {
  log.info(`Executing web research: "${query.query}"`);

  // Call Wayfarer API (would be implemented with actual HTTP calls)
  // const response = await fetch('http://localhost:8889/search', {
  //   method: 'POST',
  //   body: JSON.stringify({ query: query.query, count: depthToCount(query.depth) })
  // });

  // For now, return placeholder
  const findings: WebFinding[] = [];

  // In production:
  // findings = response.json().results.map(page => ({
  //   id: generateId(),
  //   content: page.content,
  //   source: page.domain,
  //   url: page.url,
  //   platform: 'web',
  //   confidence: 0.5,
  //   metadata: { title: page.title, extractedAt: Date.now() }
  // }));

  return findings;
}

/**
 * Execute visual research via Browser Operator for specific platform
 */
async function executeVisualResearch(
  query: ResearchQuery,
  platform: 'tiktok' | 'amazon' | 'trustpilot' | 'facebook'
): Promise<VisualFinding[]> {
  log.info(`Executing visual research on ${platform}: "${query.query}"`);

  try {
    const maxResults = query.depth === 'deep' ? 100 : query.depth === 'normal' ? 50 : 20;

    const result = await runVisualResearch(platform, query.query, {
      maxResults,
      maxCommentsPerItem: query.depth === 'deep' ? 100 : 50,
      extractFacts: true
    });

    // Convert visual research result to findings
    const findings: VisualFinding[] = result.facts.map((fact, i) => ({
      id: `${platform}-${i}`,
      content: fact,
      source: platform,
      platform: platform as any,
      confidence: result.confidence,
      metadata: {
        query: query.query,
        extractedAt: Date.now(),
        rawData: JSON.stringify(result.data)
      }
    }));

    return findings;
  } catch (err) {
    log.warn(`Visual research failed for ${platform}:`, err);
    return [];
  }
}

/**
 * Deduplicate findings across web + visual sources
 * Uses semantic similarity via context1ServiceEnhanced
 */
async function deduplicateFindings(
  findings: Array<WebFinding | VisualFinding>,
  section: string
): Promise<DedupFact[]> {
  if (findings.length === 0) return [];

  log.info(`Deduplicating ${findings.length} findings`);

  const deduped = new Map<string, DedupFact>();
  const processed = new Set<string>();

  for (const finding of findings) {
    if (processed.has(finding.id)) continue;
    processed.add(finding.id);

    // Check context1 for semantic similarity
    const existing = await context1ServiceEnhanced.search(finding.content, section, 5);

    // Find if we already have a similar fact
    let foundMatch = false;
    for (const existing_fact of existing) {
      const dedupKey = existing_fact.id;
      if (deduped.has(dedupKey)) {
        const dedupFact = deduped.get(dedupKey)!;
        dedupFact.sourceCount++;
        dedupFact.sources.push({
          platform: finding.platform,
          url: (finding as any).url || undefined
        });
        // Boost confidence with more sources
        dedupFact.confidence = Math.min(0.99, 0.5 + dedupFact.sourceCount * 0.1);
        foundMatch = true;
        break;
      }
    }

    // New fact
    if (!foundMatch) {
      const dedupKey = `dedup-${Date.now()}-${Math.random()}`;
      deduped.set(dedupKey, {
        id: dedupKey,
        fact: finding.content,
        sourceCount: 1,
        sources: [{
          platform: finding.platform,
          url: (finding as any).url
        }],
        confidence: finding.confidence
      });
    }
  }

  return Array.from(deduped.values());
}

/**
 * Convert depth setting to result counts
 */
function depthToCount(depth: 'quick' | 'normal' | 'deep'): number {
  switch (depth) {
    case 'quick': return 5;
    case 'normal': return 20;
    case 'deep': return 100;
  }
}

/**
 * Quality score for findings (for ranking)
 * Higher score = more reliable
 */
export function calculateQualityScore(fact: DedupFact): number {
  // Multi-source boost
  const sourceBoost = Math.min(0.5, fact.sourceCount * 0.15);

  // Verified source boost (Amazon verified purchases, Trustpilot verified reviews, etc.)
  const verifiedSources = fact.sources.filter(s =>
    s.platform === 'trustpilot' ||
    (s.platform === 'amazon' && (s as any).verified)
  ).length;
  const verifiedBoost = Math.min(0.3, verifiedSources * 0.1);

  return Math.min(1.0, fact.confidence + sourceBoost + verifiedBoost);
}

/**
 * Format findings for display/synthesis
 */
export function formatMergedFindings(findings: MergedFindings): string {
  let output = `\n## Research: ${findings.query}\n`;
  output += `**Section:** ${findings.section}\n`;
  output += `**Execution Time:** ${findings.executionTime}ms\n`;
  output += `**Overall Confidence:** ${(findings.confidence * 100).toFixed(0)}%\n`;
  output += `**Sources:** ${Array.from(findings.sources.entries()).map(([p, c]) => `${p} (${c})`).join(', ')}\n\n`;

  output += `### Key Findings (${findings.deduplicatedFacts.length} unique facts)\n`;
  const sortedFacts = findings.deduplicatedFacts
    .sort((a, b) => calculateQualityScore(b) - calculateQualityScore(a))
    .slice(0, 10);

  for (const fact of sortedFacts) {
    const qualityScore = calculateQualityScore(fact);
    const sourceStr = fact.sources.map(s => s.platform).join(' + ');
    output += `- **[${qualityScore.toFixed(2)}]** ${fact.fact} **(${sourceStr})**\n`;
  }

  return output;
}
