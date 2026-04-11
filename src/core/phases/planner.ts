/**
 * PHASE 1: Research Planning
 *
 * Decomposes a research question into logical sections/subtopics.
 * Each section becomes a unit of research that can be assigned to subagents.
 */

import { ollamaService } from '../../services/ollama.js';
import { createLogger } from '../../utils/logger.js';
import { liveDisplay } from '../../utils/liveDisplay.js';
import { validateQueriesBatch } from '../../utils/searchQueryValidator.js';
import { getModel } from '../../config/models.js';

const log = createLogger('planner');

// ─────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────

export interface ResearchSection {
  id: string;
  title: string;
  description: string;
  keyQuestions: string[];
  priority: 'high' | 'medium' | 'low';
}

export interface ResearchPlan {
  question: string;
  sections: ResearchSection[];
  totalEstimatedSources: number;
  researchStrategy: string;
}

// ─────────────────────────────────────────────────────────────
// UTILITY
// ─────────────────────────────────────────────────────────────

/**
 * Strip markdown code fences and parse JSON with robust error handling.
 */
function parseJson<T>(raw: string): T {
  if (!raw || raw.length === 0) {
    throw new SyntaxError('parseJson: empty input');
  }

  // 1. Try raw first (fastest path)
  try {
    const parsed = JSON.parse(raw);
    if (parsed !== null && parsed !== undefined) return parsed as T;
  } catch {}

  // 2. Strip leading/trailing code fences and whitespace
  const fenceStripped = raw
    .replace(/^```(?:json)?\s*/im, '')
    .replace(/```\s*$/m, '')
    .replace(/^[\s\n]+/, '')
    .replace(/[\s\n]+$/, '')
    .trim();

  if (fenceStripped.length > 0) {
    try {
      const parsed = JSON.parse(fenceStripped);
      if (parsed !== null && parsed !== undefined) return parsed as T;
    } catch {}
  }

  // 3. Try to find JSON by matching brackets (prefer arrays first, then objects)
  const greedyArray = raw.match(/\[\s*[\s\S]*\s*\]/);
  if (greedyArray) {
    try {
      return JSON.parse(greedyArray[0]) as T;
    } catch {}
  }

  // 4. Greedy object match
  const greedyObj = raw.match(/\{\s*[\s\S]*\s*\}/);
  if (greedyObj) {
    try {
      return JSON.parse(greedyObj[0]) as T;
    } catch {}
  }

  // 5. Last resort: find last complete array/object
  const lastArray = raw.match(/(\[\s*[\s\S]*?\s*\])\s*$/);
  if (lastArray) {
    try {
      return JSON.parse(lastArray[1]) as T;
    } catch {}
  }

  const lastObj = raw.match(/(\{\s*[\s\S]*?\s*\})\s*$/);
  if (lastObj) {
    try {
      return JSON.parse(lastObj[1]) as T;
    } catch {}
  }

  log.error(`parseJson failed. Input (first 500 chars): ${raw.substring(0, 500)}`);
  throw new SyntaxError(`parseJson: no valid JSON found in response (length=${raw.length})`);
}

// ─────────────────────────────────────────────────────────────
// PLANNING
// ─────────────────────────────────────────────────────────────

/**
 * Decompose a research question into logical sections.
 * Each section represents a distinct topic that requires research.
 */
export async function planResearch(
  question: string,
  sourcesPerSection: number = 500
): Promise<ResearchPlan> {
  log.info(`Planning research for: ${question}`);
  liveDisplay.setAgentStatus('Planner', 'Decomposing question into research sections...');

  const PLANNING_MODEL = getModel('planning');

  const prompt = `You are a research planning expert. Decompose this research question into 5-8 logical sections that together would fully answer it.

Question: "${question}"

For each section, provide:
1. Title (short, descriptive)
2. Description (1-2 sentences on what this section covers)
3. Key questions (3-4 specific questions to answer)
4. Priority (high/medium/low based on importance to answering the main question)

Format as JSON array:
[
  {
    "title": "Section Title",
    "description": "What this covers",
    "keyQuestions": ["Q1", "Q2", "Q3"],
    "priority": "high"
  }
]

Focus on creating a logical flow where sections build on each other.
Make each section specific and research-friendly (not too broad).`;

  try {
    const response = await ollamaService.generateStream(
      prompt,
      PLANNING_MODEL,
      { temperature: 0.7, num_ctx: 8192 }
    );

    const sections = parseJson<any[]>(response);

    const plan: ResearchPlan = {
      question,
      sections: sections.map((s: any, i: number) => ({
        id: `section-${i}`,
        title: s.title,
        description: s.description,
        keyQuestions: s.keyQuestions,
        priority: s.priority || 'medium'
      })),
      totalEstimatedSources: sourcesPerSection * sections.length,
      researchStrategy: `Multi-section research: ${sections.length} sections, ~${sourcesPerSection} sources per section`
    };

    liveDisplay.clearAgent('Planner');
    liveDisplay.logEvent(
      `  Plan ready — ${plan.sections.length} sections: ${plan.sections.map((s: ResearchSection) => s.title).join(', ')}`
    );
    return plan;
  } catch (error) {
    liveDisplay.clearAgent('Planner');
    log.error('Planning failed:', error);
    throw error;
  }
}

/**
 * Generate targeted search queries for a specific section.
 * Includes validation to ensure queries are relevant.
 */
export async function generateSearchQueries(
  section: ResearchSection,
  existingFacts: string[] = []
): Promise<string[]> {
  const PLANNING_MODEL = getModel('planning');

  // Build a brief summary of what we already know
  const existingSummary = existingFacts.slice(0, 10).join('; ');

  const prompt = `Generate 7-10 specific search queries to research this section thoroughly.

Section: ${section.title}
Description: ${section.description}
Key Questions: ${section.keyQuestions.join(', ')}

Existing findings (avoid re-covering these angles):
${existingSummary || 'None yet'}

Include a mix of query types:
- Tutorial/How-to: practical implementation (start with these — most likely to be relevant)
- Code/GitHub: "site:github.com ...", implementation examples
- Community: "site:reddit.com ...", user experiences
- Academic/Benchmark: comparative analysis, research papers
- News/Recent: add "2025" for time-sensitive topics
- General: broad overview as fallback

Make each query specific and searchable (5-10 words).
DO NOT use overly broad site: queries — focus on specific topics first.

Return as JSON array of strings only (no extra text):
["query 1", "query 2", "query 3", "query 4", "query 5", "query 6", "query 7"]`;

  const response = await ollamaService.generateStream(
    prompt,
    PLANNING_MODEL,
    { temperature: 0.7, num_predict: 512 }
  );

  let queries: string[] = [];
  try {
    queries = parseJson<string[]>(response);
    if (Array.isArray(queries) && queries.length > 0) {
      queries = queries.filter((q: any) => typeof q === 'string' && q.length > 5);
    }
  } catch {
    // Fallback: extract quoted strings from prose output
    const quoted = Array.from(response.matchAll(/"([^"]{10,80})"/g))
      .map(m => m[1])
      .filter(q => !q.includes('{') && !q.includes('['));
    if (quoted.length >= 3) {
      queries = quoted.slice(0, 10);
    }
  }

  if (queries.length === 0) {
    log.warn(`Failed to generate queries for section "${section.title}", using fallback`);
    queries = [section.title];
  }

  // Validate queries before deployment
  log.info(`Validating ${queries.length} generated queries...`);
  const { valid: validatedQueries } = await validateQueriesBatch(
    queries,
    `${section.title} ${section.description}`,
    5 // Keep top 5 valid queries
  );

  if (validatedQueries.length === 0) {
    log.warn(
      `No valid queries found for section "${section.title}" — using raw generated queries`
    );
    return queries.slice(0, 5);
  }

  return validatedQueries;
}
