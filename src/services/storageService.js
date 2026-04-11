/**
 * Storage Service — Artifact persistence for research tasks
 *
 * Saves all research artifacts to ~/research-output/{taskId}/
 * Includes: manifest, report, scraped pages, images, transcripts, findings
 */
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { createLogger } from './logger.js';
const log = createLogger('storageService');
const OUTPUT_DIR = path.join(os.homedir(), 'research-output');
// ─────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────
/**
 * Convert a URL into a safe filename component (max 80 chars).
 * Strips protocol, replaces non-alphanumeric with underscores.
 */
function sanitizeUrl(url) {
    return url
        .replace(/^https?:\/\//, '')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .substring(0, 80);
}
/**
 * SHA-1 hex digest of a string (short — first 16 chars for filenames).
 */
function hashString(input) {
    return crypto.createHash('sha1').update(input).digest('hex').substring(0, 16);
}
// ─────────────────────────────────────────────────────────────
// SERVICE
// ─────────────────────────────────────────────────────────────
export class StorageService {
    /**
     * Create all subdirectories for a task, write an empty manifest, and
     * return the absolute path to the task folder.
     */
    async initTask(taskId) {
        const taskDir = this.getTaskDir(taskId);
        // Create subdirectories in parallel
        await Promise.all([
            fs.mkdir(taskDir, { recursive: true }),
            fs.mkdir(path.join(taskDir, 'web'), { recursive: true }),
            fs.mkdir(path.join(taskDir, 'images'), { recursive: true }),
            fs.mkdir(path.join(taskDir, 'transcripts'), { recursive: true }),
            fs.mkdir(path.join(taskDir, 'findings'), { recursive: true }),
        ]);
        const manifest = {
            taskId,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            sources: [],
            stats: {
                pageCount: 0,
                imageCount: 0,
                transcriptCount: 0,
                findingCount: 0,
            },
        };
        await fs.writeFile(path.join(taskDir, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf-8');
        log.info(`Task directory initialised: ${taskDir}`);
        return taskDir;
    }
    /**
     * Save a scraped web page as JSON.
     * File: web/{sanitized-url}.json
     */
    async savePage(taskId, url, content, title) {
        const taskDir = this.getTaskDir(taskId);
        const filename = `${sanitizeUrl(url)}.json`;
        const filePath = path.join(taskDir, 'web', filename);
        const payload = { url, title, content, timestamp: Date.now() };
        await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf-8');
        // Update manifest
        await this.updateManifest(taskId, (m) => {
            if (!m.sources.includes(url))
                m.sources.push(url);
            m.stats.pageCount = (m.stats.pageCount ?? 0) + 1;
        });
        log.info(`Saved page: ${url}`);
    }
    /**
     * Save a downloaded image as JPEG (from base64) plus a .meta.json sidecar.
     * File: images/{hash}.jpg + images/{hash}.meta.json
     */
    async saveImage(taskId, imageUrl, base64Data, metadata) {
        const taskDir = this.getTaskDir(taskId);
        const hash = hashString(imageUrl);
        const imgPath = path.join(taskDir, 'images', `${hash}.jpg`);
        const metaPath = path.join(taskDir, 'images', `${hash}.meta.json`);
        // Strip optional data-URI prefix
        const raw = base64Data.replace(/^data:image\/[^;]+;base64,/, '');
        const buffer = Buffer.from(raw, 'base64');
        await Promise.all([
            fs.writeFile(imgPath, buffer),
            fs.writeFile(metaPath, JSON.stringify({ url: imageUrl, ...metadata, savedAt: Date.now() }, null, 2), 'utf-8'),
        ]);
        // Update manifest
        await this.updateManifest(taskId, (m) => {
            m.stats.imageCount = (m.stats.imageCount ?? 0) + 1;
        });
        log.info(`Saved image: ${imageUrl} → ${hash}.jpg`);
    }
    /**
     * Save a YouTube transcript as JSON.
     * File: transcripts/{videoId}.json
     */
    async saveTranscript(taskId, transcript) {
        const taskDir = this.getTaskDir(taskId);
        const filePath = path.join(taskDir, 'transcripts', `${transcript.videoId}.json`);
        await fs.writeFile(filePath, JSON.stringify({ ...transcript, savedAt: Date.now() }, null, 2), 'utf-8');
        // Update manifest
        await this.updateManifest(taskId, (m) => {
            if (!m.sources.includes(transcript.videoUrl))
                m.sources.push(transcript.videoUrl);
            m.stats.transcriptCount = (m.stats.transcriptCount ?? 0) + 1;
        });
        log.info(`Saved transcript: ${transcript.videoId}`);
    }
    /**
     * Save research section findings as JSON.
     * File: findings/{sectionId}.json
     */
    async saveFindings(taskId, sectionId, findings) {
        const taskDir = this.getTaskDir(taskId);
        const filePath = path.join(taskDir, 'findings', `${sectionId}.json`);
        await fs.writeFile(filePath, JSON.stringify({ sectionId, ...findings, savedAt: Date.now() }, null, 2), 'utf-8');
        // Update manifest
        await this.updateManifest(taskId, (m) => {
            m.stats.findingCount = (m.stats.findingCount ?? 0) + 1;
        });
        log.info(`Saved findings: ${sectionId}`);
    }
    /**
     * Write the final markdown report.
     * File: report.md
     */
    async saveReport(taskId, reportMarkdown) {
        const taskDir = this.getTaskDir(taskId);
        const filePath = path.join(taskDir, 'report.md');
        await fs.writeFile(filePath, reportMarkdown, 'utf-8');
        await this.updateManifest(taskId, (m) => {
            m.reportSavedAt = Date.now();
        });
        log.info(`Saved report for task ${taskId}`);
    }
    /**
     * Merge arbitrary fields into manifest.json.
     * Accepts either a plain object or a mutator function (for internal use).
     */
    async updateManifest(taskId, updates) {
        const manifestPath = path.join(this.getTaskDir(taskId), 'manifest.json');
        let manifest;
        try {
            const raw = await fs.readFile(manifestPath, 'utf-8');
            manifest = JSON.parse(raw);
        }
        catch {
            // If manifest doesn't exist yet, build a minimal one
            manifest = {
                taskId,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                sources: [],
                stats: { pageCount: 0, imageCount: 0, transcriptCount: 0, findingCount: 0 },
            };
        }
        if (typeof updates === 'function') {
            updates(manifest);
        }
        else {
            Object.assign(manifest, updates);
        }
        manifest.updatedAt = Date.now();
        await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    }
    /**
     * Return the absolute path to a task's output folder (does not create it).
     */
    getTaskDir(taskId) {
        return path.join(OUTPUT_DIR, taskId);
    }
}
export const storageService = new StorageService();
//# sourceMappingURL=storageService.js.map