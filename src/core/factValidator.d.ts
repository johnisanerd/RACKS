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
export interface ValidatedFact {
    id: string;
    claim: string;
    evidence: EvidenceItem[];
    confidence: number;
    confidenceInterval?: {
        low: number;
        high: number;
    };
    status: 'validated' | 'contradicted' | 'unverified' | 'mixed';
    relatedFacts: string[];
    reasoning: string;
    warnings?: string[];
}
export interface EvidenceItem {
    source: string;
    url?: string;
    claim: string;
    strength: 'strong' | 'moderate' | 'weak';
    date?: string;
}
export interface FactValidationResult {
    validatedFacts: ValidatedFact[];
    contradictionGroups: FactContradiction[];
    evidenceChains: EvidenceChain[];
    summary: string;
}
export interface FactContradiction {
    groupId: string;
    facts: Array<{
        id: string;
        claim: string;
        sources: number;
    }>;
    potentialExplanations: string[];
    suggestedResearch: string;
    confidence: number;
}
export interface EvidenceChain {
    premise: string;
    intermediate: string;
    conclusion: string;
    strength: number;
}
/**
 * Validate facts against each other, detect contradictions and evidence chains
 */
export declare function validateFacts(facts: Array<{
    id: string;
    claim: string;
    source: string;
    url?: string;
}>, domain: string): Promise<FactValidationResult>;
//# sourceMappingURL=factValidator.d.ts.map