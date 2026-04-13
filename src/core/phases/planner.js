/**
 * PHASE 1: Research Planning
 *
 * Decomposes a research question into logical sections/subtopics.
 * Each section becomes a unit of research that can be assigned to subagents.
 */
import { ollamaService } from '../../services/ollama.js';
import { createLogger } from '../../utils/logger.js';
import { liveDisplay } from '../../utils/liveDisplay.js';
import { validateQueriesBatch } from '../../utils/searchQueryValidator.js';
import { getModel } from '../../config/models.js';
const log = createLogger('planner');
// ─────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────
/**
 * Strip markdown code fences and parse JSON with robust error handling.
 */
function parseJson(raw) {
    if (!raw || raw.length === 0) {
        throw new SyntaxError('parseJson: empty input');
    }
    // 1. Try raw first (fastest path)
    try {
        const parsed = JSON.parse(raw);
        if (parsed !== null && parsed !== undefined)
            return parsed;
    }
    catch { }
    // 2. Strip leading/trailing code fences (```json, ```, etc.) and whitespace
    const fenceStripped = raw
        .replace(/^```(?:json)?\s*/im, '') // Remove opening ```json or ```
        .replace(/```\s*$/m, '') // Remove closing ```
        .replace(/^[\s\n]+/, '') // Remove leading whitespace
        .replace(/[\s\n]+$/, '') // Remove trailing whitespace
        .trim();
    if (fenceStripped.length > 0) {
        try {
            const parsed = JSON.parse(fenceStripped);
            if (parsed !== null && parsed !== undefined)
                return parsed;
        }
        catch { }
    }
    // 3. Try to find JSON by matching brackets (prefer arrays first, then objects)
    const greedyArray = raw.match(/\[\s*[\s\S]*\s*\]/);
    if (greedyArray) {
        try {
            return JSON.parse(greedyArray[0]);
        }
        catch { }
    }
    // 4. Greedy object match
    const greedyObj = raw.match(/\{\s*[\s\S]*\s*\}/);
    if (greedyObj) {
        try {
            return JSON.parse(greedyObj[0]);
        }
        catch { }
    }
    // 5. Last resort: find last complete array/object
    const lastArray = raw.match(/(\[\s*[\s\S]*?\s*\])\s*$/);
    if (lastArray) {
        try {
            return JSON.parse(lastArray[1]);
        }
        catch { }
    }
    const lastObj = raw.match(/(\{\s*[\s\S]*?\s*\})\s*$/);
    if (lastObj) {
        try {
            return JSON.parse(lastObj[1]);
        }
        catch { }
    }
    log.error(`parseJson failed. Input (first 500 chars): ${raw.substring(0, 500)}`);
    throw new SyntaxError(`parseJson: no valid JSON found in response (length=${raw.length})`);
}
// ─────────────────────────────────────────────────────────────
// PLANNING
// ─────────────────────────────────────────────────────────────
/**
 * Decompose a research question into logical sections.
 * Each section represents a distinct topic that requires research.
 */
export async function planResearch(question, sourcesPerSection = 500) {
    log.info(`Planning research for: ${question}`);
    liveDisplay.setAgentStatus('Planner', 'Decomposing question into research sections...');
    const PLANNING_MODEL = getModel('planning');
    const prompt = `You are a research planning expert. Decompose this research question into 5-8 logical sections that together would fully answer it.

Question: "${question}"

For each section, provide:
1. Title (short, descriptive)
2. Description (1-2 sentences on what this section covers)
3. Key questions (3-4 specific questions to answer)
4. Priority (high/medium/low based on importance to answering the main question)

Format as JSON array:
[
  {
    "title": "Section Title",
    "description": "What this covers",
    "keyQuestions": ["Q1", "Q2", "Q3"],
    "priority": "high"
  }
]

Focus on creating a logical flow where sections build on each other.
Make each section specific and research-friendly (not too broad).`;
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
                priority: s.priority || 'medium'
            })),
            totalEstimatedSources: sourcesPerSection * sections.length,
            researchStrategy: `Multi-section research: ${sections.length} sections, ~${sourcesPerSection} sources per section`
        };
        liveDisplay.clearAgent('Planner');
        liveDisplay.logEvent(`  Plan ready — ${plan.sections.length} sections: ${plan.sections.map((s) => s.title).join(', ')}`);
        return plan;
    }
    catch (error) {
        liveDisplay.clearAgent('Planner');
        log.error('Planning failed:', error);
        throw error;
    }
}
/**
 * Multi-strategy query generation based on research angle.
 * Different sections need different platforms and sentiment approaches.
 * Recognizes that Reddit ≠ TikTok ≠ Trustpilot for research value.
 */
async function generateNaturalQueries(brandName, section, existingFacts = []) {
    const PLANNING_MODEL = getModel('planning');
    // Determine query strategy based on section title
    // Different sections need different platforms and approaches
    let queryStrategy = '';
    if (section.title.toLowerCase().includes('desire') || section.title.toLowerCase().includes('problem')) {
        // For customer desires and problems: focus on emotional/sentiment content
        queryStrategy = `
STRATEGY: Emotional & sentiment-driven queries
PRIMARY PLATFORMS: Reddit (detailed experiences), TikTok (emotional reactions), Trustpilot (negative reviews)
SENTIMENT: Mix of negative ("problems", "issues", "complaints") and positive ("desires", "loves", "benefits")
EXAMPLES:
- "site:reddit.com ${brandName} complaints users avoid"
- "${brandName} TikTok reactions emotional impact"
- "what people hate about ${brandName} reddit"
- "${brandName} Trustpilot negative reviews complaints"
- "why people buy ${brandName} reddit motivation"`;
    }
    else if (section.title.toLowerCase().includes('competitor') || section.title.toLowerCase().includes('positioning')) {
        // For competitor analysis: focus on comparative queries
        queryStrategy = `
STRATEGY: Comparative & competitive analysis queries
PRIMARY PLATFORMS: Reddit (detailed comparisons), YouTube (reviews), Google (general)
APPROACH: Focus on "vs", comparisons, alternatives, positioning
EXAMPLES:
- "site:reddit.com ${brandName} vs competitors comparison reddit"
- "${brandName} alternatives comparison reddit"
- "${brandName} vs [specific competitor] which is better"
- "youtube ${brandName} review vs competition"
- "how does ${brandName} compare to alternatives"`;
    }
    else if (section.title.toLowerCase().includes('identity') || section.title.toLowerCase().includes('marker')) {
        // For identity/brand markers: focus on brand perception and culture
        queryStrategy = `
STRATEGY: Brand identity & culture queries
PRIMARY PLATFORMS: TikTok (culture/trends), Instagram, YouTube (creator usage), Reddit (community)
APPROACH: Focus on who uses it, brand perception, cultural fit
EXAMPLES:
- "${brandName} TikTok creators who use it culture"
- "instagram ${brandName} aesthetic brand vibe"
- "${brandName} community reddit who are the users"
- "what type of person uses ${brandName} reddit"
- "${brandName} brand personality values reddit"`;
    }
    else if (section.title.toLowerCase().includes('amazon') || section.title.toLowerCase().includes('review')) {
        // For reviews and sales data: focus on review platforms
        queryStrategy = `
STRATEGY: Review & purchase intent queries
PRIMARY PLATFORMS: Amazon (sales + reviews), Trustpilot (detailed reviews), site:amazon.com
APPROACH: Focus on reviews, ratings, purchase decisions, real experiences
EXAMPLES:
- "site:amazon.com ${brandName} customer reviews ratings"
- "${brandName} reviews Trustpilot real customers"
- "site:amazon.com ${brandName} best worst features"
- "${brandName} worth buying reddit honest"
- "site:amazon.com ${brandName} does it work real reviews"`;
    }
    else {
        // Generic/brand analysis: broad coverage
        queryStrategy = `
STRATEGY: Broad market awareness queries
APPROACH: Mix of platforms and sentiment for comprehensive understanding
EXAMPLES:
- "what is ${brandName} reddit explanation"
- "site:reddit.com ${brandName} discussion community"
- "${brandName} news trends 2025"
- "is ${brandName} worth it good or bad"
- "${brandName} how it works explained"`;
    }
    const prompt = `Generate 7-9 realistic search queries for this research section.

Brand: "${brandName}"
Section: ${section.title}
Goal: ${section.description}

${queryStrategy}

Generate queries that:
1. Sound like REAL searches people type (not academic questions)
2. Mix different platforms: Reddit, TikTok, Trustpilot, Amazon, YouTube, Google
3. Include actual sentiment (negative, positive, neutral - appropriate to the section)
4. Are 4-12 words each
5. Avoid generic marketing language

Return ONLY valid JSON array:
["query 1", "query 2", "query 3", "query 4", "query 5", "query 6", "query 7"]`;
    const response = await ollamaService.generateStream(prompt, PLANNING_MODEL, { temperature: 0.8, num_predict: 512 });
    let queries = [];
    try {
        queries = parseJson(response);
        if (Array.isArray(queries) && queries.length > 0) {
            queries = queries.filter((q) => typeof q === 'string' && q.length > 4 && q.length < 150);
        }
    }
    catch {
        // Fallback: extract quoted strings
        const quoted = Array.from(response.matchAll(/"([^"]{4,150})"/g))
            .map(m => m[1])
            .filter(q => !q.includes('{') && !q.includes('['));
        if (quoted.length >= 3) {
            queries = quoted.slice(0, 10);
        }
    }
    if (queries.length === 0) {
        log.warn(`Failed to generate queries for section "${section.title}", using fallback`);
        // Fallback: section-appropriate queries
        queries = [
            `site:reddit.com ${brandName} ${section.title.toLowerCase()}`,
            `${brandName} reddit`,
            `${brandName} Trustpilot reviews`,
            `${brandName} TikTok`,
            `"${brandName}" real experiences`,
            `site:amazon.com ${brandName}`,
            `is ${brandName} worth it`
        ];
    }
    return queries;
}
/**
 * Generate targeted search queries for a specific section.
 * Routes to natural query generator for brand research, template-based for generic research.
 */
export async function generateSearchQueries(section, existingFacts = []) {
    // Extract brand/product name from section description if it's in parentheses or follows "researching"
    let brandContext = '';
    const researchingMatch = section.description.match(/researching\s+([^)]+)/i);
    const productMatch = section.description.match(/\(([^)]+)\)/);
    if (researchingMatch) {
        brandContext = researchingMatch[1];
    }
    else if (productMatch && !productMatch[1].includes('e.g.')) {
        brandContext = productMatch[1];
    }
    // If we have a brand name, use natural query generation (more conversational, less rigid)
    if (brandContext.length > 0) {
        log.info(`Generating natural queries for brand: "${brandContext}"`);
        const naturalQueries = await generateNaturalQueries(brandContext, section, existingFacts);
        return naturalQueries;
    }
    // Otherwise, use original template-based approach for generic research
    const PLANNING_MODEL = getModel('planning');
    const existingSummary = existingFacts.slice(0, 10).join('; ');
    const prompt = `Generate 7-10 specific search queries to research this section thoroughly.

Section: ${section.title}
Description: ${section.description}
Key Questions: ${section.keyQuestions.join(', ')}

Existing findings (avoid re-covering these angles):
${existingSummary || 'None yet'}

Include a mix of query types:
- Tutorial/How-to: practical implementation (start with these — most likely to be relevant)
- Code/GitHub: "site:github.com ...", implementation examples
- Community: "site:reddit.com ...", user experiences
- Academic/Benchmark: comparative analysis, research papers
- News/Recent: add "2025" for time-sensitive topics
- General: broad overview as fallback

Make each query specific and searchable (5-10 words).
DO NOT use overly broad site: queries — focus on specific topics first.

Return as JSON array of strings only (no extra text):
["query 1", "query 2", "query 3", "query 4", "query 5", "query 6", "query 7"]`;
    const response = await ollamaService.generateStream(prompt, PLANNING_MODEL, { temperature: 0.7, num_predict: 512 });
    let queries = [];
    try {
        queries = parseJson(response);
        if (Array.isArray(queries) && queries.length > 0) {
            queries = queries.filter((q) => typeof q === 'string' && q.length > 5);
        }
    }
    catch {
        const quoted = Array.from(response.matchAll(/"([^"]{10,80})"/g))
            .map(m => m[1])
            .filter(q => !q.includes('{') && !q.includes('['));
        if (quoted.length >= 3) {
            queries = quoted.slice(0, 10);
        }
    }
    if (queries.length === 0) {
        log.warn(`Failed to generate queries for section "${section.title}", using fallback`);
        queries = [section.title];
    }
    // Validate queries before deployment
    log.info(`Validating ${queries.length} generated queries...`);
    const { valid: validatedQueries } = await validateQueriesBatch(queries, `${section.title} ${section.description}`, 5 // Keep top 5 valid queries
    );
    if (validatedQueries.length === 0) {
        log.warn(`No valid queries found for section "${section.title}" — using raw generated queries`);
        return queries.slice(0, 5);
    }
    return validatedQueries;
}
//# sourceMappingURL=planner.js.map