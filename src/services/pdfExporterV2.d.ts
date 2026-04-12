/**
 * Enhanced PDF Exporter - Version 2
 * Supports two export formats:
 * 1. RAW DATA DUMP - All facts in structured format for easy parsing
 * 2. POLISHED REPORT - Professional formatting with tables, charts, citations
 */
export interface PDFExportOptions {
    format: 'raw' | 'polished';
    includeVisuals?: boolean;
    includeMetrics?: boolean;
    includeAuditTrail?: boolean;
    companyLogo?: string;
    companyName?: string;
}
export interface ResearchFinding {
    fact: string;
    source: string;
    sourceUrl?: string;
    confidence?: number;
    timestamp?: number;
}
export interface ResearchSection {
    id: string;
    title: string;
    findings: ResearchFinding[];
    coverage?: number;
    confidence?: number;
    gaps?: string[];
}
export interface ResearchReport {
    question: string;
    sections: ResearchSection[];
    summary?: string;
    keyInsights?: string[];
    vulnerabilityReport?: any;
    auditTrail?: {
        urls: string[];
        models: string[];
        totalTokens: number;
        duration: number;
    };
    competitorVisuals?: Array<{
        company: string;
        colors: string[];
        fonts: string[];
        tone: string;
        cta: string;
    }>;
}
/**
 * Export to RAW PDF format
 * All facts in structured format, easy to parse and extract
 */
export declare function exportRawPDF(report: ResearchReport, filename: string): Promise<void>;
/**
 * Export to POLISHED PDF format
 * Professional formatting with tables, charts, visualizations
 */
export declare function exportPolishedPDF(report: ResearchReport, filename: string, options?: PDFExportOptions): Promise<void>;
/**
 * Export research in specified format
 */
export declare function exportResearchReport(report: ResearchReport, filename: string, options?: PDFExportOptions): Promise<void>;
/**
 * Generate citation for a fact
 */
export declare function generateCitation(finding: ResearchFinding, style?: 'markdown' | 'apa' | 'chicago'): string;
//# sourceMappingURL=pdfExporterV2.d.ts.map