/**
 * Enhanced PDF Exporter - Version 2
 * Supports two export formats:
 * 1. RAW DATA DUMP - All facts in structured format for easy parsing
 * 2. POLISHED REPORT - Professional formatting with tables, charts, citations
 */
import { createLogger } from '../utils/logger.js';
const log = createLogger('pdfExporter');
/**
 * Export to RAW PDF format
 * All facts in structured format, easy to parse and extract
 */
export async function exportRawPDF(report, filename) {
    log.info(`Exporting RAW PDF to ${filename}`);
    // In a real implementation, use a PDF library like pdfkit or reportlab
    // For now, create a structured text representation
    let content = '';
    // Header
    content += `RESEARCH REPORT\n`;
    content += `===============\n\n`;
    content += `Question: ${report.question}\n`;
    content += `Generated: ${new Date().toISOString()}\n\n`;
    // Sections
    for (const section of report.sections) {
        content += `SECTION: ${section.title}\n`;
        content += `━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        if (section.coverage !== undefined) {
            content += `Coverage: ${Math.round(section.coverage)}%\n`;
        }
        if (section.confidence !== undefined) {
            content += `Confidence: ${Math.round(section.confidence)}%\n`;
        }
        content += '\n';
        // Facts
        for (const finding of section.findings) {
            content += `• ${finding.fact}\n`;
            content += `  Source: ${finding.source}\n`;
            if (finding.sourceUrl) {
                content += `  URL: ${finding.sourceUrl}\n`;
            }
            if (finding.confidence) {
                content += `  Confidence: ${Math.round(finding.confidence)}%\n`;
            }
            content += '\n';
        }
        // Gaps
        if (section.gaps && section.gaps.length > 0) {
            content += `Identified Gaps:\n`;
            for (const gap of section.gaps) {
                content += `  - ${gap}\n`;
            }
            content += '\n';
        }
        content += '\n';
    }
    // Summary
    if (report.summary) {
        content += `SUMMARY\n`;
        content += `=======\n`;
        content += `${report.summary}\n\n`;
    }
    // Key insights
    if (report.keyInsights && report.keyInsights.length > 0) {
        content += `KEY INSIGHTS\n`;
        content += `============\n`;
        for (const insight of report.keyInsights) {
            content += `• ${insight}\n`;
        }
        content += '\n';
    }
    // Audit trail
    if (report.auditTrail && (report.auditTrail.urls.length > 0 || report.auditTrail.models.length > 0)) {
        content += `METHODOLOGY & AUDIT TRAIL\n`;
        content += `========================\n`;
        content += `Duration: ${Math.round(report.auditTrail.duration / 1000)} seconds\n`;
        content += `Total Tokens Used: ${report.auditTrail.totalTokens}\n`;
        if (report.auditTrail.models.length > 0) {
            content += `Models: ${[...new Set(report.auditTrail.models)].join(', ')}\n`;
        }
        content += `Total Sources: ${report.auditTrail.urls.length}\n`;
        if (report.auditTrail.urls.length > 0) {
            content += `\nSources:\n`;
            for (const url of [...new Set(report.auditTrail.urls)].slice(0, 50)) {
                content += `  - ${url}\n`;
            }
            if (report.auditTrail.urls.length > 50) {
                content += `  ... and ${report.auditTrail.urls.length - 50} more sources\n`;
            }
        }
    }
    // Write to file (simplified - in real implementation would use actual PDF library)
    const fs = await import('fs/promises');
    const textContent = `${content}\n\n[NOTE: This is a text representation. Actual PDF export would include professional formatting.]\n`;
    await fs.writeFile(filename, textContent, 'utf8');
    log.info(`Raw PDF exported: ${filename}`);
}
/**
 * Export to POLISHED PDF format
 * Professional formatting with tables, charts, visualizations
 */
export async function exportPolishedPDF(report, filename, options) {
    log.info(`Exporting POLISHED PDF to ${filename}`);
    // In a real implementation, use a rich PDF library with:
    // - Professional fonts (Helvetica, Times New Roman)
    // - Color-coded sections (blue, red, green, purple)
    // - Tables for competitor data
    // - Charts for positioning matrices
    // - Visual thumbnails
    // - Colored dividers and headers
    let content = '';
    // Title page
    content += `═══════════════════════════════════════════\n`;
    content += `     RESEARCH REPORT\n`;
    if (options?.companyName) {
        content += `     ${options.companyName}\n`;
    }
    content += `═══════════════════════════════════════════\n\n`;
    content += `Question: ${report.question}\n`;
    content += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    // Executive Summary
    content += `EXECUTIVE SUMMARY\n`;
    content += `═════════════════════════════════════════\n\n`;
    if (report.summary) {
        content += `${report.summary}\n\n`;
    }
    if (report.keyInsights && report.keyInsights.length > 0) {
        content += `Key Findings:\n`;
        for (const insight of report.keyInsights.slice(0, 5)) {
            content += `  ✓ ${insight}\n`;
        }
        content += '\n';
    }
    // Detailed Sections
    for (const section of report.sections) {
        content += `\n${'═'.repeat(41)}\n`;
        content += `${section.title.toUpperCase()}\n`;
        content += `${'═'.repeat(41)}\n\n`;
        // Metrics
        if (section.coverage !== undefined || section.confidence !== undefined) {
            content += `Coverage: ${section.coverage ? Math.round(section.coverage) : '?'}%  |  `;
            content += `Confidence: ${section.confidence ? Math.round(section.confidence) : '?'}%\n\n`;
        }
        // Findings as formatted list
        content += `FINDINGS:\n`;
        content += `─────────\n`;
        for (let i = 0; i < section.findings.length; i++) {
            const finding = section.findings[i];
            content += `\n${i + 1}. ${finding.fact}\n`;
            content += `   Source: ${finding.source}\n`;
            if (finding.confidence) {
                const credibility = finding.confidence > 80 ? '✓ Strong' : finding.confidence > 60 ? '◐ Medium' : '⚠ Weak';
                content += `   Credibility: ${credibility}\n`;
            }
        }
        // Gaps
        if (section.gaps && section.gaps.length > 0) {
            content += `\n\nGAPS & RECOMMENDATIONS:\n`;
            content += `───────────────────────\n`;
            for (const gap of section.gaps) {
                content += `  ⚠ ${gap}\n`;
            }
        }
        content += '\n';
    }
    // Competitive Intelligence (if available)
    if (report.competitorVisuals && report.competitorVisuals.length > 0 && options?.includeVisuals) {
        content += `\n${'═'.repeat(41)}\n`;
        content += `VISUAL INTELLIGENCE - COMPETITOR ANALYSIS\n`;
        content += `${'═'.repeat(41)}\n\n`;
        const competitors = report.competitorVisuals;
        if (competitors.length > 0) {
            content += `POSITIONING MATRIX\n`;
            content += `──────────────────\n\n`;
            // Simple table representation
            content += `Competitor         Colors              Tone        CTA Style\n`;
            content += `${'─'.repeat(70)}\n`;
            for (const comp of competitors) {
                const colors = comp.colors.slice(0, 2).join(', ');
                content += `${comp.company.padEnd(18)} ${colors.padEnd(19)} ${comp.tone.padEnd(11)} ${comp.cta}\n`;
            }
            content += '\n';
            content += `VISUAL INSIGHTS:\n`;
            for (const comp of competitors) {
                content += `\n${comp.company}:\n`;
                content += `  Colors: ${comp.colors.join(', ')}\n`;
                content += `  Primary Fonts: ${comp.fonts.join(', ')}\n`;
                content += `  Brand Tone: ${comp.tone}\n`;
                content += `  CTA Strategy: ${comp.cta}\n`;
            }
        }
    }
    // Methodology
    content += `\n${'═'.repeat(41)}\n`;
    content += `METHODOLOGY & AUDIT TRAIL\n`;
    content += `${'═'.repeat(41)}\n\n`;
    if (report.auditTrail) {
        content += `Duration: ${Math.round(report.auditTrail.duration / 60000)} min ${Math.round((report.auditTrail.duration % 60000) / 1000)} sec\n`;
        content += `Total Tokens: ${report.auditTrail.totalTokens.toLocaleString()}\n`;
        content += `Models Used: ${[...new Set(report.auditTrail.models)].join(', ')}\n`;
        content += `Sources Analyzed: ${report.auditTrail.urls.length}\n`;
    }
    // Write to file
    const fs = await import('fs/promises');
    const textContent = `${content}\n\n[NOTE: This is a text representation. Actual polished PDF would include:\n- Professional color scheme (blues, reds, greens)\n- Company branding and logo\n- Data tables with formatting\n- Positioning matrix chart (2D plot)\n- Competitor website thumbnails\n- Better typography and spacing]\n`;
    await fs.writeFile(filename, textContent, 'utf8');
    log.info(`Polished PDF exported: ${filename}`);
}
/**
 * Export research in specified format
 */
export async function exportResearchReport(report, filename, options = { format: 'polished' }) {
    if (options.format === 'raw') {
        await exportRawPDF(report, filename);
    }
    else {
        await exportPolishedPDF(report, filename, options);
    }
}
/**
 * Generate citation for a fact
 */
export function generateCitation(finding, style = 'markdown') {
    if (style === 'markdown') {
        return `[${finding.source}](${finding.sourceUrl || '#'})`;
    }
    else if (style === 'apa') {
        return `${finding.source}. Retrieved from ${finding.sourceUrl}`;
    }
    else if (style === 'chicago') {
        return `"${finding.source}." Accessed ${new Date().toLocaleDateString()}.`;
    }
    return finding.source;
}
//# sourceMappingURL=pdfExporterV2.js.map