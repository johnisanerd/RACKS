/**
 * Visual Intelligence Service
 * Analyzes competitor websites for:
 * - Color palettes and design systems
 * - Typography and visual hierarchy
 * - Layout structure and UX patterns
 * - CTA strategies and micro-interactions
 * - Accessibility and visual polish
 */
export interface ColorPalette {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;
    usage?: string;
}
export interface TypographyAnalysis {
    primaryFont: string;
    secondaryFont?: string;
    headingStyle: string;
    bodyStyle: string;
    hierarchy: string;
    readability: number;
}
export interface LayoutStructure {
    sections: string[];
    navigation: string;
    spacing: string;
    alignment: string;
}
export interface UXPatterns {
    buttonStyle: string;
    formFields: string;
    microInteractions: string[];
    scrollBehavior: string;
    mobileResponsiveness: number;
}
export interface AccessibilityAssessment {
    contrastScore: number;
    spacingAdequacy: number;
    colorContrastIssues: string[];
    accessibility: string;
}
export interface SiteVisualAnalysis {
    url: string;
    company: string;
    colors: ColorPalette;
    typography: TypographyAnalysis;
    layout: LayoutStructure;
    uxPatterns: UXPatterns;
    accessibility: AccessibilityAssessment;
    designScore: number;
    modernness: number;
    consistency: number;
    brandCohesion: number;
    summary: string;
}
/**
 * Analyze a single site's visual design
 * In a real implementation, this would:
 * 1. Take screenshot of website
 * 2. Extract DOM structure via headless browser
 * 3. Analyze computed styles
 * 4. Use vision model to extract colors, layout, tone
 * 5. Return structured analysis
 */
export declare function analyzeSiteVisuals(url: string, visionModel?: string): Promise<SiteVisualAnalysis>;
/**
 * Compare multiple sites for visual positioning gaps
 */
export declare function compareCompetitorVisuals(sites: Array<{
    url: string;
    company: string;
}>, visionModel?: string): Promise<{
    analyses: SiteVisualAnalysis[];
    commonPatterns: string[];
    visualGaps: string[];
    recommendations: string[];
}>;
/**
 * Generate visual positioning matrix (X/Y coordinates for competitors)
 */
export declare function generatePositioningMatrix(analyses: SiteVisualAnalysis[], xAxis?: 'modernness' | 'boldness' | 'warmth', yAxis?: 'accessibility' | 'playfulness' | 'minimalism'): Array<{
    company: string;
    x: number;
    y: number;
}>;
//# sourceMappingURL=visualIntelligenceService.d.ts.map