/** Whether a route pattern or built page pathname is the 404 error page. */
export function is404Pathname(pathname) {
    return pathname.replace(/^\/|\/$/g, "") === "404";
}
function normalizeExcludePath(path) {
    return path.replace(/^\/+|\/+$/g, "");
}
function matchesExcludeEntry(path, entry) {
    const isFolder = entry.endsWith("/");
    const normalizedPath = normalizeExcludePath(path);
    const normalizedEntry = normalizeExcludePath(entry);
    if (isFolder) {
        return (normalizedPath === normalizedEntry ||
            normalizedPath.startsWith(`${normalizedEntry}/`));
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
/** Directory-style markdown path mirroring Astro's `build.format: 'directory'`. */
export function pathnameToMdRelative(pathname) {
    const normalized = pathname.replace(/\/$/, "") || "/";
    if (normalized === "/") {
        return "index.md";
    }
    const slug = normalized.replace(/^\//, "");
    return `${slug}/index.md`;
}
/** Public URL path for the markdown alternate link. */
export function pathnameToMdUrl(pathname, folder) {
    const mdRelative = pathnameToMdRelative(pathname);
    return `/${folder}/${mdRelative}`;
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
