/**
 * Wayfarer Service — Web research and content fetching
 * Wraps Wayfarer API at http://100.74.135.83:8891
 *
 * Endpoints:
 *   POST /research       — search + scrape + extract (main endpoint)
 *   POST /crawl/batch   — batch URL scraping
 *   POST /screenshot     — Playwright screenshot
 *   POST /analyze-page  — page analysis with optional vision
 */
import { createLogger } from '../utils/logger.js';
const log = createLogger('wayfarer');
export class WayfarerService {
    constructor(baseUrl = process.env.WAYFARER_URL || process.env.VITE_WAYFARER_URL || 'http://localhost:8889') {
        this.baseUrl = baseUrl;
    }
    /**
     * Search + scrape using the /research endpoint (main combined call)
     * Returns fully extracted page content
     */
    async research(query, numResults = 8, concurrency = 20) {
        try {
            log.info(`Research: "${query}" (${numResults} results)`);
            const response = await fetch(`${this.baseUrl}/research`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query,
                    num_results: numResults,
                    concurrency,
                    extract_mode: 'article'
                })
            });
            if (!response.ok) {
                throw new Error(`Research failed: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            // Handle both `pages` and `results` response shapes
            const pages = data.pages || data.results || [];
            return pages
                .filter((p) => p && (p.text || p.content))
                .map((p) => ({
                url: p.url || p.source || '',
                title: p.title || 'Untitled',
                content: p.text || p.content || '',
                metadata: {
                    snippet: p.snippet || p.description || '',
                    fetchedAt: Date.now(),
                    ...(p.metadata || {})
                }
            }));
        }
        catch (error) {
            const message = error instanceof Error ? error.message : 'unknown';
            log.error('Research failed', { error: message });
            return [];
        }
    }
    /**
     * Batch-fetch a list of URLs directly (no search, just scrape)
     */
    async fetchBatch(urls) {
        try {
            log.info(`Batch fetching ${urls.length} URLs`);
            const response = await fetch(`${this.baseUrl}/crawl/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ urls, extract_mode: 'article' })
            });
            if (!response.ok) {
                throw new Error(`Batch fetch failed: ${response.status}`);
            }
            const data = await response.json();
            const pages = data.pages || data.results || [];
            return pages
                .filter((p) => p && (p.text || p.content))
                .map((p) => ({
                url: p.url || '',
                title: p.title || 'Untitled',
                content: p.text || p.content || '',
                metadata: p.metadata || {}
            }));
        }
        catch (error) {
            log.error('Batch fetch failed', { error });
            return [];
        }
    }
    /**
     * Fetch a single URL
     */
    async fetch(url) {
        const results = await this.fetchBatch([url]);
        return results[0] || null;
    }
    /**
     * Search and return results — alias for research()
     */
    async searchAndFetch(query, maxResults = 8) {
        return this.research(query, maxResults);
    }
    /**
     * Legacy search() — returns lightweight SearchResult objects
     */
    async search(query, numPages = 5) {
        const pages = await this.research(query, numPages * 5);
        return pages.map(p => ({
            url: p.url,
            title: p.title,
            snippet: (p.content || '').slice(0, 200),
            source: p.metadata?.source || p.url
        }));
    }
    /**
     * Take a Playwright screenshot of a URL
     */
    async screenshot(url) {
        try {
            log.info(`Screenshot: ${url}`);
            const response = await fetch(`${this.baseUrl}/screenshot`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            if (!response.ok)
                return null;
            const data = await response.json();
            return data.screenshot || data.image || null; // base64 JPEG
        }
        catch (error) {
            log.error(`Screenshot failed for ${url}`, { error });
            return null;
        }
    }
    /**
     * Analyze a page including visual content
     */
    async extractImages(url) {
        try {
            log.info(`Analyzing page: ${url}`);
            const response = await fetch(`${this.baseUrl}/analyze-page`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            if (!response.ok)
                return null;
            const data = await response.json();
            const images = (data.images || []).map((img) => ({
                src: img.src || '',
                alt: img.alt || '',
                title: img.title,
                contextText: img.context
            }));
            return {
                url,
                title: data.title || 'Untitled',
                content: data.content || data.text || '',
                images,
                imageAnalysis: data.visual_analysis,
                metadata: data.metadata || {}
            };
        }
        catch (error) {
            log.error(`Page analysis failed for ${url}`, { error });
            return null;
        }
    }
    /**
     * Analyze image content with vision model
     */
    async analyzeImageContent(url) {
        try {
            const response = await fetch(`${this.baseUrl}/analyze-page`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url, analyze_images: true })
            });
            if (!response.ok)
                return null;
            const data = await response.json();
            return {
                description: data.image_description || '',
                objects: data.detected_objects || [],
                text: data.extracted_text || []
            };
        }
        catch (error) {
            log.error(`Image analysis failed for ${url}`, { error });
            return null;
        }
    }
    /**
     * Fetch URL with full image extraction
     */
    async fetchWithImages(url) {
        const imageData = await this.extractImages(url);
        if (imageData)
            return imageData;
        const textContent = await this.fetch(url);
        if (!textContent)
            return null;
        return {
            url,
            title: textContent.title,
            content: textContent.content,
            images: [],
            metadata: textContent.metadata
        };
    }
    /**
     * Health check
     */
    async healthCheck() {
        try {
            const response = await fetch(`${this.baseUrl}/health`);
            return response.ok;
        }
        catch {
            return false;
        }
    }
}
export const wayfarerService = new WayfarerService();
//# sourceMappingURL=wayfarer.js.map