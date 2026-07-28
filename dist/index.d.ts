import type { AstroIntegration } from "astro";
import { type WebmcpOption } from "./webmcp.js";
export { getMarkdownLinkHeader, getMarkdownUrl } from "./utils.js";
export { resolveWebmcp, WEBMCP_MARKDOWN_TOOL_NAME, type WebmcpOption, } from "./webmcp.js";
export interface MadaoOptions {
    folder?: string;
    title?: string;
    description?: string;
    exclude?: string[];
    /** @deprecated Use `exclude` instead. */
    excludePaths?: string[];
    /**
     * When true (default), append an HTTP `Link` header pointing at the
     * markdown alternate on every HTML response.
     */
    httpHeader?: boolean;
    /**
     * Opt-in WebMCP: register a read-only tool that fetches this page's
     * Markdown alternate. Disabled by default. Use `true` or
     * `{ enabled: true }`.
     */
    webmcp?: WebmcpOption;
}
export default function madao(options?: MadaoOptions): AstroIntegration;
