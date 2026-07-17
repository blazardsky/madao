/** Whether a route pattern or built page pathname is the 404 error page. */
export declare function is404Pathname(pathname: string): boolean;
/** Whether a route pattern or pathname should be excluded from markdown generation. */
export declare function isExcluded(path: string, exclude: string[]): boolean;
/** Collect all built HTML files under outDir, skipping the markdown output folder. */
export declare function collectHtmlFiles(outDir: string, skipFolder?: string): Promise<string[]>;
/** Directory-style markdown path mirroring Astro's `build.format: 'directory'`. */
export declare function pathnameToMdRelative(pathname: string): string;
/**
 * Public URL for the markdown alternate of a page pathname.
 * Shared by the HTML `<link rel="alternate">` tag and the HTTP `Link` header
 * so both always resolve to the same path (e.g. `/md/about/index.md`).
 */
export declare function getMarkdownUrl(pathname: string, folder?: string): string;
/** @deprecated Prefer {@link getMarkdownUrl}. */
export declare function pathnameToMdUrl(pathname: string, folder: string): string;
/** Value for `Link: <url>; rel="alternate"; type="text/markdown"`. */
export declare function getMarkdownLinkHeader(pathname: string, folder?: string): string;
export declare function pathnameToHtmlCandidates(pathname: string): string[];
export declare function htmlPathToMdRelative(htmlRelative: string): string;
export declare function htmlPathToPathname(htmlRelative: string): string;
export declare function extractTitle(html: string): string | undefined;
/** Normalize a charset label for Content-Type (lowercase, trimmed). */
export declare function normalizeCharset(value: string | undefined | null): string;
/**
 * Read charset from a rendered HTML document's meta tags.
 * Prefers `<meta charset>`, then `http-equiv="content-type"`, then utf-8.
 */
export declare function extractCharset(html: string): string;
export declare function extractDescription(html: string): string | undefined;
export declare function extractMainContent(html: string): string;
export declare function mdRelativeToUrlPath(mdRelative: string, folder: string): string;
/** Section heading for llms.txt — root home is "Pages", otherwise the top-level folder name. */
export declare function getLlmsSectionName(pathname: string): string;
/**
 * Cloudflare Pages / Netlify `_headers` rules so `.md` and llms files are
 * served with an explicit charset. Without this, browsers often decode
 * `text/markdown` / `text/plain` as Latin-1 and turn `più` into `piÃ¹`.
 */
export declare function buildMadaoHeadersBlock(folder: string, charset?: string): string;
/** Merge madao charset rules into an existing `_headers` file body. */
export declare function mergeMadaoHeaders(existing: string | undefined, folder: string, charset?: string): string;
/** Set or replace the charset parameter on a Content-Type header value. */
export declare function withCharset(contentType: string, charset: string, fallbackType: string): string;
export declare function buildLlmsTxt(entries: {
    pathname: string;
    mdPath: string;
    title?: string;
}[], { title, description }: {
    title: string;
    description?: string;
}): string;
