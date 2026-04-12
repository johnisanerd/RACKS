/**
 * Command: racks query
 *
 * Ask follow-up questions about previous research using Context-1 production harness.
 * Context-1 runs an observe-reason-act loop over the stored findings corpus,
 * doing multi-hop hybrid search (BM25 + dense vectors) to surface relevant evidence.
 *
 * Usage: racks query <task-id> "Your question here?"
 */
export declare function commandQuery(args: string[]): Promise<void>;
//# sourceMappingURL=query.d.ts.map