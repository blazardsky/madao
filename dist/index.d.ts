import type { AstroIntegration } from "astro";
export interface MadaoOptions {
    folder?: string;
    title?: string;
    description?: string;
    exclude?: string[];
    /** @deprecated Use `exclude` instead. */
    excludePaths?: string[];
}
export default function madao(options?: MadaoOptions): AstroIntegration;
