/**
 * Command: racks intake
 *
 * Pre-research clarifying questions for marketing/brand research.
 * Gathers brand context, audience, competitors, and depth before starting.
 */
export interface IntakeAnswers {
    brandUrl?: string;
    productName?: string;
    targetAudience?: string;
    competitors?: string[];
    focusAreas?: string[];
    depth: 'quick' | 'standard' | 'deep';
    youtubeUrls?: string[];
}
/**
 * Interactive intake flow. Asks 5 clarifying questions, shows a summary,
 * and confirms before returning the answers.
 *
 * Returns IntakeAnswers or null if the user cancels.
 */
export declare function runIntake(): Promise<IntakeAnswers | null>;
/**
 * Merge intake data into a research question string, adding audience,
 * competitor, and brand context as additional sentences.
 *
 * Example:
 *   question = "What makes customers buy collagen supplements?"
 *   → "What makes customers buy collagen supplements? [Context: target
 *      audience is Women 25-45. Key competitors: Vital Proteins, Sports
 *      Research. Brand URL: https://example.com]"
 */
export declare function enhanceQuestionWithIntake(question: string, intake: IntakeAnswers): string;
//# sourceMappingURL=intake.d.ts.map