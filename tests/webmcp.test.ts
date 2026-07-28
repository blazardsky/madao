import { afterEach, describe, expect, it, vi } from "vitest";
import { resolveWebmcp, WEBMCP_CLIENT_SCRIPT, WEBMCP_MARKDOWN_TOOL_NAME } from "../src/webmcp.js";

describe("resolveWebmcp", () => {
	it("defaults to disabled", () => {
		expect(resolveWebmcp()).toEqual({ enabled: false, markdownTool: false });
		expect(resolveWebmcp(false)).toEqual({ enabled: false, markdownTool: false });
		expect(resolveWebmcp({ enabled: false })).toEqual({
			enabled: false,
			markdownTool: false,
		});
		expect(resolveWebmcp({ markdownTool: true })).toEqual({
			enabled: false,
			markdownTool: false,
		});
	});

	it("enables markdown tool for true and { enabled: true }", () => {
		expect(resolveWebmcp(true)).toEqual({ enabled: true, markdownTool: true });
		expect(resolveWebmcp({ enabled: true })).toEqual({
			enabled: true,
			markdownTool: true,
		});
	});

	it("respects markdownTool: false when enabled", () => {
		expect(resolveWebmcp({ enabled: true, markdownTool: false })).toEqual({
			enabled: true,
			markdownTool: false,
		});
	});
});

describe("WEBMCP_CLIENT_SCRIPT", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("follows the stable Chrome imperative API", () => {
		expect(WEBMCP_MARKDOWN_TOOL_NAME.length).toBeLessThanOrEqual(30);
		expect(WEBMCP_CLIENT_SCRIPT).toContain("document.modelContext");
		expect(WEBMCP_CLIENT_SCRIPT).not.toContain("navigator.modelContext");
		expect(WEBMCP_CLIENT_SCRIPT).toContain("registerTool");
		expect(WEBMCP_CLIENT_SCRIPT).toContain(WEBMCP_MARKDOWN_TOOL_NAME);
		expect(WEBMCP_CLIENT_SCRIPT).toContain("readOnlyHint");
		expect(WEBMCP_CLIENT_SCRIPT).toContain(
			"Returns the Markdown representation of the current page content",
		);
		expect(WEBMCP_CLIENT_SCRIPT).toContain('link[rel="alternate"][type="text/markdown"]');
		expect(WEBMCP_CLIENT_SCRIPT).toContain("No markdown alternate on this page.");
		expect(WEBMCP_CLIENT_SCRIPT).toContain("Failed to fetch markdown");
		expect(WEBMCP_CLIENT_SCRIPT).toContain("waitForModelContext");
		expect(WEBMCP_CLIENT_SCRIPT).not.toMatch(/clearTools|setTools|replaceTools|removeTool/);
		// Chrome Imperative API returns strings from execute, not MCP content arrays.
		expect(WEBMCP_CLIENT_SCRIPT).not.toContain('type: "text"');
		expect(WEBMCP_CLIENT_SCRIPT).not.toContain("content: [{");
	});

	it("registers via registerTool once document.modelContext appears", async () => {
		const registerTool = vi.fn().mockResolvedValue(undefined);
		const modelContext = { registerTool };
		const link = {
			href: "https://example.com/md/about/index.md",
			rel: "alternate",
			type: "text/markdown",
		};

		vi.stubGlobal("document", {
			modelContext: undefined as { registerTool: typeof registerTool } | undefined,
			querySelector: (selector: string) => (selector.includes('rel="alternate"') ? link : null),
		});
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: true,
				text: async () => "# About\n\nHello",
			}),
		);

		setTimeout(() => {
			(globalThis as { document: { modelContext: unknown } }).document.modelContext = modelContext;
		}, 80);

		eval(WEBMCP_CLIENT_SCRIPT);

		await vi.waitFor(() => {
			expect(registerTool).toHaveBeenCalledOnce();
		});

		const tool = registerTool.mock.calls[0]?.[0] as {
			name: string;
			description: string;
			annotations: { readOnlyHint: boolean };
			inputSchema: { type: string };
			execute: () => Promise<string>;
		};

		expect(tool.name).toBe(WEBMCP_MARKDOWN_TOOL_NAME);
		expect(tool.annotations.readOnlyHint).toBe(true);
		expect(tool.inputSchema.type).toBe("object");
		expect(typeof tool.execute).toBe("function");

		const result = await tool.execute();
		expect(result).toBe("# About\n\nHello");
		expect(typeof result).toBe("string");
	});
});
