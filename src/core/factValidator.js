/**
 * Fact Validator — Cross-Validate Claims & Detect Contradictions
 *
 * Instead of just deduplication, validates facts against each other:
 * - "Results 2 weeks" + "New formula" + "Old formula results 6 weeks" = coherent
 * - "All positive" + "But taste sucks" = contradiction
 * - "Safe to use" + "Side effects reported" = contradiction needing investigation
 *
 * Outputs: Validated facts with evidence chains + confidence intervals
 */
import { createLogger } from '../utils/logger.js';
import { ollamaService } from '../services/ollama.js';
import { getModel } from '../config/models.js';
const log = createLogger('factValidator');
/**
 * Validate facts against each other, detect contradictions and evidence chains
 */
export async function validateFacts(facts, domain) {
    log.info(`Validating ${facts.length} facts in domain: ${domain}`);
    // Group similar facts
    const factGroups = await groupSimilarFacts(facts);
    // Validate each group
    const validatedFacts = [];
    const contradictions = [];
    for (const [groupId, group] of factGroups) {
        const validated = await validateFactGroup(group);
        validatedFacts.push(...validated.facts);
        if (validated.contradiction) {
            contradictions.push(validated.contradiction);
        }
    }
    // Find evidence chains (A supports B, B supports C)
    const chains = findEvidenceChains(validatedFacts);
    // Generate summary
    const summary = generateSummary(validatedFacts, contradictions, chains);
    return {
        validatedFacts,
        contradictionGroups: contradictions,
        evidenceChains: chains,
        summary
    };
}
/**
 * Group similar facts together for validation
 */
async function groupSimilarFacts(facts) {
    const groups = new Map();
    // Simple grouping by first 10 keywords
    for (const fact of facts) {
        const keywords = fact.claim
            .toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 4)
            .slice(0, 5)
            .join(' ');
        if (!groups.has(keywords)) {
            groups.set(keywords, []);
        }
        groups.get(keywords).push(fact);
    }
    return groups;
}
/**
 * Validate a group of similar facts
 */
async function validateFactGroup(factGroup) {
    if (factGroup.length === 0) {
        return { facts: [] };
    }
    // If only one fact, mark as unverified
    if (factGroup.length === 1) {
        const fact = factGroup[0];
        return {
            facts: [{
                    id: fact.id,
                    claim: fact.claim,
                    evidence: [{ source: fact.source, claim: fact.claim, strength: 'weak' }],
                    confidence: 0.4, // Single source = lower confidence
                    status: 'unverified',
                    relatedFacts: [],
                    reasoning: 'Only one source found',
                    warnings: ['Single source only']
                }]
        };
    }
    // Multiple sources: validate coherence
    const PLANNING_MODEL = getModel('planning');
    const prompt = `Validate and reconcile these claims about the same topic:

${factGroup.map((f, i) => `${i + 1}. "${f.claim}" (source: ${f.source})`).join('\n')}

Are these claims:
A) Consistent with each other (same truth, different wording)?
B) Complementary (different aspects of same truth)?
C) Contradictory (cannot both be true)?
D) Mixed (some consistent, some contradictory)?

For each claim, provide:
1. Confidence (0-1): How likely is this claim true?
2. Evidence strength: weak/moderate/strong based on source type
3. Reasoning: Why this confidence?
4. Warnings: Any red flags (only one source, source bias, etc.)?
5. Related claims: How does this relate to other claims?

Format as JSON array for each claim, with keys: confidence, strength, reasoning, warnings, relatedTo, status`;
    try {
        const response = await ollamaService.generateStream(prompt, PLANNING_MODEL, { temperature: 0.7 });
        const parsed = parseValidationResponse(response, factGroup);
        return parsed;
    }
    catch (err) {
        log.warn(`Validation failed, using simple heuristic:`, err);
        return simpleValidation(factGroup);
    }
}
/**
 * Parse LLM validation response
 */
function parseValidationResponse(response, factGroup) {
    try {
        // Extract JSON from response
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            return simpleValidation(factGroup);
        }
        const parsed = JSON.parse(jsonMatch[0]);
        const facts = [];
        let hasContradiction = false;
        const contradictingIds = [];
        for (let i = 0; i < parsed.length && i < factGroup.length; i++) {
            const p = parsed[i];
            const fact = factGroup[i];
            const isContradicted = p.status === 'contradicted';
            facts.push({
                id: fact.id,
                claim: fact.claim,
                evidence: [
                    {
                        source: fact.source,
                        url: fact.url,
                        claim: fact.claim,
                        strength: p.strength || 'moderate'
                    }
                ],
                confidence: p.confidence || 0.5,
                status: p.status || 'unverified',
                relatedFacts: p.relatedTo || [],
                reasoning: p.reasoning || 'Multi-source validation',
                warnings: p.warnings
            });
            if (isContradicted) {
                hasContradiction = true;
                contradictingIds.push(fact.id);
            }
        }
        // If contradictions found, create contradiction group
        let contradiction;
        if (hasContradiction && contradictingIds.length > 1) {
            contradiction = {
                groupId: `contradiction-${Date.now()}`,
                facts: facts
                    .filter(f => contradictingIds.includes(f.id))
                    .map(f => ({
                    id: f.id,
                    claim: f.claim,
                    sources: f.evidence.length
                })),
                potentialExplanations: suggestExplanations(facts),
                suggestedResearch: 'Investigate timeline and context changes',
                confidence: 0.7
            };
        }
        return { facts, contradiction };
    }
    catch (err) {
        log.warn(`Parse error, using simple validation`, err);
        return simpleValidation(factGroup);
    }
}
/**
 * Fallback: Simple validation when LLM parsing fails
 */
function simpleValidation(factGroup) {
    const facts = factGroup.map(fact => ({
        id: fact.id,
        claim: fact.claim,
        evidence: [{ source: fact.source, claim: fact.claim, strength: 'moderate' }],
        confidence: Math.min(0.8, 0.5 + factGroup.length * 0.1), // More sources = higher confidence
        status: 'unverified',
        relatedFacts: [],
        reasoning: `${factGroup.length} sources found`,
        warnings: factGroup.length === 1 ? ['Single source only'] : undefined
    }));
    return { facts };
}
/**
 * Find evidence chains where A supports B supports C
 */
function findEvidenceChains(facts) {
    const chains = [];
    // Look for causal patterns
    const causalPatterns = [
        { pattern: /(\w+)\s+\w*cause\w*\s+(\w+)/, premise: 1, conclusion: 2 },
        { pattern: /(\w+)\s+\w*lead\w*\s+(\w+)/, premise: 1, conclusion: 2 },
        { pattern: /(\w+)\s+\w*result\w*\s+(\w+)/, premise: 1, conclusion: 2 }
    ];
    for (let i = 0; i < facts.length; i++) {
        for (let j = 0; j < facts.length; j++) {
            if (i === j)
                continue;
            const fact1 = facts[i].claim;
            const fact2 = facts[j].claim;
            // Check if fact1 might support fact2
            const support = calculateSupport(fact1, fact2);
            if (support > 0.5) {
                chains.push({
                    premise: fact1,
                    intermediate: fact2,
                    conclusion: `Therefore, ${fact2} is likely true`,
                    strength: support
                });
            }
        }
    }
    return chains;
}
/**
 * Calculate how much one fact supports another
 */
function calculateSupport(fact1, fact2) {
    const lower1 = fact1.toLowerCase();
    const lower2 = fact2.toLowerCase();
    // Count shared words
    const words1 = new Set(lower1.split(/\s+/));
    const words2 = new Set(lower2.split(/\s+/));
    const shared = Array.from(words1).filter(w => words2.has(w)).length;
    const maxWords = Math.max(words1.size, words2.size);
    return maxWords > 0 ? shared / maxWords : 0;
}
/**
 * Suggest explanations for contradictions
 */
function suggestExplanations(facts) {
    return [
        'Formula or product changed (timeline mismatch)',
        'Different market segments (e.g., new users vs experienced)',
        'Source bias (some sources more credible than others)',
        'Time-dependent (e.g., availability changed)',
        'Context-dependent (conditions affect outcome)'
    ];
}
/**
 * Generate human-readable summary
 */
function generateSummary(facts, contradictions, chains) {
    const validated = facts.filter(f => f.status === 'validated').length;
    const contradicted = facts.filter(f => f.status === 'contradicted').length;
    const unverified = facts.filter(f => f.status === 'unverified').length;
    let summary = `\n## Fact Validation Summary\n`;
    summary += `- Validated: ${validated} (${(validated / facts.length * 100).toFixed(0)}%)\n`;
    summary += `- Contradicted: ${contradicted}\n`;
    summary += `- Unverified: ${unverified}\n`;
    if (contradictions.length > 0) {
        summary += `\n**⚠️ Contradictions Found:** ${contradictions.length}\n`;
        for (const c of contradictions) {
            summary += `  - ${c.facts.map(f => `"${f.claim}"`).join(' vs ')}\n`;
            summary += `    Explanations: ${c.potentialExplanations.slice(0, 2).join(', ')}\n`;
        }
    }
    if (chains.length > 0) {
        summary += `\n**Evidence Chains:** ${chains.length}\n`;
        for (const chain of chains.slice(0, 3)) {
            summary += `  ${chain.premise} → ${chain.intermediate}\n`;
        }
    }
    return summary;
}
//# sourceMappingURL=factValidator.js.map