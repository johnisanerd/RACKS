# RACKS — Deep Research Agent

A sophisticated multi-agent research orchestration system that decomposes complex research questions into focused sub-questions, deploys parallel research agents, and synthesizes findings into comprehensive reports.

## Overview

RACKS is designed to power long-running research sessions for complex topics like creative strategy research, competitive analysis, market research, and technical deep dives. It orchestrates research across thousands of web pages, YouTube videos, and documentation sites while maintaining real-time progress feedback and intelligent termination.

## Core Features

- **Decomposition** — Break complex questions into structured research sections
- **Parallel Research** — Deploy multiple agents to investigate different aspects simultaneously
- **Fact Extraction** — Extract and compress web pages into structured findings
- **Reflection** — Identify gaps and determine next research directions
- **Adaptive Termination** — Continue research while coverage < 90% and confidence < 0.8
- **Synthesis** — Generate comprehensive markdown reports from all gathered intelligence
- **Large-Scale Handling** — Support 1000+ sources and multi-hour research sessions
- **Real-Time Feedback** — Live CLI progress, agent activity, and coverage metrics

## Architecture

```
src/
├── cli/                    # Command-line interface
│   ├── commands/           # ask, dive, daemon commands
│   └── cli.ts              # CLI entry point
├── core/                   # Research orchestration
│   ├── orchestrator.ts     # Main research loop
│   ├── phases/             # Planner, Researcher, Reflector, Synthesizer
│   ├── taskQueue.ts        # Checkpoint persistence (SQLite)
│   └── state.ts            # Research state types
├── services/               # External service clients
│   ├── ollama.ts           # LLM inference
│   ├── wayfarer.ts         # Web scraping
│   ├── embedding.ts        # Vector embeddings
│   ├── youtube.ts          # Video transcripts
│   └── storage.ts          # Persistence layer
├── subagents/              # Research worker pool
│   ├── pool.ts             # Worker pool manager
│   ├── researcher.ts       # Research agent
│   ├── analyzer.ts         # Code/structure analysis
│   └── monitor.ts          # Task monitoring
├── config/                 # Configuration
│   ├── models.ts           # Model registry
│   ├── services.ts         # Service URLs & limits
│   └── env.ts              # Environment validation
└── utils/                  # Utilities
    ├── errors.ts           # Error types
    ├── deduplication.ts    # Fact deduplication
    └── validation.ts       # Input validation
```

## Quick Start

### Prerequisites

- **Node.js** 18+ with TypeScript
- **Ollama** running locally (default: `http://localhost:11434`)
- **Wayfarer** web scraping service (default: `http://localhost:8889`)
- **SearXNG** for web search (default: `http://localhost:8888`)

### Installation

```bash
git clone https://github.com/anthropics/racks.git
cd racks
npm install
npm run build
```

### Environment Setup

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

```
NODE_ENV=development
OLLAMA_URL=http://localhost:11434
WAYFARER_URL=http://localhost:8889
SEARXNG_URL=http://localhost:8888
LOG_LEVEL=info
```

### Running Research

Broad research on a complex topic:

```bash
npm run racks ask \
  --question "What are the key emerging trends in creative strategy for AI products?" \
  --time "2h" \
  --research-depth "extended"
```

Deep dive into a single source:

```bash
npm run racks dive \
  --url "https://github.com/anthropics/anthropic-sdk-python"
```

## Research Phases

### Phase 1: Planning
Decompose the question into focused research sections with clear objectives.

### Phase 2: Research
Deploy parallel agents to gather findings for each section.

### Phase 3: Reflection
Analyze coverage, identify gaps, and determine next research priorities.

### Phase 4: Synthesis
Aggregate findings and generate comprehensive markdown report.

## Model Registry

All LLM model assignments are centralized in `src/config/models.ts`:

```typescript
export const MODEL_REGISTRY = {
  planning: 'gemma4:e2b',
  synthesis: 'gemma3:20b',
  extraction: 'gemma4:e2b',
  embedding: 'nomic-embed-text',
  reflection: 'gemma4:e2b',
  summarization: 'gemma4:e2b',
  youtube_transcript: 'gemma4:e2b',
};
```

## Configuration

### Service URLs

All service endpoints are configured in `src/config/services.ts` and can be overridden via environment variables:

```
OLLAMA_URL          — LLM inference service (default: http://localhost:11434)
WAYFARER_URL        — Web scraping service (default: http://localhost:8889)
```

### Concurrency Limits

```typescript
subagents: {
  defaultConcurrency: 7,    // Initial parallel agents
  maxConcurrency: 25,       // Max when scaling up
  maxQueueSize: 100,        // Task queue limit
}
```

## Error Handling

RACKS provides typed error hierarchy for graceful error handling:

- `ResearchError` — Base error class
- `PlanningError` — Decomposition failures
- `ExtractionError` — Web page processing failures (retryable)
- `SynthesisError` — Report generation failures
- `SubagentError` — Worker task failures (retryable)
- `ServiceError` — External service timeouts/failures (retryable)
- `OllamaError` — LLM inference failures (retryable)
- `WayfarerError` — Web scraping failures (retryable)

All errors report whether they're retryable and maintain timestamp/context for logging.

## Testing

```bash
# Unit tests
npm run test:unit

# Integration tests (requires running services)
npm run test:integration

# End-to-end test
npm run test:e2e
```

## Development

```bash
# Build
npm run build

# Run in development
npm run dev

# Watch mode
npm run watch
```

## Roadmap

### Phase 1: Scaffolding (Current)
✅ Config centralization (models, services, env)
✅ Error hierarchy
⏳ Bug fixes and refactoring

### Phase 2: Core Stability
- Fix Promise chain anti-patterns
- Comprehensive error handling
- Service layer improvements
- Subagent pool enhancements

### Phase 3: Checkpointing
- SQLite-based state persistence
- Pause/resume research sessions
- Crash recovery

### Phase 4: Real-Time Feedback
- Live CLI progress bar
- Per-section updates
- Subagent activity display
- Elapsed time and ETA

### Phase 5: Adaptive Termination
- Confidence scoring per section
- Algorithm: continue while coverage < 90% OR confidence < 0.8
- Open-ended research sessions

## License

Proprietary — Built with Claude

## Contributing

This is a closed-source project. For questions or feedback, please refer to internal channels.
