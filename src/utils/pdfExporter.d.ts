/**
 * PDF Exporter — Generate research reports as PDF files
 */
import type { SectionFindings } from '../core/orchestrator.js';
export interface ResearchReport {
    question: string;
    generatedAt: string;
    sections: Array<{
        title: string;
        findings: SectionFindings;
    }>;
    totalSources: number;
    avgConfidence: number;
    readyScore: number;
}
/**
 * Generate a simple HTML-based report that can be printed to PDF
 */
export declare function generateHTMLReport(report: ResearchReport): string;
/**
 * Export research findings to an HTML file (which can be printed to PDF)
 */
export declare function exportToHTML(outputPath: string, report: ResearchReport): Promise<void>;
//# sourceMappingURL=pdfExporter.d.ts.map