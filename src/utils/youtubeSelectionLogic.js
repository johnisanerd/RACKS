/**
 * YouTube Selection Logic
 *
 * Smart decision system that determines whether YouTube research is needed
 * for a given section, selects the best videos from search results, and
 * builds targeted search queries based on identified content gaps.
 */
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export var YouTubeGapType;
(function (YouTubeGapType) {
    YouTubeGapType["CUSTOMER_VOICE"] = "CUSTOMER_VOICE";
    YouTubeGapType["EXPERT_OPINION"] = "EXPERT_OPINION";
    YouTubeGapType["COMPETITOR_ADS"] = "COMPETITOR_ADS";
    YouTubeGapType["PRODUCT_DEMO"] = "PRODUCT_DEMO";
})(YouTubeGapType || (YouTubeGapType = {}));
// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------
/** Sections where expert opinion matters more than raw facts */
const IDENTITY_DESIRE_KEYWORDS = [
    'identity',
    'desire',
    'lifestyle',
    'emotion',
    'psychology',
    'motivation',
    'aspiration',
    'persona',
    'audience',
];
/** Patterns that indicate a fact contains an actual customer quote or testimonial */
const QUOTE_TESTIMONIAL_PATTERNS = [
    /["'"].{10,}["'"]/, // text wrapped in quotes
    /\bi (feel|felt|love|hate|noticed|found)\b/i,
    /\baccording to\b/i,
    /\bcustomer(s)? (say|report|claim|mention)\b/i,
    /\buser(s)? (say|report|found|noticed)\b/i,
    /\breviewer(s)?\b/i,
    /\btestimonial\b/i,
];
/** Patterns for detecting URLs that are YouTube links */
const YOUTUBE_URL_PATTERN = /https?:\/\/(www\.)?(youtube\.com\/watch|youtu\.be\/)/i;
/** Titles/content patterns that indicate non-relevant YouTube content */
const NOISE_PATTERNS = [
    /official\s+(music\s+)?video/i,
    /\blive\s+performance\b/i,
    /\btrailer\b/i,
    /\bshorts?\b/i,
    /\bvlog\b/i,
    /\bprank\b/i,
    /\bchallenge\b/i,
    /\blyrics?\b/i,
    /\baudio\b.*\bonly\b/i,
    /\bkids?\b/i,
    /\bcartoon\b/i,
    /\banimation\b/i,
];
/** Titles that signal high-value research content */
const PREFERRED_PATTERNS = [
    /\breview\b/i,
    /\btestimoni(al|al)?\b/i,
    /\bhonest\b/i,
    /\bunboxing\b/i,
    /\bbefore\s+and\s+after\b/i,
    /\bexpert\b/i,
    /\banalysis\b/i,
    /\bdoctor\b|\bdr\.\b|\bphd\b|\bmd\b/i,
    /\bstudy\b/i,
    /\bresearch\b/i,
    /\bscience\b/i,
    /\bcompared?\b/i,
    /\bbest\b.*\b(of\s+\d{4}|\bproduct)\b/i,
    /\bwort(h)?\s+it\b/i,
];
function hasCustomerVoice(facts) {
    const matchCount = facts.filter(fact => QUOTE_TESTIMONIAL_PATTERNS.some(pattern => pattern.test(fact))).length;
    return matchCount >= 5;
}
function isIdentityOrDesireSection(sectionTitle) {
    const lower = sectionTitle.toLowerCase();
    return IDENTITY_DESIRE_KEYWORDS.some(kw => lower.includes(kw));
}
function isYouTubeUrl(url) {
    return YOUTUBE_URL_PATTERN.test(url);
}
function isNoisyTitle(title) {
    return NOISE_PATTERNS.some(p => p.test(title));
}
function preferenceScore(result, sectionTopic) {
    let score = 0;
    // Reward preferred content patterns
    for (const p of PREFERRED_PATTERNS) {
        if (p.test(result.title))
            score += 2;
    }
    // Reward keyword overlap with section topic
    const topicWords = sectionTopic.toLowerCase().split(/\W+/).filter(w => w.length > 3);
    const titleLower = result.title.toLowerCase();
    for (const word of topicWords) {
        if (titleLower.includes(word))
            score += 1;
    }
    // Penalise noise
    if (isNoisyTitle(result.title))
        score -= 10;
    return score;
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
/**
 * Assess whether a section needs YouTube research.
 *
 * Returns `{ needed: false }` when the section already has strong coverage
 * (confidence > 0.70 AND facts > 50).  Otherwise checks for two gap types:
 *   - CUSTOMER_VOICE: fewer than 5 facts containing real quotes/testimonials
 *   - EXPERT_OPINION: identity/desire sections lacking credible expert voices
 */
export function assessNeedForYouTube(section, findings) {
    // Already well-covered — skip YouTube
    if (findings.confidence > 0.70 && findings.facts.length > 50) {
        return { needed: false, reason: 'Section already has high confidence and sufficient facts' };
    }
    // Check for customer voice gap
    if (!hasCustomerVoice(findings.facts)) {
        return {
            needed: true,
            gapType: YouTubeGapType.CUSTOMER_VOICE,
            searchQuery: buildYouTubeSearchQuery(section, YouTubeGapType.CUSTOMER_VOICE),
            reason: 'Fewer than 5 facts with real customer quotes or testimonials',
        };
    }
    // Check for expert opinion gap in identity/desire sections
    if (isIdentityOrDesireSection(section.title)) {
        const hasExpertVoice = findings.facts.some(fact => /\bexpert\b|\bdoctor\b|\bdr\.\b|\bphd\b|\bmd\b|\bscientist\b|\bresearcher\b|\bprofessor\b/i.test(fact));
        if (!hasExpertVoice) {
            return {
                needed: true,
                gapType: YouTubeGapType.EXPERT_OPINION,
                searchQuery: buildYouTubeSearchQuery(section, YouTubeGapType.EXPERT_OPINION),
                reason: 'Identity/desire section lacks credible expert voices',
            };
        }
    }
    return { needed: false, reason: 'No significant gaps detected' };
}
/**
 * Given a list of search results from Wayfarer, pick 1-2 best YouTube URLs.
 *
 * Criteria (in order of priority):
 *   1. Must be a YouTube URL
 *   2. Title must not match noise patterns
 *   3. Title must have keyword overlap with section topic or match preferred patterns
 * Returns at most 2 URLs.
 */
export function selectBestYouTubeVideo(searchResults, sectionTopic) {
    const candidates = searchResults
        .filter(r => isYouTubeUrl(r.url))
        .filter(r => !isNoisyTitle(r.title))
        .map(r => ({ result: r, score: preferenceScore(r, sectionTopic) }))
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score);
    return candidates.slice(0, 2).map(({ result }) => result.url);
}
/**
 * Build a targeted YouTube search query based on what content is missing.
 *
 * Examples:
 *   CUSTOMER_VOICE + supplement section  -> "collagen supplement honest review 2024"
 *   EXPERT_OPINION + competitor section  -> "supplement industry expert analysis"
 *   PRODUCT_DEMO   + skincare section    -> "skincare product demo application"
 */
export function buildYouTubeSearchQuery(section, gapType) {
    const topic = section.title.toLowerCase().trim();
    const currentYear = new Date().getFullYear();
    switch (gapType) {
        case YouTubeGapType.CUSTOMER_VOICE:
            return `${topic} honest review ${currentYear}`;
        case YouTubeGapType.EXPERT_OPINION:
            return `${topic} expert analysis`;
        case YouTubeGapType.COMPETITOR_ADS:
            return `${topic} competitor advertisement comparison`;
        case YouTubeGapType.PRODUCT_DEMO:
            return `${topic} product demo application`;
        default: {
            // Exhaustiveness guard
            const _exhaustive = gapType;
            return `${topic} review ${currentYear}`;
        }
    }
}
//# sourceMappingURL=youtubeSelectionLogic.js.map