import { readdir } from "node:fs/promises";
import path from "node:path";
/** Whether a route pattern or built page pathname is the 404 error page. */
export function is404Pathname(pathname) {
    return pathname.replace(/^\/|\/$/g, "") === "404";
}
function normalizeExcludePath(value) {
    let normalized = value.replace(/^\/+|\/+$/g, "");
    if (normalized.endsWith("/index.html")) {
        normalized = normalized.slice(0, -"/index.html".length);
    }
    else if (normalized.endsWith(".html")) {
        normalized = normalized.slice(0, -5);
    }
    if (normalized.endsWith("/index.md")) {
        normalized = normalized.slice(0, -"/index.md".length);
    }
    else if (normalized.endsWith(".md")) {
        normalized = normalized.slice(0, -3);
    }
    return normalized;
}
function matchesExcludeEntry(path, entry) {
    const isFolder = entry.endsWith("/");
    const normalizedPath = normalizeExcludePath(path);
    const normalizedEntry = normalizeExcludePath(entry);
    if (isFolder) {
        return normalizedPath === normalizedEntry || normalizedPath.startsWith(`${normalizedEntry}/`);
    }
    return normalizedPath === normalizedEntry;
}
/** Whether a route pattern or pathname should be excluded from markdown generation. */
export function isExcluded(path, exclude) {
    const unexclude = exclude.filter((entry) => entry.startsWith("!")).map((entry) => entry.slice(1));
    const excludeOnly = exclude.filter((entry) => !entry.startsWith("!"));
    if (unexclude.some((entry) => matchesExcludeEntry(path, entry))) {
        return false;
    }
    if (is404Pathname(path)) {
        return true;
    }
    return excludeOnly.some((entry) => matchesExcludeEntry(path, entry));
}
/** Collect all built HTML files under outDir, skipping the markdown output folder. */
export async function collectHtmlFiles(outDir, skipFolder) {
    const results = [];
    async function walk(dir) {
        const entries = await readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const full = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                const relative = path.relative(outDir, full).replace(/\\/g, "/");
                if (skipFolder && (relative === skipFolder || relative.startsWith(`${skipFolder}/`))) {
                    continue;
                }
                await walk(full);
            }
            else if (entry.name.endsWith(".html")) {
                results.push(full);
            }
        }
    }
    await walk(outDir);
    return results.sort();
}
/** Directory-style markdown path mirroring Astro's `build.format: 'directory'`. */
export function pathnameToMdRelative(pathname) {
    const normalized = pathname.replace(/\/$/, "") || "/";
    if (normalized === "/") {
        return "index.md";
    }
    const slug = normalized.replace(/^\//, "");
    return `${slug}/index.md`;
}
/**
 * Public URL for the markdown alternate of a page pathname.
 * Shared by the HTML `<link rel="alternate">` tag and the HTTP `Link` header
 * so both always resolve to the same path (e.g. `/md/about/index.md`).
 */
export function getMarkdownUrl(pathname, folder = "md") {
    const cleanFolder = folder.replace(/^\/|\/$/g, "") || "md";
    const mdRelative = pathnameToMdRelative(pathname);
    return `/${cleanFolder}/${mdRelative}`;
}
/** @deprecated Prefer {@link getMarkdownUrl}. */
export function pathnameToMdUrl(pathname, folder) {
    return getMarkdownUrl(pathname, folder);
}
/** Value for `Link: <url>; rel="alternate"; type="text/markdown"`. */
export function getMarkdownLinkHeader(pathname, folder = "md") {
    return `<${getMarkdownUrl(pathname, folder)}>; rel="alternate"; type="text/markdown"`;
}
export function pathnameToHtmlCandidates(pathname) {
    const normalized = pathname.replace(/\/$/, "") || "/";
    if (normalized === "/") {
        return ["index.html"];
    }
    const slug = normalized.replace(/^\//, "");
    return [`${slug}/index.html`, `${slug}.html`];
}
export function htmlPathToMdRelative(htmlRelative) {
    const posix = htmlRelative.replace(/\\/g, "/");
    if (posix === "index.html") {
        return "index.md";
    }
    if (posix.endsWith("/index.html")) {
        return posix.replace(/\/index\.html$/, "/index.md");
    }
    if (posix.endsWith(".html")) {
        const slug = posix.slice(0, -5);
        return `${slug}/index.md`;
    }
    return posix;
}
export function htmlPathToPathname(htmlRelative) {
    const posix = htmlRelative.replace(/\\/g, "/");
    if (posix === "index.html") {
        return "/";
    }
    if (posix.endsWith("/index.html")) {
        return `/${posix.slice(0, -"/index.html".length)}`;
    }
    if (posix.endsWith(".html")) {
        return `/${posix.slice(0, -5)}`;
    }
    return `/${posix}`;
}
export function extractTitle(html) {
    const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
    return match?.[1]?.trim();
}
const DEFAULT_CHARSET = "utf-8";
/** Normalize a charset label for Content-Type (lowercase, trimmed). */
export function normalizeCharset(value) {
    const trimmed = value?.trim();
    if (!trimmed) {
        return DEFAULT_CHARSET;
    }
    return trimmed.toLowerCase();
}
/**
 * Read charset from a rendered HTML document's meta tags.
 * Prefers `<meta charset>`, then `http-equiv="content-type"`, then utf-8.
 */
export function extractCharset(html) {
    for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
        const tag = match[0];
        const withoutContent = tag.replace(/\bcontent\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
        const directCharset = withoutContent.match(/\bcharset\s*=\s*["']?\s*([a-zA-Z0-9._-]+)/i);
        if (directCharset?.[1]) {
            return normalizeCharset(directCharset[1]);
        }
        if (!/\bhttp-equiv\s*=\s*["']?content-type["']?/i.test(tag)) {
            continue;
        }
        const content = tag.match(/\bcontent\s*=\s*["']([^"']*)["']/i)?.[1]
            ?? tag.match(/\bcontent\s*=\s*([^\s>]+)/i)?.[1];
        const charsetInContent = content?.match(/charset\s*=\s*([a-zA-Z0-9._-]+)/i)?.[1];
        if (charsetInContent) {
            return normalizeCharset(charsetInContent);
        }
    }
    return DEFAULT_CHARSET;
}
export function extractDescription(html) {
    const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i);
    if (match) {
        return match[1]?.trim();
    }
    const reverseMatch = html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
    return reverseMatch?.[1]?.trim();
}
export function extractMainContent(html) {
    const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
    if (mainMatch) {
        return mainMatch[1];
    }
    const articleMatch = html.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) {
        return articleMatch[1];
    }
    return html;
}
export function mdRelativeToUrlPath(mdRelative, folder) {
    return `/${folder}/${mdRelative.replace(/\\/g, "/")}`;
}
/** Section heading for llms.txt — root home is "Pages", otherwise the top-level folder name. */
export function getLlmsSectionName(pathname) {
    const normalized = pathname.replace(/\/$/, "") || "/";
    if (normalized === "/") {
        return "Pages";
    }
    const folder = normalized.replace(/^\//, "").split("/")[0];
    return folder.charAt(0).toUpperCase() + folder.slice(1);
}
const HEADERS_BEGIN = "# BEGIN astro-madao";
const HEADERS_END = "# END astro-madao";
/**
 * Cloudflare Pages / Netlify `_headers` rules so `.md` and llms files are
 * served with an explicit charset. Without this, browsers often decode
 * `text/markdown` / `text/plain` as Latin-1 and turn `più` into `piÃ¹`.
 */
export function buildMadaoHeadersBlock(folder, charset = DEFAULT_CHARSET) {
    const cleanFolder = folder.replace(/^\/|\/$/g, "");
    const encoding = normalizeCharset(charset);
    return [
        HEADERS_BEGIN,
        `/${cleanFolder}/*`,
        `  Content-Type: text/markdown; charset=${encoding}`,
        "",
        "/llms.txt",
        `  Content-Type: text/plain; charset=${encoding}`,
        "",
        "/llms-full.txt",
        `  Content-Type: text/plain; charset=${encoding}`,
        HEADERS_END,
        "",
    ].join("\n");
}
/** Merge madao charset rules into an existing `_headers` file body. */
export function mergeMadaoHeaders(existing, folder, charset = DEFAULT_CHARSET) {
    const block = buildMadaoHeadersBlock(folder, charset);
    const current = existing?.replace(/\r\n/g, "\n") ?? "";
    if (current.includes(HEADERS_BEGIN) && current.includes(HEADERS_END)) {
        return current.replace(new RegExp(`${HEADERS_BEGIN}[\\s\\S]*?${HEADERS_END}\\n?`), block);
    }
    if (!current.trim()) {
        return block;
    }
    return `${current.trimEnd()}\n\n${block}`;
}
/** Set or replace the charset parameter on a Content-Type header value. */
export function withCharset(contentType, charset, fallbackType) {
    const encoding = normalizeCharset(charset);
    const base = contentType || fallbackType;
    if (/charset=/i.test(base)) {
        return base.replace(/charset=[^;]*/i, `charset=${encoding}`);
    }
    return `${base}; charset=${encoding}`;
}
export function buildLlmsTxt(entries, { title, description }) {
    const grouped = new Map();
    for (const entry of entries) {
        const section = getLlmsSectionName(entry.pathname);
        const group = grouped.get(section) ?? [];
        group.push(entry);
        grouped.set(section, group);
    }
    const sections = [...grouped.keys()].sort((a, b) => {
        if (a === "Pages")
            return -1;
        if (b === "Pages")
            return 1;
        return a.localeCompare(b);
    });
    const lines = [`# ${title}`, ""];
    if (description) {
        lines.push(`> ${description}`, "");
    }
    for (const section of sections) {
        const group = grouped.get(section);
        if (!group)
            continue;
        lines.push(`## ${section}`, "");
        for (const { pathname, mdPath, title } of group) {
            const label = title ?? pathname;
            lines.push(`- [${label}](${mdPath})`);
        }
        lines.push("");
    }
    return lines.join("\n");
}
