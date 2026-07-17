import type { AstroIntegration } from "astro";
export { getMarkdownLinkHeader, getMarkdownUrl } from "./utils.js";
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
}
export default function madao(options?: MadaoOptions): AstroIntegration;
