import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

const mockTransformFile = vi.fn(() => Promise.resolve("transformed-code"));

vi.mock("@angular/build/private", () => ({
  JavaScriptTransformer: class MockJSTransformer {
    transformFile = mockTransformFile;
    transformData = vi.fn(() => Promise.resolve(new TextEncoder().encode("transformed")));
    close = vi.fn(() => Promise.resolve());
  },
}));

const { sdAngularPlugin } = await import("../../src/angular/vite-angular-plugin.js");

const TMP_DIR = path.join(os.tmpdir(), "sd-cli-linker-cache-test");
const CACHE_DIR = path.join(TMP_DIR, "cache");

type OnLoadHandler = (args: { path: string }) => Promise<{ contents: string; loader: string }>;

function getOnLoadHandler(plugin: ReturnType<typeof sdAngularPlugin>): OnLoadHandler {
   
  const config = (plugin as any).config();
   
  const esbuildPlugin = config.optimizeDeps.esbuildOptions.plugins[0] as {
    setup: (build: { onLoad: (filter: unknown, h: OnLoadHandler) => void }) => void;
  };
  let handler!: OnLoadHandler;
  esbuildPlugin.setup({
    onLoad: (_filter: unknown, h: OnLoadHandler) => {
      handler = h;
    },
  });
  return handler;
}

describe("Linker disk cache (optimizeDeps)", () => {
  beforeEach(() => {
    fs.mkdirSync(TMP_DIR, { recursive: true });
    mockTransformFile.mockClear();
    mockTransformFile.mockResolvedValue("transformed-code");
  });

  afterEach(() => {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  });

  // Acceptance: cache miss → transform + store, cache hit → load from disk
  it("caches transformFile result on miss and returns cached on hit", async () => {
    const jsFile = path.join(TMP_DIR, "module.js");
    fs.writeFileSync(jsFile, "export const x = 1;");

    const plugin = sdAngularPlugin({
      tsconfig: path.join(TMP_DIR, "tsconfig.json"),
      dev: true,
      linkerCacheDir: CACHE_DIR,
    });
    const onLoad = getOnLoadHandler(plugin);

    // First call: cache miss
    const result1 = await onLoad({ path: jsFile });
    expect(mockTransformFile).toHaveBeenCalledOnce();
    expect(result1.contents).toBe("transformed-code");
    expect(result1.loader).toBe("js");

    // Cache file created
    const cacheFiles = fs.readdirSync(CACHE_DIR);
    expect(cacheFiles.length).toBe(1);
    expect(cacheFiles[0]).toMatch(/^[a-f0-9]+\.js$/);

    // Second call: cache hit
    mockTransformFile.mockClear();
    const result2 = await onLoad({ path: jsFile });
    expect(mockTransformFile).not.toHaveBeenCalled();
    expect(result2.contents).toBe("transformed-code");
  });

  // Acceptance: file content change → cache miss
  it("invalidates cache when file content changes", async () => {
    const jsFile = path.join(TMP_DIR, "changing.js");
    fs.writeFileSync(jsFile, "export const v = 1;");

    const plugin = sdAngularPlugin({
      tsconfig: path.join(TMP_DIR, "tsconfig.json"),
      dev: true,
      linkerCacheDir: CACHE_DIR,
    });
    const onLoad = getOnLoadHandler(plugin);

    await onLoad({ path: jsFile });
    expect(mockTransformFile).toHaveBeenCalledOnce();

    // Change content
    fs.writeFileSync(jsFile, "export const v = 2;");
    mockTransformFile.mockClear();
    mockTransformFile.mockResolvedValue("transformed-v2");

    const result = await onLoad({ path: jsFile });
    expect(mockTransformFile).toHaveBeenCalledOnce();
    expect(result.contents).toBe("transformed-v2");
  });

  // Unit: corrupted cache file → graceful fallback
  it("falls back to transform when cache file is corrupted", async () => {
    const jsFile = path.join(TMP_DIR, "fallback.js");
    fs.writeFileSync(jsFile, "export const y = 1;");

    const plugin = sdAngularPlugin({
      tsconfig: path.join(TMP_DIR, "tsconfig.json"),
      dev: true,
      linkerCacheDir: CACHE_DIR,
    });
    const onLoad = getOnLoadHandler(plugin);

    // First call to populate cache
    await onLoad({ path: jsFile });

    // Remove the cache file to simulate corruption/missing cache
    const cacheFiles = fs.readdirSync(CACHE_DIR);
    fs.rmSync(path.join(CACHE_DIR, cacheFiles[0]));

    mockTransformFile.mockClear();
    const result = await onLoad({ path: jsFile });
    expect(mockTransformFile).toHaveBeenCalledOnce();
    expect(result.contents).toBe("transformed-code");
  });

  // Unit: Uint8Array result from transformFile is handled
  it("handles Uint8Array result from transformFile", async () => {
    const jsFile = path.join(TMP_DIR, "uint8.js");
    fs.writeFileSync(jsFile, "export const z = 1;");

    mockTransformFile.mockResolvedValue(new TextEncoder().encode("uint8-transformed") as unknown as string);

    const plugin = sdAngularPlugin({
      tsconfig: path.join(TMP_DIR, "tsconfig.json"),
      dev: true,
      linkerCacheDir: CACHE_DIR,
    });
    const onLoad = getOnLoadHandler(plugin);

    const result = await onLoad({ path: jsFile });
    expect(result.contents).toBe("uint8-transformed");

    // Second call: cache hit should also return string
    mockTransformFile.mockClear();
    const result2 = await onLoad({ path: jsFile });
    expect(mockTransformFile).not.toHaveBeenCalled();
    expect(result2.contents).toBe("uint8-transformed");
  });
});
