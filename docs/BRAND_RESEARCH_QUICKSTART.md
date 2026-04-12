# Deep Brand Research — Quick Start Guide

## What It Does

The Deep Brand Research mode finds **1000+ sources** about a brand across all platforms:
- **TikTok videos, Instagram posts, YouTube channels**
- **Reddit communities, Twitter conversations**
- **Customer reviews and testimonials**
- **Product features and pricing**
- **Partnerships and funding**
- **Market position and competitors**
- **Company history and evolution**
- **Internet memes and cultural references**

## 30-Second Start

```bash
racks brand-research --brand "Based" --niche "social-commerce"
```

That's it. The system generates 80+ search queries across 8 platforms, finds 1000+ sources, and creates a comprehensive brand profile.

## Common Use Cases

### 1. Quick Brand Overview (5 minutes)
```bash
racks brand-research --brand "Notion" --depth light
```
**Gets:** 100-200 sources, quick snapshot of brand presence

### 2. Thorough Brand Research (30 minutes)
```bash
racks brand-research --brand "Figma" --depth standard
```
**Gets:** 300-500 sources, good coverage of all aspects

### 3. Deep Competitive Analysis (2 hours)
```bash
racks brand-research \
  --brand "Slack" \
  --niche "workplace communication" \
  --competitors "Teams,Discord" \
  --depth deep
```
**Gets:** 1000-1500 sources, comprehensive competitive landscape

### 4. Exhaustive Brand Profile (4-6 hours)
```bash
racks brand-research \
  --brand "Tesla" \
  --niche "electric vehicles" \
  --depth maximum \
  --target-sources 2000 \
  --export-pdf Tesla-Brand-Profile.pdf
```
**Gets:** 2000+ sources, publication-ready report

## Understanding the Output

### Phase-by-Phase Breakdown

The research generates 8 phases:

| Phase | Covers | Time | Sources |
|-------|--------|------|---------|
| 1. Brand Basics | Mission, products, pricing, founders | 15 min | 150+ |
| 2. Social Media | TikTok, Instagram, YouTube, Twitter, Reddit | 25 min | 200+ |
| 3. Customer Sentiment | Reviews, testimonials, complaints, discussion | 20 min | 150+ |
| 4. Products | Features, pricing tiers, comparisons, tutorials | 30 min | 200+ |
| 5. Partnerships | Investors, resellers, influencers, deals | 20 min | 150+ |
| 6. Market Position | Niche, competitors, unique value, trends | 20 min | 150+ |
| 7. History | Timeline, pivots, milestones, failures | 15 min | 100+ |
| 8. Internet Culture | Memes, viral moments, fan communities | 15 min | 100+ |

### Reading the Results

```
DEEP BRAND RESEARCH: Based (social-commerce)
============================================================

📋 Research Plan Ready:
  Phases: 8
  1. Brand Fundamentals (high)
  2. Social Media & Internet Presence (high)
  3. Customer Sentiment & Reviews (high)
  4. Products & Features Deep-Dive (high)
  5. Partnerships & Collaborations (high)
  6. Niche & Market Position (high)
  7. History & Evolution (high)
  8. Internet Culture & Relevance (medium)
  Total Estimated Sources: 1200

🔍 Search Strategy Ready:
  Total Queries: 84
  Platforms:
    • GENERAL: 14 queries, ~70 sources
    • TIKTOK: 10 queries, ~50 sources
    • INSTAGRAM: 9 queries, ~40 sources
    • YOUTUBE: 10 queries, ~50 sources
    • REDDIT: 11 queries, ~60 sources
    • TWITTER: 10 queries, ~45 sources
    • REVIEWS: 10 queries, ~50 sources
    • NEWS: 10 queries, ~35 sources
  Estimated Sources: 1200

📊 Research Summary:
  Brand: Based (social-commerce)
  Total Sources: 1247
  Research Phases: 8
  Source Diversity Score: 87.3%
  
  Recommendations:
    • Increase review sources (Instagram/TikTok review content)
    • Strong TikTok presence captured
    • Good Reddit community discussion
```

## Key Metrics Explained

### Source Diversity Score
- **Score:** 0-100% (higher is better)
- **What it means:** How evenly sources are spread across platforms
- **Target:** 75%+ means good balance, not over-reliant on one platform
- **Example gaps:** If score is 45%, might mean 70% of sources from TikTok alone

### Platform Breakdown
- **General Web:** Brand sites, blogs, articles (10-15%)
- **TikTok:** Videos, trends, viral content (12-18%)
- **Instagram:** Posts, aesthetic, content strategy (8-12%)
- **YouTube:** Channel, videos, reviews (8-12%)
- **Reddit:** Communities, discussions, honest opinions (10-15%)
- **Twitter:** Mentions, sentiment, news (8-12%)
- **Reviews:** Trustpilot, Google Reviews, testimonials (10-12%)
- **News:** Press releases, announcements, coverage (6-10%)

### Quality Indicators

**Good Research:**
✓ Diversity score 75%+  
✓ 1000+ sources total  
✓ All 8 phases have findings  
✓ Mix of official + community sources  

**Needs More Research:**
✗ Diversity score <60%  
✗ <500 sources  
✗ 1-2 phases missing  
✗ Heavily skewed to one platform  

## Advanced Options

### Export to PDF
```bash
racks brand-research \
  --brand "Notion" \
  --depth extended \
  --export-pdf Notion-Brand-Profile.pdf
```
Creates a professional report with all phases, findings, and citations.

### Export to JSON
```bash
racks brand-research \
  --brand "Notion" \
  --depth extended \
  --export-json notion-research.json
```
Raw data format for programmatic use or further analysis.

### Competitive Comparison
```bash
racks brand-research \
  --brand "Notion" \
  --competitors "Obsidian,OneNote,Roam" \
  --depth deep
```
Includes competitor comparisons and positioning gaps.

### Custom Target
```bash
racks brand-research \
  --brand "Notion" \
  --target-sources 1500 \
  --max-iterations 50
```
Override default iterations/sources for more/less research.

## Platform-Specific Insights

### TikTok Research
**Finds:**
- Official brand account and videos
- Trending sounds/trends using brand
- Creator collaborations
- User-generated content (UGC)
- TikTok-specific memes and trends

**Example queries:**
```
site:tiktok.com @brand_name
Brand TikTok trending viral
Brand TikTok transformation before/after
```

### Reddit Research
**Finds:**
- Dedicated subreddit (r/brand)
- Community size and engagement
- User opinions and experiences
- Common complaints and praise
- AMA threads with team

**Example queries:**
```
site:reddit.com r/brand
site:reddit.com brand review
Brand Reddit honest opinion vs alternatives
```

### Review Platforms
**Finds:**
- Overall ratings and sentiment
- Specific complaint patterns
- Success stories and testimonials
- Feature requests and missing features
- Customer service feedback

**Covered:**
- Trustpilot (most brands)
- Google Reviews (local/service brands)
- Amazon (if product on Amazon)
- G2 (B2B SaaS)
- Capterra (enterprise software)

## Depth Levels Explained

### Light (5 min)
- Basic brand info only
- 100-200 sources
- Fast, surface-level overview
- **Use when:** You just need quick facts

### Standard (30 min)
- All 8 phases covered
- 300-500 sources
- Good coverage
- **Use when:** Normal research needs

### Extended (90 min)
- Deeper per phase
- 600-900 sources
- Very comprehensive
- **Use when:** Competitive analysis needed

### Deep (2-3 hrs)
- Exhaustive phase coverage
- 1000-1500 sources
- Near-complete research
- **Use when:** Decision-critical research

### Maximum (4-6 hrs)
- Complete coverage
- 2000+ sources
- Publication-quality
- **Use when:** Creating formal reports

## Interpreting Findings

### What Each Phase Reveals

**Brand Basics** answers:
- What is this company?
- What problem do they solve?
- How much does it cost?
- Who founded it?

**Social Media** answers:
- Where is the brand online?
- How many followers?
- What content style?
- Who are they partnering with?

**Customer Sentiment** answers:
- Do people like this brand?
- What are complaints?
- Is it a scam?
- Does it have a cult following?

**Products** answers:
- What features?
- How does it compare to competitors?
- What's the pricing?
- How do I use it?

**Partnerships** answers:
- Who invests in this company?
- What brands partner with it?
- Where can I buy it?
- Is it acquiring or acquired?

**Market Position** answers:
- What niche is this?
- Who are the competitors?
- What's the market size?
- What's unique about it?

**History** answers:
- When was it founded?
- What changed over time?
- What major milestones?
- What failures happened?

**Internet Culture** answers:
- Are there memes?
- What do fans think?
- Is there drama or controversy?
- How relevant is it culturally?

## Troubleshooting

### "Only 200 sources found" (wanted 1000)
**Solutions:**
1. Use `--depth maximum` instead of light/standard
2. Try `--target-sources 1500` to push harder
3. Verify brand name spelling
4. Smaller brands may legitimately have fewer sources

### "Skewed to TikTok (80% of sources)"
**Solutions:**
1. Run again with `--depth extended` to force other platform queries
2. The reflection agent will auto-detect and rebalance
3. May indicate TikTok is genuinely the primary platform (e.g., app brand)

### "Research is slow"
**Solutions:**
1. Use `--depth light` instead of maximum
2. Split into multiple runs (social media first, then products)
3. Reduce parallel agents (internal setting)

### "Some phases have no sources"
**Solutions:**
1. Brand may not have strong presence in that area
2. Try broader search: remove `--niche` filter
3. Add `--website` to help system find brand info
4. Run `--depth extended` to force more thorough search

## Common Patterns

### Young Startup (1-2 years)
Typically:
- Strong TikTok/Instagram (founders are young)
- Active Reddit communities (tech-savvy early users)
- Limited news coverage
- Few reviews yet
- Small social follower counts

### Established SaaS (5+ years)
Typically:
- Balanced social presence (all platforms)
- Lots of customer reviews
- News coverage and press mentions
- Active communities
- Detailed product documentation

### Consumer Brand (10+ years)
Typically:
- Strong Instagram/TikTok
- High review volume
- Celebrity/influencer partnerships
- Significant news coverage
- Established market position

### B2B Enterprise
Typically:
- Strong LinkedIn presence
- Industry publication coverage
- Limited TikTok/Instagram
- Technical documentation focus
- Analyst reports (Gartner, Forrester)

## Next Steps

1. **Start with standard depth:**
   ```bash
   racks brand-research --brand "YourBrand" --depth standard
   ```

2. **Check the diversity report** to see if more research needed

3. **Export to PDF** if making presentation:
   ```bash
   racks brand-research --brand "YourBrand" --export-pdf report.pdf
   ```

4. **For competitive analysis, include competitors:**
   ```bash
   racks brand-research --brand "YourBrand" --competitors "Comp1,Comp2"
   ```

## Questions?

See `DEEP_BRAND_RESEARCH.md` for complete documentation covering:
- All 8 phases in detail
- Query generation strategy
- Source tracking and diversity
- Integration architecture
- Advanced usage patterns
