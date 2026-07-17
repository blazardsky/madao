import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("astro:middleware", () => ({
	defineMiddleware: (handler: unknown) => handler,
}));

describe("madao middleware", () => {
	afterEach(() => {
		vi.resetModules();
		vi.unstubAllEnvs();
	});

	it("injects a markdown alternate link into HTML responses", async () => {
		vi.stubEnv("ASTRO_MADAO_FOLDER", "ai");
		const { onRequest } = await import("../src/middleware.js");

		const response = await onRequest(
			{ url: new URL("https://example.com/about/") } as never,
			async () =>
				new Response(
					'<html><head><meta charset="utf-8"><title>About</title></head><body></body></html>',
					{
						headers: { "content-type": "text/html" },
					},
				),
		);

		const html = await response.text();
		expect(html).toContain(
			'<link rel="alternate" type="text/markdown" href="/ai/about/index.md" />',
		);
		expect(html).toContain("</head>");
		expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
	});

	it("leaves non-HTML responses untouched", async () => {
		const { onRequest } = await import("../src/middleware.js");
		const original = new Response('{"ok":true}', {
			headers: { "content-type": "application/json" },
		});

		const response = await onRequest(
			{ url: new URL("https://example.com/api") } as never,
			async () => original,
		);

		expect(response).toBe(original);
		expect(await response.text()).toBe('{"ok":true}');
	});

	it("uses the page meta charset and falls back to utf-8 for markdown", async () => {
		const { onRequest } = await import("../src/middleware.js");

		const htmlResponse = await onRequest(
			{ url: new URL("https://example.com/") } as never,
			async () =>
				new Response('<html><head><meta charset="ISO-8859-1"></head><body></body></html>', {
					headers: { "content-type": "text/html" },
				}),
		);
		expect(htmlResponse.headers.get("content-type")).toBe("text/html; charset=iso-8859-1");

		const mdResponse = await onRequest(
			{ url: new URL("https://example.com/md/index.md") } as never,
			async () =>
				new Response("più focus", {
					headers: { "content-type": "text/markdown" },
				}),
		);
		expect(mdResponse.headers.get("content-type")).toBe("text/markdown; charset=utf-8");
		expect(await mdResponse.text()).toBe("più focus");

		const llmsResponse = await onRequest(
			{ url: new URL("https://example.com/llms.txt") } as never,
			async () =>
				new Response("# Kìpo", {
					headers: { "content-type": "text/plain" },
				}),
		);
		expect(llmsResponse.headers.get("content-type")).toBe("text/plain; charset=utf-8");
	});

	it("defaults the markdown folder to md", async () => {
		const { onRequest } = await import("../src/middleware.js");

		const response = await onRequest(
			{ url: new URL("https://example.com/") } as never,
			async () =>
				new Response("<html><head></head><body></body></html>", {
					headers: { "content-type": "text/html" },
				}),
		);

		expect(await response.text()).toContain('href="/md/index.md"');
	});
});
