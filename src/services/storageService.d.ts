/**
 * Storage Service — Artifact persistence for research tasks
 *
 * Saves all research artifacts to ~/research-output/{taskId}/
 * Includes: manifest, report, scraped pages, images, transcripts, findings
 */
import type { VideoTranscript } from './youtubeTranscriptService.js';
export interface TaskManifest {
    taskId: string;
    createdAt: number;
    updatedAt: number;
    sources: string[];
    stats: {
        pageCount: number;
        imageCount: number;
        transcriptCount: number;
        findingCount: number;
        totalTokens?: number;
    };
    [key: string]: unknown;
}
export declare class StorageService {
    /**
     * Create all subdirectories for a task, write an empty manifest, and
     * return the absolute path to the task folder.
     */
    initTask(taskId: string): Promise<string>;
    /**
     * Save a scraped web page as JSON.
     * File: web/{sanitized-url}.json
     */
    savePage(taskId: string, url: string, content: string, title: string): Promise<void>;
    /**
     * Save a downloaded image as JPEG (from base64) plus a .meta.json sidecar.
     * File: images/{hash}.jpg + images/{hash}.meta.json
     */
    saveImage(taskId: string, imageUrl: string, base64Data: string, metadata: object): Promise<void>;
    /**
     * Save a YouTube transcript as JSON.
     * File: transcripts/{videoId}.json
     */
    saveTranscript(taskId: string, transcript: VideoTranscript): Promise<void>;
    /**
     * Save research section findings as JSON.
     * File: findings/{sectionId}.json
     */
    saveFindings(taskId: string, sectionId: string, findings: object): Promise<void>;
    /**
     * Write the final markdown report.
     * File: report.md
     */
    saveReport(taskId: string, reportMarkdown: string): Promise<void>;
    /**
     * Merge arbitrary fields into manifest.json.
     * Accepts either a plain object or a mutator function (for internal use).
     */
    updateManifest(taskId: string, updates: object | ((manifest: TaskManifest) => void)): Promise<void>;
    /**
     * Return the absolute path to a task's output folder (does not create it).
     */
    getTaskDir(taskId: string): string;
}
export declare const storageService: StorageService;
//# sourceMappingURL=storageService.d.ts.map