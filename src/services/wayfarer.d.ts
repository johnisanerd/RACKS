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
export interface SearchResult {
    url: string;
    title: string;
    snippet: string;
    source: string;
}
export interface FetchedContent {
    url: string;
    title: string;
    content: string;
    metadata: Record<string, any>;
}
export interface WayfarerErrorResponse {
    error: true;
    message: string;
    data: [];
}
export interface ExtractedImage {
    src: string;
    alt: string;
    title?: string;
    contextText?: string;
}
export interface PageWithImages {
    url: string;
    title: string;
    content: string;
    images: ExtractedImage[];
    imageAnalysis?: string;
    metadata: Record<string, any>;
}
export declare class WayfarerService {
    private baseUrl;
    constructor(baseUrl?: string);
    /**
     * Search + scrape using the /research endpoint (main combined call)
     * Returns fully extracted page content
     */
    research(query: string, numResults?: number, concurrency?: number): Promise<FetchedContent[]>;
    /**
     * Batch-fetch a list of URLs directly (no search, just scrape)
     */
    fetchBatch(urls: string[]): Promise<FetchedContent[]>;
    /**
     * Fetch a single URL
     */
    fetch(url: string): Promise<FetchedContent | null>;
    /**
     * Search and return results — alias for research()
     */
    searchAndFetch(query: string, maxResults?: number): Promise<FetchedContent[]>;
    /**
     * Legacy search() — returns lightweight SearchResult objects
     */
    search(query: string, numPages?: number): Promise<SearchResult[]>;
    /**
     * Take a Playwright screenshot of a URL
     */
    screenshot(url: string): Promise<string | null>;
    /**
     * Analyze a page including visual content
     */
    extractImages(url: string): Promise<PageWithImages | null>;
    /**
     * Analyze image content with vision model
     */
    analyzeImageContent(url: string): Promise<{
        description: string;
        objects: string[];
        text: string[];
    } | null>;
    /**
     * Fetch URL with full image extraction
     */
    fetchWithImages(url: string): Promise<PageWithImages | null>;
    /**
     * Health check
     */
    healthCheck(): Promise<boolean>;
}
export declare const wayfarerService: WayfarerService;
//# sourceMappingURL=wayfarer.d.ts.map