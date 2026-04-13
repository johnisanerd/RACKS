/**
 * TikTok Analysis Agent
 * Uses browser automation (Playwright) to:
 * - Search for brand/creator videos
 * - Extract captions, hooks, hashtags
 * - Analyze comments for sentiment and themes
 * - Identify viral patterns and engagement drivers
 */
export interface TikTokVideo {
    videoId: string;
    url: string;
    caption: string;
    hashtags: string[];
    hook: string;
    creatorHandle: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    saves: number;
    postedAt: string;
    duration: number;
}
export interface TikTokComment {
    author: string;
    text: string;
    likes: number;
    timestamp: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    theme: string;
}
export interface TikTokAnalysis {
    searchQuery: string;
    videosAnalyzed: number;
    topVideos: TikTokVideo[];
    commentSentiment: {
        positive: number;
        negative: number;
        neutral: number;
    };
    commonThemes: Array<{
        theme: string;
        frequency: number;
    }>;
    topHooks: string[];
    viralPatterns: string[];
    recommendations: string[];
}
/**
 * Search TikTok for brand/keyword and extract top videos
 * Uses Playwright for browser automation to bypass TikTok bot detection
 *
 * Implementation approach:
 * 1. Launch Playwright browser (headless: false for better detection avoidance)
 * 2. Navigate to TikTok search
 * 3. Simulate human scrolling to load videos
 * 4. Extract video data from DOM
 * 5. For top videos, load comments
 * 6. Extract and analyze comments
 */
export declare function searchTikTokVideos(searchQuery: string, maxVideos?: number): Promise<TikTokVideo[]>;
/**
 * Extract and analyze comments from a TikTok video
 * Extracts sentiment and identifies key themes
 */
export declare function analyzeTikTokComments(videoUrl: string, maxComments?: number): Promise<TikTokComment[]>;
/**
 * Identify viral hooks and patterns from TikTok videos
 */
export declare function analyzeViralPatterns(videos: TikTokVideo[]): {
    topHooks: string[];
    patterns: string[];
};
/**
 * Synthesize TikTok analysis into actionable insights
 */
export declare function synthesizeTikTokAnalysis(videos: TikTokVideo[], comments: TikTokComment[]): TikTokAnalysis;
export declare function runTikTokAnalysis(searchQuery: string): Promise<TikTokAnalysis>;
//# sourceMappingURL=tiktokAnalysisAgent.d.ts.map