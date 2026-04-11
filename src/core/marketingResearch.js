/**
 * Marketing Research Orchestration
 *
 * Implements the 5-step marketing research workflow from the PDF:
 *
 * STEP 1: Brand & Product Analysis
 * STEP 2: Desire & Problem Mapping
 * STEP 3: Competitor & Market Research
 * STEP 4: Identity Markers Research      ← YouTube is EXPLICITLY needed here
 * STEP 5: Amazon Review Mining
 *
 * YouTube strategy: ONLY fetch when section specifically needs real customer voice
 * or identity group media consumption data. NOT for facts already well-covered.
 */
// ─────────────────────────────────────────────────────────────
// SECTION CONFIGURATIONS
// ─────────────────────────────────────────────────────────────
export const MARKETING_SECTIONS = {
    brand_analysis: {
        id: 'brand_analysis',
        title: 'Brand & Product Analysis',
        description: 'Deep analysis of the brand website, product positioning, mechanisms, pricing, and voice',
        keyQuestions: [
            'What specific desire or problem does this product address?',
            'Is this a superior product (mechanism-based) or identity marketing?',
            'What is the brand voice and tone? (collect 10+ examples of specific language)',
            'How does it position against direct and indirect competitors?',
            'What mechanisms does the product use to deliver results?',
            'What is the price point relative to alternatives?',
            'What guarantee/risk-reversal elements are present?',
        ],
        priority: 'high',
        primarySources: ['brand_website', 'google', 'competitor_sites'],
        youtubeBehavior: {
            when: 'never', // Brand website is primary — YouTube adds noise here
            searchTemplate: '',
            purpose: 'N/A — brand website and structured data is primary source',
            maxVideos: 0,
            requiredFor: [],
        },
        minFacts: 30,
        minSourcedQuotes: 10, // 10 examples of brand language
    },
    desire_mapping: {
        id: 'desire_mapping',
        title: 'Desire & Problem Mapping',
        description: 'Map the emotional landscape — what customers deeply want and what blocks them',
        keyQuestions: [
            'What are the primary desires that drive this market? (e.g. weight loss, confidence, status)',
            'How urgent are these desires? Rate 1-10 with explanation',
            'What problems prevent people from achieving these desires?',
            'What is the emotional state of people in this market? (desperate, curious, skeptical)',
            'What language do customers use to describe their desires (exact phrases)',
            'How many solutions have people tried before this one?',
            'Are these desires growing or shrinking in the marketplace?',
        ],
        priority: 'high',
        primarySources: ['reddit', 'amazon', 'google', 'social_media'],
        youtubeBehavior: {
            when: 'gap_only', // Only if Reddit/Amazon don't yield enough customer voice
            searchTemplate: '{product_category} honest review how it works',
            purpose: 'Capture unscripted customer testimonials and before/after stories',
            maxVideos: 2,
            requiredFor: ['unscripted testimonials', 'emotional reaction captures'],
        },
        minFacts: 50,
        minSourcedQuotes: 20, // At least 20 direct customer quotes
    },
    competitor_research: {
        id: 'competitor_research',
        title: 'Competitor & Market Research',
        description: '10-15 direct competitors + 7-10 indirect alternatives, their hooks, ads, and positioning gaps',
        keyQuestions: [
            'Who are the 10-15 key direct competitors? List with websites',
            'What desires do competitor hooks/headlines appeal to?',
            'Which competitor ads have been running the longest? (most successful)',
            'What visual elements appear consistently in competitor ads? (actors, environments, demo styles)',
            'What positioning strategies and key messaging does each use?',
            'How do competitors substantiate their claims?',
            'What guarantee structures and risk-reversal tactics are most common?',
            'What are the pricing strategies across the competitive landscape?',
            'What marketing channels are competitors primarily using?',
            'What target audience segments do competitors serve?',
        ],
        priority: 'high',
        primarySources: ['competitor_sites', 'google', 'reddit', 'social_media'],
        youtubeBehavior: {
            when: 'gap_only', // Only for finding competitor ad patterns/channels
            searchTemplate: '{competitor_name} advertisement commercial {year}',
            purpose: 'Find competitor video ads to analyze visual styles, actors, hooks',
            maxVideos: 3,
            requiredFor: ['competitor ad visual analysis', 'video ad creative patterns'],
        },
        minFacts: 80,
        minSourcedQuotes: 15, // Links to actual competitor pages
    },
    identity_markers: {
        id: 'identity_markers',
        title: 'Identity Markers Research',
        description: 'Deep profile of the target identity group — values, language, media, influencers, tribal signals',
        keyQuestions: [
            'What are the 10+ common values of this identity group?',
            'What visual markers identify members? (clothing, accessories, aesthetics)',
            'What language patterns are specific to this group? (20+ phrases/terms)',
            'Who are the 15-20 influencers and authorities this group respects?',
            'What 10+ other brands successfully market to this identity?',
            'What common experiences unite this identity group?',
            'What media (podcasts, YouTube channels, publications) does this group consume?',
            'What are the aspirations and fears specific to this identity?',
            'How does this group signal belonging to others in the group?',
            'What opposing identities does this group define itself against?',
            'How has this identity evolved over the past 5 years?',
        ],
        priority: 'high',
        primarySources: ['reddit', 'youtube', 'social_media', 'google'],
        youtubeBehavior: {
            when: 'always', // YouTube ALWAYS needed here — this section is about media consumption
            searchTemplate: '{identity_group} lifestyle routine {year}',
            purpose: 'Find actual YouTube channels the identity group watches. Analyze what content resonates, what language is used, who they trust.',
            maxVideos: 5,
            requiredFor: [
                'YouTube channels this group consumes',
                'influencer identification',
                'language patterns in authentic settings',
                'aspirational content formats',
                'tribal signal validation',
            ],
        },
        minFacts: 60,
        minSourcedQuotes: 20, // 20 phrases/terms + examples
    },
    amazon_research: {
        id: 'amazon_research',
        title: 'Amazon Review Mining',
        description: 'Exhaustive mining of Amazon reviews for customer language, objections, and decision patterns',
        keyQuestions: [
            'What language do customers use to describe their problems? (30+ direct quotes)',
            'What products have customers tried before and what disappointed them?',
            'What "a-ha moments" do customers describe when a product works? (15+ examples)',
            'What visual proof do customers look for to believe a product works?',
            'What objections cause hesitation before purchasing? (15+ documented)',
            'How do customers describe their decision-making process?',
            'What words appear repeatedly in 5-star vs 1-star reviews?',
            'What specific results do customers mention? (timeframes, measurements)',
        ],
        priority: 'high',
        primarySources: ['amazon', 'reddit', 'google'],
        youtubeBehavior: {
            when: 'never', // Amazon reviews provide all the customer voice needed
            searchTemplate: '',
            purpose: 'N/A — Amazon reviews are primary source for customer voice',
            maxVideos: 0,
            requiredFor: [],
        },
        minFacts: 50,
        minSourcedQuotes: 30, // 30 direct quotes with links (critical requirement from PDF)
    },
};
// ─────────────────────────────────────────────────────────────
// PLAN GENERATION
// ─────────────────────────────────────────────────────────────
/**
 * Generate a marketing research plan from the 5-step PDF workflow.
 * This replaces the generic LLM-generated plan for marketing research.
 */
export function generateMarketingPlan(question, brandUrl, targetAudience, focusSections) {
    const sectionIds = focusSections || [
        'brand_analysis',
        'desire_mapping',
        'competitor_research',
        'identity_markers',
        'amazon_research',
    ];
    const sections = sectionIds.map((id, index) => {
        const config = MARKETING_SECTIONS[id];
        const contextualizedQuestions = config.keyQuestions.map(q => q
            .replace('{brand}', brandUrl || 'the brand')
            .replace('{audience}', targetAudience || 'the target audience'));
        return {
            id: `section-${index}`,
            title: config.title,
            description: config.description + (brandUrl ? ` Focus on ${brandUrl}` : ''),
            keyQuestions: contextualizedQuestions,
            priority: config.priority,
        };
    });
    const totalEstimatedSources = sectionIds.reduce((sum, id) => sum + MARKETING_SECTIONS[id].minFacts * 3, 0); // ~3 sources per fact
    return {
        sections,
        totalEstimatedSources,
        researchStrategy: `5-step marketing research: ${sectionIds.length} specialized sections. YouTube used selectively: always for identity markers, conditionally for desire/competitor, never for brand analysis or Amazon review mining.`,
    };
}
/**
 * Decide if YouTube should be searched for a given section.
 * This is the core logic that prevents random/blind YouTube fetching.
 */
export function decideYouTube(sectionId, marketingSection, findings) {
    const config = MARKETING_SECTIONS[marketingSection];
    const behavior = config.youtubeBehavior;
    // Never fetch for sections that don't need it
    if (behavior.when === 'never') {
        return {
            shouldFetch: false,
            reason: behavior.purpose,
            searchQuery: '',
            maxVideos: 0,
            purpose: 'Not applicable for this section type',
        };
    }
    // Always fetch for identity_markers (YouTube consumption IS the research)
    if (behavior.when === 'always') {
        return {
            shouldFetch: true,
            reason: `Identity markers research always requires YouTube data — this section maps what media the target group consumes`,
            searchQuery: behavior.searchTemplate,
            maxVideos: behavior.maxVideos,
            purpose: behavior.purpose,
        };
    }
    // 'gap_only' — only fetch if specific gaps exist
    const hasCustomerVoice = findings.facts.some(f => f.includes('"') || f.toLowerCase().includes('customer said') || f.toLowerCase().includes('review'));
    const hasEnoughFacts = findings.facts.length >= config.minFacts;
    const hasGoodConfidence = findings.confidence >= 0.65;
    if (hasEnoughFacts && hasGoodConfidence && hasCustomerVoice) {
        return {
            shouldFetch: false,
            reason: `Section has ${findings.facts.length} facts (>=${config.minFacts} required), confidence ${findings.confidence.toFixed(2)} (>=0.65), and customer voice present. YouTube not needed.`,
            searchQuery: '',
            maxVideos: 0,
            purpose: '',
        };
    }
    // Gap found — describe specifically what's missing
    const missingDimensions = [];
    if (!hasCustomerVoice)
        missingDimensions.push('authentic customer voice/quotes');
    if (!hasEnoughFacts)
        missingDimensions.push(`sufficient facts (${findings.facts.length}/${config.minFacts})`);
    if (!hasGoodConfidence)
        missingDimensions.push(`confidence (${findings.confidence.toFixed(2)}/0.65)`);
    return {
        shouldFetch: true,
        reason: `Gap detected: missing ${missingDimensions.join(', ')}. YouTube can provide: ${behavior.requiredFor.join(', ')}`,
        searchQuery: behavior.searchTemplate,
        maxVideos: behavior.maxVideos,
        purpose: behavior.purpose,
    };
}
/**
 * Format a sourced fact as a markdown citation.
 * Used in final report to ensure every claim is attributable.
 */
export function formatCitation(fact, index) {
    const linkText = fact.sourceTitle || new URL(fact.sourceUrl).hostname;
    const methodNote = fact.extractionMethod === 'direct_quote' ? '' :
        fact.extractionMethod === 'paraphrase' ? ' (paraphrased)' : ' (inferred)';
    if (fact.directQuote) {
        return `> "${fact.directQuote}" — [${linkText}](${fact.sourceUrl})${methodNote}`;
    }
    return `${fact.fact} [[${index}]](${fact.sourceUrl})${methodNote}`;
}
//# sourceMappingURL=marketingResearch.js.map