/**
 * ENHANCED Planner — Adaptive Multi-Platform Query Generation
 *
 * Improvements:
 * 1. Contradiction-aware queries (if conflicting facts found, suggest resolution queries)
 * 2. Gap-aware queries (based on coverage %, generate more detailed queries)
 * 3. Platform-aware multi-source queries (TikTok, Reddit, Trustpilot, Amazon, YouTube)
 * 4. Cross-platform synthesis (if TikTok shows emotional need, query Amazon reviews for same need)
 * 5. Domain knowledge seeding (pre-populate queries with learnings from past research)
 * 6. Adaptive depth (low confidence = generate deeper, more specific queries)
 * 7. Related angle suggestions (after core coverage > 80%, suggest tangential topics)
 */
import { ollamaService } from '../../services/ollama.js';
import { createLogger } from '../../utils/logger.js';
import { liveDisplay } from '../../utils/liveDisplay.js';
import { getModel } from '../../config/models.js';
const log = createLogger('plannerEnhanced');
function parseJson(raw) {
    if (!raw || raw.length === 0) {
        throw new SyntaxError('parseJson: empty input');
    }
    try {
        return JSON.parse(raw);
    }
    catch { }
    const fenceStripped = raw
        .replace(/^```(?:json)?\s*/im, '')
        .replace(/```\s*$/m, '')
        .replace(/^[\s\n]+/, '')
        .replace(/[\s\n]+$/, '')
        .trim();
    if (fenceStripped.length > 0) {
        try {
            return JSON.parse(fenceStripped);
        }
        catch { }
    }
    const greedyArray = raw.match(/\[\s*[\s\S]*\s*\]/);
    if (greedyArray) {
        try {
            return JSON.parse(greedyArray[0]);
        }
        catch { }
    }
    const greedyObj = raw.match(/\{\s*[\s\S]*\s*\}/);
    if (greedyObj) {
        try {
            return JSON.parse(greedyObj[0]);
        }
        catch { }
    }
    throw new SyntaxError(`parseJson: no valid JSON found`);
}
/**
 * Generate adaptive queries based on findings, gaps, contradictions
 * Routes to appropriate platforms
 */
async function generateAdaptiveQueries(brandName, section, context = {}) {
    const PLANNING_MODEL = getModel('planning');
    // Map section to research strategy + platforms
    let strategy = '';
    let primaryPlatforms = [];
    if (section.title.toLowerCase().includes('desire') || section.title.toLowerCase().includes('problem')) {
        strategy = `EMOTIONAL & SENTIMENT-DRIVEN (customer desires, pain points)
PRIMARY: Reddit (detailed experiences), TikTok (emotional reactions), YouTube (long-form reviews)
SECONDARY: Trustpilot (negative reviews), Amazon reviews (verified buyer feedback)
SENTIMENT: Mix of negative, positive, aspirational
DEPTH: If confidence < 60%, ask "why" questions (WHY do people want this, WHY do they avoid it)`;
        primaryPlatforms = ['reddit', 'tiktok', 'youtube', 'trustpilot', 'amazon'];
    }
    else if (section.title.toLowerCase().includes('competitor') || section.title.toLowerCase().includes('positioning')) {
        strategy = `COMPARATIVE & COMPETITIVE ANALYSIS
PRIMARY: Reddit (comparisons), YouTube (vs reviews), Google (general)
SECONDARY: Amazon (pricing, reviews comparison), Trustpilot (competitor reviews)
APPROACH: vs, alternatives, positioning, differentiation
DEPTH: If conflicts found, generate resolution queries (e.g., if Competitor A is "premium" and "affordable", clarify which positioning wins)`;
        primaryPlatforms = ['reddit', 'youtube', 'amazon', 'trustpilot'];
    }
    else if (section.title.toLowerCase().includes('identity') || section.title.toLowerCase().includes('marker')) {
        strategy = `BRAND IDENTITY & CULTURAL FIT
PRIMARY: TikTok (creator culture), Instagram (aesthetic), YouTube (community), Reddit (tribe)
SECONDARY: Twitter (sentiment), Amazon reviews (buyer demographics)
APPROACH: Who uses it, brand perception, cultural resonance, creator association
DEPTH: If coverage low, dig into: creator demographics, geographic clusters, psychographic markers`;
        primaryPlatforms = ['tiktok', 'instagram', 'youtube', 'reddit', 'amazon'];
    }
    else if (section.title.toLowerCase().includes('objection') || section.title.toLowerCase().includes('risk')) {
        strategy = `OBJECTION & RISK MAPPING
PRIMARY: Reddit (complaints), Trustpilot (negative reviews), YouTube (criticism), Amazon (1-star reviews)
APPROACH: Problems, side effects, regrets, disappointments, pricing friction
DEPTH: If gaps found, generate follow-ups: "How do people overcome objection X?", "Does competitor Y address this?"`;
        primaryPlatforms = ['reddit', 'trustpilot', 'youtube', 'amazon'];
    }
    else {
        strategy = `BROAD MARKET AWARENESS
APPROACH: Mix of platforms, sentiment, depth appropriate to question
PLATFORMS: Google, Reddit, YouTube, TikTok, Amazon, Trustpilot`;
        primaryPlatforms = ['google', 'reddit', 'youtube', 'tiktok', 'amazon', 'trustpilot'];
    }
    // Build context for LLM
    let contextStr = '';
    if (context.findings?.length) {
        contextStr += `\nWe've already found:\n${context.findings.slice(0, 3).join('\n')}\n`;
    }
    if (context.contradictions?.length) {
        contextStr += `\nContradictions to resolve:\n${context.contradictions.map(c => `- "${c.fact1}" vs "${c.fact2}"`).join('\n')}\n`;
    }
    if (context.gaps?.length) {
        contextStr += `\nIdentified gaps:\n${context.gaps.slice(0, 3).join('\n')}\n`;
    }
    const depthClue = context.confidence && context.confidence < 0.5
        ? 'AGGRESSIVE: Generate SPECIFIC, DEEP queries (not broad searches). We need detailed information.'
        : context.confidence && context.confidence > 0.8
            ? 'REFINED: Generate queries to explore NUANCES and edge cases we haven\'t covered.'
            : 'BALANCED: Mix broad and specific queries.';
    const prompt = `You are a market researcher investigating "${brandName}".

Section: ${section.title}
Goal: ${section.description}
Key Questions: ${section.keyQuestions.join(', ')}

${contextStr}

${strategy}

${depthClue}

Generate 7-10 REALISTIC, CONVERSATIONAL search queries that:
1. Sound like REAL searches people type (not marketing jargon)
2. Target specific PLATFORMS where this data lives
3. Include SENTIMENT markers when appropriate (negative, positive, emotional)
4. Are 4-15 words each
5. Avoid generic marketing language

Format each query with platform prefix:
reddit: [query]
tiktok: [query]
youtube: [query]
trustpilot: [query]
amazon: [query]
google: [query]

Example for competitor section:
reddit: basedbodyworks vs collagen peptides reddit discussion
tiktok: comparison collagen brands quality
amazon: collagen supplement customer reviews pricing
trustpilot: basedbodyworks reviews complaints

Generate ONLY the prefixed queries, no explanations.`;
    try {
        const response = await ollamaService.generateStream(prompt, PLANNING_MODEL, { temperature: 0.8, num_predict: 512 });
        // Parse platform:query format
        const lines = response.split('\n').filter(l => l.trim());
        const queries = [];
        for (const line of lines) {
            const match = line.match(/^(reddit|tiktok|youtube|trustpilot|amazon|google):\s*(.+)$/i);
            if (match) {
                const [, platform, query] = match;
                if (query.length > 4 && query.length < 150) {
                    queries.push(query.trim());
                }
            }
        }
        if (queries.length === 0) {
            log.warn(`No platform queries parsed, extracting quoted strings`);
            const quoted = Array.from(response.matchAll(/"([^"]{4,150})"/g))
                .map(m => m[1])
                .filter(q => !q.includes('{') && !q.includes('['));
            return quoted.slice(0, 10);
        }
        return queries;
    }
    catch (err) {
        log.warn(`Query generation failed:`, err);
        return [
            `site:reddit.com ${brandName}`,
            `${brandName} vs competitors`,
            `${brandName} reviews`,
            `why people buy ${brandName}`,
            `${brandName} customer objections`
        ];
    }
}
/**
 * Generate contradiction-resolution queries
 * If we found conflicting facts, generate queries to figure out which is true
 */
async function generateContradictionResolutionQueries(brandName, contradictions) {
    const PLANNING_MODEL = getModel('planning');
    const prompt = `You found contradictory information about "${brandName}":

${contradictions.map((c, i) => `${i + 1}. "${c.fact1}" vs "${c.fact2}"`).join('\n')}

Generate 3-4 targeted queries to resolve these contradictions. Look for:
- Recent updates that might explain the difference
- Different contexts (price varies by market, formula changed, etc.)
- Different sources speaking different truths

Format as simple query strings (no platform prefix needed for resolution queries):`;
    try {
        const response = await ollamaService.generateStream(prompt, PLANNING_MODEL, { temperature: 0.7 });
        const queries = response
            .split('\n')
            .filter(l => l.trim() && !l.startsWith('-'))
            .map(l => l.replace(/^[\d.]\s*/, '').trim())
            .filter(q => q.length > 4 && q.length < 120);
        return queries;
    }
    catch (err) {
        return [];
    }
}
/**
 * After core coverage is solid (>80%), suggest related angles
 * E.g., if researching "collagen supplements", suggest "collagen vs other protein sources"
 */
async function generateRelatedAngleQueries(brandName, section, coreCoverage) {
    if (coreCoverage < 0.8)
        return []; // Only after core is solid
    const PLANNING_MODEL = getModel('planning');
    const prompt = `We've covered the core topic thoroughly for "${brandName}" in "${section.title}" (${Math.round(coreCoverage * 100)}% confidence).

Now suggest 3-4 RELATED but NOT CRITICAL angles to explore:
- Adjacent markets or comparisons
- Deeper nuances or emerging trends
- Related decision factors

Format as simple queries:`;
    try {
        const response = await ollamaService.generateStream(prompt, PLANNING_MODEL, { temperature: 0.7 });
        return response
            .split('\n')
            .filter(l => l.trim())
            .map(l => l.replace(/^[\d.]\s*/, '').trim())
            .filter(q => q.length > 4 && q.length < 120)
            .slice(0, 4);
    }
    catch (err) {
        return [];
    }
}
/**
 * Main export: generate section-specific queries with full context awareness
 */
export async function generateSearchQueries(section, existingFacts = [], context) {
    log.info(`Generating queries for section: ${section.title}`);
    // Extract brand name from section description
    let brandContext = '';
    const researchingMatch = section.description.match(/researching\s+([^)]+)/i);
    const productMatch = section.description.match(/\(([^)]+)\)/);
    if (researchingMatch) {
        brandContext = researchingMatch[1];
    }
    else if (productMatch && !productMatch[1].includes('e.g.')) {
        brandContext = productMatch[1];
    }
    if (!brandContext) {
        log.warn(`No brand context found in section: ${section.title}`);
        return [section.title];
    }
    log.info(`Generating adaptive queries for brand: "${brandContext}", context awareness: ${context?.confidence || 'N/A'}`);
    try {
        const queries = await generateAdaptiveQueries(brandContext, section, context);
        // If contradictions exist, generate resolution queries
        if (context?.contradictions && context.contradictions.length > 0) {
            const resolutionQueries = await generateContradictionResolutionQueries(brandContext, context.contradictions);
            queries.push(...resolutionQueries);
        }
        // If core coverage is high, suggest related angles
        if (context?.confidence && context.confidence > 0.8) {
            const relatedQueries = await generateRelatedAngleQueries(brandContext, section, context.confidence);
            if (relatedQueries.length > 0) {
                liveDisplay.logEvent(`  💡 Suggested related angles: ${relatedQueries.slice(0, 2).join(', ')}`);
                // Don't force related queries, just suggest them
            }
        }
        return queries;
    }
    catch (err) {
        log.warn(`Query generation failed, falling back`, err);
        return [section.title];
    }
}
/**
 * Enhanced planning with gaps + contradictions
 */
export async function planResearch(question, sourcesPerSection = 500) {
    log.info(`Enhanced planning for: ${question}`);
    liveDisplay.setAgentStatus('Planner', 'Decomposing question with contradiction awareness...');
    const PLANNING_MODEL = getModel('planning');
    const prompt = `You are a research planning expert. Decompose this question into 5-8 logical sections.

Question: "${question}"

IMPORTANT: Mark each section as either:
- scope: "core" (MUST cover to answer the question)
- scope: "related" (useful context, but optional)

For each section, provide:
1. Title
2. Description
3. Key questions (3-4 specific, answerable questions)
4. Priority (high/medium/low)
5. Scope (core/related)

Format as JSON array:
[
  {
    "title": "Section",
    "description": "What this covers",
    "keyQuestions": ["Q1", "Q2"],
    "priority": "high",
    "scope": "core"
  }
]`;
    try {
        const response = await ollamaService.generateStream(prompt, PLANNING_MODEL, { temperature: 0.7, num_ctx: 8192 });
        const sections = parseJson(response);
        const plan = {
            question,
            sections: sections.map((s, i) => ({
                id: `section-${i}`,
                title: s.title,
                description: s.description,
                keyQuestions: s.keyQuestions,
                priority: s.priority || 'medium',
                scope: s.scope || 'core'
            })),
            totalEstimatedSources: sourcesPerSection * sections.length,
            researchStrategy: `Adaptive research with contradiction detection: ${sections.length} sections (${sections.filter((s) => s.scope === 'core').length} core, ${sections.filter((s) => s.scope === 'related').length} related)`
        };
        liveDisplay.clearAgent('Planner');
        liveDisplay.logEvent(`  Plan ready — ${plan.sections.length} sections (${plan.sections.filter(s => s.scope === 'core').length} core)`);
        return plan;
    }
    catch (err) {
        liveDisplay.clearAgent('Planner');
        log.error('Planning failed:', err);
        throw err;
    }
}
//# sourceMappingURL=plannerEnhanced.js.map