/**
 * Ads Intelligence Agent
 * Analyzes competitor advertising across platforms:
 * - Facebook Ads Library (public, legal)
 * - Amazon Sponsored Ads
 * - TikTok ads (if available)
 */
export interface AdCreative {
    platform: 'facebook' | 'amazon' | 'tiktok';
    brand: string;
    adTitle?: string;
    adCopy: string;
    imageUrl?: string;
    videoUrl?: string;
    cta: string;
    targetAudience?: string[];
    startDate?: string;
    status: 'active' | 'paused' | 'archived';
    engagementMetrics?: {
        likes?: number;
        comments?: number;
        shares?: number;
        saves?: number;
    };
}
export interface AdsIntelligence {
    brand: string;
    totalAdsFound: number;
    platforms: string[];
    ads: AdCreative[];
    patterns: {
        commonCTA: string[];
        messageThemes: string[];
        emotionalAngle: string;
        targetingFocus: string[];
    };
    recommendations: string[];
}
/**
 * Analyze Facebook Ads Library for a brand
 * URL: https://www.facebook.com/ads/library
 * This is public, legal data meant for transparency
 */
export declare function analyzeFacebookAds(brandName: string): Promise<AdCreative[]>;
/**
 * Analyze Amazon Sponsored Ads for a brand
 * Search for the brand on Amazon, extract sponsored ads
 */
export declare function analyzeAmazonAds(brandName: string, keywords?: string[]): Promise<AdCreative[]>;
/**
 * Analyze TikTok content for a brand/creator
 * Requires browser automation (Playwright)
 * Can extract: videos, captions, comment themes, engagement
 */
export declare function analyzeTikTokContent(searchQuery: string, options?: {
    maxResults?: number;
    analyzeComments?: boolean;
}): Promise<AdCreative[]>;
/**
 * Synthesize ads intelligence into patterns and recommendations
 */
export declare function synthesizeAdsIntelligence(ads: AdCreative[]): AdsIntelligence;
export declare function runAdsIntelligenceAgent(brandName: string): Promise<AdsIntelligence>;
//# sourceMappingURL=adsIntelligenceAgent.d.ts.map