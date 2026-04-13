/**
 * Export to RAW PDF format
 * All facts in structured format, easy to parse and extract
 */
export function exportRawPDF(report: any, filename: any): Promise<void>;
/**
 * Export to POLISHED PDF format
 * Professional formatting with tables, charts, visualizations
 */
export function exportPolishedPDF(report: any, filename: any, options: any): Promise<void>;
/**
 * Export research in specified format
 */
export function exportResearchReport(report: any, filename: any, options?: {
    format: string;
}): Promise<void>;
/**
 * Generate citation for a fact
 */
export function generateCitation(finding: any, style?: string): any;
//# sourceMappingURL=pdfExporterV2.d.ts.map