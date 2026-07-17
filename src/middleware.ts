import { defineMiddleware } from "astro:middleware";
import {
	extractCharset,
	getMarkdownLinkHeader,
	getMarkdownUrl,
	withCharset,
} from "./utils.js";

function isHttpHeaderEnabled(): boolean {
	// Vite `define` injects the string `"true"` / `"false"`; unset defaults to on.
	return process.env.ASTRO_MADAO_HTTP_HEADER !== "false";
}

export const onRequest = defineMiddleware(async (context, next) => {
	const response = await next();
	const folderName = process.env.ASTRO_MADAO_FOLDER || "md";
	const pathname = context.url.pathname;
	const contentType = response.headers.get("content-type") ?? "";

	const isMarkdown =
		pathname.endsWith(".md") || contentType.includes("text/markdown");
	const isLlms = pathname === "/llms.txt" || pathname === "/llms-full.txt";

	if (isMarkdown || isLlms) {
		const headers = new Headers(response.headers);
		headers.set(
			"content-type",
			withCharset(contentType, "utf-8", isMarkdown ? "text/markdown" : "text/plain"),
		);
		return new Response(response.body, {
			status: response.status,
			statusText: response.statusText,
			headers,
		});
	}

	if (!contentType.startsWith("text/html")) {
		return response;
	}

	const pagePath = pathname.replace(/\/$/, "") || "/";
	const mdPath = getMarkdownUrl(pagePath, folderName);
	const linkTag = `<link rel="alternate" type="text/markdown" href="${mdPath}" />`;

	const html = await response.text();
	const charset = extractCharset(html);
	const modifiedHtml = html.replace("</head>", `${linkTag}\n</head>`);

	const headers = new Headers(response.headers);
	headers.delete("content-length");
	headers.set("content-type", withCharset(contentType, charset, "text/html"));

	if (isHttpHeaderEnabled()) {
		// append() preserves any existing Link headers (preload, preconnect, etc.)
		headers.append("Link", getMarkdownLinkHeader(pagePath, folderName));
	}

	return new Response(modifiedHtml, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
});
