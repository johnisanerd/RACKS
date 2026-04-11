/**
 * Command: racks ask-file
 *
 * Research from a markdown document containing questions, constraints, and resource URLs.
 * Usage: racks ask-file <path/to/document.md>
 *
 * Document format:
 * # Research Brief
 *
 * ## Question
 * What are the latest trends in AI safety?
 *
 * ## Sub-questions
 * - What are the main challenges?
 * - Which organizations are leading?
 *
 * ## Constraints
 * Time: 60m
 * Depth: extended
 * MinConfidence: 0.7
 *
 * ## Resources
 * https://arxiv.org/...
 * https://github.com/...
 */
/**
 * Execute ask-file command
 */
export declare function commandAskFile(args: string[]): Promise<void>;
//# sourceMappingURL=askFile.d.ts.map