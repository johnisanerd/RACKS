/**
 * Fact Deduplication — Remove duplicate findings across research sections
 *
 * Uses hashing and semantic similarity to identify and remove duplicate facts.
 * Keeps the highest-confidence version of each fact.
 */
export interface DedupResult {
    originalCount: number;
    deduplicatedCount: number;
    duplicatesRemoved: number;
    removedFacts: string[];
}
/**
 * Deduplicate facts within a single section
 */
export declare function deduplicateFactsInSection(facts: string[], similarityThreshold?: number): DedupResult;
/**
 * Deduplicate facts across multiple sections
 * Keeps facts from earlier sections, deduplicates against them
 * Uses SHA256 hashing for fast deduplication. For semantic deduplication,
 * use Context-1 embeddings service (future enhancement).
 */
export declare function deduplicateFactsAcrossSections(sectionFacts: Map<string, string[]>, similarityThreshold?: number): Map<string, string[]>;
/**
 * Get deduplication statistics
 */
export declare function getDeduplicationStats(original: Map<string, string[]>, deduplicated: Map<string, string[]>): {
    originalTotal: number;
    deduplicatedTotal: number;
    removed: number;
    ratio: string;
};
//# sourceMappingURL=deduplication.d.ts.map