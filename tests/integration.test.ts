import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import type { AstroIntegrationLogger } from "astro";
import { describe, expect, it, vi } from "vitest";
import madao from "../src/index.js";

function createLogger(): AstroIntegrationLogger {
	return {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		fork: vi.fn(),
		label: "madao",
		options: { dest: process.stdout, level: "info" },
	} as unknown as AstroIntegrationLogger;
}

describe("madao integration", () => {
	it("registers middleware and exposes the markdown folder to Vite", () => {
		const integration = madao({ folder: "/ai/" });
		const addMiddleware = vi.fn();
		const updateConfig = vi.fn();

		integration.hooks["astro:config:setup"]?.({
			addMiddleware,
			updateConfig,
		} as never);

		expect(integration.name).toBe("madao");
		expect(addMiddleware).toHaveBeenCalledWith({
			order: "pre",
			entrypoint: "astro-madao/middleware",
		});
		expect(updateConfig).toHaveBeenCalledWith({
			vite: {
				define: {
					"process.env.ASTRO_MADAO_FOLDER": JSON.stringify("ai"),
				},
			},
		});
	});

	it("converts HTML pages to markdown and writes llms files on build done", async () => {
		const outDir = await mkdtemp(path.join(tmpdir(), "madao-build-"));
		await writeFile(
			path.join(outDir, "index.html"),
			`<!doctype html>
<html>
<head>
  <title>Demo Site</title>
  <meta name="description" content="Site blurb" />
</head>
<body>
  <main><h1>Home</h1><p>Welcome home.</p></main>
</body>
</html>`,
		);
		await mkdir(path.join(outDir, "about"), { recursive: true });
		await writeFile(
			path.join(outDir, "about", "index.html"),
			`<!doctype html>
<html>
<head><title>About</title></head>
<body><main><h1>About</h1><p>About us.</p></main></body>
</html>`,
		);
		await mkdir(path.join(outDir, "drafts"), { recursive: true });
		await writeFile(
			path.join(outDir, "drafts", "secret.html"),
			`<!doctype html>
<html>
<head><title>Secret</title></head>
<body><main><p>Hidden</p></main></body>
</html>`,
		);
		await mkdir(path.join(outDir, "404"), { recursive: true });
		await writeFile(
			path.join(outDir, "404", "index.html"),
			`<!doctype html><html><head><title>404</title></head><body><main>missing</main></body></html>`,
		);

		const integration = madao({
			folder: "md",
			exclude: ["drafts/"],
		});
		const logger = createLogger();

		await integration.hooks["astro:build:done"]?.({
			dir: pathToFileURL(outDir + path.sep),
			logger,
		} as never);

		const homeMd = await readFile(path.join(outDir, "md", "index.md"), "utf-8");
		const aboutMd = await readFile(path.join(outDir, "md", "about", "index.md"), "utf-8");
		const llmsTxt = await readFile(path.join(outDir, "llms.txt"), "utf-8");
		const llmsFull = await readFile(path.join(outDir, "llms-full.txt"), "utf-8");

		expect(homeMd).toContain("Home");
		expect(homeMd).toContain("Welcome home.");
		expect(aboutMd).toContain("About");
		expect(aboutMd).toContain("About us.");

		await expect(
			readFile(path.join(outDir, "md", "drafts", "secret", "index.md"), "utf-8"),
		).rejects.toThrow();
		await expect(readFile(path.join(outDir, "md", "404", "index.md"), "utf-8")).rejects.toThrow();

		expect(llmsTxt).toContain("# Demo Site");
		expect(llmsTxt).toContain("> Site blurb");
		expect(llmsTxt).toContain("- [Demo Site](/md/index.md)");
		expect(llmsTxt).toContain("- [About](/md/about/index.md)");
		expect(llmsTxt).not.toContain("Secret");
		expect(llmsFull).toContain("Welcome home.");
		expect(llmsFull).toContain("About us.");
		expect(llmsFull).toContain("---");

		const headers = await readFile(path.join(outDir, "_headers"), "utf-8");
		expect(headers).toContain("/md/*");
		expect(headers).toContain("text/markdown; charset=utf-8");
		expect(headers).toContain("/llms.txt");
		expect(headers).toContain("text/plain; charset=utf-8");
	});

	it("preserves accented characters in generated markdown", async () => {
		const outDir = await mkdtemp(path.join(tmpdir(), "madao-utf8-"));
		await writeFile(
			path.join(outDir, "index.html"),
			`<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Più focus</title>
  <meta name="description" content="Caffè e tranquillità" />
</head>
<body>
  <main>
    <h1>Il coworking dove lavori con più focus.</h1>
    <p>Lavora in tranquillità. Caffè specialty.</p>
  </main>
</body>
</html>`,
			"utf-8",
		);

		const integration = madao();
		await integration.hooks["astro:build:done"]?.({
			dir: pathToFileURL(outDir + path.sep),
			logger: createLogger(),
		} as never);

		const homeMd = await readFile(path.join(outDir, "md", "index.md"), "utf-8");
		expect(homeMd).toContain("più");
		expect(homeMd).toContain("tranquillità");
		expect(homeMd).toContain("Caffè");
		expect(homeMd).not.toMatch(/Ã[¹ ]|CaffÃ/);

		const headers = await readFile(path.join(outDir, "_headers"), "utf-8");
		expect(headers).toContain("charset=utf-8");
	});

	it("uses the homepage meta charset in _headers", async () => {
		const outDir = await mkdtemp(path.join(tmpdir(), "madao-charset-"));
		await writeFile(
			path.join(outDir, "index.html"),
			`<!doctype html>
<html>
<head><meta charset="ISO-8859-1"><title>Home</title></head>
<body><main><p>ciao</p></main></body>
</html>`,
		);

		await madao().hooks["astro:build:done"]?.({
			dir: pathToFileURL(outDir + path.sep),
			logger: createLogger(),
		} as never);

		const headers = await readFile(path.join(outDir, "_headers"), "utf-8");
		expect(headers).toContain("charset=iso-8859-1");
	});

	it("prefers explicit title and description options for llms.txt", async () => {
		const outDir = await mkdtemp(path.join(tmpdir(), "madao-opts-"));
		await writeFile(
			path.join(outDir, "index.html"),
			`<!doctype html>
<html>
<head>
  <title>Ignored Title</title>
  <meta name="description" content="Ignored description" />
</head>
<body><main><p>Only page</p></main></body>
</html>`,
		);

		const integration = madao({
			title: "Custom Title",
			description: "Custom description",
		});

		await integration.hooks["astro:build:done"]?.({
			dir: pathToFileURL(outDir + path.sep),
			logger: createLogger(),
		} as never);

		const llmsTxt = await readFile(path.join(outDir, "llms.txt"), "utf-8");
		expect(llmsTxt.startsWith("# Custom Title\n")).toBe(true);
		expect(llmsTxt).toContain("> Custom description");
		expect(llmsTxt).not.toContain("> Ignored description");
		expect(llmsTxt).toContain("- [Ignored Title](/md/index.md)");
	});
});
