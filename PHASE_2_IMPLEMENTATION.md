# RACKS Phase 2 Implementation Guide

## Overview

Phase 2 adds enterprise-grade research quality control, visual intelligence, knowledge persistence, and professional reporting. The system now supports:

1. **Core-Focused Research** — Stay on topic, prevent tangential exploration
2. **Visual Intelligence** — Analyze competitor websites for positioning gaps
3. **Professional Exports** — Raw data dumps + polished PDFs with charts and citations
4. **Knowledge Accumulation** — Cross-session learning and follow-up research
5. **Pre-configured Workflows** — 4 templates for common research scenarios

---

## Architecture Changes

### 1. Vulnerability Judge (Core-Focused Quality Control)

**File:** `src/core/phases/vulnerabilityJudge.ts`

The judge ensures research answers the **original question** rather than exploring tangential topics.

**Key Concept:**
- CORE topic coverage (0-100): How well does research answer the original question?
- VULNERABILITY score (0-100): How exposed are we to having missed something critical?
- CORE GAPS: Missing aspects of the core question (critical/high/medium priority)
- RELATED ANGLES: Only suggested AFTER 80%+ core coverage

**Example:**
```typescript
// Original question: "How to peel an apple?"
// Bad research finding: "What are fruits?"
// Judge decision: "This is tangential - don't suggest this"

// Good research finding: "Why peel? When should you peel?"
// Judge decision: "This directly answers aspects of original question - pursue it"
```

**Integration:**
```typescript
const report = await judgeResearchQuality(
  findings,           // What was found
  section,            // Which section
  "How to peel an apple?", // Original question
  pool
);

if (report.coreTopicCoverage > 85 && report.relatedAngles) {
  // Now offer to explore related angles
}
```

---

### 2. Research Templates (Pre-configured Workflows)

**File:** `src/core/templates/templateRegistry.ts`

Four professional research workflows for common scenarios:

#### A. **Creative Strategy Template**
Best for: Positioning, emotional hooks, differentiation

Sections (core → related):
1. Customer Desires & Emotions (CORE)
2. Competitor Positioning (CORE)
3. Creative Angles & Differentiation (CORE)
4. Proof Points & Social Evidence (CORE)
5. Market Trends (RELATED — only if core > 80%)

Example usage:
```typescript
const template = getTemplate('creative-strategy');
const customized = substituteTemplate(template, {
  TOPIC: 'collagen supplements'
});
// Now use customized.sections for research queries
```

#### B. **Market Research Template**
Best for: Market sizing, trends, competitive analysis

#### C. **Lead Generation Template**
Best for: Finding prospect companies

#### D. **Problem Solution Template**
Best for: Multi-source solution finding (YouTube, forums, experts)

**Features:**
- Variable substitution: `[TOPIC]`, `[COMPANY]`, `[MARKET]`, `[PROBLEM]`
- Priority levels: critical, high, medium
- Scope marking: core vs related
- Structured sections with research queries

---

### 3. PDF Exporter V2 (Two Professional Formats)

**File:** `src/services/pdfExporterV2.ts`

#### Format 1: RAW DATA DUMP
Perfect for data extraction and analysis:
```
SECTION: Customer Desires
━━━━━━━━━━━━━━━━━━━━━━━━━
• Fact 1: [text]
  Source: [url]
  Confidence: 85%

• Fact 2: [text]
  Source: [url]
  Confidence: 72%
```

#### Format 2: POLISHED REPORT
Professional presentation:
- Executive Summary with key findings
- Color-coded sections
- Data tables for competitors
- Positioning matrix (2D chart)
- Visual intelligence section (if available)
- Methodology & audit trail
- Full citation bibliography

**Usage:**
```typescript
// Raw export for data engineers
await exportResearchReport(report, 'data.pdf', {
  format: 'raw',
  includeAuditTrail: true
});

// Polished export for stakeholders
await exportResearchReport(report, 'report.pdf', {
  format: 'polished',
  includeVisuals: true,
  includeMetrics: true,
  companyName: 'ACME Corp'
});
```

---

### 4. Visual Intelligence Service

**File:** `src/services/visualIntelligenceService.ts`

Analyzes competitor websites for:
- Color palettes and usage
- Typography hierarchy
- Layout structure
- UX patterns and micro-interactions
- Accessibility scores
- Overall design quality (0-100)
- Modernness and consistency

**Example Output:**
```typescript
const analysis = await analyzeSiteVisuals('https://competitor.com');

// Returns:
{
  company: 'competitor',
  colors: {
    primary: '#007AFF',     // Blue
    secondary: '#5AC8FA',
    accent: '#FF9500'
  },
  typography: {
    primaryFont: 'System Font',
    headingStyle: 'Bold, Large',
    readability: 85
  },
  designScore: 85,          // 0-100 overall
  modernness: 80,
  consistency: 90,
  brandCohesion: 88
}
```

**Positioning Matrix:**
```typescript
const matrix = generatePositioningMatrix(analyses, 'modernness', 'accessibility');
// Returns competitor positions on 2D graph
// Used to identify visual gaps and differentiation opportunities
```

---

### 5. Knowledge Base Service

**File:** `src/services/knowledgeBaseService.ts`

Persistent semantic knowledge across sessions. Enables:
- Follow-up questions on previous research
- Cross-domain knowledge reuse
- Session-based learning
- Confidence-weighted facts
- Automatic topic indexing

**Usage:**

```typescript
const kb = getKnowledgeBase();

// Store knowledge
await kb.addKnowledge({
  topic: 'collagen market growth',
  domain: 'supplements',
  content: 'Collagen market growing at 12% CAGR',
  confidence: 85,
  sources: ['report1.com', 'report2.com'],
  relatedTopics: ['market size', 'CAGR'],
  tags: ['market', 'growth'],
  category: 'market'
});

// Query for follow-up research
const related = await kb.getRelated('collagen market');
// Returns: peptides market, supplement trends, etc.

// Create session memory
const session = kb.createSession(
  'supplements',           // domain
  'How to market collagen supplements?',
  ['task1', 'task2']       // task IDs
);

// Later: Query session knowledge for follow-ups
const sessionKnowledge = kb.querySession(sessionId, 'What about marketing to Gen Z?');
```

---

## Core-Focused Research Philosophy

All Phase 2 features enforce the principle: **Answer the original question first, explore tangentials second.**

### Decision Tree

```
START RESEARCH
    ↓
RESEARCH CORE TOPIC
    ↓
Judge: Is core coverage > 85%?
    ├─ NO  → Continue researching core gaps
    │         Suggest next queries based on vulnerabilities
    │         (Only CORE queries shown)
    │
    └─ YES → Core question answered
             ├─ Suggest related angles? (if any)
             ├─ Or move to SYNTHESIS?
             └─ Or continue to 90%+ for confidence?
```

---

## Integration Example: Complete Research Flow

```typescript
// 1. Select template
const template = getTemplate('creative-strategy');
const customized = substituteTemplate(template, { TOPIC: 'collagen' });

// 2. Run research using sections from template
for (const section of customized.sections) {
  const findings = await research(section.researchQueries);
  
  // 3. Judge quality (core vs related)
  const judgment = await judgeResearchQuality(
    findings,
    section,
    "How to position collagen supplements creatively?"
  );
  
  // 4. Store in knowledge base
  for (const finding of findings) {
    kb.addKnowledge({
      topic: section.title,
      domain: 'supplements',
      content: finding.fact,
      confidence: judgment.coreTopicCoverage,
      sources: [finding.source],
      category: 'market'
    });
  }
  
  // 5. Decide: Continue or synthesis?
  if (!judgment.readyForSynthesis && iterationsRemaining > 0) {
    // Suggest next query from core gaps
    const nextQuery = judgment.coreGaps[0].suggestedQuery;
    continue; // Research more
  }
}

// 6. Analyze competitor visuals
const visuals = await compareCompetitorVisuals([
  { url: 'https://comp1.com', company: 'Competitor 1' },
  { url: 'https://comp2.com', company: 'Competitor 2' }
]);

// 7. Export in both formats
await exportResearchReport(report, 'data.pdf', { format: 'raw' });
await exportResearchReport(report, 'report.pdf', {
  format: 'polished',
  includeVisuals: true
});
```

---

## Phase 2 Success Metrics

✅ **Implemented:**
- Vulnerability Judge with core-focused assessment
- 4 Research Templates (Creative, Market, Lead Gen, Problem Solving)
- PDF Exporter with raw + polished formats
- Visual Intelligence Service for competitor analysis
- Knowledge Base for cross-session learning

⏳ **Pending (Phase 2+ future work):**
- Real Wayfarer integration for website screenshots
- Vision model integration for color/font extraction
- SQLite persistence for knowledge base
- Vector embeddings for semantic search
- Real-time dashboard
- Fact-checking system (optional)
- Competitive intelligence module (optional)

---

## Files Changed/Added (Phase 2)

### New Files
- `src/core/phases/vulnerabilityJudge.ts` (260 lines)
- `src/core/templates/templateRegistry.ts` (410 lines)
- `src/services/pdfExporterV2.ts` (340 lines)
- `src/services/visualIntelligenceService.ts` (380 lines)
- `src/services/knowledgeBaseService.ts` (410 lines)
- `PHASE_2_IMPLEMENTATION.md` (this file)

### Modified Files
- (None — Phase 2 is additive)

**Total New Code:** 1,800+ lines

---

## Next Steps (Phase 3+)

1. **Real Infrastructure Integration**
   - Connect to Wayfarer for actual website screenshots
   - Integrate vision model for color/font/layout analysis
   - SQLite persistence for knowledge base
   - Vector embeddings for semantic search

2. **Optional Enhancements**
   - Fact-checking system (verify contradictions)
   - Competitive intelligence module (deep competitor analysis)
   - Real-time dashboard for monitoring research
   - Stricter accessibility scoring

3. **Production Readiness**
   - Error handling and retry logic
   - Rate limiting
   - Caching strategies
   - Memory management for long sessions

---

## Testing Phase 2

1. **Test Vulnerability Judge**
   ```bash
   npx tsx src/tests/vulnerabilityJudge.test.ts
   ```

2. **Test Templates**
   ```bash
   npx tsx src/tests/templates.test.ts
   ```

3. **Test PDF Export**
   ```bash
   npx tsx src/tests/pdfExport.test.ts
   ```

4. **Test Visual Intelligence**
   ```bash
   npx tsx src/tests/visualIntelligence.test.ts
   ```

5. **Test Knowledge Base**
   ```bash
   npx tsx src/tests/knowledgeBase.test.ts
   ```

---

## Questions?

See `DYNAMIC_REASONING_README.md` for dynamic reasoning system.
See `AGENT_DIAGNOSTICS_SYSTEM.md` for diagnostic agents.

Both systems now integrate with Phase 2 features for comprehensive research quality control.
