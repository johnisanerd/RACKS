/**
 * Research Template Registry
 * Pre-configured research workflows for common use cases
 */
export interface TemplateSection {
    id: string;
    title: string;
    description: string;
    researchQueries: string[];
    relatedQueries?: string[];
    priority: 'critical' | 'high' | 'medium';
    scope: 'core' | 'related';
}
export interface ResearchTemplate {
    id: string;
    name: string;
    description: string;
    primaryGoal: string;
    sections: TemplateSection[];
    estimatedDuration: string;
    requiredInputs: string[];
    outputs: string[];
    judgeStrategy: 'core-focused' | 'breadth-allowed';
}
/**
 * CREATIVE STRATEGY TEMPLATE
 * Find positioning, emotional hooks, differentiation for a topic/brand
 */
export declare const CREATIVE_STRATEGY: ResearchTemplate;
/**
 * MARKET RESEARCH TEMPLATE
 * Comprehensive market analysis
 */
export declare const MARKET_RESEARCH: ResearchTemplate;
/**
 * LEAD GENERATION TEMPLATE
 * Find companies to reach out to
 */
export declare const LEAD_GENERATION: ResearchTemplate;
/**
 * PROBLEM SOLVING TEMPLATE
 * Multi-source solution finding
 */
export declare const PROBLEM_SOLUTION: ResearchTemplate;
/**
 * Get template by ID or name
 */
export declare function getTemplate(idOrName: string): ResearchTemplate | null;
/**
 * List all available templates
 */
export declare function listTemplates(): Array<{
    id: string;
    name: string;
    description: string;
}>;
/**
 * Substitute variables in template
 * [TOPIC], [COMPANY], [MARKET], [PROBLEM], etc.
 */
export declare function substituteTemplate(template: ResearchTemplate, vars: Record<string, string>): ResearchTemplate;
//# sourceMappingURL=templateRegistry.d.ts.map