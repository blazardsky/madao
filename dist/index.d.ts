import type { AstroIntegration } from "astro";
export interface MadaoOptions {
    folder?: string;
    title?: string;
    description?: string;
}
export default function madao(options?: string | MadaoOptions): AstroIntegration;
