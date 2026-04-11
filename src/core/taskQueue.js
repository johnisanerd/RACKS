/**
 * Deep Research Task Queue — SQLite persistence + daemon management
 *
 * Handles:
 * - Task storage (pending → running → completed/failed)
 * - Task scheduling (now, time, window, cron)
 * - Queue operations (enqueue, dequeue, pause, resume)
 * - Checkpoint system (resume from interrupted tasks)
 */
import Database from 'better-sqlite3';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';
import { EventEmitter } from 'events';
// ─────────────────────────────────────────────────────────────
// TASK QUEUE MANAGER
// ─────────────────────────────────────────────────────────────
export class DeepResearchTaskQueue extends EventEmitter {
    constructor(dbPath) {
        super();
        // Default path: ~/.deep-research/tasks.db
        this.dbPath = dbPath || path.join(os.homedir(), '.deep-research', 'tasks.db');
        // Ensure directory exists
        const dir = path.dirname(this.dbPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        // Initialize database
        this.db = new Database(this.dbPath);
        this.initSchema();
    }
    // ─────────────────────────────────────────────────────────────
    // SCHEMA
    // ─────────────────────────────────────────────────────────────
    initSchema() {
        const schema = `
      CREATE TABLE IF NOT EXISTS tasks (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        question TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed', 'cancelled', 'paused')),

        scheduleType TEXT NOT NULL DEFAULT 'now' CHECK(scheduleType IN ('now', 'at_time', 'time_window', 'cron')),
        scheduledTime INTEGER,
        timeWindowStart INTEGER,
        timeWindowEnd INTEGER,
        cronExpression TEXT,

        createdAt INTEGER NOT NULL,
        startedAt INTEGER,
        completedAt INTEGER,
        timeoutMs INTEGER,

        progressPercent INTEGER DEFAULT 0,
        currentIteration INTEGER DEFAULT 0,
        maxIterations INTEGER,
        coverage REAL,
        confidence REAL,
        readyScore REAL,

        reportPath TEXT,
        errorMessage TEXT,

        checkpointIteration INTEGER,
        checkpointFindings TEXT,
        checkpointTimestamp INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_status ON tasks(status);
      CREATE INDEX IF NOT EXISTS idx_created ON tasks(createdAt DESC);
      CREATE INDEX IF NOT EXISTS idx_scheduled ON tasks(scheduledTime);
    `;
        schema.split(';').forEach(statement => {
            if (statement.trim()) {
                this.db.exec(statement);
            }
        });
    }
    // ─────────────────────────────────────────────────────────────
    // TASK OPERATIONS
    // ─────────────────────────────────────────────────────────────
    /**
     * Create a new task
     */
    createTask(task) {
        const id = task.id || this.generateTaskId();
        const stmt = this.db.prepare(`
      INSERT INTO tasks (
        id, name, question, status, scheduleType,
        scheduledTime, timeWindowStart, timeWindowEnd, cronExpression,
        createdAt, timeoutMs, maxIterations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        stmt.run(id, task.name || 'Untitled Research', task.question || '', task.status || 'pending', task.scheduleType || 'now', task.scheduledTime || null, task.timeWindow?.start || null, task.timeWindow?.end || null, task.cronExpression || null, task.createdAt || Date.now(), task.timeoutMs || null, task.maxIterations || 12);
        this.emit('taskCreated', { id });
        return this.getTask(id);
    }
    /**
     * Get task by ID
     */
    getTask(id) {
        const stmt = this.db.prepare('SELECT * FROM tasks WHERE id = ?');
        const row = stmt.get(id);
        if (!row)
            return null;
        return this.rowToTask(row);
    }
    /**
     * List tasks with optional filtering
     */
    listTasks(filter) {
        let query = 'SELECT * FROM tasks';
        const params = [];
        if (filter?.status) {
            query += ' WHERE status = ?';
            params.push(filter.status);
        }
        query += ' ORDER BY createdAt DESC';
        if (filter?.limit) {
            query += ' LIMIT ?';
            params.push(filter.limit);
        }
        const stmt = this.db.prepare(query);
        const rows = stmt.all(...params);
        return rows.map(row => this.rowToTask(row));
    }
    /**
     * Update task progress
     */
    updateProgress(id, progress) {
        const updates = [];
        const values = [];
        if (progress.progressPercent !== undefined) {
            updates.push('progressPercent = ?');
            values.push(progress.progressPercent);
        }
        if (progress.currentIteration !== undefined) {
            updates.push('currentIteration = ?');
            values.push(progress.currentIteration);
        }
        if (progress.coverage !== undefined) {
            updates.push('coverage = ?');
            values.push(progress.coverage);
        }
        if (progress.confidence !== undefined) {
            updates.push('confidence = ?');
            values.push(progress.confidence);
        }
        if (progress.readyScore !== undefined) {
            updates.push('readyScore = ?');
            values.push(progress.readyScore);
        }
        if (updates.length === 0)
            return;
        values.push(id);
        const stmt = this.db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`);
        stmt.run(...values);
        this.emit('progressUpdated', { id, progress });
    }
    /**
     * Set task status
     */
    setStatus(id, status, options) {
        const updates = ['status = ?'];
        const values = [status];
        if (status === 'running' && !this.getTask(id)?.startedAt) {
            updates.push('startedAt = ?');
            values.push(Date.now());
        }
        if (status === 'completed' || status === 'failed' || status === 'cancelled') {
            updates.push('completedAt = ?');
            values.push(Date.now());
        }
        if (options?.errorMessage) {
            updates.push('errorMessage = ?');
            values.push(options.errorMessage);
        }
        if (options?.reportPath) {
            updates.push('reportPath = ?');
            values.push(options.reportPath);
        }
        values.push(id);
        const stmt = this.db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`);
        stmt.run(...values);
        this.emit('statusChanged', { id, status });
    }
    /**
     * Save checkpoint
     */
    saveCheckpoint(id, iteration, findings) {
        const stmt = this.db.prepare(`
      UPDATE tasks SET
        checkpointIteration = ?,
        checkpointFindings = ?,
        checkpointTimestamp = ?
      WHERE id = ?
    `);
        stmt.run(iteration, findings, Date.now(), id);
        this.emit('checkpointSaved', { id, iteration });
    }
    /**
     * Get next pending task
     */
    getNextPendingTask() {
        const now = Date.now();
        const stmt = this.db.prepare(`
      SELECT * FROM tasks WHERE status = 'pending'
      AND (
        scheduleType = 'now'
        OR (scheduleType = 'at_time' AND scheduledTime <= ?)
        OR (scheduleType = 'time_window' AND timeWindowStart <= ?)
      )
      ORDER BY createdAt ASC
      LIMIT 1
    `);
        const row = stmt.get(now, now);
        return row ? this.rowToTask(row) : null;
    }
    /**
     * Get statistics
     */
    getStats() {
        const stmt = this.db.prepare(`
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'running' THEN 1 ELSE 0 END) as running,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        AVG(CASE WHEN status IN ('completed', 'failed') AND startedAt IS NOT NULL THEN (completedAt - startedAt) ELSE NULL END) as avgDuration
      FROM tasks
    `);
        const row = stmt.get();
        return {
            totalTasks: row.total || 0,
            pending: row.pending || 0,
            running: row.running || 0,
            completed: row.completed || 0,
            failed: row.failed || 0,
            cancelled: row.cancelled || 0,
            avgDuration: row.avgDuration || 0
        };
    }
    // ─────────────────────────────────────────────────────────────
    // UTILITIES
    // ─────────────────────────────────────────────────────────────
    generateTaskId() {
        const now = new Date();
        const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
        const random = Math.random().toString(36).substring(2, 5).toUpperCase();
        return `task-${date}-${random}`;
    }
    rowToTask(row) {
        return {
            id: row.id,
            name: row.name,
            question: row.question,
            status: row.status,
            scheduleType: row.scheduleType,
            scheduledTime: row.scheduledTime,
            timeWindow: row.timeWindowStart ? { start: row.timeWindowStart, end: row.timeWindowEnd } : undefined,
            cronExpression: row.cronExpression,
            createdAt: row.createdAt,
            startedAt: row.startedAt,
            completedAt: row.completedAt,
            timeoutMs: row.timeoutMs,
            progressPercent: row.progressPercent,
            currentIteration: row.currentIteration,
            maxIterations: row.maxIterations,
            coverage: row.coverage,
            confidence: row.confidence,
            readyScore: row.readyScore,
            reportPath: row.reportPath,
            errorMessage: row.errorMessage,
            checkpoint: row.checkpointIteration ? {
                iteration: row.checkpointIteration,
                findings: row.checkpointFindings,
                timestamp: row.checkpointTimestamp
            } : undefined
        };
    }
    /**
     * Close database connection
     */
    close() {
        this.db.close();
    }
}
export const createTaskQueue = (dbPath) => new DeepResearchTaskQueue(dbPath);
//# sourceMappingURL=taskQueue.js.map