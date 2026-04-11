/**
 * PHASE 5: Report Synthesis
 *
 * Transforms findings into a coherent research report.
 * Writes section summaries and generates an executive summary.
 */
import { ollamaService } from '../../services/ollama.js';
import { storageService } from '../../services/storageService.js';
import { createLogger } from '../../utils/logger.js';
import { liveDisplay } from '../../utils/liveDisplay.js';
import { getModel } from '../../config/models.js';
const log = createLogger('synthesizer');
// ─────────────────────────────────────────────────────────────
// SYNTHESIS
// ─────────────────────────────────────────────────────────────
/**
 * Synthesize research findings into a complete report.
 * Combines section summaries with an executive summary and bibliography.
 */
export async function synthesizeReport(state, taskId) {
    const { plan, findings } = state;
    const SYNTHESIS_MODEL = getModel('synthesis');
    liveDisplay.setAgentStatus('Synthesis', 'Writing section summaries...');
    // Step 1: Summarize all sections in parallel
    const sectionsToSummarize = plan.sections
        .map(section => ({ section, f: findings.get(section.id) }))
        .filter(({ f }) => f && f.researched && f.facts.length > 0);
    const sectionSummaryResults = await Promise.all(sectionsToSummarize.map(async ({ section, f }) => {
        // Prioritize insights from reasoning layer
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
            // Fallback: list facts as bullet points
            return `## ${section.title}\n\n${f.facts.slice(0, 10).map(fact => `- ${fact}`).join('\n')}`;
        }
    }));
    const sectionSummaries = sectionSummaryResults;
    // Step 2: Cross-section synthesis and executive summary
    liveDisplay.setAgentStatus('Synthesis', 'Cross-section analysis...');
    // Gather all insights and tensions from reasoning layer
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
    const totalSources = Array.from(findings.values()).reduce((n, f) => n + f.sources.length, 0);
    const executiveSummaryPrompt = `You are writing the executive summary for a deep research report on:

"${plan.question}"

The research covered ${plan.sections.length} sections and analyzed ${totalSources} sources. Here are the key analytical findings across all sections:

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
        const factCount = Array.from(findings.values()).reduce((n, f) => n + f.facts.length, 0);
        executiveSummary = `Research on "${plan.question}" gathered ${factCount} facts from ${totalSources} sources across ${plan.sections.length} sections.`;
    }
    // Step 3: Assemble full report
    const totalFacts = Array.from(findings.values()).reduce((n, f) => n + f.facts.length, 0);
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
    liveDisplay.clearAgent('Synthesis');
    return report;
}
/**
 * Format research findings as a simple text summary (for logging/display).
 */
export function formatFindingsSummary(findings) {
    const lines = [];
    for (const [sectionId, f] of findings) {
        lines.push(`${f.sectionTitle}: ${f.facts.length} facts, ${f.sources.length} sources, confidence: ${f.confidence.toFixed(2)}`);
    }
    return lines.join('\n');
}
//# sourceMappingURL=synthesizer.js.map