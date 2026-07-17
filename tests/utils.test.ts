import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
	buildLlmsTxt,
	buildMadaoHeadersBlock,
	collectHtmlFiles,
	extractCharset,
	extractDescription,
	extractMainContent,
	extractTitle,
	getLlmsSectionName,
	htmlPathToMdRelative,
	htmlPathToPathname,
	is404Pathname,
	isExcluded,
	mdRelativeToUrlPath,
	mergeMadaoHeaders,
	pathnameToHtmlCandidates,
	pathnameToMdRelative,
	pathnameToMdUrl,
	withCharset,
} from "../src/utils.js";

describe("is404Pathname", () => {
	it("detects 404 routes with or without slashes", () => {
		expect(is404Pathname("404")).toBe(true);
		expect(is404Pathname("/404")).toBe(true);
		expect(is404Pathname("/404/")).toBe(true);
		expect(is404Pathname("about")).toBe(false);
	});
});

describe("isExcluded", () => {
	it("always excludes the 404 page", () => {
		expect(isExcluded("/404", [])).toBe(true);
	});

	it("excludes an exact path", () => {
		expect(isExcluded("/drafts/secret", ["drafts/secret"])).toBe(true);
		expect(isExcluded("/drafts/other", ["drafts/secret"])).toBe(false);
	});

	it("excludes a folder and its children when the rule ends with /", () => {
		expect(isExcluded("/blog", ["blog/"])).toBe(true);
		expect(isExcluded("/blog/post", ["blog/"])).toBe(true);
		expect(isExcluded("/blog-archive", ["blog/"])).toBe(false);
	});

	it("normalizes .html and .md suffixes in exclude rules", () => {
		expect(isExcluded("/about", ["about.html"])).toBe(true);
		expect(isExcluded("/about", ["about/index.html"])).toBe(true);
		expect(isExcluded("/about", ["about.md"])).toBe(true);
	});

	it("honors ! unexclude rules over excludes and 404", () => {
		expect(isExcluded("/blog/keep", ["blog/", "!blog/keep"])).toBe(false);
		expect(isExcluded("/404", ["!404"])).toBe(false);
	});
});

describe("path conversions", () => {
	it("maps pathnames to directory-style markdown paths", () => {
		expect(pathnameToMdRelative("/")).toBe("index.md");
		expect(pathnameToMdRelative("/about")).toBe("about/index.md");
		expect(pathnameToMdRelative("/blog/post/")).toBe("blog/post/index.md");
	});

	it("builds public markdown URLs under the configured folder", () => {
		expect(pathnameToMdUrl("/", "md")).toBe("/md/index.md");
		expect(pathnameToMdUrl("/about", "ai")).toBe("/ai/about/index.md");
	});

	it("lists HTML candidates for a pathname", () => {
		expect(pathnameToHtmlCandidates("/")).toEqual(["index.html"]);
		expect(pathnameToHtmlCandidates("/about")).toEqual(["about/index.html", "about.html"]);
	});

	it("converts built HTML paths to markdown relatives and pathnames", () => {
		expect(htmlPathToMdRelative("index.html")).toBe("index.md");
		expect(htmlPathToMdRelative("about/index.html")).toBe("about/index.md");
		expect(htmlPathToMdRelative("about.html")).toBe("about/index.md");

		expect(htmlPathToPathname("index.html")).toBe("/");
		expect(htmlPathToPathname("about/index.html")).toBe("/about");
		expect(htmlPathToPathname("about.html")).toBe("/about");
	});

	it("builds markdown URL paths from relative md files", () => {
		expect(mdRelativeToUrlPath("index.md", "md")).toBe("/md/index.md");
		expect(mdRelativeToUrlPath("about/index.md", "ai")).toBe("/ai/about/index.md");
	});
});

describe("HTML extraction", () => {
	const html = `<!doctype html>
<html>
<head>
  <title> Hello World </title>
  <meta name="description" content="A sample page" />
</head>
<body>
  <nav>skip me</nav>
  <main><h1>Main</h1><p>Body</p></main>
  <footer>also skip</footer>
</body>
</html>`;

	it("extracts title and description", () => {
		expect(extractTitle(html)).toBe("Hello World");
		expect(extractDescription(html)).toBe("A sample page");
	});

	it("reads description when content comes before name", () => {
		const reverse = `<meta content="Reversed meta" name="description" />`;
		expect(extractDescription(reverse)).toBe("Reversed meta");
	});

	it("prefers main, then article, then full html", () => {
		expect(extractMainContent(html)).toBe("<h1>Main</h1><p>Body</p>");
		expect(extractMainContent("<article>Only article</article>")).toBe("Only article");
		expect(extractMainContent("<p>fallback</p>")).toBe("<p>fallback</p>");
	});

	it("extracts charset from meta tags and falls back to utf-8", () => {
		expect(extractCharset('<meta charset="UTF-8">')).toBe("utf-8");
		expect(extractCharset("<meta charset=iso-8859-1>")).toBe("iso-8859-1");
		expect(
			extractCharset(
				'<meta http-equiv="Content-Type" content="text/html; charset=windows-1252">',
			),
		).toBe("windows-1252");
		expect(
			extractCharset(
				'<meta content="text/html; charset=Shift_JIS" http-equiv="content-type">',
			),
		).toBe("shift_jis");
		expect(extractCharset("<html><head></head></html>")).toBe("utf-8");
	});

	it("applies charset onto Content-Type values", () => {
		expect(withCharset("text/html", "UTF-8", "text/html")).toBe("text/html; charset=utf-8");
		expect(withCharset("text/markdown; charset=iso-8859-1", "utf-8", "text/markdown")).toBe(
			"text/markdown; charset=utf-8",
		);
	});
});

describe("llms.txt helpers", () => {
	it("names sections from the top-level folder", () => {
		expect(getLlmsSectionName("/")).toBe("Pages");
		expect(getLlmsSectionName("/blog/post")).toBe("Blog");
		expect(getLlmsSectionName("/docs/guide/")).toBe("Docs");
	});

	it("builds grouped llms.txt with Pages first", () => {
		const result = buildLlmsTxt(
			[
				{ pathname: "/blog/a", mdPath: "/md/blog/a/index.md", title: "Post A" },
				{ pathname: "/", mdPath: "/md/index.md", title: "Home" },
				{ pathname: "/about", mdPath: "/md/about/index.md" },
			],
			{ title: "Demo Site", description: "Demo description" },
		);

		expect(result).toBe(`# Demo Site

> Demo description

## Pages

- [Home](/md/index.md)

## About

- [/about](/md/about/index.md)

## Blog

- [Post A](/md/blog/a/index.md)
`);
	});
});

describe("charset headers", () => {
	it("builds Cloudflare/Netlify _headers rules for markdown and llms files", () => {
		expect(buildMadaoHeadersBlock("md")).toBe(`# BEGIN astro-madao
/md/*
  Content-Type: text/markdown; charset=utf-8

/llms.txt
  Content-Type: text/plain; charset=utf-8

/llms-full.txt
  Content-Type: text/plain; charset=utf-8
# END astro-madao
`);
		expect(buildMadaoHeadersBlock("md", "ISO-8859-1")).toContain(
			"charset=iso-8859-1",
		);
	});

	it("appends or replaces the madao block when merging", () => {
		expect(mergeMadaoHeaders(undefined, "ai")).toContain("/ai/*");
		expect(mergeMadaoHeaders("/*\n  X-Frame-Options: DENY\n", "md")).toContain(
			"X-Frame-Options: DENY",
		);
		expect(mergeMadaoHeaders("/*\n  X-Frame-Options: DENY\n", "md")).toContain(
			"# BEGIN astro-madao",
		);

		const once = mergeMadaoHeaders(undefined, "md", "utf-8");
		const twice = mergeMadaoHeaders(once, "ai", "utf-8");
		expect(twice.match(/# BEGIN astro-madao/g)).toHaveLength(1);
		expect(twice).toContain("/ai/*");
		expect(twice).not.toContain("/md/*");
	});
});

describe("collectHtmlFiles", () => {
	it("walks the output tree and skips the markdown folder", async () => {
		const root = await mkdtemp(path.join(tmpdir(), "madao-"));
		await writeFile(path.join(root, "index.html"), "<html></html>");
		await mkdir(path.join(root, "about"), { recursive: true });
		await writeFile(path.join(root, "about", "index.html"), "<html></html>");
		await mkdir(path.join(root, "md", "nested"), { recursive: true });
		await writeFile(path.join(root, "md", "nested", "index.html"), "<html></html>");

		const files = await collectHtmlFiles(root, "md");

		expect(files.map((file) => path.relative(root, file).replace(/\\/g, "/"))).toEqual([
			"about/index.html",
			"index.html",
		]);
	});
});
