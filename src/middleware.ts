import { defineMiddleware } from "astro:middleware";
import { pathnameToMdUrl } from "./utils.js";

export const onRequest = defineMiddleware(async (context, next) => {
	const response = await next();

	const contentType = response.headers.get("content-type");
	if (!contentType?.includes("text/html")) {
		return response;
	}

	const folderName = process.env.ASTRO_MADAO_FOLDER || "md";
	const pathname = context.url.pathname.replace(/\/$/, "") || "/";
	const mdPath = pathnameToMdUrl(pathname, folderName);

	const linkTag = `<link rel="alternate" type="text/markdown" href="${mdPath}" />`;

	const html = await response.text();
	const modifiedHtml = html.replace("</head>", `${linkTag}\n</head>`);

	return new Response(modifiedHtml, {
		status: response.status,
		headers: response.headers,
	});
});
