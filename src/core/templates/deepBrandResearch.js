/**
 * Deep Brand Research Template
 *
 * Comprehensive brand analysis with 1000+ sources across 8 research phases:
 * - Brand Fundamentals (150+ sources)
 * - Social Media & Internet Presence (200+ sources)
 * - Customer Sentiment & Reviews (150+ sources)
 * - Products & Features Deep-Dive (200+ sources)
 * - Partnerships & Collaborations (150+ sources)
 * - Niche & Market Position (150+ sources)
 * - History & Evolution (100+ sources)
 * - Internet Culture & Memes (100+ sources)
 *
 * Total target: 1000+ sources, 8 research phases
 */
// ─────────────────────────────────────────────────────────────
// PHASE CONFIGURATIONS
// ─────────────────────────────────────────────────────────────
export const DEEP_BRAND_RESEARCH_PHASES = {
    'brand-basics': {
        id: 'brand-basics',
        title: 'Brand Fundamentals',
        description: 'Core company information, mission, products, pricing, target customers, founding, team, size, location, funding',
        scope: 'core',
        priority: 'critical',
        estimatedSources: 150,
        keyQuestions: [
            'What is the brand/company and what do they do?',
            'What is their mission, vision, and core values?',
            'What products or services do they sell?',
            'What is their pricing model and cost structure?',
            'Who is their target customer and use case?',
            'When was the brand founded and by whom?',
            'Who are the founders, CEO, and leadership team?',
            'How large is the company (employees, revenue)?',
            'Where is the company headquartered?',
            'What funding or investments has the company received?',
        ],
        searchQueryTemplates: [
            // Direct brand website discovery
            '[BRAND].com official website',
            'site:[BRAND].com',
            '[BRAND] official brand website',
            '[BRAND] company official storefront',
            '[BRAND] home page about mission',
            // Product discovery
            '[BRAND] products all offerings catalog',
            '[BRAND] what products they sell',
            '[BRAND] product lineup full range',
            'site:[BRAND].com products services',
            // Company info
            '[BRAND] company about page mission vision values',
            '[BRAND] company information founded when',
            '[BRAND] founders CEO leadership team members',
        ],
    },
    'social-media-presence': {
        id: 'social-media-presence',
        title: 'Social Media & Internet Presence',
        description: 'Brand presence across all platforms: TikTok, Instagram, YouTube, Twitter/X, Reddit, Discord, LinkedIn, and influencer collaborations',
        scope: 'core',
        priority: 'critical',
        estimatedSources: 200,
        keyQuestions: [
            'What is the brand presence on TikTok (handle, followers, video style)?',
            'What TikTok videos are trending or viral for this brand?',
            'What is the brand Instagram aesthetic and content strategy?',
            'Does the brand have an official YouTube channel? What content?',
            'What is the brand Twitter/X presence and community engagement?',
            'Is there an active subreddit or Reddit community discussing the brand?',
            'Does the brand have a Discord server or community platform?',
            'What influencers and creators collaborate with the brand?',
            'Who are the brand ambassadors or official partners?',
            'What is the brand LinkedIn company profile and employee presence?',
        ],
        searchQueryTemplates: [
            'site:tiktok.com [BRAND] account videos',
            '[BRAND] TikTok trending viral content',
            'site:instagram.com [BRAND] official account',
            '[BRAND] Instagram aesthetic content strategy',
            'site:youtube.com [BRAND] official channel',
            '[BRAND] YouTube videos uploads',
            'site:twitter.com [BRAND] official account',
            '[BRAND] Twitter X posts community',
            'site:reddit.com [BRAND] subreddit',
            '[BRAND] Reddit community discussion',
            'site:discord.com [BRAND] server community',
            '[BRAND] Discord server members',
            'site:linkedin.com [BRAND] company page',
            '[BRAND] LinkedIn employees team',
            '[BRAND] influencer collaboration partnership',
            '[BRAND] brand ambassadors official representatives',
        ],
    },
    'customer-sentiment': {
        id: 'customer-sentiment',
        title: 'Customer Sentiment & Reviews',
        description: 'What people actually say about the brand: reviews, testimonials, complaints, praise, sentiment analysis, trust ratings',
        scope: 'core',
        priority: 'critical',
        estimatedSources: 150,
        keyQuestions: [
            'What are the overall review ratings and sentiment for [BRAND]?',
            'What do Google Reviews and Trustpilot ratings show?',
            'What positive testimonials and success stories exist?',
            'What are the main complaints and negative reviews?',
            'What do Reddit communities say about the brand?',
            'What criticisms appear across Twitter and social media?',
            'What do TikTok commenters say about the brand?',
            'How is customer service rated and reviewed?',
            'Is [BRAND] considered a scam or legitimate?',
            'What is the sentiment: cult following, hate movement, or neutral?',
        ],
        searchQueryTemplates: [
            '[BRAND] reviews ratings Trustpilot',
            '[BRAND] Google Reviews customer feedback',
            '[BRAND] customer testimonials success stories',
            '[BRAND] complaints negative reviews criticism',
            'site:reddit.com [BRAND] reviews opinions',
            '[BRAND] Reddit what people say',
            'site:twitter.com [BRAND] reviews feedback',
            '[BRAND] Twitter sentiment opinions reviews',
            '[BRAND] TikTok comments feedback reviews',
            '[BRAND] customer service complaints praise',
            '[BRAND] product quality reviews experiences',
            '[BRAND] is [BRAND] worth it should I buy',
            '[BRAND] legitimate scam real opinions',
            '[BRAND] fan community cult following',
            '[BRAND] hate movement why people dislike',
            '[BRAND] controversy drama scandal news',
        ],
    },
    'products-features': {
        id: 'products-features',
        title: 'Products & Features Deep-Dive',
        description: 'Comprehensive product breakdown: all offerings, features, specifications, pricing tiers, comparisons, tutorials, integrations, limitations',
        scope: 'core',
        priority: 'critical',
        estimatedSources: 200,
        keyQuestions: [
            'What is the complete product line and offerings?',
            'What are the key features and specifications of each product?',
            'How does [BRAND] compare to direct competitors?',
            'What are the pricing tiers and plan differences?',
            'What is included in free vs paid tiers?',
            'What are the newest product updates and features in 2025?',
            'What is the product roadmap and future plans?',
            'Are there beta or early access programs?',
            'How do users implement or use [BRAND]? (tutorials, guides)',
            'What API documentation and developer tools exist?',
            'What integrations work with [BRAND]?',
            'What are the technical requirements and compatible devices?',
            'What are the limitations or things [BRAND] cannot do?',
            'What are the top alternatives and direct competitors?',
            'Is [BRAND] suitable for beginners vs advanced users?',
        ],
        searchQueryTemplates: [
            // Direct product discovery from brand website
            'site:[BRAND].com products catalog all',
            '[BRAND] product catalog full lineup',
            '[BRAND] all products offerings available',
            '[BRAND] product images photos visual',
            // Product details
            '[BRAND] features specifications detailed list',
            '[BRAND] product descriptions how it works',
            '[BRAND] product comparison different types',
            '[BRAND] vs competitors comparison analysis',
            // Pricing and purchasing
            '[BRAND] pricing tiers plans costs all',
            '[BRAND] where to buy purchase official',
            '[BRAND] price list detailed breakdown',
            // Customer usage
            '[BRAND] how to use tutorial guide demo',
            '[BRAND] product reviews customer feedback',
            '[BRAND] customer use cases testimonials',
            // Innovation and updates
            '[BRAND] 2024 2025 new features updates',
            '[BRAND] latest product announcements',
        ],
    },
    'partnerships': {
        id: 'partnerships',
        title: 'Partnerships & Collaborations',
        description: 'Strategic partnerships, B2B deals, investor relationships, acquisition history, distribution channels, reseller networks, affiliate programs',
        scope: 'core',
        priority: 'high',
        estimatedSources: 150,
        keyQuestions: [
            'What official partnerships and collaborations does [BRAND] have?',
            'What celebrity or brand partnerships have been announced?',
            'What influencers or creators have formal partnerships?',
            'What B2B or enterprise partnerships exist?',
            'Does [BRAND] have an affiliate or reseller program?',
            'What companies or investors have backed [BRAND]?',
            'Has [BRAND] been acquired or merged with another company?',
            'What are the major business deals or news?',
            'Where can customers officially buy [BRAND]? (retail, distribution)',
            'What companies resell or distribute [BRAND]?',
            'What API or integration partners does [BRAND] have?',
            'Does [BRAND] partner with educational institutions?',
            'What marketing partnerships or sponsored content exists?',
        ],
        searchQueryTemplates: [
            '[BRAND] partnerships official collaborations',
            '[BRAND] brand deals celebrity partnerships',
            '[BRAND] influencer collaborations creators partnerships',
            '[BRAND] corporate partnerships B2B deals',
            '[BRAND] affiliate program resellers',
            '[BRAND] investors funding backing',
            '[BRAND] acquired by acquisition merger',
            '[BRAND] business deals news announcements',
            '[BRAND] distribution channels where to buy',
            '[BRAND] retail partners authorized sellers',
            '[BRAND] API partners integrations',
            '[BRAND] educational partnerships schools universities',
            '[BRAND] marketing partnerships sponsored content',
        ],
    },
    'niche-market': {
        id: 'niche-market',
        title: 'Niche & Market Position',
        description: 'Market category, competitive positioning, unique value proposition, target segments, market size, competitive advantages, industry trends',
        scope: 'core',
        priority: 'high',
        estimatedSources: 150,
        keyQuestions: [
            'What market niche or category does [BRAND] operate in?',
            'What is the total addressable market (TAM) for this category?',
            'What is [BRAND] market share vs competitors?',
            'What are the competitive advantages and unique selling points?',
            'What makes [BRAND] different from competitors?',
            'What are the major industry trends affecting [BRAND]?',
            'What market opportunities exist for growth?',
            'Who is [BRAND] primary target demographic?',
            'What are common use cases for [BRAND]?',
            'Does [BRAND] have a strong community or subculture?',
            'What cultural impact does [BRAND] have?',
            'Is [BRAND] considered relevant to internet culture?',
            'What sub-markets or segments is [BRAND] expanding into?',
        ],
        searchQueryTemplates: [
            'what niche category is [BRAND] in',
            '[BRAND] market size industry TAM',
            '[BRAND] market share competitive position',
            '[BRAND] vs [COMPETITOR] comparison',
            '[BRAND] competitive advantages unique selling points',
            '[BRAND] what makes different from competitors',
            '[BRAND] industry trends market opportunities',
            '[BRAND] target demographic audience profile',
            '[BRAND] use cases how people use',
            '[BRAND] community subculture following',
            '[BRAND] memes culture internet relevance',
            '[BRAND] cultural impact influence',
            '[BRAND] expansion growth markets segments',
        ],
    },
    'history-timeline': {
        id: 'history-timeline',
        title: 'History & Evolution',
        description: 'Company timeline, pivots, major milestones, product evolution, rebranding, leadership changes, growth trajectory, key announcements',
        scope: 'core',
        priority: 'high',
        estimatedSources: 100,
        keyQuestions: [
            'What is the complete history and origin story of [BRAND]?',
            'When was [BRAND] founded and by whom?',
            'What major pivots or business changes has [BRAND] made?',
            'How has the product evolved over different versions?',
            'Has [BRAND] rebranded or changed its name?',
            'What leadership changes has [BRAND] experienced?',
            'What is the growth trajectory (users, revenue, employees)?',
            'What are the biggest announcements and milestones?',
            'What failures or setbacks has [BRAND] experienced?',
            'What lessons has [BRAND] learned from failures?',
        ],
        searchQueryTemplates: [
            '[BRAND] history timeline origin story',
            '[BRAND] founded [YEAR] background',
            '[BRAND] major pivots business changes',
            '[BRAND] product evolution versions history',
            '[BRAND] rebranding name changes',
            '[BRAND] leadership CEO changes founder',
            '[BRAND] growth trajectory metrics milestones',
            '[BRAND] biggest announcements news milestones',
            '[BRAND] setbacks failures challenges',
            '[BRAND] lessons learned from failures',
        ],
    },
    'internet-culture': {
        id: 'internet-culture',
        title: 'Internet Culture & Relevance',
        description: 'Memes, viral moments, fan communities, trending topics, fan art, subcultures, trending moments, cancel culture discussions, stan culture',
        scope: 'core',
        priority: 'medium',
        estimatedSources: 100,
        keyQuestions: [
            'What memes or internet references involve [BRAND]?',
            'What viral or trending moments has [BRAND] had?',
            'Does [BRAND] have fan art or creative community content?',
            'How large and active is the [BRAND] subreddit or community?',
            'What Discord servers or fan communities exist?',
            'What fan theories or speculation exist?',
            'Is there a shipping or fan community around [BRAND]?',
            'Do fans cosplay or create convention content?',
            'What cancel culture or controversy discussions exist?',
            'Does [BRAND] have a dedicated fanbase or stan culture?',
            'What is [BRAND] meme potential?',
            'How has [BRAND] been referenced in popular media?',
        ],
        searchQueryTemplates: [
            '[BRAND] memes internet culture references',
            '[BRAND] trending topic viral moments',
            '[BRAND] fan art community creative content',
            'site:reddit.com r/[BRAND] community size',
            '[BRAND] subreddit active members discussions',
            '[BRAND] Discord server community members',
            '[BRAND] fan theories speculation discussion',
            '[BRAND] shipping fan communities',
            '[BRAND] cosplay fan convention presence',
            '[BRAND] NSFW content adult community',
            '[BRAND] cancel culture controversy Twitter',
            '[BRAND] stan culture fanbase dedication',
            '[BRAND] meme potential how [BRAND] becomes meme',
            '[BRAND] references in popular media culture',
        ],
    },
};
// ─────────────────────────────────────────────────────────────
// PLAN GENERATION
// ─────────────────────────────────────────────────────────────
/**
 * Generate a deep brand research plan targeting 1000+ sources.
 * Replaces generic LLM planning with structured 8-phase research.
 */
export function generateDeepBrandResearchPlan(brand, niche, focusPhases) {
    const phases = focusPhases || [
        'brand-basics',
        'social-media-presence',
        'customer-sentiment',
        'products-features',
        'partnerships',
        'niche-market',
        'history-timeline',
        'internet-culture',
    ];
    const sections = phases.map((phaseId, index) => {
        const config = DEEP_BRAND_RESEARCH_PHASES[phaseId];
        // Contextualize key questions with brand name
        const contextualizedQuestions = config.keyQuestions.map(q => q
            .replace(/\[BRAND\]/g, brand)
            .replace(/\[NICHE\]/g, niche || 'market'));
        return {
            id: `brand-phase-${index}`,
            title: config.title,
            description: `${config.description}. Focus: ${brand}${niche ? ` (${niche})` : ''}`,
            keyQuestions: contextualizedQuestions,
            priority: config.priority === 'critical' ? 'high' : 'medium',
        };
    });
    const totalEstimatedSources = phases.reduce((sum, phaseId) => sum + DEEP_BRAND_RESEARCH_PHASES[phaseId].estimatedSources, 0);
    return {
        sections,
        totalEstimatedSources,
        researchStrategy: `Deep brand research: ${phases.length} research phases targeting 1000+ sources. All platforms covered: website, social (TikTok/Instagram/YouTube/Reddit/Twitter), reviews, products, partnerships, market position, history, and internet culture.`,
        brandContext: {
            brand,
            niche,
        },
    };
}
// ─────────────────────────────────────────────────────────────
// SEARCH QUERY OPTIMIZATION FOR BRAND RESEARCH
// ─────────────────────────────────────────────────────────────
/**
 * Generate optimized search queries specifically for brand research.
 * Focuses on finding the brand across all platforms with high precision.
 */
export function generateBrandSearchQueries(brand, phaseId, niche) {
    const config = DEEP_BRAND_RESEARCH_PHASES[phaseId];
    const brandSanitized = brand.replace(/[^a-z0-9]/gi, '');
    // Substitute [BRAND], [NICHE], [COMPETITOR] into templates
    const queries = config.searchQueryTemplates.map(template => template
        .replace(/\[BRAND\]/g, brand)
        .replace(/\[NICHE\]/g, niche || 'market')
        .replace(/\[COMPETITOR\]/g, 'competitor'));
    // Add platform-specific variants for social media phase
    if (phaseId === 'social-media-presence') {
        queries.push(`site:tiktok.com @${brandSanitized}`, `site:instagram.com ${brand}`, `site:youtube.com ${brand} official`, `site:linkedin.com "${brand}"`, `site:twitter.com @${brandSanitized}`);
    }
    // Add sentiment-specific queries for customer sentiment phase
    if (phaseId === 'customer-sentiment') {
        queries.push(`"${brand}" review -fake -affiliate`, `"${brand}" rating experience`, `"${brand}" complaint issue problem`, `"${brand}" worth it recommend`, `${brand} scam fake legitimate`);
    }
    // Add competitor comparison queries for products phase
    if (phaseId === 'products-features') {
        queries.push(`"${brand}" features comparison`, `${brand} vs alternatives`, `${brand} pricing plans tiers`, `${brand} tutorial how to use`, `${brand} API documentation`);
    }
    // Filter duplicates and ensure minimum length
    const uniqueQueries = Array.from(new Set(queries))
        .filter(q => q.length >= 8)
        .slice(0, 20); // Return top 20 queries
    return uniqueQueries;
}
/**
 * Calculate source diversity score (ensures we're not over-reliant on one platform).
 * Returns 0-1 where 1 is perfectly balanced across platforms.
 */
export function calculateSourceDiversity(sourceBreakdown) {
    const total = Object.values(sourceBreakdown).reduce((a, b) => a + b, 0);
    if (total === 0)
        return 0;
    const platformWeights = {
        official_website: 0.15,
        social_media_tiktok: 0.15,
        social_media_instagram: 0.10,
        social_media_youtube: 0.10,
        reddit: 0.10,
        reviews: 0.10,
        twitter: 0.10,
        news: 0.08,
        blogs: 0.05,
        forums: 0.05,
        other: 0.02,
    };
    let diversityScore = 0;
    for (const [platform, weight] of Object.entries(platformWeights)) {
        const actual = sourceBreakdown[platform] || 0;
        const proportion = actual / total;
        const variance = Math.abs(proportion - weight);
        diversityScore += Math.max(0, 1 - variance);
    }
    return diversityScore / Object.keys(platformWeights).length;
}
/**
 * Identify source diversity gaps for a given research phase.
 * Used by reflection agent to determine if more research is needed.
 */
export function identifySourceGaps(phaseId, sourceBreakdown) {
    const gaps = [];
    const total = Object.values(sourceBreakdown).reduce((a, b) => a + b, 0);
    if (total === 0) {
        return ['No sources found for this phase'];
    }
    // Phase-specific source requirements
    if (phaseId === 'social-media-presence') {
        if ((sourceBreakdown['social_media_tiktok'] || 0) / total < 0.2)
            gaps.push('Need more TikTok sources');
        if ((sourceBreakdown['social_media_instagram'] || 0) / total < 0.15)
            gaps.push('Need more Instagram sources');
        if ((sourceBreakdown['social_media_youtube'] || 0) / total < 0.15)
            gaps.push('Need more YouTube sources');
    }
    if (phaseId === 'customer-sentiment') {
        if ((sourceBreakdown['reviews'] || 0) / total < 0.3)
            gaps.push('Need more customer reviews');
        if ((sourceBreakdown['reddit'] || 0) / total < 0.2)
            gaps.push('Need more Reddit discussions');
        if ((sourceBreakdown['social_media_twitter'] || 0) / total < 0.15)
            gaps.push('Need more Twitter sentiment');
    }
    if (phaseId === 'internet-culture') {
        if ((sourceBreakdown['reddit'] || 0) / total < 0.25)
            gaps.push('Need more Reddit community sources');
        if ((sourceBreakdown['social_media_tiktok'] || 0) / total < 0.2)
            gaps.push('Need more TikTok viral/meme sources');
    }
    // Generic gaps
    if ((sourceBreakdown['official_website'] || 0) / total < 0.1)
        gaps.push('Need official website sources');
    if ((sourceBreakdown['news'] || 0) / total < 0.08)
        gaps.push('Need news/press coverage');
    return gaps;
}
export default {
    DEEP_BRAND_RESEARCH_PHASES,
    generateDeepBrandResearchPlan,
    generateBrandSearchQueries,
    calculateSourceDiversity,
    identifySourceGaps,
};
//# sourceMappingURL=deepBrandResearch.js.map