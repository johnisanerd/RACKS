/**
 * PHASE 3: Reflection & Gap Analysis
 *
 * Analyzes coverage, identifies gaps, and determines if more research is needed.
 */
import { ollamaService } from '../../services/ollama.js';
import { createLogger } from '../../utils/logger.js';
import { liveDisplay } from '../../utils/liveDisplay.js';
import { getModel } from '../../config/models.js';
const log = createLogger('reflector');
// ─────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────
/**
 * Parse JSON with robust error handling (same as other phases).
 */
function parseJson(raw) {
    if (!raw || raw.length === 0) {
        throw new SyntaxError('parseJson: empty input');
    }
    try {
        const parsed = JSON.parse(raw);
        if (parsed !== null && parsed !== undefined)
            return parsed;
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
            const parsed = JSON.parse(fenceStripped);
            if (parsed !== null && parsed !== undefined)
                return parsed;
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
// GAP ANALYSIS
// ─────────────────────────────────────────────────────────────
/**
 * Analyze coverage and identify gaps based on initial findings.
 * Returns list of gaps that should trigger additional research.
 */
export async function analyzeGaps(plan, findings) {
    const gaps = [];
    let coverageCount = 0;
    liveDisplay.setAgentStatus('Reflection', 'Analyzing coverage gaps...');
    // Check which sections have been researched and their confidence levels
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
    // Run deep reflection agent to detect non-obvious gaps
    const reflectionGaps = await runReflectionAgent(plan, findings);
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
 * Run deep reflection on all findings to detect non-obvious gaps.
 * Acts as a devil's advocate and coverage auditor.
 */
async function runReflectionAgent(plan, findings) {
    liveDisplay.setAgentStatus('Reflection', 'Running deep reflection on all findings...');
    const EXTRACTION_MODEL = getModel('extraction');
    // Build summary with top facts, confidence, and source count
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
    const response = await ollamaService.generateStream(prompt, EXTRACTION_MODEL, { temperature: 0.5, num_predict: 512 });
    try {
        const result = parseJson(response);
        if (!Array.isArray(result.gaps)) {
            log.warn('Reflection output missing or invalid gaps array, returning empty gaps');
            return [];
        }
        return result.gaps;
    }
    catch (err) {
        log.warn(`Failed to parse reflection output: ${err instanceof Error ? err.message : String(err)}`);
        log.debug(`Raw response (first 500 chars): ${response.substring(0, 500)}`);
        return [];
    }
}
/**
 * Calculate overall research coverage (0-1 scale).
 */
export function calculateCoverage(plan, findings) {
    let researchedCount = 0;
    for (const section of plan.sections) {
        const sectionFindings = findings.get(section.id);
        if (sectionFindings?.researched) {
            researchedCount++;
        }
    }
    return researchedCount / plan.sections.length;
}
/**
 * Calculate overall confidence across all sections.
 */
export function calculateConfidence(plan, findings) {
    const confidences = plan.sections
        .map(s => findings.get(s.id)?.confidence || 0)
        .filter(c => c > 0);
    if (confidences.length === 0)
        return 0;
    return confidences.reduce((sum, c) => sum + c, 0) / confidences.length;
}
/**
 * Determine if research should continue based on coverage and confidence.
 */
export function shouldContinueResearch(plan, findings, gaps, iteration, maxIterations, coverageThreshold = 0.8) {
    const coverage = calculateCoverage(plan, findings);
    const confidence = calculateConfidence(plan, findings);
    // Stop if max iterations reached
    if (iteration >= maxIterations) {
        log.info(`Max iterations (${maxIterations}) reached`);
        return false;
    }
    // Stop if we've achieved good coverage and confidence
    if (coverage >= coverageThreshold && confidence >= 0.7 && gaps.length === 0) {
        log.info(`Coverage and confidence thresholds met (${(coverage * 100).toFixed(0)}% coverage, ${(confidence).toFixed(2)} confidence)`);
        return false;
    }
    // Continue if there are gaps to fill
    if (gaps.length > 0) {
        log.info(`${gaps.length} gap(s) found, continuing research...`);
        return true;
    }
    // Continue if coverage is below threshold
    if (coverage < coverageThreshold) {
        log.info(`Coverage below threshold (${(coverage * 100).toFixed(0)}% < ${(coverageThreshold * 100).toFixed(0)}%), continuing...`);
        return true;
    }
    return false;
}
//# sourceMappingURL=reflector.js.map