/**
 * Scrape product images from brand websites (product pages, listings, detail pages).
 * Extracts high-res versions when available, with complete metadata.
 * Handles up to 50 images per brand site.
 */
export function scrapeImages(url: any, context: any, limit?: number): Promise<{
    url: any;
    alt: any;
    context: any;
}[]>;
/**
 * Batch scrape images from multiple brand URLs.
 * Efficient for competitor landscape analysis.
 */
export function scrapeImagesFromBrands(brandUrls: any, limit?: number): Promise<{}>;
/**
 * Analyze product images using vision model (Gemma 4).
 * Extracts: colors, tone, style, packaging, aesthetic, positioning, target audience.
 * Batch processing with 5-10 concurrent analyses.
 * Production-ready with comprehensive error handling.
 */
export function analyzeProductImages(images: any, brand: any, context: any, maxConcurrent?: number): Promise<any>;
/**
 * Compare brand images with competitor images.
 * Identifies common patterns, visual gaps, and differentiation opportunities.
 */
export function compareImages(brandImages: any, competitorImages: any, brandName: any): {
    brandImages: any;
    competitorImages: any;
    commonPatterns: any[];
    visualGaps: any[];
    recommendedDifferentiation: any[];
    toneConsistency: {
        brand: any[];
        competitors: any[];
    };
    colorStrategy?: undefined;
    packagingInsights?: undefined;
} | {
    brandImages: any;
    competitorImages: any;
    commonPatterns: string[];
    visualGaps: string[];
    recommendedDifferentiation: string[];
    colorStrategy: string;
    toneConsistency: {
        brand: any[];
        competitors: any[];
    };
    packagingInsights: string;
};
/**
 * Build visual profile from analyzed images.
 * Creates comprehensive brand visual identity summary.
 */
export function buildVisualProfile(brandName: any, images: any, comparison: any): {
    brandName: any;
    dominantColors: {
        hex: string;
        rgb: string;
        name: any;
        frequency: number;
        position: string;
    }[];
    primaryTone: any;
    primaryStyle: any;
    primaryAesthetic: any;
    packagingTypes: any[];
    visualIdentity: string;
    differentiationFactors: any;
    targetAudienceSignals: any[];
    recommendations: string[];
    confidence: number;
};
/**
 * Format image analysis results for markdown report.
 * Integrates into research findings output.
 */
export function formatImageAnalysisForReport(comparison: any): string;
/**
 * Format visual profile for export.
 */
export function formatVisualProfileForReport(profile: any): string;
//# sourceMappingURL=imageAnalyzer.d.ts.map