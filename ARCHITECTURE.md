# RACKS Architecture — Deep Research Agent

## Overview

RACKS (Reasoning Agents with Checkpointing and Knowledge Synthesis) is a deep research orchestration system that breaks down complex research questions into logical sections, researches them in parallel, and synthesizes findings into comprehensive reports.

## High-Level Flow

```
Question Input
    ↓
[PHASE 1: PLANNER] → Decompose into sections, generate search queries
    ↓
[PHASE 2-4: RESEARCH LOOP] → Research sections, reason about findings, analyze gaps
    ├─ Iterate: Generate → Research → Evaluate → Analyze
    └─ Stop when: Coverage threshold met OR Max iterations reached OR Plateau detected
    ↓
[PHASE 5: SYNTHESIS] → Generate final markdown report with citations
    ↓
Report Output
```

## Architecture Layers

### 1. **CLI Layer** (`src/cli/`)
Entry points for command-line interaction:
- `ask.ts` — Main research command with time/iteration limits
- `askFile.ts` — Research from markdown files with embedded constraints
- `dive.ts` — Deep dive on single URLs
- `resume.ts` — Resume interrupted research from checkpoint
- `query.ts` — Follow-up questions using RAG over previous findings
- `listTasks.ts` — List research tasks and their status

### 2. **Core Orchestration** (`src/core/`)
Main research orchestrator with phase-based architecture:

#### `orchestrator.ts` (Thin Coordinator)
- Coordinates the 5-phase research workflow
- Manages iteration loop and termination conditions
- Tracks research state (coverage, confidence, ready score)
- Delegates to phase modules for specific functionality

#### Phase Modules (`src/core/phases/`)

**`planner.ts`** — PHASE 1: Research Planning
- `planResearch(question)` → Decomposes question into 5-8 research sections
- `generateSearchQueries(section)` → Creates targeted search queries for each section
- Returns: `ResearchPlan` with sections, strategy, and resource estimates

**`researcher.ts`** — PHASE 2: Parallel Research Execution
- `researchSection(section, pool, queries)` → Deploys subagents to research one section
- Subagents execute queries in parallel via `SubagentPool`
- Aggregates findings: facts, quotes, statistics, source URLs
- YouTube transcript enrichment: queues video processing
- Reasoning layer: analyzes findings for insights and contradictions
- Confidence scoring: rates finding quality (0-1 scale)
- Returns: `SectionFindings` with facts, analysis, and confidence

**`reflector.ts`** — PHASE 3: Gap Analysis & Termination Logic
- `analyzeGaps(plan, findings)` → Identifies research gaps and weak areas
- `calculateCoverage()` → Percentage of sections researched
- `calculateConfidence()` → Average confidence across all sections
- `shouldContinueResearch()` → Determines if another iteration is needed
- Termination conditions: coverage threshold, max iterations, plateau detection

**`synthesizer.ts`** — PHASE 5: Report Generation
- `synthesizeReport(state)` → Transforms research findings into structured markdown report
- Per-section synthesis: LLM writes rigorous section summaries
- Cross-section synthesis: Identifies patterns and generates executive summary
- Final report: Headers, metadata, bibliography, proper citations
- Returns: Complete markdown report

### 3. **Subagent System** (`src/subagents/`)
Parallel research workers:

- `pool.ts` — SubagentPool: Manages worker lifecycle, concurrency, task queueing
  - `submit(task, signal)` → Dispatch async research task
  - `getStatus()` → Current pool metrics (active, queued, completed)
  - Supports AbortSignal for cancellation
  - Configurable concurrency (default: 7 parallel agents)

- `researcher.ts` — Research subagent role
  - Takes search query + context
  - Fetches content via Wayfarer
  - Extracts facts, quotes, statistics
  - Returns structured findings

- `analyzer.ts`, `monitor.ts` — Additional specialized roles

### 4. **Services** (`src/services/`)
Integration with external systems:

**`ollama.ts`** — Local LLM Inference
- Models: qwen3.5 (planning, extraction, reasoning, synthesis)
- Concurrency: 5 simultaneous requests
- Retries: 3 attempts with exponential backoff
- Typed errors: `OllamaError` with retryable flag

**`wayfarer.ts`** — Web Research & Content Fetching
- Search: Via SearXNG integration
- Scraping: Article extraction from URLs
- Screenshots: Playwright-based page capture
- Vision: Image analysis with Qwen vision model
- Error handling: Graceful degradation on failures

**`context1Service.ts`** — Vector Embeddings & Semantic Search
- Embedding model: nomic-embed-text (384-dim vectors)
- Storage: In-memory LRU cache (1000 entry max)
- Batch processing: Debounced 5s flushes, max 32 facts per batch
- Race condition protection: Atomic flags for concurrent flushes

**`youtubeTranscriptService.ts`** — YouTube Integration
- Transcript extraction: youtubei.js for reliability
- Queue system: Non-blocking batch processing (3 concurrent)
- Summarization: Qwen compression of long transcripts
- Persistence: Saved to task storage with metadata

**`knowledgeBase.ts`** — Persistent Vector Store
- Schema: SQLite with embedding storage
- RAG: Semantic search across sessions
- Methods: `indexFinding()`, `searchBySemanticSimilarity()`, `querySession()`
- Allows follow-up questions: "You found X, what about Y?"

**`storageService.ts`** — Persistence Layer
- Findings: Per-section serialization to SQLite
- Checkpoints: Full state snapshots for resume capability
- Reports: Final markdown to `~/research-output/`

**`summarizationService.ts`** — Fact Compression
- Compresses raw page text into key findings
- Deduplication: Identifies repeated facts across sources
- Confidence scoring: Estimates extraction quality

### 5. **Utilities** (`src/utils/`)

**`errors.ts`** — Typed Error Hierarchy
- `ResearchError`: Base with code + retryable flag
- `PlanningError`, `ExtractionError`, `SynthesisError`: Specific variants
- Proper error propagation instead of silent failures

**`logger.ts`** — Structured Logging
- Per-component loggers for debugging
- Log levels: info, warn, error

**`liveDisplay.ts`** — Real-Time CLI Feedback
- Live progress bar: Coverage %, sources, agents active
- Phase updates: Current stage and activity
- Event logging: Human-readable progress milestones

**`deduplicationCache.ts`** — Request Deduplication
- SHA256-based caching with TTL
- LRU eviction: Bounded memory usage
- Query deduplicator: Prevents redundant research

**`rateLimiter.ts`** — Service Backpressure Control
- Token bucket algorithm: Fair rate limiting
- Adaptive backoff: Multiplier-based slowdown on errors
- Service presets: Pre-configured limits for Ollama, Wayfarer, etc.

**`timeout.ts`** — Timeout & Resilience Patterns
- `withTimeout()`: Execute with deadline
- `CircuitBreaker`: Prevent cascading failures
- `retryWithBackoff()`: Exponential backoff retry helper
- Pre-configured timeouts: Network (5-60s), LLM (30-300s), Research (15s-2h)

**`responseValidator.ts`** — Response Sanitization
- HTTP status validation
- JSON schema validation
- Control character removal
- Array length bounds checking

## Data Flow

### Research Iteration
```
planResearch()
  ↓ ResearchPlan
researchSection(s1) || researchSection(s2) || ... [parallel]
  ↓
aggregateFindings()
  ↓ SectionFindings[]
scoreConfidence() + reasonAboutFindings()
  ↓
indexToVectorDB()
persistToStorage()
  ↓
evaluateMetrics(coverage, confidence, ready_score)
  ↓ Continue?
analyzeGaps()
  ↓ shouldContinueResearch()
  ├─ YES: Loop back, generate new queries
  └─ NO: Proceed to synthesis
```

### Finding Aggregation (Within Section)
```
Subagent 1: Query A → Pages → Extract facts/quotes/sources
Subagent 2: Query B → Pages → Extract facts/quotes/sources
Subagent 3: Query C → Pages → Extract facts/quotes/sources
  ↓
Merge results:
  - facts: [f1, f2, f3, ...]
  - sources: deduplicated URL set
  - statistics: key=value metadata
  ↓
Confidence Score:
  - Source count (30+ → 0.5, 75+ → 1.0)
  - Fact density (100+ facts → 1.0)
  - Source diversity (5+ types → 1.0)
  - Penalty: contradictions (-0.1 each), gaps (-0.05 each)
  ↓
Reasoning Analysis:
  - Key insights: patterns across sources
  - Contradictions: conflicting claims
  - Implications: practical meaning
  - Gaps: unanswered questions
```

## Configuration

### Environment Variables
```bash
VITE_OLLAMA_URL=http://localhost:11434
VITE_WAYFARER_URL=http://localhost:8889
VITE_SEARXNG_URL=http://localhost:8888
```

### Model Registry (`config/models.ts`)
```typescript
planning: 'qwen3.5:4b',      // Fast, good at decomposition
synthesis: 'qwen3.5:4b',     // High-quality prose
extraction: 'qwen3.5:4b',    // Fact extraction
embedding: 'nomic-embed-text' // 384-dim vectors
```

### Research Presets
| Preset | Time | Iterations | Features |
|--------|------|-----------|----------|
| Super Quick (SQ) | 5 min | 5 | Basic research |
| Quick (QK) | 30 min | 12 | — |
| Normal (NR) | 90 min | 30 | — |
| Extended (EX) | 2 hrs | 45 | Cross-validation, visual scouting |
| Maximum (MX) | 5 hrs | 100 | All features + deep visual analysis |

## Termination Conditions

Research loop terminates when ANY of these conditions is met:

1. **Coverage + Confidence Threshold**: `readyScore >= 0.8` (80% coverage × high confidence)
2. **Max Iterations**: Reached `maxIterations` (default: 12)
3. **Plateau Detection**: No improvement >1% for 2 consecutive iterations
4. **Time Budget**: Exceeded `timeoutMs` minus 120s synthesis reserve

## Error Recovery

### Retry Strategy
- **Ollama**: 3 attempts with 2s/4s backoff
- **Wayfarer**: Graceful degradation, continue with partial results
- **YouTube**: Queue-based, non-blocking, retried on next iteration
- **Context1**: Sparse embeddings on failure, marked for re-embedding

### Circuit Breaker
- Opens after 5 consecutive failures
- Half-open after 60s to attempt recovery
- Prevents cascading failures across dependent services

## Testing

### Unit Tests (`src/core/phases/__tests__/`)
- `planner.test.ts`: Plan decomposition, query generation
- `researcher.test.ts`: Finding aggregation, confidence scoring
- `reflector.test.ts`: Coverage calculation, termination logic
- `synthesizer.test.ts`: Report structure, metadata

### Integration Tests (`src/core/__tests__/`)
- `orchestrator.integration.test.ts`: Full workflow orchestration
- Config validation, state management, lifecycle

### Run Tests
```bash
npm test              # Run all tests
npm run test:watch   # Watch mode
npm run test:coverage # Coverage report
```

## Performance Characteristics

### Throughput Per Iteration
- Wayfarer search + scrape: ~4.5s for 8 pages
- Fact compression (Qwen): ~20s for 50KB text
- Reasoning analysis: ~15s for 50 facts
- **Total per section: ~40-55s (sequential), ~8-11s (parallel with 5 agents)**

### Scaling
- **1-hour research**: ~75 iterations, 300-500 sources analyzed, 100-150 unique findings
- **2-hour research**: ~120 iterations, 600-1000 sources, 200-300 findings, 0.75-0.82 confidence
- **12-hour research**: ~400-800 iterations, 3000-5000 sources, 600-1200 findings, 0.82-0.88 confidence

## Future Enhancements

1. **Checkpointing**: Pause/resume with SQLite snapshots
2. **Session Knowledge**: Accumulate findings across multiple research runs
3. **RAG Follow-ups**: Answer questions based on previous research
4. **Multi-Modal**: Integrate video, PDF, and document sources
5. **Parallel Orchestration**: Multiple questions researched simultaneously
6. **Custom Models**: Support user-provided models beyond Qwen

## File Structure
```
racks/
├── src/
│   ├── cli/
│   │   ├── commands/         # Command implementations
│   │   └── index.ts          # CLI entry point
│   ├── core/
│   │   ├── phases/           # Research phases (planner, researcher, reflector, synthesizer)
│   │   ├── orchestrator.ts   # Main coordinator
│   │   └── taskQueue.ts      # Task persistence
│   ├── services/             # External integrations (Ollama, Wayfarer, etc.)
│   ├── subagents/            # Research worker pool
│   ├── config/               # Model registry, service config, env validation
│   ├── utils/                # Error types, logging, validation, caching
│   └── types/                # TypeScript interfaces
├── tests/
│   ├── unit/                 # Unit tests per module
│   └── integration/          # Workflow integration tests
└── jest.config.js            # Test configuration
```
