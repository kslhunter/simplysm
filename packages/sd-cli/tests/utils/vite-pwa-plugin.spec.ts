import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { Plugin } from "vite";
import fs from "node:fs";

// --- Mock factories ---

const mockGeneratePwaIcons = vi.fn();
vi.mock("../../src/utils/generate-pwa-icons.js", () => ({
  generatePwaIcons: mockGeneratePwaIcons,
}));

const mockGlob = vi.fn();
vi.mock("glob", () => ({
  glob: mockGlob,
}));

// --- Dynamic import ---

const { sdPwaPlugin } = await import("../../src/utils/vite-pwa-plugin");

// --- Helpers ---

function createPlugin(
  overrides?: Partial<Parameters<typeof sdPwaPlugin>[0]>,
): Plugin {
  return sdPwaPlugin({
    pkgDir: "/packages/test-app",
    pkgName: "test-app",
    ...overrides,
  }) as Plugin;
}

function initPlugin(plugin: Plugin): void {
  (plugin.configResolved as Function)({
    base: "/test-app/",
    build: { outDir: "/packages/test-app/dist" },
  });
}

function getWriteCall(filename: string): [string, string] | undefined {
  return vi.mocked(fs.writeFileSync).mock.calls.find((c) =>
    String(c[0]).endsWith(filename),
  ) as [string, string] | undefined;
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  mockGeneratePwaIcons.mockResolvedValue([]);
  mockGlob.mockResolvedValue([]);
  vi.spyOn(fs, "readFileSync").mockReturnValue(
    JSON.stringify({ version: "1.0.0" }),
  );
  vi.spyOn(fs, "writeFileSync").mockReturnValue(undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("sdPwaPlugin — manifest generation", () => {
  // Unit: pwa undefined uses same defaults as empty object
  it("uses defaults when pwa is undefined", async () => {
    const plugin = createPlugin({ pwa: undefined });
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    const call = getWriteCall("manifest.webmanifest");
    expect(call).toBeDefined();
    const manifest = JSON.parse(call![1]) as Record<string, unknown>;
    expect(manifest["name"]).toBe("test-app");
    expect(manifest["scope"]).toBe(".");
  });

  // Unit: manifest written to correct outDir path
  it("writes manifest to resolvedOutDir", async () => {
    const plugin = createPlugin();
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    const call = getWriteCall("manifest.webmanifest");
    const writtenPath = String(call![0]).replace(/\\/g, "/");
    expect(writtenPath).toContain("packages/test-app/dist");
  });

  // Unit: all manifest fields can be overridden
  it("overrides all customizable manifest fields", async () => {
    const plugin = createPlugin({
      pwa: {
        manifest: {
          name: "A",
          short_name: "B",
          display: "fullscreen",
          theme_color: "#111",
          background_color: "#222",
        },
      },
    });
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    const manifest = JSON.parse(getWriteCall("manifest.webmanifest")![1]) as Record<
      string,
      unknown
    >;
    expect(manifest["name"]).toBe("A");
    expect(manifest["short_name"]).toBe("B");
    expect(manifest["display"]).toBe("fullscreen");
    expect(manifest["theme_color"]).toBe("#111");
    expect(manifest["background_color"]).toBe("#222");
  });
});

describe("sdPwaPlugin — precache file collection", () => {
  // Unit: default globPatterns
  it("uses default globPatterns when workbox is not configured", async () => {
    mockGlob.mockResolvedValue(["index.html", "assets/main.js"]);

    const plugin = createPlugin();
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    expect(mockGlob).toHaveBeenCalledWith(
      "**/*.{js,css,html,ico,png,svg,woff2}",
      { cwd: "/packages/test-app/dist" },
    );
  });

  // Unit: custom globPatterns
  it("uses custom globPatterns from workbox config", async () => {
    mockGlob.mockResolvedValue(["index.html"]);

    const plugin = createPlugin({
      pwa: { workbox: { globPatterns: ["**/*.{js,html}"] } },
    });
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    expect(mockGlob).toHaveBeenCalledWith("**/*.{js,html}", expect.anything());
  });

  // Unit: excludes sw.js and manifest.webmanifest from precache
  it("excludes sw.js and manifest.webmanifest from precache list", async () => {
    mockGlob.mockResolvedValue([
      "index.html",
      "main.js",
      "sw.js",
      "manifest.webmanifest",
    ]);

    const plugin = createPlugin();
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    const swCall = getWriteCall("sw.js");
    const swContent = swCall![1];
    expect(swContent).toContain('"index.html"');
    expect(swContent).toContain('"main.js"');
    expect(swContent).not.toMatch(/"sw\.js"/);
    expect(swContent).not.toMatch(/"manifest\.webmanifest"/);
  });

  // Unit: deduplicates file list
  it("deduplicates files matched by multiple patterns", async () => {
    mockGlob
      .mockResolvedValueOnce(["index.html", "main.js"])
      .mockResolvedValueOnce(["index.html", "styles.css"]);

    const plugin = createPlugin({
      pwa: {
        workbox: { globPatterns: ["**/*.{html,js}", "**/*.{html,css}"] },
      },
    });
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    const swContent = getWriteCall("sw.js")![1];
    // Extract only the PRECACHE_URLS array declaration
    const precacheMatch = swContent.match(
      /const PRECACHE_URLS = \[([\s\S]*?)\];/,
    );
    expect(precacheMatch).toBeDefined();
    const precacheBlock = precacheMatch![1];
    const htmlMatches = precacheBlock.match(/"index\.html"/g);
    expect(htmlMatches).toHaveLength(1);
  });
});

describe("sdPwaPlugin — sw.js generation", () => {
  // Unit: version injected from package.json
  it("injects APP_VERSION from package.json", async () => {
    vi.mocked(fs.readFileSync).mockReturnValue(
      JSON.stringify({ version: "14.0.16" }),
    );

    const plugin = createPlugin();
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    const swContent = getWriteCall("sw.js")![1];
    expect(swContent).toContain('const APP_VERSION = "14.0.16"');
    expect(swContent).toContain('"precache-" + APP_VERSION');
  });

  // Unit: base URL injected
  it("injects BASE_URL from resolved config", async () => {
    const plugin = createPlugin();
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    const swContent = getWriteCall("sw.js")![1];
    expect(swContent).toContain('const BASE_URL = "/test-app/"');
  });

  // Unit: sw.js contains all 4 event listeners
  it("contains install, activate, fetch, and message event listeners", async () => {
    const plugin = createPlugin();
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    const swContent = getWriteCall("sw.js")![1];
    expect(swContent).toContain('self.addEventListener("install"');
    expect(swContent).toContain('self.addEventListener("activate"');
    expect(swContent).toContain('self.addEventListener("fetch"');
    expect(swContent).toContain('self.addEventListener("message"');
  });

  // Unit: install handler uses cache.addAll
  it("install handler caches all precache URLs", async () => {
    const plugin = createPlugin();
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    const swContent = getWriteCall("sw.js")![1];
    expect(swContent).toContain("caches.open(CACHE_NAME)");
    expect(swContent).toContain("cache.addAll(PRECACHE_URLS)");
  });

  // Unit: activate handler deletes old caches with precache- prefix only
  it("activate handler filters by precache- prefix", async () => {
    const plugin = createPlugin();
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    const swContent = getWriteCall("sw.js")![1];
    expect(swContent).toContain('name.startsWith("precache-")');
    expect(swContent).toContain("name !== CACHE_NAME");
    expect(swContent).toContain("self.clients.claim()");
  });

  // Unit: fetch handler has navigate fallback to index.html with network fallback
  it("fetch handler falls back to index.html for navigate requests with network fallback", async () => {
    const plugin = createPlugin();
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    const swContent = getWriteCall("sw.js")![1];
    expect(swContent).toContain('event.request.mode === "navigate"');
    expect(swContent).toContain('BASE_URL + "index.html"');
    // Network fallback when index.html is not in cache (storage pressure)
    expect(swContent).toContain("resp || fetch(event.request)");
  });

  // Unit: message handler responds to SKIP_WAITING
  it("message handler calls self.skipWaiting on SKIP_WAITING", async () => {
    const plugin = createPlugin();
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    const swContent = getWriteCall("sw.js")![1];
    expect(swContent).toContain('"SKIP_WAITING"');
    expect(swContent).toContain("self.skipWaiting()");
  });

  // Unit: backslash normalization in file paths
  it("normalizes backslashes in precache URLs", async () => {
    mockGlob.mockResolvedValue(["assets\\main.js"]);

    const plugin = createPlugin();
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    const swContent = getWriteCall("sw.js")![1];
    expect(swContent).toContain('"assets/main.js"');
    expect(swContent).not.toContain("\\\\");
  });
});

describe("sdPwaPlugin — transformIndexHtml", () => {
  // Unit: manifest link tag
  it("injects manifest link tag", () => {
    const plugin = createPlugin();
    initPlugin(plugin);
    const tags = (plugin.transformIndexHtml as Function)() as Array<{
      tag: string;
      attrs?: Record<string, string>;
      injectTo?: string;
    }>;

    const linkTag = tags.find((t) => t.tag === "link");
    expect(linkTag).toBeDefined();
    expect(linkTag!.attrs!["rel"]).toBe("manifest");
    expect(linkTag!.attrs!["href"]).toBe("manifest.webmanifest");
  });

  // Unit: SW registration script tag
  it("injects SW registration script", () => {
    const plugin = createPlugin();
    initPlugin(plugin);
    const tags = (plugin.transformIndexHtml as Function)() as Array<{
      tag: string;
      children?: string;
      injectTo?: string;
    }>;

    const scriptTag = tags.find((t) => t.tag === "script");
    expect(scriptTag).toBeDefined();
    expect(scriptTag!.children).toContain("serviceWorker");
    expect(scriptTag!.children).toContain('register("sw.js")');
  });

  // Unit: registration script dispatches sd-pwa-update-ready event
  it("dispatches sd-pwa-update-ready CustomEvent", () => {
    const plugin = createPlugin();
    initPlugin(plugin);
    const tags = (plugin.transformIndexHtml as Function)() as Array<{
      tag: string;
      children?: string;
    }>;

    const scriptTag = tags.find((t) => t.tag === "script");
    expect(scriptTag!.children).toContain("sd-pwa-update-ready");
    expect(scriptTag!.children).toContain("SKIP_WAITING");
  });

  // Unit: registration script reloads on controllerchange
  it("reloads page on controllerchange", () => {
    const plugin = createPlugin();
    initPlugin(plugin);
    const tags = (plugin.transformIndexHtml as Function)() as Array<{
      tag: string;
      children?: string;
    }>;

    const scriptTag = tags.find((t) => t.tag === "script");
    expect(scriptTag!.children).toContain("controllerchange");
    expect(scriptTag!.children).toContain("location.reload");
  });
});
