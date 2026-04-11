/**
 * Pre-Research Questioner
 *
 * Analyzes research topic complexity and asks adaptive clarifying questions
 * to narrow scope before deep research begins.
 *
 * Helps prevent overly broad research and ensures focused results.
 */
import { ollamaService } from '../services/ollama.js';
import { createLogger } from './logger.js';
const log = createLogger('preResearchQuestioner');
/**
 * Analyze topic complexity and generate adaptive clarifying questions.
 * More complex topics = fewer, more targeted questions.
 * Simple topics = maybe skip questions entirely.
 */
export async function analyzeTopicAndGenerateQuestions(researchQuestion, skipQuestions = false) {
    if (skipQuestions) {
        return {
            analysis: {
                complexity: 'moderate',
                scope: 'broad',
                numQuestions: 0,
                questions: []
            },
            answers: {}
        };
    }
    try {
        log.info('Analyzing topic complexity...');
        // Analyze complexity and scope
        const complexityPrompt = `Analyze this research question for complexity and scope:

"${researchQuestion}"

Return JSON with:
{
  "complexity": "simple|moderate|complex",
  "scope": "narrow|broad|very-broad",
  "reasoning": "1-2 sentence explanation",
  "recommendedQuestions": number (1-4, higher for simpler/broader topics)
}

Be strict: simple = 1 variable, narrow scope. Complex = 3+ variables, deep expertise needed.`;
        const complexityResponse = await ollamaService.generateStream(complexityPrompt, 'gemma4:e2b', { temperature: 0.5, num_predict: 256 });
        const complexityData = parseJson(complexityResponse);
        const numQuestions = complexityData.recommendedQuestions || 2;
        const complexity = complexityData.complexity || 'moderate';
        const scope = complexityData.scope || 'broad';
        log.info(`Topic analysis: ${complexity} complexity, ${scope} scope → ${numQuestions} clarifying questions`);
        // Generate clarifying questions only if needed
        if (numQuestions === 0) {
            return {
                analysis: {
                    complexity,
                    scope,
                    numQuestions: 0,
                    questions: []
                },
                answers: {}
            };
        }
        const questionsPrompt = `Generate ${numQuestions} clarifying questions to narrow scope for this research:

"${researchQuestion}"

For each question, provide:
1. A brief, focused question (8-15 words)
2. 3-4 practical options
3. Why it matters (1 sentence)

Focus on:
- Technical vs non-technical scope
- Industry/domain specificity
- Time frame (current vs historical)
- Implementation context (research vs production)
- Audience level (beginner vs expert)

Return as JSON:
{
  "questions": [
    {
      "question": "...",
      "options": ["option 1", "option 2", "option 3"],
      "context": "Why this matters"
    }
  ]
}`;
        const questionsResponse = await ollamaService.generateStream(questionsPrompt, 'gemma4:e2b', { temperature: 0.6, num_predict: 512 });
        const questionsData = parseJson(questionsResponse);
        const questions = questionsData.questions || [];
        return {
            analysis: {
                complexity,
                scope,
                numQuestions: questions.length,
                questions
            }
        };
    }
    catch (error) {
        log.warn('Topic analysis failed, using defaults:', error);
        return {
            analysis: {
                complexity: 'moderate',
                scope: 'broad',
                numQuestions: 0,
                questions: []
            },
            answers: {}
        };
    }
}
/**
 * Parse JSON with fallbacks for model output variations.
 */
function parseJson(raw) {
    // Try raw first
    try {
        return JSON.parse(raw);
    }
    catch { }
    // Strip code fences
    const fenceStripped = raw
        .replace(/^```(?:json)?\s*/im, '')
        .replace(/```\s*$/m, '')
        .trim();
    try {
        return JSON.parse(fenceStripped);
    }
    catch { }
    // Greedy object match
    const greedyObj = raw.match(/\{[\s\S]*\}/);
    if (greedyObj) {
        try {
            return JSON.parse(greedyObj[0]);
        }
        catch { }
    }
    throw new Error(`Failed to parse JSON from: ${raw.substring(0, 100)}`);
}
/**
 * Format questions for CLI display
 */
export function formatQuestionsForDisplay(questions) {
    if (questions.length === 0)
        return '';
    const lines = ['\n📋 Clarifying Questions (helps narrow scope):'];
    questions.forEach((q, i) => {
        lines.push(`\n${i + 1}. ${q.question}`);
        lines.push(`   ${q.context}`);
        q.options.forEach((opt, j) => {
            lines.push(`   ${String.fromCharCode(97 + j)}) ${opt}`);
        });
    });
    return lines.join('\n');
}
//# sourceMappingURL=preResearchQuestioner.js.map