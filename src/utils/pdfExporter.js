/**
 * PDF Exporter — Generate research reports as PDF files
 */
import { createWriteStream } from 'fs';
import { createLogger } from './logger.js';
const log = createLogger('pdfExporter');
/**
 * Generate a simple HTML-based report that can be printed to PDF
 */
export function generateHTMLReport(report) {
    const sections = report.sections
        .map((section, idx) => `
    <div class="section" style="page-break-inside: avoid; margin-bottom: 40px;">
      <h2 style="color: #1e40af; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">
        ${idx + 1}. ${section.title}
      </h2>

      <div class="metrics" style="background: #f0f4f8; padding: 15px; border-radius: 8px; margin: 15px 0;">
        <p><strong>Confidence:</strong> <span style="font-size: 18px; color: ${getConfidenceColor(section.findings.confidence)};">${(section.findings.confidence * 100).toFixed(0)}%</span></p>
        <p><strong>Sources:</strong> ${section.findings.sources.length}</p>
        <p><strong>Facts Extracted:</strong> ${section.findings.facts.length}</p>
      </div>

      <h3 style="color: #374151; margin-top: 20px; margin-bottom: 10px;">Key Insights</h3>
      <ul style="line-height: 1.8;">
        ${section.findings.facts
        .slice(0, 10)
        .map((fact) => `<li>${escapeHtml(fact)}</li>`)
        .join('')}
      </ul>

      ${section.findings.analysis?.contradictions && section.findings.analysis.contradictions.length > 0
        ? `
        <h3 style="color: #dc2626; margin-top: 20px; margin-bottom: 10px;">⚠️ Contradictions Found</h3>
        <ul style="line-height: 1.8; color: #7f1d1d; background: #fee2e2; padding: 15px; border-radius: 8px;">
          ${section.findings.analysis.contradictions
            .slice(0, 5)
            .map((c) => `<li>${escapeHtml(c)}</li>`)
            .join('')}
        </ul>
      `
        : ''}

      ${section.findings.analysis?.gaps && section.findings.analysis.gaps.length > 0
        ? `
        <h3 style="color: #f59e0b; margin-top: 20px; margin-bottom: 10px;">🔍 Research Gaps</h3>
        <ul style="line-height: 1.8;">
          ${section.findings.analysis.gaps
            .slice(0, 5)
            .map((g) => `<li>${escapeHtml(g)}</li>`)
            .join('')}
        </ul>
      `
        : ''}

      <h3 style="color: #6b7280; margin-top: 20px; margin-bottom: 10px;">Sources (${section.findings.sources.length})</h3>
      <ol style="font-size: 12px; line-height: 1.6; color: #4b5563;">
        ${section.findings.sources
        .slice(0, 15)
        .map((src) => `<li style="word-break: break-all;"><a href="${src}" style="color: #2563eb;">${src}</a></li>`)
        .join('')}
        ${section.findings.sources.length > 15 ? `<li><em>... and ${section.findings.sources.length - 15} more sources</em></li>` : ''}
      </ol>
    </div>
  `)
        .join('');
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Research Report: ${escapeHtml(report.question)}</title>
  <style>
    * { margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
      color: #1f2937;
      background: #fff;
      padding: 40px;
      max-width: 900px;
      margin: 0 auto;
    }
    h1 {
      color: #0f172a;
      border-bottom: 4px solid #3b82f6;
      padding-bottom: 20px;
      margin-bottom: 30px;
      font-size: 32px;
    }
    .metadata {
      background: #eff6ff;
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 30px;
      border-left: 4px solid #3b82f6;
    }
    .metadata p {
      margin: 8px 0;
      font-size: 14px;
    }
    .metadata strong {
      color: #1e40af;
    }
    h2 {
      margin-top: 40px;
      page-break-after: avoid;
    }
    h3 {
      margin-top: 20px;
      page-break-after: avoid;
    }
    ul, ol {
      margin-left: 20px;
    }
    li {
      margin-bottom: 8px;
    }
    a {
      color: #2563eb;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .metrics p {
      margin: 5px 0;
    }
    @media print {
      body { padding: 0; }
      .section { page-break-inside: avoid; }
      h1, h2, h3 { page-break-after: avoid; }
      ul, ol { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <h1>📊 Research Report</h1>

  <div class="metadata">
    <p><strong>Question:</strong> ${escapeHtml(report.question)}</p>
    <p><strong>Generated:</strong> ${report.generatedAt}</p>
    <p><strong>Overall Confidence:</strong> <span style="font-size: 18px; font-weight: bold; color: ${getConfidenceColor(report.avgConfidence)};">${(report.avgConfidence * 100).toFixed(0)}%</span></p>
    <p><strong>Ready Score:</strong> ${(report.readyScore * 100).toFixed(0)}% (coverage × confidence)</p>
    <p><strong>Total Sources Analyzed:</strong> ${report.totalSources}</p>
    <p><strong>Research Depth:</strong> ${report.sections.length} major sections</p>
  </div>

  <h1 style="border: none; margin-top: 50px; font-size: 24px; color: #374151;">Detailed Findings by Section</h1>

  ${sections}

  <div style="margin-top: 80px; padding-top: 20px; border-top: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
    <p>Generated by Billy — Deep Research Harness</p>
    <p>${new Date().toISOString()}</p>
  </div>
</body>
</html>
  `.trim();
}
function getConfidenceColor(confidence) {
    if (confidence >= 0.9)
        return '#059669'; // green
    if (confidence >= 0.75)
        return '#0ea5e9'; // cyan
    if (confidence >= 0.6)
        return '#f59e0b'; // amber
    return '#dc2626'; // red
}
function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
}
/**
 * Export research findings to an HTML file (which can be printed to PDF)
 */
export async function exportToHTML(outputPath, report) {
    const html = generateHTMLReport(report);
    return new Promise((resolve, reject) => {
        const stream = createWriteStream(outputPath);
        stream.write(html);
        stream.end();
        stream.on('finish', () => {
            log.info(`Report exported to: ${outputPath}`);
            resolve();
        });
        stream.on('error', (err) => {
            log.error(`Failed to export report: ${err.message}`);
            reject(err);
        });
    });
}
//# sourceMappingURL=pdfExporter.js.map