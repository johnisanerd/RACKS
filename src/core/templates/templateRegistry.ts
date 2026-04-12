/**
 * Research Template Registry
 * Pre-configured research workflows for common use cases
 */

export interface TemplateSection {
  id: string;
  title: string;
  description: string;
  researchQueries: string[];
  relatedQueries?: string[]; // Only suggest after core is covered
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
  judgeStrategy: 'core-focused' | 'breadth-allowed'; // core-focused = stay on topic
}

/**
 * CREATIVE STRATEGY TEMPLATE
 * Find positioning, emotional hooks, differentiation for a topic/brand
 */
export const CREATIVE_STRATEGY: ResearchTemplate = {
  id: 'creative-strategy',
  name: 'Creative Strategy Research',
  description: 'Discover creative positioning, emotional hooks, and differentiation angles',
  primaryGoal: 'Find unique positioning, emotional motivations, and competitive gaps for [TOPIC]',
  judgeStrategy: 'core-focused',
  estimatedDuration: '1-3 hours',
  requiredInputs: ['Brand/Topic name'],
  outputs: ['Positioning angles', 'Emotional hooks', 'Competitive gaps', 'Differentiation strategy'],
  sections: [
    {
      id: 'desires',
      title: 'Customer Desires & Emotions',
      scope: 'core',
      description: 'Deep customer desires and emotional drivers',
      priority: 'critical',
      researchQueries: [
        'deep customer desires for [TOPIC]',
        'emotional motivations for buying [TOPIC]',
        'customer pain points with [TOPIC]',
        'what customers really want from [TOPIC]'
      ]
    },
    {
      id: 'comp-positioning',
      title: 'Competitor Positioning',
      scope: 'core',
      description: 'How competitors position themselves',
      priority: 'critical',
      researchQueries: [
        'how competitors position [TOPIC]',
        'competitor value propositions for [TOPIC]',
        'competitor messaging for [TOPIC]',
        'competitor differentiation strategies'
      ]
    },
    {
      id: 'creative-angles',
      title: 'Creative Angles & Differentiation',
      scope: 'core',
      description: 'Unique positioning and unmet desires',
      priority: 'high',
      researchQueries: [
        'unique angles to position [TOPIC]',
        'unmet desires in [TOPIC] market',
        'emotional messaging that works for [TOPIC]',
        'creative positioning for [TOPIC]'
      ]
    },
    {
      id: 'proof-points',
      title: 'Proof Points & Social Evidence',
      scope: 'core',
      description: 'Customer testimonials and social proof',
      priority: 'high',
      researchQueries: [
        'customer testimonials for [TOPIC]',
        'social proof for [TOPIC]',
        'case studies of [TOPIC] success',
        'customer stories for [TOPIC]'
      ]
    },
    {
      id: 'trends',
      title: 'Market Trends (Optional)',
      scope: 'related',
      description: 'Emerging opportunities and trends',
      priority: 'medium',
      researchQueries: [
        '[TOPIC] market trends 2025',
        'emerging opportunities in [TOPIC]',
        'future of [TOPIC]'
      ],
      relatedQueries: [
        'sustainability in [TOPIC]',
        'innovation in [TOPIC]'
      ]
    }
  ]
};

/**
 * MARKET RESEARCH TEMPLATE
 * Comprehensive market analysis
 */
export const MARKET_RESEARCH: ResearchTemplate = {
  id: 'market-research',
  name: 'Market Research Analysis',
  description: 'Comprehensive market sizing, trends, and competitive landscape',
  primaryGoal: 'Understand [MARKET] market size, growth, competitors, and trends',
  judgeStrategy: 'core-focused',
  estimatedDuration: '2-4 hours',
  requiredInputs: ['Market/Category name'],
  outputs: ['Market size', 'Growth rate', 'Competitor analysis', 'Trends', 'Opportunities'],
  sections: [
    {
      id: 'market-overview',
      title: 'Market Overview & Sizing',
      scope: 'core',
      description: 'Market size and growth metrics',
      priority: 'critical',
      researchQueries: [
        '[MARKET] market size 2025',
        '[MARKET] total addressable market',
        '[MARKET] market growth rate',
        '[MARKET] revenue projections'
      ]
    },
    {
      id: 'competitive-landscape',
      title: 'Competitive Landscape',
      scope: 'core',
      description: 'Key competitors and market share',
      priority: 'critical',
      researchQueries: [
        'top companies in [MARKET]',
        '[MARKET] market leaders',
        '[MARKET] competitive analysis',
        'market share in [MARKET]'
      ]
    },
    {
      id: 'market-trends',
      title: 'Market Trends & Drivers',
      scope: 'core',
      description: 'What is driving market growth',
      priority: 'high',
      researchQueries: [
        '[MARKET] market trends 2025',
        '[MARKET] growth drivers',
        '[MARKET] emerging trends',
        'innovation in [MARKET]'
      ]
    },
    {
      id: 'customer-behavior',
      title: 'Customer Behavior & Preferences',
      scope: 'core',
      description: 'How customers are buying',
      priority: 'high',
      researchQueries: [
        '[MARKET] customer behavior trends',
        '[MARKET] buying patterns',
        'customer preferences in [MARKET]',
        '[MARKET] customer demographics'
      ]
    },
    {
      id: 'opportunities',
      title: 'Gaps & Opportunities',
      scope: 'related',
      description: 'Unmet needs and market gaps',
      priority: 'medium',
      researchQueries: [
        'unmet needs in [MARKET]',
        '[MARKET] market gaps',
        'opportunities in [MARKET]'
      ]
    }
  ]
};

/**
 * LEAD GENERATION TEMPLATE
 * Find companies to reach out to
 */
export const LEAD_GENERATION: ResearchTemplate = {
  id: 'lead-generation',
  name: 'Lead Generation & Prospecting',
  description: 'Find companies similar to target for outreach',
  primaryGoal: 'Find [N] companies in [INDUSTRY] similar to [TARGET_COMPANY]',
  judgeStrategy: 'core-focused',
  estimatedDuration: '1-2 hours',
  requiredInputs: ['Target company', 'Industry', 'Number of leads wanted'],
  outputs: ['Company list', 'Contact info', 'Fit analysis', 'Outreach strategy'],
  sections: [
    {
      id: 'direct-competitors',
      title: 'Direct Competitors',
      scope: 'core',
      description: 'Companies doing similar things',
      priority: 'critical',
      researchQueries: [
        'competitors to [COMPANY] in [INDUSTRY]',
        '[INDUSTRY] companies similar to [COMPANY]',
        'alternatives to [COMPANY]',
        '[COMPANY] direct competitors'
      ]
    },
    {
      id: 'adjacent-market',
      title: 'Adjacent Market Players',
      scope: 'core',
      description: 'Companies in adjacent spaces',
      priority: 'high',
      researchQueries: [
        '[INDUSTRY] adjacent market players',
        'companies entering [INDUSTRY]',
        '[INDUSTRY] adjacent opportunities',
        'new players in [INDUSTRY]'
      ]
    },
    {
      id: 'decision-makers',
      title: 'Decision Makers & Contacts',
      scope: 'high',
      description: 'Who makes buying decisions',
      priority: 'high',
      researchQueries: [
        '[INDUSTRY] marketing leaders and contacts',
        '[INDUSTRY] executive leadership',
        'who handles [INDUSTRY] buying',
        '[COMPANY] founder and leadership'
      ]
    }
  ]
};

/**
 * PROBLEM SOLVING TEMPLATE
 * Multi-source solution finding
 */
export const PROBLEM_SOLUTION: ResearchTemplate = {
  id: 'problem-solution',
  name: 'Problem Solution Research',
  description: 'Find solutions from YouTube, forums, experts',
  primaryGoal: 'Find solutions to [PROBLEM] across multiple sources',
  judgeStrategy: 'core-focused',
  estimatedDuration: '30 min - 2 hours',
  requiredInputs: ['Problem description'],
  outputs: ['Solution options', 'Step-by-step guides', 'Expert advice', 'Community consensus'],
  sections: [
    {
      id: 'video-solutions',
      title: 'Video Tutorials & Guides',
      scope: 'core',
      description: 'YouTube and video-based solutions',
      priority: 'high',
      researchQueries: [
        '[PROBLEM] tutorial',
        'how to solve [PROBLEM]',
        '[PROBLEM] step-by-step guide',
        '[PROBLEM] video guide'
      ]
    },
    {
      id: 'community-advice',
      title: 'Community Advice & Forum Discussions',
      scope: 'core',
      description: 'Reddit and forum wisdom',
      priority: 'high',
      researchQueries: [
        '[PROBLEM] Reddit',
        '[PROBLEM] forum discussion',
        'people talking about [PROBLEM]',
        '[PROBLEM] community solutions'
      ]
    },
    {
      id: 'technical-qa',
      title: 'Technical Q&A Solutions',
      scope: 'core',
      description: 'StackOverflow and expert answers',
      priority: 'high',
      researchQueries: [
        '[PROBLEM] StackOverflow',
        '[PROBLEM] technical solution',
        '[PROBLEM] how to fix',
        '[PROBLEM] expert advice'
      ]
    },
    {
      id: 'best-practices',
      title: 'Best Practices & Consensus',
      scope: 'core',
      description: 'What experts recommend',
      priority: 'medium',
      researchQueries: [
        'best way to solve [PROBLEM]',
        '[PROBLEM] professional approach',
        '[PROBLEM] industry standard',
        '[PROBLEM] pro tips'
      ]
    }
  ]
};

/**
 * Get template by ID or name
 */
export function getTemplate(idOrName: string): ResearchTemplate | null {
  const normalizedQuery = idOrName.toLowerCase().replace(/\s+/g, '-');

  const templates = [CREATIVE_STRATEGY, MARKET_RESEARCH, LEAD_GENERATION, PROBLEM_SOLUTION];

  return templates.find(t => t.id === normalizedQuery || t.name.toLowerCase().includes(idOrName.toLowerCase())) || null;
}

/**
 * List all available templates
 */
export function listTemplates(): Array<{ id: string; name: string; description: string }> {
  return [
    { id: CREATIVE_STRATEGY.id, name: CREATIVE_STRATEGY.name, description: CREATIVE_STRATEGY.description },
    { id: MARKET_RESEARCH.id, name: MARKET_RESEARCH.name, description: MARKET_RESEARCH.description },
    { id: LEAD_GENERATION.id, name: LEAD_GENERATION.name, description: LEAD_GENERATION.description },
    { id: PROBLEM_SOLUTION.id, name: PROBLEM_SOLUTION.name, description: PROBLEM_SOLUTION.description }
  ];
}

/**
 * Substitute variables in template
 * [TOPIC], [COMPANY], [MARKET], [PROBLEM], etc.
 */
export function substituteTemplate(template: ResearchTemplate, vars: Record<string, string>): ResearchTemplate {
  const substitute = (text: string): string => {
    let result = text;
    Object.entries(vars).forEach(([key, value]) => {
      const placeholder = `[${key.toUpperCase()}]`;
      result = result.replace(new RegExp(placeholder, 'g'), value);
    });
    return result;
  };

  return {
    ...template,
    primaryGoal: substitute(template.primaryGoal),
    sections: template.sections.map(section => ({
      ...section,
      title: substitute(section.title),
      description: substitute(section.description),
      researchQueries: section.researchQueries.map(q => substitute(q)),
      relatedQueries: section.relatedQueries?.map(q => substitute(q))
    }))
  };
}
