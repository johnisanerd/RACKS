/**
 * Image Analyzer Service
 *
 * Comprehensive image analysis module for RACKS product research.
 * Capabilities:
 *   - Image scraping from brand websites (product pages, listings)
 *   - Vision model analysis (color palettes, packaging, positioning)
 *   - Batch processing with concurrency control (5-10 parallel analyses)
 *   - Competitor visual comparison and differentiation analysis
 *   - Complete visual intelligence profiles for research findings
 *
 * Integrates with Wayfarer (webpage/screenshot API) and Ollama (vision models).
 * Production-ready with comprehensive error handling and no crashes.
 */
export interface ImageData {
    url: string;
    alt: string;
    context: string;
    base64?: string;
    width?: number;
    height?: number;
}
export interface ColorAnalysis {
    hex: string;
    rgb: string;
    name: string;
    frequency: number;
    position: string;
    psychology?: string;
}
export interface PackagingAnalysis {
    material: string;
    shape: string;
    design: string;
    sustainability?: string;
}
export interface ImageAnalysis {
    imageUrl: string;
    colors: ColorAnalysis[];
    tone: string;
    style: string;
    aesthetic: string;
    positioning: string;
    targetAudience?: {
        age?: string;
        gender?: string;
        lifestyle?: string[];
    };
    packaging?: PackagingAnalysis;
    analysis: string;
    confidence: number;
    processedAt?: Date;
}
export interface ImageComparisonResult {
    brandImages: ImageAnalysis[];
    competitorImages: ImageAnalysis[];
    commonPatterns: string[];
    visualGaps: string[];
    recommendedDifferentiation: string[];
    colorStrategy?: string;
    toneConsistency?: {
        brand: string[];
        competitors: string[];
    };
    packagingInsights?: string;
}
export interface VisualProfile {
    brandName: string;
    dominantColors: ColorAnalysis[];
    primaryTone: string;
    primaryStyle: string;
    primaryAesthetic: string;
    packagingTypes: string[];
    visualIdentity: string;
    differentiationFactors: string[];
    targetAudienceSignals: string[];
    recommendations: string[];
    confidence: number;
}
/**
 * Scrape product images from brand websites (product pages, listings, detail pages).
 * Extracts high-res versions when available, with complete metadata.
 * Handles up to 50 images per brand site.
 */
export declare function scrapeImages(url: string, context?: string, limit?: number): Promise<ImageData[]>;
/**
 * Batch scrape images from multiple brand URLs.
 * Efficient for competitor landscape analysis.
 */
export declare function scrapeImagesFromBrands(brandUrls: Record<string, string>, limit?: number): Promise<Record<string, ImageData[]>>;
/**
 * Analyze product images using vision model (Gemma 4).
 * Extracts: colors, tone, style, packaging, aesthetic, positioning, target audience.
 * Batch processing with 5-10 concurrent analyses.
 * Production-ready with comprehensive error handling.
 */
export declare function analyzeProductImages(images: ImageData[], brand: string, context?: string, maxConcurrent?: number): Promise<ImageAnalysis[]>;
/**
 * Compare brand images with competitor images.
 * Identifies common patterns, visual gaps, and differentiation opportunities.
 */
export declare function compareImages(brandImages: ImageAnalysis[], competitorImages: ImageAnalysis[], brandName?: string): ImageComparisonResult;
/**
 * Build visual profile from analyzed images.
 * Creates comprehensive brand visual identity summary.
 */
export declare function buildVisualProfile(brandName: string, images: ImageAnalysis[], comparison?: ImageComparisonResult): VisualProfile;
/**
 * Format image analysis results for markdown report.
 * Integrates into research findings output.
 */
export declare function formatImageAnalysisForReport(comparison: ImageComparisonResult): string;
/**
 * Format visual profile for export.
 */
export declare function formatVisualProfileForReport(profile: VisualProfile): string;
//# sourceMappingURL=imageAnalyzer.d.ts.map