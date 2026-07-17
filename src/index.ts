import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AstroIntegration } from "astro";
import TurndownService from "turndown";
import {
	buildLlmsTxt,
	collectHtmlFiles,
	extractDescription,
	extractMainContent,
	extractTitle,
	htmlPathToMdRelative,
	htmlPathToPathname,
	isExcluded,
	mdRelativeToUrlPath,
} from "./utils.js";

const turndown = new TurndownService();

export interface MadaoOptions {
	folder?: string;
	title?: string;
	description?: string;
	exclude?: string[];
	/** @deprecated Use `exclude` instead. */
	excludePaths?: string[];
}

export default function madao(options?: MadaoOptions): AstroIntegration {
	const opts = options ?? {};
	const folder = opts.folder ?? "md";
	const cleanFolder = folder.replace(/^\/|\/$/g, "");

	return {
		name: "madao",
		hooks: {
			"astro:config:setup": ({ addMiddleware, updateConfig }) => {
				addMiddleware({
					order: "pre",
					entrypoint: "astro-madao/middleware",
				});
				updateConfig({
					vite: {
						define: {
							"process.env.ASTRO_MADAO_FOLDER": JSON.stringify(cleanFolder),
						},
					},
				});
			},

			"astro:build:done": async ({ dir, logger }) => {
				const outDir = fileURLToPath(dir);
				const mdDir = path.join(outDir, cleanFolder);
				const exclude = opts.exclude ?? opts.excludePaths ?? [];

				try {
					await mkdir(mdDir, { recursive: true });
				} catch (error) {
					logger.error(`Failed to create md directory: ${error}`);
					return;
				}

				logger.info("Building LLM files inside output directory...");
				if (exclude.length > 0) {
					logger.info(`Exclude rules: ${exclude.join(", ")}`);
				}

				const entries: {
					pathname: string;
					mdPath: string;
					title?: string;
				}[] = [];
				const fullContents: string[] = [];
				let websiteTitle: string | undefined;
				let websiteDescription: string | undefined;
				let skipped = 0;

				const htmlFiles = await collectHtmlFiles(outDir, cleanFolder);

				for (const htmlPath of htmlFiles) {
					const htmlRelative = path.relative(outDir, htmlPath).replace(/\\/g, "/");
					const pathname = htmlPathToPathname(htmlRelative);

					if (isExcluded(pathname, exclude) || isExcluded(htmlRelative, exclude)) {
						skipped += 1;
						continue;
					}

					try {
						const html = await readFile(htmlPath, "utf-8");
						const mdRelative = htmlPathToMdRelative(htmlRelative);
						const mdPath = path.join(mdDir, mdRelative);
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

				if (skipped > 0) {
					logger.info(`Skipped ${skipped} excluded page(s)`);
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
