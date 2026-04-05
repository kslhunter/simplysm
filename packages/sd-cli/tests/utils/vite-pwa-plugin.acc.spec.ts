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

function getManifestWriteCall(): [string, string] | undefined {
  return vi.mocked(fs.writeFileSync).mock.calls.find((c) =>
    String(c[0]).includes("manifest.webmanifest"),
  ) as [string, string] | undefined;
}

function parseWrittenManifest(): Record<string, unknown> {
  const call = getManifestWriteCall();
  if (call == null) throw new Error("manifest.webmanifest not written");
  return JSON.parse(call[1]);
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

describe("sdPwaPlugin — Acceptance: Slice 1 manifest 생성", () => {
  // Scenario: 기본 manifest 생성
  it("generates manifest.webmanifest with default fields when pwa is empty", async () => {
    const plugin = createPlugin({ pwa: {} });
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    const manifest = parseWrittenManifest();
    expect(manifest["name"]).toBe("test-app");
    expect(manifest["short_name"]).toBe("test-app");
    expect(manifest["display"]).toBe("standalone");
    expect(manifest["theme_color"]).toBe("#ffffff");
    expect(manifest["background_color"]).toBe("#ffffff");
    expect(manifest["start_url"]).toBe(".");
  });

  // Scenario: manifest 필드 커스텀
  it("applies custom manifest fields from SdPwaConfig", async () => {
    const plugin = createPlugin({
      pwa: { manifest: { name: "My App", theme_color: "#000000" } },
    });
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    const manifest = parseWrittenManifest();
    expect(manifest["name"]).toBe("My App");
    expect(manifest["theme_color"]).toBe("#000000");
    expect(manifest["short_name"]).toBe("test-app");
    expect(manifest["display"]).toBe("standalone");
  });

  // Scenario: 기본 아이콘 자동 생성
  it("includes generated icons in manifest when no custom icons", async () => {
    mockGeneratePwaIcons.mockResolvedValue([
      { src: "icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ]);

    const plugin = createPlugin();
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    expect(mockGeneratePwaIcons).toHaveBeenCalledWith("/packages/test-app");
    const manifest = parseWrittenManifest();
    expect(manifest["icons"]).toEqual([
      { src: "icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
    ]);
  });

  // Scenario: 커스텀 아이콘 설정 시 자동 생성 건너뜀
  it("uses custom icons and skips generatePwaIcons", async () => {
    const icons = [
      { src: "/custom.png", sizes: "512x512", type: "image/png" },
    ];
    const plugin = createPlugin({
      pwa: { manifest: { icons } },
    });
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    expect(mockGeneratePwaIcons).not.toHaveBeenCalled();
    const manifest = parseWrittenManifest();
    expect(manifest["icons"]).toEqual(icons);
  });

  // Scenario: 원본 아이콘 없음
  it("omits icons field when generatePwaIcons returns empty array", async () => {
    mockGeneratePwaIcons.mockResolvedValue([]);

    const plugin = createPlugin();
    initPlugin(plugin);
    await (plugin.closeBundle as Function)();

    const manifest = parseWrittenManifest();
    expect(manifest["icons"]).toBeUndefined();
  });
});
