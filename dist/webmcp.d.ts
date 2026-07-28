/** Opt-in WebMCP config. Prefer `webmcp: true` for the MD reading tool. */
export type WebmcpOption = boolean | {
    enabled?: boolean;
    /** Register `read_page_markdown` (default true when enabled). */
    markdownTool?: boolean;
};
export declare function resolveWebmcp(webmcp?: WebmcpOption): {
    enabled: boolean;
    markdownTool: boolean;
};
/** Tool name registered with `document.modelContext.registerTool`. */
export declare const WEBMCP_MARKDOWN_TOOL_NAME = "read_page_markdown";
/**
 * Client bootstrap for `injectScript("head-inline", ...)`.
 *
 * Follows the Chrome Imperative API:
 * https://developer.chrome.com/docs/ai/webmcp/imperative-api
 * - `await document.modelContext.registerTool(...)`
 * - `execute` returns a string
 * - `annotations.readOnlyHint` for non-mutating tools
 *
 * Waits briefly for `document.modelContext` because head-inline can run
 * before the API is attached.
 */
export declare const WEBMCP_CLIENT_SCRIPT: string;
