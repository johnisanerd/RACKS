/**
 * Pre-Research Questioner
 *
 * Analyzes research topic complexity and asks adaptive clarifying questions
 * to narrow scope before deep research begins.
 *
 * Helps prevent overly broad research and ensures focused results.
 */
export interface ClarifyingQuestion {
    question: string;
    options: string[];
    context: string;
}
export interface TopicAnalysis {
    complexity: 'simple' | 'moderate' | 'complex';
    scope: 'narrow' | 'broad' | 'very-broad';
    numQuestions: number;
    questions: ClarifyingQuestion[];
}
/**
 * Analyze topic complexity and generate adaptive clarifying questions.
 * More complex topics = fewer, more targeted questions.
 * Simple topics = maybe skip questions entirely.
 */
export declare function analyzeTopicAndGenerateQuestions(researchQuestion: string, skipQuestions?: boolean): Promise<{
    analysis: TopicAnalysis;
    answers?: Record<string, string>;
}>;
/**
 * Format questions for CLI display
 */
export declare function formatQuestionsForDisplay(questions: ClarifyingQuestion[]): string;
//# sourceMappingURL=preResearchQuestioner.d.ts.map