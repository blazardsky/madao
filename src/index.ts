import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration, IntegrationResolvedRoute } from "astro";
import TurndownService from "turndown";
import {
	buildLlmsTxt,
	extractDescription,
	extractMainContent,
	extractTitle,
	htmlPathToMdRelative,
	htmlPathToPathname,
	is404Pathname,
	mdRelativeToUrlPath,
	pathnameToHtmlCandidates,
	pathnameToMdRelative,
} from "./utils.js";

const turndown = new TurndownService();

export interface MadaoOptions {
	folder?: string;
	title?: string;
	description?: string;
	excludePaths?: string[];
}

export default function madao(options?: MadaoOptions): AstroIntegration {
	const opts = options ?? {};
	const folder = opts.folder ?? "md";
	const cleanFolder = folder.replace(/^\/|\/$/g, "");

	let resolvedRoutes: IntegrationResolvedRoute[] = [];

	return {
		name: "madao",
		hooks: {
			"astro:config:setup": ({ addMiddleware, updateConfig }) => {
				addMiddleware({
					order: "pre",
					entrypoint: "madao/middleware",
				});
				updateConfig({
					vite: {
						define: {
							"process.env.ASTRO_MADAO_FOLDER": JSON.stringify(cleanFolder),
						},
					},
				});
			},

			"astro:routes:resolved": ({ routes }) => {
				resolvedRoutes = routes;
			},

			"astro:build:done": async ({ dir, assets, pages, logger }) => {
				const outDir = fileURLToPath(dir);
				const mdDir = path.join(outDir, cleanFolder);

				if (opts.excludePaths && opts.excludePaths.length > 0) {
					resolvedRoutes = resolvedRoutes.filter((r) => !opts.excludePaths?.includes(r.pattern));
				}

				try {
					await mkdir(mdDir, { recursive: true });
				} catch (error) {
					logger.error(`Failed to create md directory: ${error}`);
					return;
				}

				logger.info("Building LLM files inside output directory...");

				const entries: {
					pathname: string;
					mdPath: string;
					title?: string;
				}[] = [];
				const fullContents: string[] = [];
				const processedHtml = new Set<string>();
				let websiteTitle: string | undefined;
				let websiteDescription: string | undefined;

				const pageRoutes = resolvedRoutes.filter((r) => r.type === "page" || r.type === "fallback");

				for (const route of pageRoutes) {
					if (is404Pathname(route.pattern)) {
						continue;
					}

					const distURLs = assets.get(route.pattern);
					if (!distURLs?.length) {
						continue;
					}

					for (const distURL of distURLs) {
						const htmlPath = fileURLToPath(distURL);
						const htmlRelative = path.relative(outDir, htmlPath).replace(/\\/g, "/");

						if (!htmlRelative.endsWith(".html") || processedHtml.has(htmlRelative)) {
							continue;
						}
						processedHtml.add(htmlRelative);

						try {
							const html = await readFile(htmlPath, "utf-8");
							const mdRelative = htmlPathToMdRelative(htmlRelative);
							const mdPath = path.join(mdDir, mdRelative);
							const pathname = htmlPathToPathname(htmlRelative);
							const cleanHtml = extractMainContent(html);
							const markdown = turndown.turndown(cleanHtml);

							if (pathname === "/") {
								websiteTitle = extractTitle(html);
								websiteDescription = extractDescription(html);
							}

							await mkdir(path.dirname(mdPath), { recursive: true });
							await writeFile(mdPath, markdown, "utf-8");

							entries.push({
								pathname,
								mdPath: mdRelativeToUrlPath(mdRelative, cleanFolder),
								title: extractTitle(html),
							});
							fullContents.push(markdown);
							logger.info(`Generated ${mdRelative}`);
						} catch (error) {
							logger.error(`Failed to convert ${htmlRelative}: ${error}`);
						}
					}
				}

				// Fallback for routes not captured via assets map
				for (const page of pages) {
					if (is404Pathname(page.pathname)) {
						continue;
					}

					const htmlCandidates = pathnameToHtmlCandidates(page.pathname);

					for (const candidate of htmlCandidates) {
						if (processedHtml.has(candidate)) {
							break;
						}

						try {
							const html = await readFile(path.join(outDir, candidate), "utf-8");
							processedHtml.add(candidate);

							const mdRelative = pathnameToMdRelative(page.pathname);
							const mdPath = path.join(mdDir, mdRelative);
							const cleanHtml = extractMainContent(html);
							const markdown = turndown.turndown(cleanHtml);

							if (page.pathname === "/" || page.pathname === "") {
								websiteTitle = extractTitle(html);
								websiteDescription = extractDescription(html);
							}

							await mkdir(path.dirname(mdPath), { recursive: true });
							await writeFile(mdPath, markdown, "utf-8");

							entries.push({
								pathname: page.pathname,
								mdPath: mdRelativeToUrlPath(mdRelative, cleanFolder),
								title: extractTitle(html),
							});
							fullContents.push(markdown);
							logger.info(`Generated ${mdRelative}`);
							break;
						} catch {
							// try next candidate
						}
					}
				}

				if (entries.length === 0) {
					logger.warn("No markdown files generated, skipping llms.txt");
					return;
				}

				const llmsTxt = buildLlmsTxt(entries, {
					title: opts.title ?? websiteTitle ?? "Site",
					description: opts.description ?? websiteDescription,
				});

				const llmsFullTxt = fullContents.join("\n\n---\n\n");

				try {
					await writeFile(path.join(outDir, "llms.txt"), llmsTxt, "utf-8");
					await writeFile(path.join(outDir, "llms-full.txt"), llmsFullTxt, "utf-8");
					logger.info("Generated llms.txt and llms-full.txt");
				} catch (error) {
					logger.error(`Failed to write llms files: ${error}`);
				}
			},
		},
	};
}
