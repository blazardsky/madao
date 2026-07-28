export function resolveWebmcp(webmcp) {
    if (webmcp === true) {
        return { enabled: true, markdownTool: true };
    }
    if (typeof webmcp !== "object" || webmcp.enabled !== true) {
        return { enabled: false, markdownTool: false };
    }
    return {
        enabled: true,
        markdownTool: webmcp.markdownTool !== false,
    };
}
/** Tool name registered with `document.modelContext.registerTool`. */
export const WEBMCP_MARKDOWN_TOOL_NAME = "read_page_markdown";
/**
 * Client bootstrap for `injectScript("head-inline", ...)`.
 *
 * Follows the Chrome Imperative API:
 * https://developer.chrome.com/docs/ai/webmcp/imperative-api
 * - `await document.modelContext.registerTool(...)`
 * - `execute` returns a string
 * - `annotations.readOnlyHint` for non-mutating tools
 *
 * Waits briefly for `document.modelContext` because head-inline can run
 * before the API is attached.
 */
export const WEBMCP_CLIENT_SCRIPT = `(function () {
  var TOOL_NAME = ${JSON.stringify(WEBMCP_MARKDOWN_TOOL_NAME)};
  var WAIT_MS = 15000;
  var POLL_MS = 50;

  function getModelContext() {
    if (document.modelContext && typeof document.modelContext.registerTool === "function") {
      return document.modelContext;
    }
    return null;
  }

  function waitForModelContext() {
    var existing = getModelContext();
    if (existing) return Promise.resolve(existing);
    return new Promise(function (resolve) {
      var started = Date.now();
      var id = setInterval(function () {
        var ctx = getModelContext();
        if (ctx || Date.now() - started >= WAIT_MS) {
          clearInterval(id);
          resolve(ctx);
        }
      }, POLL_MS);
    });
  }

  function resolveMarkdownUrl() {
    var link = document.querySelector('link[rel="alternate"][type="text/markdown"]');
    return link && link.href ? link.href : null;
  }

  async function executeReadPageMarkdown() {
    var mdLink = resolveMarkdownUrl();
    if (!mdLink) {
      return "No markdown alternate on this page.";
    }
    try {
      var res = await fetch(mdLink);
      if (!res.ok) {
        return "Failed to fetch markdown (" + res.status + "): " + mdLink;
      }
      return await res.text();
    } catch (err) {
      return "Failed to fetch markdown: " + (err && err.message ? err.message : String(err));
    }
  }

  waitForModelContext().then(function (ctx) {
    if (!ctx) return;
    // Append only — never clear/replace existing tools (coexist with site tools).
    return ctx.registerTool({
      name: TOOL_NAME,
      description:
        "Returns the Markdown representation of the current page content for reading and summarizing.",
      inputSchema: { type: "object", properties: {} },
      annotations: { readOnlyHint: true },
      execute: executeReadPageMarkdown,
    });
  }).catch(function () {
    /* WebMCP unavailable or registration rejected — fail closed. */
  });
})();`;
