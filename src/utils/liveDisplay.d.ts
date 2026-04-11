/**
 * LiveDisplay — Real-time terminal display for Billy research sessions
 *
 * Architecture:
 * - Persistent header (box-drawing chars, always at top)
 * - Agent status lines (update in-place with ANSI cursor tricks)
 * - Permanent log stream below agent lines
 *
 * Uses process.stdout.write directly for cursor control.
 * All log.info() calls should be routed through liveDisplay.logEvent()
 * during an active session so they don't clobber the agent lines.
 */
export interface HeaderState {
    question: string;
    iteration: number;
    maxIterations: number;
    coveragePct: number;
    readyScore: number;
    sourcesTotal: number;
    activeAgents: number;
    maxAgents: number;
    elapsedMs: number;
}
export declare class LiveDisplay {
    private agentStatuses;
    private header;
    private active;
    private lastAgentLineCount;
    private readonly HEADER_LINES;
    private logBuffer;
    /**
     * Start the live display (clears screen, draws initial header).
     * Optionally seed the header state before first render.
     */
    start(initialHeader?: Partial<HeaderState>): void;
    /**
     * Stop the live display (restore cursor, leave final state on screen).
     */
    stop(): void;
    /**
     * Update partial header fields and re-render.
     */
    updateHeader(patch: Partial<HeaderState>): void;
    /**
     * Set or update an agent's status line.
     * agentId examples: "Agent-1", "Context-1", "Synthesis"
     */
    setAgentStatus(agentId: string, status: string): void;
    /**
     * Remove an agent from the live status block (e.g. when it finishes).
     */
    clearAgent(agentId: string): void;
    /**
     * Emit a permanent log line (appended after the agent block).
     * Does NOT disappear when agents update.
     */
    logEvent(message: string): void;
    /**
     * Full re-render: reposition cursor to top, redraw header + agents + log.
     */
    render(): void;
}
export declare const liveDisplay: LiveDisplay;
//# sourceMappingURL=liveDisplay.d.ts.map