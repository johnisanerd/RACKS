/**
 * Deep Research Orchestrator — Planning + Research + Reflection Loop
 *
 * Architecture:
 * 1. PLANNING: Decompose question into logical sections/subtopics
 * 2. RESEARCH: For each section, spawn parallel subagents to research
 * 3. REFLECTION: Analyze coverage/gaps, decide if more research needed
 * 4. LOOP: Continue until coverage × confidence > threshold or time/iterations exhausted
 *
 * Key Insight: Don't just iterate blindly. Plan the structure, research
 * methodically per section, reflect on what's missing.
 */
import { ollamaService } from '../services/ollama.js';
import { context1Service } from '../services/context1Service.js';
import { SubagentPool } from '../subagents/pool.js';
import { createLogger } from '../utils/logger.js';
import { liveDisplay } from '../utils/liveDisplay.js';
import { youtubeVideoQueue } from '../services/youtubeTranscriptService.js';
import { storageService } from '../services/storageService.js';
import { validateQueriesBatch } from '../utils/searchQueryValidator.js';
import pLimit from 'p-limit';
import { getModel } from '../config/models.js';
const log = createLogger('deepResearchOrchestrator');
// Concurrency limit for YouTube transcript fetching — prevents overwhelming the service
const ytLimit = pLimit(3);
// Concurrency limit for reasoning calls — qwen3.5:4b is solid but we cap at 3 to avoid overload
// to prevent Ollama from getting overloaded when all sections finish simultaneously
const reasoningLimit = pLimit(3);
/**
 * Strip markdown code fences and parse JSON with robust error handling.
 * Models often return: ```json\n[...]\n``` — this handles that gracefully.
 * Also validates that parsed output is not malformed.
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
    // 2. Strip leading/trailing code fences and whitespace
    const fenceStripped = raw
        .replace(/^```(?:json)?\s*/im, '')
        .replace(/```\s*$/m, '')
        .replace(/^[\s\n]+/, '')
        .replace(/[\s\n]+$/, '')
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
    // Greedy array match — captures from first '[' to last ']'
    const greedyArray = raw.match(/\[\s*[\s\S]*\s*\]/);
    if (greedyArray) {
        try {
            return JSON.parse(greedyArray[0]);
        }
        catch { }
    }
    // 4. Greedy object match — captures from first '{' to last '}'
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
    // Log the problematic output for debugging
    log.error(`parseJson failed. Input (first 500 chars): ${raw.substring(0, 500)}`);
    throw new SyntaxError(`parseJson: no valid JSON found in response (length=${raw.length})`);
}
// ─────────────────────────────────────────────────────────────
// MODEL ASSIGNMENTS (Gemma-prioritized for speed & quality)
// ─────────────────────────────────────────────────────────────
// Model assignments loaded from centralized registry
const PLANNING_MODEL = getModel('planning');
const SYNTHESIS_MODEL = getModel('synthesis');
const EXTRACTION_MODEL = getModel('extraction');
export { EXTRACTION_MODEL }; // used by subagentManager
// ─────────────────────────────────────────────────────────────
// STANDARD RESEARCH CONFIGURATION
// ─────────────────────────────────────────────────────────────
export const STANDARD_RESEARCH_CONFIG = {
    maxIterations: 12,
    sourcesPerSection: 500,
    coverageThreshold: 0.80,
    maxParallelAgents: 7,
    timeoutMs: 2 * 60 * 60 * 1000
};
// ─────────────────────────────────────────────────────────────
// ORCHESTRATOR
// ─────────────────────────────────────────────────────────────
export class DeepResearchOrchestrator {
    constructor(configOverrides) {
        this.startTime = 0;
        this.config = { ...STANDARD_RESEARCH_CONFIG, ...configOverrides };
        this.agentPool = new SubagentPool(this.config.maxParallelAgents);
    }
    // ─────────────────────────────────────────────────────────────
    // PHASE 1: PLANNING
    // ─────────────────────────────────────────────────────────────
    /**
     * Decompose question into logical research sections
     */
    async planResearch(question) {
        log.info(`Planning research for: ${question}`);
        liveDisplay.setAgentStatus('Planner', 'Decomposing question into research sections...');
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
                totalEstimatedSources: this.config.sourcesPerSection * sections.length,
                researchStrategy: `Multi-section research: ${sections.length} sections, ~${this.config.sourcesPerSection} sources per section`
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
    // ─────────────────────────────────────────────────────────────
    // PHASE 2: RESEARCH (Per Section)
    // ─────────────────────────────────────────────────────────────
    /**
     * Research a single section using parallel subagents.
     * All subagent queries fire simultaneously via Promise.all.
     * After aggregation, YouTube URLs found in sources are fetched in
     * parallel (concurrency capped at 3 via p-limit) and their transcript
     * summaries are appended as additional facts.
     */
    async researchSection(section, existingFindings, taskId) {
        log.info(`Researching section: ${section.title}`);
        const sectionAgentId = `[${section.title.slice(0, 16)}...]`;
        liveDisplay.setAgentStatus(sectionAgentId, `Generating queries...`);
        // Generate search queries for this section
        const queries = await this.generateSearchQueries(section, existingFindings);
        liveDisplay.setAgentStatus(sectionAgentId, `Executing ${queries.length} queries...`);
        // Submit ALL subagent queries simultaneously -- true parallel execution
        const subagentPromises = queries.map((query) => this.agentPool.submit({
            role: 'researcher',
            task: `Research: ${query}`,
            query,
            context: section.description,
            maxSteps: 5
        }));
        const results = await Promise.all(subagentPromises);
        // Aggregate findings from all subagents
        const sourceSet = new Set();
        const findings = {
            sectionId: section.id,
            sectionTitle: section.title,
            facts: [],
            quotes: [],
            statistics: {},
            sources: [],
            confidence: 0,
            researched: true
        };
        for (const result of results) {
            if (result.success) {
                findings.facts.push(...(result.facts || []));
                findings.quotes.push(...(result.quotes || []));
                Object.assign(findings.statistics, result.statistics || {});
                (result.sources || []).forEach(s => sourceSet.add(s));
            }
        }
        findings.sources = Array.from(sourceSet);
        // -- YouTube transcript enrichment --
        // Scan all collected sources for YouTube URLs, queue transcripts for background processing
        // Queue prevents blocking research while videos process. Max 3 concurrent downloads.
        const ytUrls = findings.sources.filter(url => /youtube\.com\/watch|youtu\.be\//.test(url));
        if (ytUrls.length > 0) {
            log.info(`Found ${ytUrls.length} YouTube URL(s) in section "${section.title}" -- queueing for background processing`);
            for (const url of ytUrls) {
                youtubeVideoQueue.enqueue(url, section.title); // Queue instead of awaiting
            }
            const status = youtubeVideoQueue.getQueueStatus();
            log.info(`Queue status: ${status.queued} queued, ${status.processing} processing`);
        }
        // Score confidence based on specificity and corroboration
        findings.confidence = this.scoreConfidence(findings);
        // ── REASONING LAYER ──────────────────────────────────────────────────
        // Don't just bag facts — reason about them. Find patterns, contradictions,
        // implications, and what's conspicuously absent. This is what separates
        // research from fact collection.
        if (findings.facts.length >= 5) {
            try {
                liveDisplay.setAgentStatus(sectionAgentId, `Reasoning across ${findings.facts.length} facts...`);
                const analysis = await reasoningLimit(() => this.reasonAboutFindings(section, findings));
                if (analysis) {
                    // Prepend analysis insights as high-signal facts
                    findings.analysis = analysis;
                    findings.facts.unshift(...analysis.keyInsights.map(i => `[INSIGHT] ${i}`));
                    if (analysis.contradictions.length > 0) {
                        findings.facts.push(...analysis.contradictions.map(c => `[CONTRADICTION] ${c}`));
                    }
                }
            }
            catch (err) {
                log.warn(`Reasoning step failed for section ${section.id}:`, err);
            }
        }
        // Index into Context-1 vector DB for semantic search
        for (let i = 0; i < findings.facts.length; i++) {
            await context1Service.indexContent(`${section.id}-fact-${i}`, findings.facts[i], 'web', { section: section.title, confidence: findings.confidence });
        }
        // Persist findings to disk
        if (taskId) {
            try {
                await storageService.saveFindings(taskId, section.id, findings);
            }
            catch (err) {
                log.warn(`Failed to persist findings for ${section.id}:`, err);
            }
        }
        liveDisplay.clearAgent(sectionAgentId);
        liveDisplay.logEvent(`  + Section "${section.title}" — ${findings.sources.length} sources, confidence: ${findings.confidence.toFixed(2)}`);
        return findings;
    }
    /**
     * Reasoning layer: given raw facts, derive insights, find contradictions,
     * and identify what the data actually means. This is what makes the difference
     * between fact-dumping and genuine research.
     */
    async reasonAboutFindings(section, findings) {
        // Sample representatively across the fact list (not just head)
        const step = Math.max(1, Math.floor(findings.facts.length / 30));
        const sampledFacts = findings.facts
            .filter((_, i) => i % step === 0)
            .slice(0, 30)
            .map((f, i) => `${i + 1}. ${f}`)
            .join('\n');
        const prompt = `You are a senior research analyst. You have collected ${findings.facts.length} facts from ${findings.sources.length} sources about: "${section.title}"

Research question context: ${section.description}
Key questions being answered: ${section.keyQuestions.join('; ')}

FACTS COLLECTED (representative sample):
${sampledFacts}

Your job is NOT to summarize these facts. Your job is to REASON about them:

1. KEY INSIGHTS: What non-obvious conclusions can be drawn? What patterns emerge across multiple sources? What does the data collectively point to that no single source explicitly states?

2. CONTRADICTIONS: Where do sources disagree? What claims conflict with each other? What are the tensions in this field?

3. IMPLICATIONS: Given these findings, what does this mean for someone building/deploying this? What are the practical consequences?

4. GAPS: What important questions remain unanswered? What did the research NOT find that we'd expect to find?

Return JSON only:
{
  "keyInsights": ["insight 1", "insight 2", "insight 3"],
  "contradictions": ["contradiction 1", "contradiction 2"],
  "implications": ["implication 1", "implication 2", "implication 3"],
  "gaps": ["gap 1", "gap 2"]
}`;
        // Use PLANNING_MODEL (qwen3.5:4b) — fast enough, avoids overloading qwen3.5:9b during parallel section research
        const response = await ollamaService.generateStream(prompt, PLANNING_MODEL, {
            temperature: 0.4,
            num_ctx: 8192,
            num_predict: 1024
        });
        try {
            return parseJson(response);
        }
        catch {
            log.warn(`Failed to parse reasoning output for section ${section.id}`);
            return null;
        }
    }
    /**
     * Generate and validate search queries for a section.
     * Tests queries against real search engines before deployment.
     * Ensures queries are relevant and not casting nets too wide.
     */
    async generateSearchQueries(section, existingFindings) {
        // Build a brief summary of what we already know to avoid redundant queries
        const existingSummary = Array.from(existingFindings.values())
            .flatMap(f => f.facts.slice(0, 2))
            .slice(0, 10)
            .join('; ');
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
            // Fallback: extract quoted strings from prose output
            const quoted = Array.from(response.matchAll(/"([^"]{10,80})"/g))
                .map(m => m[1])
                .filter(q => !q.includes('{') && !q.includes('['));
            if (quoted.length >= 3) {
                queries = quoted.slice(0, 10);
            }
        }
        if (queries.length === 0) {
            log.warn(`Failed to generate queries for section "${section.title}", using fallback`);
            // Emergency fallback: just use the section title as a query
            queries = [section.title];
        }
        // Validate queries before deploying them
        // This prevents wasteful research on irrelevant topics
        log.info(`Validating ${queries.length} generated queries...`);
        const { valid: validatedQueries } = await validateQueriesBatch(queries, `${section.title} ${section.description}`, 5 // Keep top 5 valid queries
        );
        if (validatedQueries.length === 0) {
            log.warn(`No valid queries found for section "${section.title}" — using raw generated queries`);
            return queries.slice(0, 5); // Fall back to original generation
        }
        return validatedQueries;
    }
    /**
     * Score confidence of findings (0-1 scale) — STRICT MODE.
     * Much higher thresholds required for high confidence.
     * Based on: source count, fact density, source diversity, and contradiction analysis.
     */
    scoreConfidence(findings) {
        // Source volume — STRICT: 30 sources for 0.5, 75+ for 1.0
        const sourcesScore = Math.min(findings.sources.length / 75, 1);
        // Fact density — STRICT: 100+ facts needed for high confidence
        const factsScore = Math.min(findings.facts.length / 100, 1);
        // Source diversity (unique domains) — must have 5+ types
        const sourceTypes = new Set(findings.sources.map(s => this.categorizeSource(s)));
        const diversityScore = Math.min(sourceTypes.size / 5, 1); // 5+ types for full score
        // Contradiction detection penalty — high contradictions lower confidence
        const contradictionCount = (findings.analysis?.contradictions || []).length;
        const contradictionPenalty = Math.min(contradictionCount * 0.1, 0.5); // Max -0.5 penalty
        // Gap count penalty — unresolved gaps lower confidence
        const gapCount = (findings.analysis?.gaps || []).length;
        const gapPenalty = Math.min(gapCount * 0.05, 0.4); // Max -0.4 penalty
        // Much stricter weighting: require high bar across all dimensions
        const baseScore = sourcesScore * 0.35 + factsScore * 0.4 + diversityScore * 0.25;
        const finalScore = Math.max(baseScore - contradictionPenalty - gapPenalty, 0);
        return Math.min(finalScore, 1.0);
    }
    categorizeSource(url) {
        if (url.includes('reddit.com'))
            return 'community';
        if (url.includes('pubmed.gov') || url.includes('arxiv.org'))
            return 'academic';
        if (url.includes('github.com'))
            return 'code';
        return 'industry';
    }
    // ─────────────────────────────────────────────────────────────
    // PHASE 3: REFLECTION & GAP ANALYSIS
    // ─────────────────────────────────────────────────────────────
    /**
     * Analyze coverage and identify gaps
     */
    async analyzeGaps(plan, findings) {
        const gaps = [];
        let coverageCount = 0;
        liveDisplay.setAgentStatus('Reflection', 'Analyzing coverage gaps...');
        for (const section of plan.sections) {
            const sectionFindings = findings.get(section.id);
            if (!sectionFindings || !sectionFindings.researched) {
                gaps.push(`Missing: ${section.title}`);
            }
            else if (sectionFindings.confidence < 0.5) {
                gaps.push(`Weak confidence in: ${section.title}`);
            }
            else {
                coverageCount++;
            }
        }
        // Run reflection agent to detect non-obvious gaps
        const reflectionGaps = await this.runReflectionAgent(plan, findings);
        gaps.push(...reflectionGaps);
        liveDisplay.clearAgent('Reflection');
        if (gaps.length > 0) {
            for (const gap of gaps.slice(0, 5)) {
                liveDisplay.logEvent(`  > Gap found: ${gap}`);
            }
            liveDisplay.logEvent(`  -> Dispatching agents to fill ${gaps.length} gap${gaps.length !== 1 ? 's' : ''}...`);
        }
        else {
            liveDisplay.logEvent('  > No coverage gaps found — research looks solid');
        }
        return gaps;
    }
    /**
     * Run reflection agent (Devil's Advocate, Depth Auditor, Coverage Checker).
     * Provides top-5 facts per section plus confidence score and source count
     * so the model has richer signal to detect gaps.
     */
    async runReflectionAgent(plan, findings) {
        liveDisplay.setAgentStatus('Reflection', 'Running deep reflection on all findings...');
        // Include top-5 facts, confidence score, and source count per section
        const summary = Array.from(findings.entries())
            .map(([sectionId, f]) => {
            const section = plan.sections.find(s => s.id === sectionId);
            const title = section ? section.title : sectionId;
            const topFacts = f.facts.slice(0, 5).join('; ');
            return `[${title}] confidence=${f.confidence.toFixed(2)}, sources=${f.sources.length}: ${topFacts}`;
        })
            .join('\n');
        const prompt = `Review this research and identify gaps:

Question: "${plan.question}"

Findings Summary (top 5 facts, confidence score, and source count per section):
${summary}

For each gap identified, suggest what specific research would fill it.
Format as JSON:
{
  "gaps": ["gap 1", "gap 2"],
  "suggestedQueries": ["query 1", "query 2"]
}`;
        // Extract gaps and suggested queries for next research iteration
        const response = await ollamaService.generateStream(prompt, EXTRACTION_MODEL, { temperature: 0.5, num_predict: 512 });
        const result = parseJson(response);
        return result.gaps || [];
    }
    // ─────────────────────────────────────────────────────────────
    // MAIN LOOP
    // ─────────────────────────────────────────────────────────────
    /**
     * Main orchestration loop: Plan -> Research -> Reflect -> Loop
     */
    async orchestrate(task, onProgress) {
        this.startTime = Date.now();
        log.info(`Starting research orchestration for task: ${task.id}`);
        log.info(`Config: ${JSON.stringify(this.config)}`);
        liveDisplay.updateHeader({
            question: task.question,
            iteration: 0,
            maxIterations: this.config.maxIterations,
            coveragePct: 0,
            readyScore: 0,
            sourcesTotal: 0,
            activeAgents: 0,
            maxAgents: this.config.maxParallelAgents,
            elapsedMs: 0
        });
        // Initialise storage for this task (best-effort -- don't block on failure)
        try {
            await storageService.initTask(task.id);
            await storageService.updateManifest(task.id, { question: task.question });
        }
        catch (err) {
            log.warn(`Storage init failed for task ${task.id}:`, err);
        }
        // PHASE 1: PLAN
        liveDisplay.logEvent('  Planning research structure...');
        const plan = await this.planResearch(task.question);
        log.info(`Created plan with ${plan.sections.length} sections`);
        const state = {
            plan,
            findings: new Map(),
            iteration: 0,
            coverage: 0,
            confidence: 0,
            readyScore: 0,
            gaps: []
        };
        // PHASE 2-4: RESEARCH LOOP
        let previousReadyScore = 0;
        let plateauCount = 0;
        for (let i = 1; i <= this.config.maxIterations; i++) {
            state.iteration = i;
            log.info(`Iteration ${i}/${this.config.maxIterations}`);
            liveDisplay.updateHeader({ iteration: i, elapsedMs: Date.now() - this.startTime });
            liveDisplay.logEvent(`\n  === Iteration ${i}/${this.config.maxIterations} ===`);
            // Check time limit — reserve 120s for synthesis so report always finishes
            const synthesisReserve = 120000;
            const researchBudget = (this.config.timeoutMs ?? Infinity) - synthesisReserve;
            if (Date.now() - this.startTime > researchBudget) {
                log.warn(`Research budget exhausted — reserving time for synthesis`);
                liveDisplay.logEvent('  Time limit reached — writing report...');
                break;
            }
            // Research all sections in parallel -- each section fires its own
            // parallel subagent queries internally via Promise.all
            liveDisplay.updateHeader({ activeAgents: plan.sections.length });
            const sectionResults = await Promise.all(plan.sections.map(section => this.researchSection(section, state.findings, task.id)));
            // Store results in state
            sectionResults.forEach((findings, index) => {
                state.findings.set(plan.sections[index].id, findings);
            });
            liveDisplay.updateHeader({ activeAgents: 0 });
            // Evaluate coverage & confidence
            const completedSections = Array.from(state.findings.values()).filter(f => f.researched).length;
            state.coverage = (completedSections / plan.sections.length) * 100;
            state.confidence = Array.from(state.findings.values()).reduce((sum, f) => sum + f.confidence, 0) / Math.max(plan.sections.length, 1);
            state.readyScore = (state.coverage / 100) * state.confidence;
            const totalSources = Array.from(state.findings.values()).reduce((sum, f) => sum + f.sources.length, 0);
            liveDisplay.updateHeader({
                coveragePct: state.coverage,
                readyScore: state.readyScore,
                sourcesTotal: totalSources,
                elapsedMs: Date.now() - this.startTime
            });
            log.info(`Coverage: ${state.coverage.toFixed(0)}% | Confidence: ${state.confidence.toFixed(2)} | Ready: ${state.readyScore.toFixed(2)}`);
            // Check termination conditions
            if (state.readyScore >= this.config.coverageThreshold) {
                log.info(`Ready score (${state.readyScore.toFixed(2)}) exceeds threshold (${this.config.coverageThreshold})`);
                liveDisplay.logEvent(`  Coverage threshold met — ready score ${state.readyScore.toFixed(2)} >= ${this.config.coverageThreshold}`);
                break;
            }
            // Plateau detection
            if (Math.abs(state.readyScore - previousReadyScore) < 0.01) {
                plateauCount++;
                if (plateauCount >= 2) {
                    log.warn(`Plateau detected (< 1% improvement for 2 iterations)`);
                    liveDisplay.logEvent('  Plateau detected — no improvement in last 2 iterations, stopping early');
                    break;
                }
            }
            else {
                plateauCount = 0;
            }
            previousReadyScore = state.readyScore;
            // Emit progress
            if (onProgress) {
                onProgress(state);
            }
            // Gap analysis (if not final iteration)
            if (i < this.config.maxIterations) {
                state.gaps = await this.analyzeGaps(plan, state.findings);
                log.info(`Identified ${state.gaps.length} gaps`);
            }
        }
        const totalSources = Array.from(state.findings.values()).reduce((n, f) => n + f.sources.length, 0);
        liveDisplay.setAgentStatus('Synthesis', `Synthesizing ${totalSources} sources into report...`);
        liveDisplay.logEvent(`\n  Research complete — ready score: ${state.readyScore.toFixed(2)}, ${state.iteration} iteration(s)`);
        log.info(`Research complete. Ready score: ${state.readyScore.toFixed(2)}, Iterations: ${state.iteration}`);
        // Flush any pending embeddings so semantic search works in synthesis
        await context1Service.flush();
        // PHASE 5: SYNTHESIS — write final markdown report
        try {
            const report = await this.synthesize(state, task.id);
            state.report = report;
        }
        catch (err) {
            log.warn('Synthesis failed:', err);
            // Fallback: generate minimal report from available data
            const totalFacts = Array.from(state.findings.values()).reduce((n, f) => n + f.facts.length, 0);
            const totalSources = Array.from(state.findings.values()).reduce((n, f) => n + f.sources.length, 0);
            state.report = `# Research Report: ${task.question}

**Generated:** ${new Date().toISOString()}
**Status:** Synthesis failed, showing gathered findings
**Sections:** ${state.plan.sections.length}
**Total Facts:** ${totalFacts}
**Total Sources:** ${totalSources}
**Coverage:** ${state.coverage.toFixed(0)}%

## Findings Summary

${Array.from(state.findings.entries())
                .filter(([_, f]) => f.researched)
                .map(([_, f]) => `### ${f.sectionTitle}\n\n- **Facts:** ${f.facts.length}\n- **Sources:** ${f.sources.length}`)
                .join('\n\n')}

*Note: Full section synthesis was unavailable; see detailed findings in structured data.*`;
        }
        liveDisplay.clearAgent('Synthesis');
        return state;
    }
    // ─────────────────────────────────────────────────────────────
    // PHASE 5: SYNTHESIS
    // ─────────────────────────────────────────────────────────────
    /**
     * Synthesize all section findings into a final markdown report.
     * Uses hierarchical summarization: section summaries → final report.
     */
    async synthesize(state, taskId) {
        const { plan, findings } = state;
        liveDisplay.setAgentStatus('Synthesis', 'Writing section summaries...');
        // Step 1: Summarize all sections in parallel
        const sectionsToSummarize = plan.sections
            .map(section => ({ section, f: findings.get(section.id) }))
            .filter(({ f }) => f && f.researched && f.facts.length > 0);
        const sectionSummaryResults = await Promise.all(sectionsToSummarize.map(async ({ section, f }) => {
            // Use INSIGHT-tagged facts first (from reasoning layer), then supporting facts
            const insightFacts = f.facts.filter(fa => fa.startsWith('[INSIGHT]'));
            const contradictions = f.facts.filter(fa => fa.startsWith('[CONTRADICTION]'));
            const regularFacts = f.facts.filter(fa => !fa.startsWith('[INSIGHT]') && !fa.startsWith('[CONTRADICTION]'));
            const factsText = [
                ...insightFacts.slice(0, 5),
                ...regularFacts.slice(0, 25),
                ...contradictions.slice(0, 3)
            ].map((fact, i) => `${i + 1}. ${fact}`).join('\n');
            const analysisBlock = f.analysis ? `
ANALYTICAL INSIGHTS (pre-computed):
- Key insights: ${f.analysis.keyInsights.join(' | ')}
- Contradictions found: ${f.analysis.contradictions.join(' | ') || 'none'}
- Implications: ${f.analysis.implications.join(' | ')}
- Still unknown: ${f.analysis.gaps.join(' | ')}
` : '';
            const sourcesText = f.sources.slice(0, 10).join('\n  - ');
            const sectionPrompt = `Write a rigorous research section on "${section.title}" for a practitioner audience.
${analysisBlock}
EVIDENCE BASE (${f.facts.length} facts from ${f.sources.length} sources):
${factsText}

SOURCES:
  - ${sourcesText}

Requirements:
- Lead with the most important non-obvious insight, not a definition
- Integrate the contradictions and tensions — don't smooth them over
- Be specific: name frameworks, cite numbers, reference real implementations
- End with clear practical takeaways
- 4-6 paragraphs of flowing prose. No bullet lists.`;
            try {
                liveDisplay.setAgentStatus(`Synthesis:${section.title.slice(0, 20)}`, 'Writing...');
                const summary = await ollamaService.generateStream(sectionPrompt, SYNTHESIS_MODEL, {
                    temperature: 0.5,
                    num_ctx: 8192
                });
                liveDisplay.clearAgent(`Synthesis:${section.title.slice(0, 20)}`);
                return `## ${section.title}\n\n${summary}`;
            }
            catch (err) {
                log.warn(`Section synthesis failed for ${section.title}:`, err);
                liveDisplay.clearAgent(`Synthesis:${section.title.slice(0, 20)}`);
                return `## ${section.title}\n\n${f.facts.slice(0, 10).map(fact => `- ${fact}`).join('\n')}`;
            }
        }));
        const sectionSummaries = sectionSummaryResults;
        // Step 2: Cross-section synthesis — find connections between sections, then executive summary
        liveDisplay.setAgentStatus('Synthesis', 'Cross-section analysis...');
        // Gather all insights from the reasoning layer across all sections
        const allInsights = Array.from(findings.values())
            .filter(f => f.analysis)
            .flatMap(f => [
            ...f.analysis.keyInsights.map(i => `INSIGHT: ${i}`),
            ...f.analysis.contradictions.map(c => `TENSION: ${c}`),
            ...f.analysis.implications.map(i => `IMPLICATION: ${i}`)
        ]);
        const allFacts = Array.from(findings.values())
            .flatMap(f => f.facts.filter(fa => fa.startsWith('[INSIGHT]') || fa.startsWith('[CONTRADICTION]')))
            .slice(0, 20);
        const executiveSummaryPrompt = `You are writing the executive summary for a deep research report on:

"${plan.question}"

The research covered ${plan.sections.length} sections and analyzed ${Array.from(findings.values()).reduce((n, f) => n + f.sources.length, 0)} sources. Here are the key analytical findings across all sections:

${[...allInsights, ...allFacts].slice(0, 25).map((f, i) => `${i + 1}. ${f}`).join('\n')}

Write a 4-5 paragraph executive summary that:
1. Opens with the single most important finding (not a description of what was researched)
2. Synthesizes insights ACROSS sections — what emerges from combining all the research?
3. Names the key tensions and unresolved debates in this space
4. Gives 3-5 concrete, specific recommendations a practitioner can act on today
5. Closes with what this means for the field 12-24 months from now

This should read like a McKinsey brief or Nature editorial — sharp, opinionated, evidence-backed. No hedging, no vague generalities.`;
        let executiveSummary = '';
        try {
            executiveSummary = await ollamaService.generateStream(executiveSummaryPrompt, SYNTHESIS_MODEL, {
                temperature: 0.5,
                num_ctx: 8192
            });
        }
        catch (err) {
            log.warn('Executive summary failed:', err);
            executiveSummary = `Research on "${plan.question}" gathered ${Array.from(findings.values()).reduce((n, f) => n + f.facts.length, 0)} facts from ${Array.from(findings.values()).reduce((n, f) => n + f.sources.length, 0)} sources across ${plan.sections.length} sections.`;
        }
        // Step 3: Assemble full report
        const totalFacts = Array.from(findings.values()).reduce((n, f) => n + f.facts.length, 0);
        const totalSources = Array.from(findings.values()).reduce((n, f) => n + f.sources.length, 0);
        const allSources = Array.from(new Set(Array.from(findings.values()).flatMap(f => f.sources))).slice(0, 50);
        const report = `# Research Report: ${plan.question}

**Generated:** ${new Date().toISOString()}
**Sections:** ${plan.sections.length}
**Total Facts:** ${totalFacts}
**Total Sources:** ${totalSources}
**Coverage:** ${state.coverage.toFixed(0)}%
**Iterations:** ${state.iteration}

---

## Executive Summary

${executiveSummary}

---

${sectionSummaries.join('\n\n---\n\n')}

---

## Sources

${allSources.map((s, i) => `${i + 1}. ${s}`).join('\n')}
`;
        // Save report to disk
        if (taskId) {
            try {
                await storageService.saveReport(taskId, report);
                log.info(`Report saved to ~/research-output/${taskId}/report.md`);
                liveDisplay.logEvent(`  Report saved: ~/research-output/${taskId}/report.md`);
            }
            catch (err) {
                log.warn('Failed to save report:', err);
            }
        }
        return report;
    }
    close() {
        this.agentPool.close();
    }
}
//# sourceMappingURL=orchestrator.js.map