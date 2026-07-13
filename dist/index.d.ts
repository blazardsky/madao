import type { AstroIntegration } from "astro";
export interface MadaoOptions {
    folder?: string;
    title?: string;
    description?: string;
    excludePaths?: string[];
}
export default function madao(options?: MadaoOptions): AstroIntegration;
