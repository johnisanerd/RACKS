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
export interface TikTokVideo {
    id: string;
    caption: string;
    hashtags: string[];
    hook: string;
    creator: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    duration: number;
    postedAt: string;
    engagement: number;
}
export interface TikTokComment {
    id: string;
    author: string;
    text: string;
    likes: number;
    sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
    themes: string[];
    timestamp: string;
}
export interface TikTokAnalysis {
    query: string;
    videosFound: number;
    videos: TikTokVideo[];
    topComments: TikTokComment[];
    commonThemes: Map<string, number>;
    sentimentDistribution: {
        positive: number;
        negative: number;
        neutral: number;
    };
    viralPatterns: string[];
    emotionalHooks: string[];
    confidence: number;
}
export interface AmazonProduct {
    id: string;
    title: string;
    asin: string;
    price: number;
    currency: string;
    rating: number;
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
    helpful: number;
    sentiment: 'positive' | 'negative' | 'neutral';
    themes: string[];
    date: string;
}
export interface AmazonAnalysis {
    query: string;
    productsFound: number;
    topProducts: AmazonProduct[];
    reviewsAnalyzed: number;
    reviews: AmazonReview[];
    averageRating: number;
    priceRange: {
        min: number;
        max: number;
    };
    commonObjections: string[];
    sentimentDistribution: {
        positive: number;
        negative: number;
        neutral: number;
    };
    confidence: number;
}
export interface TrustpilotReview {
    id: string;
    author: string;
    rating: number;
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
    sentimentDistribution: {
        positive: number;
        negative: number;
        neutral: number;
    };
    trustScore: number;
    confidence: number;
}
export interface VisualResearchResult {
    platform: 'tiktok' | 'amazon' | 'facebook' | 'trustpilot' | 'instagram';
    query: string;
    timestamp: number;
    data: TikTokAnalysis | AmazonAnalysis | TrustpilotAnalysis;
    facts: string[];
    gaps: string[];
    confidence: number;
}
/**
 * TikTok extractor: Analyze videos, comments, viral patterns
 */
export declare function analyzeTikTok(query: string, maxVideos?: number, maxCommentsPerVideo?: number): Promise<TikTokAnalysis>;
/**
 * Amazon extractor: Product listings, reviews, objections
 */
export declare function analyzeAmazon(query: string, maxProducts?: number, maxReviewsPerProduct?: number): Promise<AmazonAnalysis>;
/**
 * Trustpilot extractor: Reviews, complaints, trust score
 */
export declare function analyzeTrustpilot(query: string, maxReviews?: number): Promise<TrustpilotAnalysis>;
export declare function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' | 'mixed';
export declare function extractThemes(text: string): string[];
export declare function runVisualResearch(platform: 'tiktok' | 'amazon' | 'facebook' | 'trustpilot' | 'instagram', query: string, options?: {
    maxResults?: number;
    maxCommentsPerItem?: number;
    extractFacts?: boolean;
}): Promise<VisualResearchResult>;
//# sourceMappingURL=visualResearchAgent.d.ts.map