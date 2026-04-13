/**
 * Visual Research Agent — Browser-Based Multi-Platform Scraping
 *
 * Uses UI-TARS Desktop to scrape:
 * - TikTok: videos, captions, comments, engagement, sentiment
 * - Amazon: product listings, sponsored ads, customer reviews, ratings
 * - Facebook Ads Library: ad creative, messaging, CTA patterns
 * - Trustpilot: reviews, ratings, customer themes
 * - Instagram: posts, comments, creator analysis
 *
 * Returns structured findings for orchestrator synthesis
 */

import { createLogger } from '../utils/logger.js';

const log = createLogger('visualResearchAgent');

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface TikTokVideo {
  id: string;
  caption: string;
  hashtags: string[];
  hook: string;  // First sentence/emotional hook
  creator: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  duration: number;
  postedAt: string;
  engagement: number;  // (likes + shares + saves) / views
}

export interface TikTokComment {
  id: string;
  author: string;
  text: string;
  likes: number;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  themes: string[];  // ["pricing", "results", "taste", "effectiveness"]
  timestamp: string;
}

export interface TikTokAnalysis {
  query: string;
  videosFound: number;
  videos: TikTokVideo[];
  topComments: TikTokComment[];
  commonThemes: Map<string, number>;  // theme → count
  sentimentDistribution: { positive: number; negative: number; neutral: number };
  viralPatterns: string[];  // "before/after", "urgency", "creator authenticity", etc.
  emotionalHooks: string[];
  confidence: number;  // 0-1, based on engagement + comment volume
}

export interface AmazonProduct {
  id: string;
  title: string;
  asin: string;
  price: number;
  currency: string;
  rating: number;  // 1-5
  reviewCount: number;
  sponsored: boolean;
  imageUrl?: string;
  keyFeatures: string[];
}

export interface AmazonReview {
  id: string;
  author: string;
  rating: number;
  title: string;
  text: string;
  verified: boolean;
  helpful: number;  // "X found this helpful"
  sentiment: 'positive' | 'negative' | 'neutral';
  themes: string[];  // ["price", "quality", "shipping", "results"]
  date: string;
}

export interface AmazonAnalysis {
  query: string;
  productsFound: number;
  topProducts: AmazonProduct[];
  reviewsAnalyzed: number;
  reviews: AmazonReview[];
  averageRating: number;
  priceRange: { min: number; max: number };
  commonObjections: string[];  // Most mentioned problems
  sentimentDistribution: { positive: number; negative: number; neutral: number };
  confidence: number;
}

export interface TrustpilotReview {
  id: string;
  author: string;
  rating: number;  // 1-5
  title: string;
  text: string;
  verified: boolean;
  helpfulCount: number;
  sentiment: 'positive' | 'negative' | 'neutral';
  themes: string[];
  date: string;
}

export interface TrustpilotAnalysis {
  query: string;
  companyName: string;
  overallRating: number;
  reviewCount: number;
  reviews: TrustpilotReview[];
  commonComplaints: string[];
  commonPraises: string[];
  sentimentDistribution: { positive: number; negative: number; neutral: number };
  trustScore: number;  // 0-100, based on verified reviews
  confidence: number;
}

export interface VisualResearchResult {
  platform: 'tiktok' | 'amazon' | 'facebook' | 'trustpilot' | 'instagram';
  query: string;
  timestamp: number;
  data: TikTokAnalysis | AmazonAnalysis | TrustpilotAnalysis;
  facts: string[];  // Extracted key facts
  gaps: string[];  // What's missing
  confidence: number;
}

// ─────────────────────────────────────────────────────────────
// PLATFORM-SPECIFIC EXTRACTORS
// ─────────────────────────────────────────────────────────────

/**
 * TikTok extractor: Analyze videos, comments, viral patterns
 */
export async function analyzeTikTok(
  query: string,
  maxVideos: number = 20,
  maxCommentsPerVideo: number = 50
): Promise<TikTokAnalysis> {
  log.info(`Analyzing TikTok: "${query}" (${maxVideos} videos)`);

  // Simulated TikTok scraping via Browser Operator
  // In reality: UI-TARS takes screenshots, vision model extracts video data
  const videos: TikTokVideo[] = [];
  const allComments: TikTokComment[] = [];
  const themes = new Map<string, number>();
  let positiveSentiment = 0;
  let negativeSentiment = 0;
  let neutralSentiment = 0;

  // Parse TikTok data structure (would come from Browser Operator)
  // Videos: extract caption, hook, engagement metrics
  // Comments: sentiment + theme extraction

  const viralPatterns = extractViralPatterns(videos);
  const emotionalHooks = extractEmotionalHooks(videos);

  const totalEngagement = videos.reduce((sum, v) => sum + v.engagement, 0);
  const avgEngagement = videos.length > 0 ? totalEngagement / videos.length : 0;

  const analysis: TikTokAnalysis = {
    query,
    videosFound: videos.length,
    videos,
    topComments: allComments.slice(0, 10),
    commonThemes: themes,
    sentimentDistribution: {
      positive: positiveSentiment,
      negative: negativeSentiment,
      neutral: neutralSentiment
    },
    viralPatterns,
    emotionalHooks,
    confidence: Math.min(1.0, (videos.length / 10) * (avgEngagement > 0.02 ? 1.0 : 0.6))
  };

  log.info(`TikTok analysis: ${videos.length} videos, ${allComments.length} comments, confidence ${analysis.confidence.toFixed(2)}`);
  return analysis;
}

/**
 * Amazon extractor: Product listings, reviews, objections
 */
export async function analyzeAmazon(
  query: string,
  maxProducts: number = 15,
  maxReviewsPerProduct: number = 30
): Promise<AmazonAnalysis> {
  log.info(`Analyzing Amazon: "${query}" (${maxProducts} products)`);

  const products: AmazonProduct[] = [];
  const reviews: AmazonReview[] = [];
  const objections: Map<string, number> = new Map();
  let totalRating = 0;
  let minPrice = Infinity;
  let maxPrice = 0;
  let positiveSentiment = 0;
  let negativeSentiment = 0;
  let neutralSentiment = 0;

  // Parse Amazon data structure (from Browser Operator)
  // Products: title, price, rating, sponsored status
  // Reviews: sentiment + theme extraction

  const commonObjections = Array.from(objections.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([objection]) => objection)
    .slice(0, 5);

  const analysis: AmazonAnalysis = {
    query,
    productsFound: products.length,
    topProducts: products.slice(0, 5),
    reviewsAnalyzed: reviews.length,
    reviews,
    averageRating: products.length > 0 ? totalRating / products.length : 0,
    priceRange: { min: minPrice, max: maxPrice },
    commonObjections,
    sentimentDistribution: {
      positive: positiveSentiment,
      negative: negativeSentiment,
      neutral: neutralSentiment
    },
    confidence: Math.min(1.0, (reviews.length / 50) * 0.5 + (products.length / 10) * 0.5)
  };

  log.info(`Amazon analysis: ${products.length} products, ${reviews.length} reviews, confidence ${analysis.confidence.toFixed(2)}`);
  return analysis;
}

/**
 * Trustpilot extractor: Reviews, complaints, trust score
 */
export async function analyzeTrustpilot(
  query: string,
  maxReviews: number = 100
): Promise<TrustpilotAnalysis> {
  log.info(`Analyzing Trustpilot: "${query}" (${maxReviews} reviews)`);

  const reviews: TrustpilotReview[] = [];
  const complaints: Map<string, number> = new Map();
  const praises: Map<string, number> = new Map();
  let totalRating = 0;
  let verifiedCount = 0;
  let positiveSentiment = 0;
  let negativeSentiment = 0;

  // Parse Trustpilot data structure
  // Reviews: verified badge, helpful count, sentiment + themes

  const commonComplaints = Array.from(complaints.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([complaint]) => complaint)
    .slice(0, 5);

  const commonPraises = Array.from(praises.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([praise]) => praise)
    .slice(0, 5);

  const trustScore = Math.min(100, (verifiedCount / Math.max(1, reviews.length)) * 100 + (totalRating / 5) * 40);

  const analysis: TrustpilotAnalysis = {
    query,
    companyName: query,
    overallRating: reviews.length > 0 ? totalRating / reviews.length : 0,
    reviewCount: reviews.length,
    reviews,
    commonComplaints,
    commonPraises,
    sentimentDistribution: {
      positive: positiveSentiment,
      negative: negativeSentiment,
      neutral: reviews.length - positiveSentiment - negativeSentiment
    },
    trustScore,
    confidence: Math.min(1.0, (reviews.length / 100) * (verifiedCount > reviews.length * 0.3 ? 1.0 : 0.7))
  };

  log.info(`Trustpilot analysis: ${reviews.length} reviews, trust score ${trustScore.toFixed(0)}, confidence ${analysis.confidence.toFixed(2)}`);
  return analysis;
}

// ─────────────────────────────────────────────────────────────
// PATTERN EXTRACTION
// ─────────────────────────────────────────────────────────────

function extractViralPatterns(videos: TikTokVideo[]): string[] {
  const patterns: string[] = [];
  const textContent = videos.map(v => v.caption).join(' ').toLowerCase();

  const patternRules = [
    { name: 'before/after', regex: /before|after|transformation|progress/gi },
    { name: 'urgency', regex: /now|limited|only|hurry|don't wait|asap|ending soon/gi },
    { name: 'emotional', regex: /feel|love|hate|scared|excited|amazed|shocked/gi },
    { name: 'question hook', regex: /\?/g },
    { name: 'creator authenticity', regex: /real|honest|truth|confession|secret|unexpected/gi },
    { name: 'social proof', regex: /everyone|everyone's|trending|viral|go viral|people love/gi }
  ];

  for (const pattern of patternRules) {
    const matches = textContent.match(pattern.regex);
    if (matches && matches.length > videos.length * 0.3) {  // Present in 30%+ of videos
      patterns.push(pattern.name);
    }
  }

  return patterns;
}

function extractEmotionalHooks(videos: TikTokVideo[]): string[] {
  return videos
    .filter(v => v.hook && v.engagement > 0.03)  // High engagement hooks
    .map(v => v.hook)
    .slice(0, 10);
}

function extractCommonThemes(comments: TikTokComment[]): Map<string, number> {
  const themes = new Map<string, number>();

  for (const comment of comments) {
    for (const theme of comment.themes) {
      themes.set(theme, (themes.get(theme) || 0) + 1);
    }
  }

  return themes;
}

// ─────────────────────────────────────────────────────────────
// SENTIMENT ANALYSIS (Simple keyword-based)
// ─────────────────────────────────────────────────────────────

export function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' | 'mixed' {
  const lower = text.toLowerCase();

  const positiveWords = ['love', 'amazing', 'great', 'excellent', 'best', 'awesome', 'fantastic', 'happy', 'works', 'effective', 'recommend'];
  const negativeWords = ['hate', 'terrible', 'worst', 'bad', 'awful', 'horrible', 'waste', 'scam', 'doesn\'t work', 'disappointed', 'regret'];

  const positiveCount = positiveWords.filter(w => lower.includes(w)).length;
  const negativeCount = negativeWords.filter(w => lower.includes(w)).length;

  if (positiveCount > 0 && negativeCount > 0) return 'mixed';
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

export function extractThemes(text: string): string[] {
  const themePatterns: Record<string, RegExp> = {
    'pricing': /price|cost|expensive|cheap|afford|money|dollar/i,
    'results': /result|work|effective|effective|changes|visible|improvement/i,
    'taste': /taste|flavor|palatable|delicious|gross|disgusting/i,
    'quality': /quality|product quality|durability|build|made|craftsmanship/i,
    'shipping': /shipping|delivery|fast|slow|arrived|package/i,
    'customer service': /service|support|help|customer service|response|rude|helpful/i,
    'side effects': /side effects|adverse|health|safe|dangerous|allergic/i,
    'ingredients': /ingredient|formula|composition|label|organic|natural/i,
    'experience': /experience|process|easy|difficult|simple|complicated/i
  };

  const themes: string[] = [];
  for (const [theme, regex] of Object.entries(themePatterns)) {
    if (regex.test(text)) {
      themes.push(theme);
    }
  }

  return themes;
}

// ─────────────────────────────────────────────────────────────
// MAIN AGENT EXECUTOR
// ─────────────────────────────────────────────────────────────

export async function runVisualResearch(
  platform: 'tiktok' | 'amazon' | 'facebook' | 'trustpilot' | 'instagram',
  query: string,
  options?: {
    maxResults?: number;
    maxCommentsPerItem?: number;
    extractFacts?: boolean;
  }
): Promise<VisualResearchResult> {
  const startTime = Date.now();
  let data: TikTokAnalysis | AmazonAnalysis | TrustpilotAnalysis;

  switch (platform) {
    case 'tiktok':
      data = await analyzeTikTok(query, options?.maxResults || 20);
      break;
    case 'amazon':
      data = await analyzeAmazon(query, options?.maxResults || 15);
      break;
    case 'trustpilot':
      data = await analyzeTrustpilot(query, options?.maxResults || 100);
      break;
    default:
      throw new Error(`Unsupported platform: ${platform}`);
  }

  const facts = extractFacts(data, platform);
  const gaps = identifyGaps(data, platform);
  const duration = Date.now() - startTime;

  log.info(`Visual research complete (${platform}): ${duration}ms, ${facts.length} facts, confidence ${data.confidence.toFixed(2)}`);

  return {
    platform,
    query,
    timestamp: Date.now(),
    data,
    facts,
    gaps,
    confidence: data.confidence
  };
}

function extractFacts(data: any, platform: string): string[] {
  const facts: string[] = [];

  if (platform === 'tiktok') {
    const tiktokData = data as TikTokAnalysis;
    const sentimentTotal = Object.values(tiktokData.sentimentDistribution).reduce((a: number, b: number) => a + b, 0);
    const positivePct = Math.round((tiktokData.sentimentDistribution.positive / sentimentTotal) * 100);

    facts.push(`${tiktokData.videosFound} TikTok videos found with ${positivePct}% positive sentiment`);
    facts.push(`Most common themes: ${Array.from(tiktokData.commonThemes.entries()).slice(0, 3).map(([t]) => t).join(', ')}`);
    if (tiktokData.viralPatterns.length > 0) {
      facts.push(`Viral patterns: ${tiktokData.viralPatterns.join(', ')}`);
    }
  } else if (platform === 'amazon') {
    const amazonData = data as AmazonAnalysis;
    const avgRating = amazonData.averageRating.toFixed(1);
    facts.push(`${amazonData.productsFound} Amazon products found, average rating ${avgRating}/5`);
    facts.push(`Price range: $${amazonData.priceRange.min.toFixed(0)} - $${amazonData.priceRange.max.toFixed(0)}`);
    if (amazonData.commonObjections.length > 0) {
      facts.push(`Top objections: ${amazonData.commonObjections.slice(0, 3).join(', ')}`);
    }
  } else if (platform === 'trustpilot') {
    const trustpilotData = data as TrustpilotAnalysis;
    facts.push(`${trustpilotData.reviewCount} Trustpilot reviews, rating ${trustpilotData.overallRating.toFixed(1)}/5`);
    facts.push(`Trust score: ${trustpilotData.trustScore.toFixed(0)}/100`);
    if (trustpilotData.commonComplaints.length > 0) {
      facts.push(`Top complaints: ${trustpilotData.commonComplaints.slice(0, 3).join(', ')}`);
    }
  }

  return facts;
}

function identifyGaps(data: any, platform: string): string[] {
  const gaps: string[] = [];

  if (platform === 'tiktok') {
    const tiktokData = data as TikTokAnalysis;
    if (tiktokData.videosFound < 10) gaps.push('Low video volume, increase search specificity');
    if (tiktokData.confidence < 0.5) gaps.push('Low engagement, broaden platform search');
  } else if (platform === 'amazon') {
    const amazonData = data as AmazonAnalysis;
    if (amazonData.reviewsAnalyzed < 50) gaps.push('Insufficient reviews analyzed, search more products');
    if (!amazonData.sentimentDistribution) gaps.push('Sentiment analysis incomplete');
  }

  return gaps;
}
