/**
 * Command: racks intake
 *
 * Pre-research clarifying questions for marketing/brand research.
 * Gathers brand context, audience, competitors, and depth before starting.
 */
import chalk from 'chalk';
import { input, select, confirm } from '@inquirer/prompts';
// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function parseCommaSeparated(raw) {
    return raw
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
}
function formatDepthLabel(depth) {
    switch (depth) {
        case 'quick': return 'Quick (~30 min)';
        case 'standard': return 'Standard (~2 hrs)';
        case 'deep': return 'Deep (~5 hrs)';
    }
}
// ─────────────────────────────────────────────────────────────
// MAIN INTAKE FLOW
// ─────────────────────────────────────────────────────────────
/**
 * Interactive intake flow. Asks 5 clarifying questions, shows a summary,
 * and confirms before returning the answers.
 *
 * Returns IntakeAnswers or null if the user cancels.
 */
export async function runIntake() {
    console.log(chalk.bold.cyan('\nRACKS — Research Intake\n'));
    console.log(chalk.gray('Answer a few quick questions to focus the research.\n'));
    // Q1 — Brand URL or product name
    const brandInput = await input({
        message: 'Brand website URL or product name:',
        validate: (v) => v.trim().length > 0 || 'Please enter a URL or product name.'
    });
    const brandUrl = brandInput.startsWith('http') ? brandInput.trim() : undefined;
    const productName = !brandInput.startsWith('http') ? brandInput.trim() : undefined;
    // Q2 — Target audience
    const targetAudience = await input({
        message: 'Describe your target audience in 1-2 sentences:',
        validate: (v) => v.trim().length > 0 || 'Please describe your audience.'
    });
    // Q3 — Competitors (optional)
    const competitorsRaw = await input({
        message: 'Specific competitors to focus on? (comma-separated, or press Enter to auto-discover):'
    });
    const competitors = competitorsRaw.trim().length > 0
        ? parseCommaSeparated(competitorsRaw)
        : undefined;
    // Q4 — Research depth
    const depth = await select({
        message: 'Research depth:',
        choices: [
            { name: 'Quick    (~30 min) — fast overview, top sources', value: 'quick' },
            { name: 'Standard (~2 hrs)  — thorough, recommended', value: 'standard' },
            { name: 'Deep     (~5 hrs)  — exhaustive, maximum insight', value: 'deep' }
        ],
        default: 'standard'
    });
    // Q5 — YouTube URLs (optional)
    const youtubeRaw = await input({
        message: 'YouTube URLs to include? (comma-separated, or press Enter to skip):'
    });
    const youtubeUrls = youtubeRaw.trim().length > 0
        ? parseCommaSeparated(youtubeRaw)
        : undefined;
    // ── Summary ─────────────────────────────────────────────────
    console.log(chalk.bold('\n--- Research Plan ---'));
    if (brandUrl)
        console.log(`  Brand URL:       ${chalk.cyan(brandUrl)}`);
    if (productName)
        console.log(`  Product:         ${chalk.cyan(productName)}`);
    console.log(`  Audience:        ${chalk.cyan(targetAudience)}`);
    if (competitors && competitors.length > 0) {
        console.log(`  Competitors:     ${chalk.cyan(competitors.join(', '))}`);
    }
    else {
        console.log(`  Competitors:     ${chalk.gray('auto-discover')}`);
    }
    console.log(`  Depth:           ${chalk.cyan(formatDepthLabel(depth))}`);
    if (youtubeUrls && youtubeUrls.length > 0) {
        console.log(`  YouTube URLs:    ${chalk.cyan(youtubeUrls.length.toString())} provided`);
    }
    console.log('');
    // ── Confirm ──────────────────────────────────────────────────
    const confirmed = await confirm({
        message: 'Start research?',
        default: true
    });
    if (!confirmed) {
        console.log(chalk.yellow('\nResearch cancelled.\n'));
        return null;
    }
    const answers = {
        brandUrl,
        productName,
        targetAudience: targetAudience.trim(),
        competitors,
        depth,
        youtubeUrls
    };
    return answers;
}
// ─────────────────────────────────────────────────────────────
// CONTEXT ENRICHMENT
// ─────────────────────────────────────────────────────────────
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
export function enhanceQuestionWithIntake(question, intake) {
    const parts = [];
    if (intake.targetAudience) {
        parts.push(`Target audience: ${intake.targetAudience}.`);
    }
    if (intake.competitors && intake.competitors.length > 0) {
        parts.push(`Key competitors: ${intake.competitors.join(', ')}.`);
    }
    if (intake.brandUrl) {
        parts.push(`Brand URL: ${intake.brandUrl}.`);
    }
    else if (intake.productName) {
        parts.push(`Product: ${intake.productName}.`);
    }
    if (intake.focusAreas && intake.focusAreas.length > 0) {
        parts.push(`Focus on: ${intake.focusAreas.join(', ')}.`);
    }
    if (parts.length === 0)
        return question;
    return `${question.trimEnd()} [Context: ${parts.join(' ')}]`;
}
//# sourceMappingURL=intake.js.map