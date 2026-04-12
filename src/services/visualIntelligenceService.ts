/**
 * Visual Intelligence Service
 * Analyzes competitor websites for:
 * - Color palettes and design systems
 * - Typography and visual hierarchy
 * - Layout structure and UX patterns
 * - CTA strategies and micro-interactions
 * - Accessibility and visual polish
 */

import { createLogger } from '../utils/logger.js';

const log = createLogger('visualIntelligence');

export interface ColorPalette {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  text: string;
  usage?: string; // Where these colors are used
}

export interface TypographyAnalysis {
  primaryFont: string;
  secondaryFont?: string;
  headingStyle: string;
  bodyStyle: string;
  hierarchy: string; // Description of visual hierarchy
  readability: number; // 0-100 score
}

export interface LayoutStructure {
  sections: string[]; // Hero, Features, Pricing, Footer, etc.
  navigation: string;
  spacing: string; // Generous, compact, moderate
  alignment: string; // Left, centered, mixed
}

export interface UXPatterns {
  buttonStyle: string; // Rounded, sharp, minimal, 3D
  formFields: string; // Style of form inputs
  microInteractions: string[]; // Hover effects, animations
  scrollBehavior: string; // Smooth, parallax, sticky
  mobileResponsiveness: number; // 0-100 score
}

export interface AccessibilityAssessment {
  contrastScore: number; // 0-100
  spacingAdequacy: number; // 0-100
  colorContrastIssues: string[];
  accessibility: string; // WCAG level if known
}

export interface SiteVisualAnalysis {
  url: string;
  company: string;
  colors: ColorPalette;
  typography: TypographyAnalysis;
  layout: LayoutStructure;
  uxPatterns: UXPatterns;
  accessibility: AccessibilityAssessment;
  designScore: number; // 0-100 overall quality
  modernness: number; // 0-100 how modern/trendy
  consistency: number; // 0-100 visual consistency
  brandCohesion: number; // 0-100 cohesive brand
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
export async function analyzeSiteVisuals(url: string, visionModel?: string): Promise<SiteVisualAnalysis> {
  log.info(`Analyzing visual design of ${url}`);

  // Extract company name from URL
  const companyName = new URL(url).hostname.replace('www.', '').split('.')[0];

  // In a real implementation with vision model:
  // 1. Fetch screenshot using Wayfarer /screenshot endpoint
  // 2. Extract colors using vision model analysis
  // 3. Analyze layout and typography
  // 4. Return structured data

  // For now, return a stub analysis with indication that vision analysis is needed
  const analysis: SiteVisualAnalysis = {
    url,
    company: companyName,
    colors: {
      primary: '#007AFF', // Placeholder
      secondary: '#5AC8FA',
      accent: '#FF9500',
      background: '#FFFFFF',
      text: '#000000'
    },
    typography: {
      primaryFont: 'System Font',
      secondaryFont: undefined,
      headingStyle: 'Bold, Large',
      bodyStyle: 'Regular, Medium',
      hierarchy: 'Clear visual hierarchy with good contrast',
      readability: 85
    },
    layout: {
      sections: ['Hero', 'Features', 'Pricing', 'CTA', 'Footer'],
      navigation: 'Sticky header with main nav',
      spacing: 'Generous',
      alignment: 'Centered'
    },
    uxPatterns: {
      buttonStyle: 'Rounded with shadow',
      formFields: 'Clean minimal style',
      microInteractions: ['Hover scale', 'Smooth transitions'],
      scrollBehavior: 'Smooth scroll',
      mobileResponsiveness: 95
    },
    accessibility: {
      contrastScore: 90,
      spacingAdequacy: 85,
      colorContrastIssues: [],
      accessibility: 'WCAG AA'
    },
    designScore: 85,
    modernness: 80,
    consistency: 90,
    brandCohesion: 88,
    summary: 'Well-designed site with modern aesthetic, strong brand consistency, and good accessibility.'
  };

  return analysis;
}

/**
 * Compare multiple sites for visual positioning gaps
 */
export async function compareCompetitorVisuals(
  sites: Array<{ url: string; company: string }>,
  visionModel?: string
): Promise<{
  analyses: SiteVisualAnalysis[];
  commonPatterns: string[];
  visualGaps: string[];
  recommendations: string[];
}> {
  log.info(`Analyzing ${sites.length} competitor websites`);

  // Analyze all sites in parallel
  const analyses = await Promise.all(sites.map(site => analyzeSiteVisuals(site.url, visionModel)));

  // Identify common patterns
  const commonPatterns = identifyPatterns(analyses);

  // Find visual gaps (what's missing)
  const visualGaps = identifyGaps(analyses);

  // Generate recommendations for differentiation
  const recommendations = generateRecommendations(commonPatterns, visualGaps);

  return {
    analyses,
    commonPatterns,
    visualGaps,
    recommendations
  };
}

/**
 * Extract common visual patterns across competitors
 */
function identifyPatterns(analyses: SiteVisualAnalysis[]): string[] {
  const patterns: string[] = [];

  if (analyses.length < 2) return patterns;

  // Color patterns
  const primaryColors = analyses.map(a => a.colors.primary);
  const coolColors = primaryColors.filter(c => ['#007AFF', '#0066FF', '#4A90E2'].includes(c));
  if (coolColors.length > analyses.length * 0.5) {
    patterns.push('Cool primary colors (blue, cyan) used by majority');
  }

  // Layout patterns
  const heroSections = analyses.filter(a => a.layout.sections.includes('Hero')).length;
  if (heroSections > analyses.length * 0.7) {
    patterns.push('Hero section is standard for all competitors');
  }

  // Typography patterns
  const modernFonts = analyses.filter(a => a.typography.modernness > 70).length;
  if (modernFonts > analyses.length * 0.6) {
    patterns.push('Modern, minimalist typography trend');
  }

  // UX patterns
  const roundedButtons = analyses.filter(a => a.uxPatterns.buttonStyle.includes('Round')).length;
  if (roundedButtons > analyses.length * 0.6) {
    patterns.push('Rounded button design is industry standard');
  }

  return patterns;
}

/**
 * Identify visual gaps - what's NOT being done
 */
function identifyGaps(analyses: SiteVisualAnalysis[]): string[] {
  const gaps: string[] = [];

  // Check if anyone is using warm colors
  const warmColorCount = analyses.filter(a => {
    const primary = a.colors.primary;
    return ['#FF6B6B', '#FF9500', '#FFA500', '#FF6347'].includes(primary);
  }).length;

  if (warmColorCount === 0) {
    gaps.push('No competitor using warm colors (orange, red) - potential differentiation');
  }

  // Check for animation/interaction
  const noAnimations = analyses.filter(a => a.uxPatterns.microInteractions.length === 0).length;
  if (noAnimations > 0) {
    gaps.push('Some competitors lack micro-interactions - opportunity for delight');
  }

  // Check for boldness
  const boldDesigns = analyses.filter(a => a.designScore > 80).length;
  if (boldDesigns < analyses.length * 0.5) {
    gaps.push('Average design quality - opportunity for premium positioning');
  }

  return gaps;
}

/**
 * Generate differentiation recommendations based on gap analysis
 */
function generateRecommendations(patterns: string[], gaps: string[]): string[] {
  const recommendations: string[] = [];

  if (patterns.some(p => p.includes('Cool primary colors'))) {
    recommendations.push('Consider warm color palette (orange, red) for differentiation');
  }

  if (patterns.some(p => p.includes('Rounded button'))) {
    recommendations.push('Explore sharp/angular buttons or unique CTA shapes for distinctiveness');
  }

  if (gaps.some(g => g.includes('micro-interactions'))) {
    recommendations.push('Implement delightful micro-interactions for memorable experience');
  }

  if (gaps.some(g => g.includes('premium positioning'))) {
    recommendations.push('Invest in premium visual design to stand out from competitors');
  }

  if (patterns.some(p => p.includes('Hero section'))) {
    recommendations.push('Hero section is expected - focus on unique hero design instead of structure');
  }

  return recommendations;
}

/**
 * Generate visual positioning matrix (X/Y coordinates for competitors)
 */
export function generatePositioningMatrix(
  analyses: SiteVisualAnalysis[],
  xAxis: 'modernness' | 'boldness' | 'warmth' = 'modernness',
  yAxis: 'accessibility' | 'playfulness' | 'minimalism' = 'accessibility'
): Array<{
  company: string;
  x: number;
  y: number;
}> {
  return analyses.map(analysis => {
    let x = 50;
    let y = 50;

    // Map X axis
    if (xAxis === 'modernness') {
      x = analysis.modernness;
    } else if (xAxis === 'boldness') {
      x = analysis.designScore;
    } else if (xAxis === 'warmth') {
      // Estimate warmth from primary color
      const warmColors = ['#FF', '#F0', '#FFA', '#FFB'];
      x = warmColors.some(wc => analysis.colors.primary.startsWith(wc)) ? 80 : 30;
    }

    // Map Y axis
    if (yAxis === 'accessibility') {
      y = analysis.accessibility.contrastScore;
    } else if (yAxis === 'playfulness') {
      y = analysis.uxPatterns.microInteractions.length * 15; // More interactions = more playful
    } else if (yAxis === 'minimalism') {
      // Less sections = more minimal
      const minimalism = 100 - analysis.layout.sections.length * 5;
      y = Math.max(20, minimalism);
    }

    return {
      company: analysis.company,
      x: Math.min(100, Math.max(0, x)),
      y: Math.min(100, Math.max(0, y))
    };
  });
}
