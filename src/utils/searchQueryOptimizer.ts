/**
 * Search Query Optimizer for Deep Brand Research
 *
 * Generates highly targeted search queries for brand research across all platforms.
 * Focuses on precision and source diversity (not just volume).
 */

import { createLogger } from './logger.js';

const log = createLogger('searchQueryOptimizer');

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface OptimizedQuerySet {
  platform: 'tiktok' | 'instagram' | 'youtube' | 'reddit' | 'twitter' | 'general' | 'news' | 'reviews';
  queries: string[];
  purpose: string;
  estimatedSources: number;
}

export interface BrandQueryStrategy {
  brand: string;
  niche?: string;
  competitors?: string[];
  queries: OptimizedQuerySet[];
  totalEstimatedQueries: number;
  totalEstimatedSources: number;
}

// ─────────────────────────────────────────────────────────────
// PLATFORM-SPECIFIC QUERY GENERATORS
// ─────────────────────────────────────────────────────────────

function generateTikTokQueries(brand: string, niche?: string): OptimizedQuerySet {
  const brandClean = brand.replace(/[^a-z0-9]/gi, '');

  return {
    platform: 'tiktok',
    purpose: 'Find TikTok videos, creators, trends, and viral content',
    estimatedSources: 50,
    queries: [
      `site:tiktok.com @${brandClean}`,
      `site:tiktok.com ${brand} official`,
      `site:tiktok.com "${brand}"`,
      `${brand} TikTok videos trending`,
      `${brand} TikTok creator content`,
      `${brand} TikTok how to`,
      `${brand} TikTok reviews honest`,
      `${brand} TikTok transformation before after`,
      `${brand} TikTok unboxing haul`,
      `${brand} TikTok fail experience`,
    ],
  };
}

function generateInstagramQueries(brand: string, niche?: string): OptimizedQuerySet {
  return {
    platform: 'instagram',
    purpose: 'Find Instagram profile, aesthetic, content strategy, posts',
    estimatedSources: 40,
    queries: [
      `site:instagram.com ${brand} official`,
      `site:instagram.com @${brand.replace(/[^a-z0-9]/gi, '')}`,
      `${brand} Instagram account followers`,
      `${brand} Instagram aesthetic posts`,
      `${brand} Instagram content strategy`,
      `${brand} Instagram photos products`,
      `${brand} Instagram behind the scenes`,
      `${brand} Instagram stories highlights`,
      `${brand} Instagram engagement followers`,
    ],
  };
}

function generateYouTubeQueries(brand: string, niche?: string): OptimizedQuerySet {
  return {
    platform: 'youtube',
    purpose: 'Find YouTube channel, videos, reviews, tutorials, vlogs',
    estimatedSources: 50,
    queries: [
      `site:youtube.com ${brand} official channel`,
      `site:youtube.com "${brand}" review`,
      `${brand} YouTube channel subscribers`,
      `${brand} YouTube tutorial how to use`,
      `${brand} YouTube honest review unboxing`,
      `${brand} YouTube creator channel`,
      `${brand} YouTube product demo`,
      `${brand} YouTube customer testimonial`,
      `${brand} YouTube fail review`,
      `${brand} YouTube influencer collaboration`,
    ],
  };
}

function generateRedditQueries(brand: string, niche?: string): OptimizedQuerySet {
  const brandSanitized = brand.replace(/\s+/g, '').toLowerCase();

  return {
    platform: 'reddit',
    purpose: 'Find Reddit communities, discussions, opinions, experiences',
    estimatedSources: 60,
    queries: [
      `site:reddit.com r/${brandSanitized}`,
      `site:reddit.com ${brand} review`,
      `site:reddit.com ${brand} experience`,
      `${brand} Reddit community discussion`,
      `${brand} Reddit what do people think`,
      `${brand} Reddit complaints issues`,
      `${brand} Reddit worth it should I buy`,
      `${brand} Reddit vs alternatives`,
      `${brand} Reddit AMA ask me anything`,
      `${brand} Reddit honest opinion`,
      `${brand} Reddit scam legitimate`,
    ],
  };
}

function generateTwitterQueries(brand: string, niche?: string): OptimizedQuerySet {
  const brandClean = brand.replace(/[^a-z0-9]/gi, '');

  return {
    platform: 'twitter',
    purpose: 'Find Twitter/X mentions, sentiment, conversations, news',
    estimatedSources: 45,
    queries: [
      `site:twitter.com @${brandClean}`,
      `site:twitter.com ${brand} official`,
      `${brand} Twitter account followers`,
      `${brand} Twitter mentions sentiment`,
      `"${brand}" tweet review experience`,
      `${brand} Twitter controversy discussion`,
      `${brand} Twitter customer service`,
      `${brand} Twitter trending topic`,
      `${brand} Twitter news announcement`,
      `${brand} Twitter community feedback`,
    ],
  };
}

function generateReviewsQueries(brand: string, niche?: string): OptimizedQuerySet {
  return {
    platform: 'reviews',
    purpose: 'Find product reviews, ratings, and customer feedback',
    estimatedSources: 50,
    queries: [
      `${brand} reviews ratings Trustpilot`,
      `${brand} Google Reviews customer feedback`,
      `"${brand}" reviews -fake -affiliate`,
      `${brand} Capterra reviews ratings`,
      `${brand} G2 reviews customer scores`,
      `${brand} Amazon reviews customer feedback`,
      `${brand} product reviews honest opinions`,
      `${brand} customer satisfaction ratings`,
      `${brand} testimonials success stories`,
      `${brand} quality reviews specifications`,
    ],
  };
}

function generateNewsQueries(brand: string, niche?: string): OptimizedQuerySet {
  return {
    platform: 'news',
    purpose: 'Find news coverage, press releases, announcements, industry news',
    estimatedSources: 35,
    queries: [
      `${brand} news 2025 announcement`,
      `${brand} press release funding`,
      `${brand} TechCrunch Venture Beat news`,
      `${brand} startup funding raised`,
      `${brand} acquisition merger deal`,
      `${brand} partnership announcement`,
      `${brand} new product launch`,
      `${brand} industry news ${niche || 'market'}`,
      `${brand} CEO interview founder story`,
      `${brand} expansion growth news`,
    ],
  };
}

function generateGeneralQueries(brand: string, niche?: string): OptimizedQuerySet {
  return {
    platform: 'general',
    purpose: 'Find general information, websites, blogs, articles',
    estimatedSources: 70,
    queries: [
      `${brand} official website`,
      `${brand} company about page mission`,
      `${brand} what is how does it work`,
      `${brand} products services offerings`,
      `${brand} pricing cost how much`,
      `${brand} target audience customers`,
      `${brand} founded history background`,
      `${brand} competitors alternatives`,
      `${brand} features specifications`,
      `${brand} tutorial guide getting started`,
      `${brand} blog articles insights`,
      `${brand} whitepaper case study`,
      `${brand} integrations API documentation`,
      `${brand} community forum support`,
    ],
  };
}

// ─────────────────────────────────────────────────────────────
// MAIN QUERY GENERATION
// ─────────────────────────────────────────────────────────────

/**
 * Generate a comprehensive search query strategy for a brand.
 * Returns queries optimized for all platforms to achieve 1000+ sources.
 */
export function generateBrandSearchStrategy(
  brand: string,
  niche?: string,
  competitors?: string[]
): BrandQueryStrategy {
  log.info(`Generating search strategy for brand: ${brand}${niche ? ` (${niche})` : ''}`);

  const querysets: OptimizedQuerySet[] = [
    generateGeneralQueries(brand, niche),
    generateTikTokQueries(brand, niche),
    generateInstagramQueries(brand, niche),
    generateYouTubeQueries(brand, niche),
    generateRedditQueries(brand, niche),
    generateTwitterQueries(brand, niche),
    generateReviewsQueries(brand, niche),
    generateNewsQueries(brand, niche),
  ];

  const totalQueries = querysets.reduce((sum, qs) => sum + qs.queries.length, 0);
  const totalEstimatedSources = querysets.reduce((sum, qs) => sum + qs.estimatedSources, 0);

  log.info(`Generated ${totalQueries} queries across ${querysets.length} platforms. Estimated ${totalEstimatedSources} sources.`);

  return {
    brand,
    niche,
    competitors,
    queries: querysets,
    totalEstimatedQueries: totalQueries,
    totalEstimatedSources,
  };
}

/**
 * Flatten the strategy into a simple query list for execution.
 */
export function flattenBrandSearchStrategy(strategy: BrandQueryStrategy): string[] {
  return strategy.queries.flatMap(qs => qs.queries);
}

/**
 * Get queries for a specific platform only.
 */
export function getQueriesByPlatform(
  strategy: BrandQueryStrategy,
  platform: OptimizedQuerySet['platform']
): string[] {
  const queryset = strategy.queries.find(qs => qs.platform === platform);
  return queryset?.queries || [];
}

/**
 * Batch queries into groups of N for parallel execution.
 */
export function batchQueries(
  strategy: BrandQueryStrategy,
  batchSize: number = 5
): string[][] {
  const flatQueries = flattenBrandSearchStrategy(strategy);
  const batches: string[][] = [];

  for (let i = 0; i < flatQueries.length; i += batchSize) {
    batches.push(flatQueries.slice(i, i + batchSize));
  }

  return batches;
}

/**
 * Track source diversity across platforms.
 * Used by reflection agent to detect over-reliance on single sources.
 */
export interface SourceDiversityTracker {
  total: number;
  byPlatform: Record<string, number>;
  byCategory: Record<string, number>;
  diversityScore: number;
  gapAnalysis: string[];
}

export function analyzeSourceDiversity(
  sources: Array<{ url: string; platform?: string; category?: string }>
): SourceDiversityTracker {
  const byPlatform: Record<string, number> = {};
  const byCategory: Record<string, number> = {
    official: 0,
    social_media: 0,
    reviews: 0,
    news: 0,
    blogs: 0,
    forums: 0,
    video: 0,
    other: 0,
  };

  sources.forEach(source => {
    if (source.platform) {
      byPlatform[source.platform] = (byPlatform[source.platform] || 0) + 1;
    }
    if (source.category) {
      byCategory[source.category] = (byCategory[source.category] || 0) + 1;
    }
  });

  // Calculate diversity score (0-1, where 1 is perfectly balanced)
  const platformEntropy = Object.values(byPlatform).length / 8; // 8 major platforms
  const categoryEntropy = Object.values(byCategory).length / 8; // 8 major categories
  const diversityScore = (platformEntropy + categoryEntropy) / 2;

  // Identify gaps
  const gapAnalysis: string[] = [];
  if ((byPlatform['tiktok'] || 0) / sources.length < 0.15) gapAnalysis.push('TikTok sources underrepresented');
  if ((byPlatform['reddit'] || 0) / sources.length < 0.12) gapAnalysis.push('Reddit sources underrepresented');
  if ((byCategory['reviews'] || 0) / sources.length < 0.10) gapAnalysis.push('Review sources underrepresented');
  if ((byCategory['video'] || 0) / sources.length < 0.10) gapAnalysis.push('Video sources underrepresented');

  return {
    total: sources.length,
    byPlatform,
    byCategory,
    diversityScore,
    gapAnalysis,
  };
}

export default {
  generateBrandSearchStrategy,
  flattenBrandSearchStrategy,
  getQueriesByPlatform,
  batchQueries,
  analyzeSourceDiversity,
};
