/**
 * YouTube Selection Logic
 *
 * Smart decision system that determines whether YouTube research is needed
 * for a given section, selects the best videos from search results, and
 * builds targeted search queries based on identified content gaps.
 */
import type { SectionFindings } from '../types/research.js';
export declare enum YouTubeGapType {
    CUSTOMER_VOICE = "CUSTOMER_VOICE",
    EXPERT_OPINION = "EXPERT_OPINION",
    COMPETITOR_ADS = "COMPETITOR_ADS",
    PRODUCT_DEMO = "PRODUCT_DEMO"
}
export interface YouTubeNeed {
    needed: boolean;
    gapType?: YouTubeGapType;
    searchQuery?: string;
    reason?: string;
}
export interface YouTubeSearchResult {
    url: string;
    title: string;
    description?: string;
    channelName?: string;
}
/**
 * Assess whether a section needs YouTube research.
 *
 * Returns `{ needed: false }` when the section already has strong coverage
 * (confidence > 0.70 AND facts > 50).  Otherwise checks for two gap types:
 *   - CUSTOMER_VOICE: fewer than 5 facts containing real quotes/testimonials
 *   - EXPERT_OPINION: identity/desire sections lacking credible expert voices
 */
export declare function assessNeedForYouTube(section: {
    id: string;
    title: string;
    objective: string;
}, findings: SectionFindings): YouTubeNeed;
/**
 * Given a list of search results from Wayfarer, pick 1-2 best YouTube URLs.
 *
 * Criteria (in order of priority):
 *   1. Must be a YouTube URL
 *   2. Title must not match noise patterns
 *   3. Title must have keyword overlap with section topic or match preferred patterns
 * Returns at most 2 URLs.
 */
export declare function selectBestYouTubeVideo(searchResults: YouTubeSearchResult[], sectionTopic: string): string[];
/**
 * Build a targeted YouTube search query based on what content is missing.
 *
 * Examples:
 *   CUSTOMER_VOICE + supplement section  -> "collagen supplement honest review 2024"
 *   EXPERT_OPINION + competitor section  -> "supplement industry expert analysis"
 *   PRODUCT_DEMO   + skincare section    -> "skincare product demo application"
 */
export declare function buildYouTubeSearchQuery(section: {
    title: string;
    objective: string;
}, gapType: YouTubeGapType): string;
//# sourceMappingURL=youtubeSelectionLogic.d.ts.map