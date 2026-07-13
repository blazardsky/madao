/** Whether a route pattern or built page pathname is the 404 error page. */
export function is404Pathname(pathname: string): boolean {
	return pathname.replace(/^\/|\/$/g, "") === "404";
}

function normalizeExcludePath(path: string): string {
	return path.replace(/^\/+|\/+$/g, "");
}

function matchesExcludeEntry(path: string, entry: string): boolean {
	const isFolder = entry.endsWith("/");
	const normalizedPath = normalizeExcludePath(path);
	const normalizedEntry = normalizeExcludePath(entry);

	if (isFolder) {
		return (
			normalizedPath === normalizedEntry ||
			normalizedPath.startsWith(`${normalizedEntry}/`)
		);
	}

	return normalizedPath === normalizedEntry;
}

/** Whether a route pattern or pathname should be excluded from markdown generation. */
export function isExcluded(path: string, exclude: string[]): boolean {
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
export function pathnameToMdRelative(pathname: string): string {
	const normalized = pathname.replace(/\/$/, "") || "/";
	if (normalized === "/") {
		return "index.md";
	}
	const slug = normalized.replace(/^\//, "");
	return `${slug}/index.md`;
}

/** Public URL path for the markdown alternate link. */
export function pathnameToMdUrl(pathname: string, folder: string): string {
	const mdRelative = pathnameToMdRelative(pathname);
	return `/${folder}/${mdRelative}`;
}

export function pathnameToHtmlCandidates(pathname: string): string[] {
	const normalized = pathname.replace(/\/$/, "") || "/";
	if (normalized === "/") {
		return ["index.html"];
	}
	const slug = normalized.replace(/^\//, "");
	return [`${slug}/index.html`, `${slug}.html`];
}

export function htmlPathToMdRelative(htmlRelative: string): string {
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

export function htmlPathToPathname(htmlRelative: string): string {
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

export function extractTitle(html: string): string | undefined {
	const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
	return match?.[1]?.trim();
}

export function extractDescription(html: string): string | undefined {
	const match = html.match(
		/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i,
	);
	if (match) {
		return match[1]?.trim();
	}
	const reverseMatch = html.match(
		/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i,
	);
	return reverseMatch?.[1]?.trim();
}

export function extractMainContent(html: string): string {
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

export function mdRelativeToUrlPath(mdRelative: string, folder: string): string {
	return `/${folder}/${mdRelative.replace(/\\/g, "/")}`;
}

/** Section heading for llms.txt — root home is "Pages", otherwise the top-level folder name. */
export function getLlmsSectionName(pathname: string): string {
	const normalized = pathname.replace(/\/$/, "") || "/";
	if (normalized === "/") {
		return "Pages";
	}
	const folder = normalized.replace(/^\//, "").split("/")[0];
	return folder.charAt(0).toUpperCase() + folder.slice(1);
}

export function buildLlmsTxt(
	entries: { pathname: string; mdPath: string; title?: string }[],
	{ title, description }: { title: string; description?: string },
): string {
	const grouped = new Map<string, typeof entries>();

	for (const entry of entries) {
		const section = getLlmsSectionName(entry.pathname);
		const group = grouped.get(section) ?? [];
		group.push(entry);
		grouped.set(section, group);
	}

	const sections = [...grouped.keys()].sort((a, b) => {
		if (a === "Pages") return -1;
		if (b === "Pages") return 1;
		return a.localeCompare(b);
	});

	const lines = [`# ${title}`, ""];

	if (description) {
		lines.push(`> ${description}`, "");
	}

	for (const section of sections) {
		const group = grouped.get(section);
		if (!group) continue;

		lines.push(`## ${section}`, "");
		for (const { pathname, mdPath, title } of group) {
			const label = title ?? pathname;
			lines.push(`- [${label}](${mdPath})`);
		}
		lines.push("");
	}

	return lines.join("\n");
}
