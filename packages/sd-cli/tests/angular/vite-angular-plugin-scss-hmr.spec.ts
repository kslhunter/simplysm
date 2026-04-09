import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import path from "path";
import type { SdConfig } from "../../src/sd-config.types";
import {
  FIXTURE_DIR,
  PKG_DIR,
  createTestSdConfig,
  initPlugin,
} from "./_vite-angular-plugin-test-setup";

const mockLoadSdConfig = vi.fn<(...args: unknown[]) => Promise<SdConfig>>();

vi.mock("../../src/utils/sd-config", () => ({
  loadSdConfig: (...args: unknown[]) => mockLoadSdConfig(...args),
}));

const { sdAngularPlugin } = await import("../../src/angular/vite-angular-plugin.js");

function mockServerWithModuleGraph() {
  return {
    moduleGraph: {
      getModulesByFile: (file: string) => {
        return new Set([{ file, id: file }]);
      },
    },
  };
}

describe("sdAngularPlugin SCSS @use HMR", () => {
  let plugin: ReturnType<typeof sdAngularPlugin>;

  beforeAll(async () => {
    vi.spyOn(process, "cwd").mockReturnValue(FIXTURE_DIR);
    mockLoadSdConfig.mockResolvedValue(createTestSdConfig());
    plugin = sdAngularPlugin({ pkg: "basic-app" });
    await initPlugin(plugin);
  });

  afterAll(async () => {
    await (plugin as any).buildEnd?.call({});
  });

  // Acceptance: inline styles의 직접 @use 의존성 변경 시 재컴파일
  it("recompiles when inline SCSS @use dependency changes", async () => {
    const variablesPath = path
      .join(PKG_DIR, "scss/_variables.scss")
      .replace(/\\/g, "/");

    const result = await (plugin as any).handleHotUpdate?.({
      file: variablesPath,
      modules: [],
      server: mockServerWithModuleGraph(),
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    expect(result).toBeDefined();
    expect(result!.length).toBeGreaterThan(0);
  });

  // Acceptance: inline styles의 간접 @use 의존성 변경 시 재컴파일 (체이닝)
  it("recompiles when chained @use dependency changes", async () => {
    const colorsPath = path
      .join(PKG_DIR, "scss/_colors.scss")
      .replace(/\\/g, "/");

    const result = await (plugin as any).handleHotUpdate?.({
      file: colorsPath,
      modules: [],
      server: mockServerWithModuleGraph(),
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    expect(result).toBeDefined();
    expect(result!.length).toBeGreaterThan(0);
  });

  // Acceptance: 무관한 SCSS 변경 시 재빌드하지 않음
  it("does not recompile when unrelated SCSS changes", async () => {
    const unrelatedPath = path
      .join(PKG_DIR, "scss/_unrelated.scss")
      .replace(/\\/g, "/");

    const result = await (plugin as any).handleHotUpdate?.({
      file: unrelatedPath,
      modules: [],
      server: mockServerWithModuleGraph(),
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    expect(result).toBeUndefined();
  });
});
