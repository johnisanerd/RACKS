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
import chalk from 'chalk';
// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
function padRight(s, width) {
    // Strip ANSI before measuring length
    const clean = s.replace(/\x1b\[[0-9;]*m/g, '');
    const pad = width - clean.length;
    return pad > 0 ? s + ' '.repeat(pad) : s;
}
function formatElapsed(ms) {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0)
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
function truncate(s, max) {
    if (s.length <= max)
        return s;
    return s.slice(0, max - 3) + '...';
}
// ─────────────────────────────────────────────────────────────
// LIVE DISPLAY CLASS
// ─────────────────────────────────────────────────────────────
export class LiveDisplay {
    constructor() {
        // Active agent status lines — order of insertion preserved
        this.agentStatuses = new Map();
        // Current header state
        this.header = {
            question: '',
            iteration: 0,
            maxIterations: 12,
            coveragePct: 0,
            readyScore: 0,
            sourcesTotal: 0,
            activeAgents: 0,
            maxAgents: 7,
            elapsedMs: 0
        };
        // Whether display has been activated
        this.active = false;
        // How many lines we last drew for agent statuses
        this.lastAgentLineCount = 0;
        // How many lines the header occupies
        this.HEADER_LINES = 5; // box: top + 3 content + bottom
        // Buffered permanent log lines (shown after agent block)
        this.logBuffer = [];
    }
    // ── Public API ──────────────────────────────────────────────
    /**
     * Start the live display (clears screen, draws initial header).
     * Optionally seed the header state before first render.
     */
    start(initialHeader) {
        if (initialHeader)
            Object.assign(this.header, initialHeader);
        this.active = true;
        process.stdout.write('\x1b[?25l'); // hide cursor
        process.stdout.write('\x1b[2J\x1b[H'); // clear screen, move to top
        this.render();
    }
    /**
     * Stop the live display (restore cursor, leave final state on screen).
     */
    stop() {
        this.active = false;
        this.render(); // final render with all state
        process.stdout.write('\x1b[?25h'); // show cursor
        process.stdout.write('\n');
    }
    /**
     * Update partial header fields and re-render.
     */
    updateHeader(patch) {
        Object.assign(this.header, patch);
        if (this.active)
            this.render();
    }
    /**
     * Set or update an agent's status line.
     * agentId examples: "Agent-1", "Context-1", "Synthesis"
     */
    setAgentStatus(agentId, status) {
        this.agentStatuses.set(agentId, status);
        if (this.active)
            this.render();
    }
    /**
     * Remove an agent from the live status block (e.g. when it finishes).
     */
    clearAgent(agentId) {
        this.agentStatuses.delete(agentId);
        if (this.active)
            this.render();
    }
    /**
     * Emit a permanent log line (appended after the agent block).
     * Does NOT disappear when agents update.
     */
    logEvent(message) {
        this.logBuffer.push(message);
        if (this.active) {
            this.render();
        }
        else {
            // Fallback: just print normally
            process.stdout.write(message + '\n');
        }
    }
    /**
     * Full re-render: reposition cursor to top, redraw header + agents + log.
     */
    render() {
        const out = [];
        // Move cursor to top-left
        out.push('\x1b[H');
        // ── Header box ──────────────────────────────────────────
        const BOX_WIDTH = 58;
        const INNER = BOX_WIDTH - 2; // space inside │ chars
        const questionShort = truncate(this.header.question || 'Idle', INNER - 14);
        const title = `Billy — Researching: ${questionShort}`;
        const iterStr = `Iteration ${this.header.iteration}/${this.header.maxIterations}`;
        const covStr = `Coverage: ${this.header.coveragePct.toFixed(0)}%`;
        const readyStr = `Ready: ${this.header.readyScore.toFixed(2)}`;
        const row2 = `${iterStr}  |  ${covStr}  |  ${readyStr}`;
        const srcStr = `Sources: ${this.header.sourcesTotal.toLocaleString()}`;
        const agentStr = `Agents: ${this.header.activeAgents}/${this.header.maxAgents}`;
        const timeStr = `Time: ${formatElapsed(this.header.elapsedMs)}`;
        const row3 = `${srcStr}  |  ${agentStr}  |  ${timeStr}`;
        const border = chalk.cyan('╔' + '═'.repeat(BOX_WIDTH - 2) + '╗');
        const borderB = chalk.cyan('╚' + '═'.repeat(BOX_WIDTH - 2) + '╝');
        const side = chalk.cyan('║');
        const fmtRow = (content) => {
            const padded = padRight(content, INNER);
            return `${side} ${padded} ${side}`;
        };
        out.push(border);
        out.push(fmtRow(chalk.bold.white(truncate(title, INNER))));
        out.push(fmtRow(chalk.yellow(truncate(row2, INNER))));
        out.push(fmtRow(chalk.gray(truncate(row3, INNER))));
        out.push(borderB);
        // ── Agent status lines ───────────────────────────────────
        const agentEntries = Array.from(this.agentStatuses.entries());
        const agentLines = [];
        for (const [id, status] of agentEntries) {
            const label = chalk.bold.cyan(`[${id}]`);
            const line = `  ${label} ${status}`;
            // Truncate to terminal width - 2 to avoid wrapping
            const cols = process.stdout.columns || 120;
            agentLines.push(truncate(line.replace(/\x1b\[[0-9;]*m/g, ''), cols - 2));
        }
        // Blank out any extra lines from previous render (shrinking agent count)
        const blankLine = '\x1b[2K'; // erase current line
        const totalAgentLinesNow = agentLines.length;
        if (totalAgentLinesNow === 0 && this.agentStatuses.size === 0) {
            agentLines.push(chalk.gray('  (no active agents)'));
        }
        for (const line of agentLines) {
            out.push('\x1b[2K' + line); // clear line first, then write
        }
        // Erase leftover lines from previous render if we have fewer now
        const leftover = this.lastAgentLineCount - totalAgentLinesNow;
        for (let i = 0; i < leftover; i++) {
            out.push(blankLine);
        }
        this.lastAgentLineCount = totalAgentLinesNow;
        // ── Separator ────────────────────────────────────────────
        const cols = process.stdout.columns || 120;
        out.push(chalk.gray('─'.repeat(Math.min(cols, BOX_WIDTH))));
        // ── Permanent log lines (last 20 to prevent overflow) ────
        const recentLogs = this.logBuffer.slice(-20);
        for (const line of recentLogs) {
            out.push('\x1b[2K' + line);
        }
        // Erase to end of screen (clears stale content below)
        out.push('\x1b[J');
        process.stdout.write(out.join('\n'));
    }
}
// Singleton — import this everywhere
export const liveDisplay = new LiveDisplay();
//# sourceMappingURL=liveDisplay.js.map