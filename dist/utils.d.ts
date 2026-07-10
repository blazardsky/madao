/** Whether a route pattern or built page pathname is the 404 error page. */
export declare function is404Pathname(pathname: string): boolean;
/** Directory-style markdown path mirroring Astro's `build.format: 'directory'`. */
export declare function pathnameToMdRelative(pathname: string): string;
/** Public URL path for the markdown alternate link. */
export declare function pathnameToMdUrl(pathname: string, folder: string): string;
export declare function pathnameToHtmlCandidates(pathname: string): string[];
export declare function htmlPathToMdRelative(htmlRelative: string): string;
export declare function htmlPathToPathname(htmlRelative: string): string;
export declare function extractTitle(html: string): string | undefined;
export declare function extractDescription(html: string): string | undefined;
export declare function extractMainContent(html: string): string;
export declare function mdRelativeToUrlPath(mdRelative: string, folder: string): string;
/** Section heading for llms.txt — root home is "Pages", otherwise the top-level folder name. */
export declare function getLlmsSectionName(pathname: string): string;
export declare function buildLlmsTxt(entries: {
    pathname: string;
    mdPath: string;
    title?: string;
}[], { title, description }: {
    title: string;
    description?: string;
}): string;
