/**
 * Deep Dive Analyzer
 *
 * Analyzes a single source (GitHub repo, documentation site, database) deeply.
 * Extracts structure, code patterns, key files, architecture, and creates
 * comprehensive report on that specific source.
 */
import { wayfarerService } from '../services/wayfarer.js';
import { ollamaService } from '../services/ollama.js';
import { createLogger } from './logger.js';
const log = createLogger('deepDiveAnalyzer');
/**
 * Identify source type from URL
 */
function identifySourceType(url) {
    if (url.includes('github.com'))
        return 'github';
    if (url.includes('docs.') || url.includes('documentation'))
        return 'documentation';
    if (url.includes('api'))
        return 'api';
    if (url.includes('db') || url.includes('database'))
        return 'database';
    return 'other';
}
/**
 * Deep dive into a single source
 */
export async function analyzeSingleSource(sourceUrl) {
    log.info(`Starting deep dive into: ${sourceUrl}`);
    const sourceType = identifySourceType(sourceUrl);
    const analysis = {
        url: sourceUrl,
        type: sourceType,
        title: sourceUrl.split('/').pop() || 'Unknown',
        structure: { files: [], directories: [], keyFiles: [] },
        content: { readme: '', codeSnippets: [], documentation: [], patterns: [] },
        insights: {
            architecture: '',
            keyTechnologies: [],
            patterns: [],
            bestPractices: [],
            gaps: []
        },
        summary: ''
    };
    try {
        if (sourceType === 'github') {
            await analyzeGitHubRepo(sourceUrl, analysis);
        }
        else if (sourceType === 'documentation') {
            await analyzeDocumentation(sourceUrl, analysis);
        }
        else {
            await analyzeGenericSource(sourceUrl, analysis);
        }
        // Generate insights using LLM
        await generateInsights(analysis);
        log.info(`Deep dive complete: ${sourceUrl}`);
    }
    catch (error) {
        log.error(`Deep dive failed for ${sourceUrl}:`, error);
        throw error;
    }
    return analysis;
}
/**
 * Analyze GitHub repository structure and content
 */
async function analyzeGitHubRepo(repoUrl, analysis) {
    log.info(`Analyzing GitHub repo: ${repoUrl}`);
    try {
        // Fetch the repo main page
        const repoContent = await wayfarerService.research(`${repoUrl} README architecture structure`, 5);
        if (repoContent.length > 0) {
            // Extract structure from search results
            const mainContent = repoContent[0].content || '';
            analysis.content.readme = mainContent.substring(0, 2000);
            // Try to identify key files and patterns
            const keyFilePatterns = [
                'package.json',
                'go.mod',
                'requirements.txt',
                'Gemfile',
                'cargo.toml',
                'pom.xml',
                'build.gradle',
                'dockerfile',
                'docker-compose.yml',
                'kubernetes',
                'helm',
                'terraform'
            ];
            for (const pattern of keyFilePatterns) {
                if (mainContent.toLowerCase().includes(pattern)) {
                    analysis.structure.keyFiles.push(pattern);
                }
            }
        }
        // Search for code examples and patterns
        const codeSearches = [
            `${repoUrl} code architecture patterns`,
            `${repoUrl} main components structure`,
            `${repoUrl} API endpoints schema`,
            `${repoUrl} data models database schema`,
            `${repoUrl} best practices conventions`
        ];
        for (const query of codeSearches) {
            const results = await wayfarerService.research(query, 2);
            for (const result of results) {
                if (result.content) {
                    const snippet = result.content.substring(0, 500);
                    analysis.content.codeSnippets.push(snippet);
                }
            }
        }
        log.info(`GitHub analysis complete: found ${analysis.content.codeSnippets.length} code examples`);
    }
    catch (error) {
        log.warn(`GitHub repo analysis partial failure:`, error);
    }
}
/**
 * Analyze documentation site
 */
async function analyzeDocumentation(docUrl, analysis) {
    log.info(`Analyzing documentation: ${docUrl}`);
    try {
        // Fetch main documentation
        const docContent = await wayfarerService.research(docUrl, 5);
        if (docContent.length > 0) {
            // Collect all documentation
            analysis.content.documentation = docContent
                .slice(0, 5)
                .map(d => d.content || '')
                .filter(c => c.length > 0);
            analysis.content.readme = docContent[0].content?.substring(0, 1500) || '';
        }
        // Search for key sections
        const docSections = [
            `${docUrl} getting started installation setup`,
            `${docUrl} API reference endpoints`,
            `${docUrl} architecture design`,
            `${docUrl} examples tutorials`,
            `${docUrl} configuration options`
        ];
        for (const query of docSections) {
            const results = await wayfarerService.research(query, 2);
            for (const result of results) {
                if (result.content) {
                    analysis.content.documentation.push(result.content.substring(0, 800));
                }
            }
        }
        log.info(`Documentation analysis complete: ${analysis.content.documentation.length} sections`);
    }
    catch (error) {
        log.warn(`Documentation analysis partial failure:`, error);
    }
}
/**
 * Generic source analysis (fallback)
 */
async function analyzeGenericSource(sourceUrl, analysis) {
    log.info(`Analyzing generic source: ${sourceUrl}`);
    try {
        const results = await wayfarerService.research(sourceUrl, 10);
        analysis.content.documentation = results
            .map(r => r.content || '')
            .filter(c => c.length > 0);
        analysis.content.readme = results[0]?.content?.substring(0, 1500) || '';
        // Extract patterns and key information
        const allText = results.map(r => r.content).join(' ').toLowerCase();
        const patterns = [
            { name: 'REST API', keywords: ['rest', 'endpoint', 'http', 'request', 'response'] },
            { name: 'GraphQL', keywords: ['graphql', 'query', 'mutation', 'schema'] },
            { name: 'Database', keywords: ['database', 'sql', 'mongodb', 'postgres', 'schema'] },
            { name: 'Authentication', keywords: ['auth', 'jwt', 'oauth', 'token', 'session'] },
            { name: 'Caching', keywords: ['cache', 'redis', 'memcached', 'ttl'] },
            { name: 'Message Queue', keywords: ['queue', 'kafka', 'rabbitmq', 'pubsub'] }
        ];
        for (const pattern of patterns) {
            const hasPattern = pattern.keywords.some(kw => allText.includes(kw));
            if (hasPattern) {
                analysis.content.patterns.push(pattern.name);
            }
        }
    }
    catch (error) {
        log.warn(`Generic source analysis failed:`, error);
    }
}
/**
 * Use LLM to generate insights about the source
 */
async function generateInsights(analysis) {
    try {
        const contentSummary = `
Source: ${analysis.url}
Type: ${analysis.type}

README/Main Content:
${analysis.content.readme}

Code Patterns Found:
${analysis.content.patterns.join(', ')}

Key Files:
${analysis.structure.keyFiles.join(', ')}

Documentation Sections: ${analysis.content.documentation.length}
Code Examples: ${analysis.content.codeSnippets.length}
    `.trim();
        const prompt = `Analyze this source and provide insights:

${contentSummary}

Provide:
1. Architecture summary (1-2 sentences)
2. Key technologies used (list)
3. Main patterns observed (list)
4. Best practices evident (list)
5. Potential gaps or improvements (list)

Return as JSON:
{
  "architecture": "...",
  "keyTechnologies": ["...", "..."],
  "patterns": ["...", "..."],
  "bestPractices": ["...", "..."],
  "gaps": ["...", "..."]
}`;
        const response = await ollamaService.generateStream(prompt, 'gemma2b', { temperature: 0.5, num_predict: 512 });
        const insights = parseJson(response);
        if (insights) {
            analysis.insights.architecture = insights.architecture || '';
            analysis.insights.keyTechnologies = insights.keyTechnologies || [];
            analysis.insights.patterns = insights.patterns || [];
            analysis.insights.bestPractices = insights.bestPractices || [];
            analysis.insights.gaps = insights.gaps || [];
        }
        // Generate summary
        analysis.summary = `
Deep Dive: ${analysis.url}

Architecture: ${analysis.insights.architecture}

Key Technologies: ${analysis.insights.keyTechnologies.join(', ')}

Patterns: ${analysis.insights.patterns.join(', ')}

Best Practices:
${analysis.insights.bestPractices.map(bp => `• ${bp}`).join('\n')}

Potential Improvements:
${analysis.insights.gaps.map(gap => `• ${gap}`).join('\n')}
    `.trim();
    }
    catch (error) {
        log.warn(`Insight generation failed:`, error);
        analysis.summary = `Deep Dive: ${analysis.url}\n\nAnalysis: See detailed findings above.`;
    }
}
/**
 * Parse JSON with fallbacks
 */
function parseJson(raw) {
    try {
        return JSON.parse(raw);
    }
    catch {
        const obj = raw.match(/\{[\s\S]*\}/);
        if (obj) {
            try {
                return JSON.parse(obj[0]);
            }
            catch { }
        }
    }
    return null;
}
/**
 * Format analysis for CLI display
 */
export function formatAnalysisForDisplay(analysis) {
    return `
╔════════════════════════════════════════════════════════╗
║ DEEP DIVE: ${analysis.title.padEnd(42)} ║
╚════════════════════════════════════════════════════════╝

URL: ${analysis.url}
Type: ${analysis.type.toUpperCase()}

${analysis.summary}

Key Files Found:
${analysis.structure.keyFiles.map(f => `  • ${f}`).join('\n')}

Documentation Analyzed: ${analysis.content.documentation.length} sections
Code Examples: ${analysis.content.codeSnippets.length} snippets
  `;
}
//# sourceMappingURL=deepDiveAnalyzer.js.map