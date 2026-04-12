/**
 * Command: racks ask
 *
 * Broad research on a topic with automatic decomposition and synthesis.
 *
 * Flow:
 *   1. If no --no-intake flag: run interactive intake (brand, audience, competitors, depth)
 *   2. Confirm research plan with user
 *   3. Run orchestrator (plan → research → reflect → synthesize)
 *   4. Print report path + quick summary
 *
 * Usage:
 *   racks ask --question "What are trends in collagen supplements?"
 *   racks ask --question "..." --time "2h" --depth "extended"
 *   racks ask --question "..." --no-intake   # skip clarifying questions
 */
export declare function commandAsk(args: string[]): Promise<void>;
//# sourceMappingURL=ask.d.ts.map