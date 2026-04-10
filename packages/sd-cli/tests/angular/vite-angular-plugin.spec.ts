import { describe, it, expect, vi, beforeEach } from "vitest";
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

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(process, "cwd").mockReturnValue(FIXTURE_DIR);
  mockLoadSdConfig.mockResolvedValue(createTestSdConfig());
});

describe("sdAngularPlugin", () => {
  // Scenario: Angular define 설정
  it("sets ngDevMode and ngJitMode defines", async () => {
    const devPlugin = sdAngularPlugin({ pkg: "basic-app"});
    const prodPlugin = sdAngularPlugin({ pkg: "basic-app"});

    const devConfig = await (devPlugin as any).config?.({}, { mode: "development", command: "serve" });
    const prodConfig = await (prodPlugin as any).config?.({}, { mode: "production", command: "build" });

    expect(devConfig?.define?.ngJitMode).toBe("false");
    expect(devConfig?.define?.ngDevMode).toBeUndefined();

    expect(prodConfig?.define?.ngJitMode).toBe("false");
    expect(prodConfig?.define?.ngDevMode).toBe("false");
  });

  // Scenario: non-Angular .ts 파일은 기본 처리
  it("returns undefined for non-emitted .ts files", async () => {
    const plugin = sdAngularPlugin({ pkg: "basic-app"});
    await initPlugin(plugin);

    const result = await (plugin as any).transform?.call(
      {},
      "export const x = 1;",
      "/some/unknown/file.ts",
    );

    expect(result).toBeUndefined();
    await (plugin as any).buildEnd?.call({});
  });

  // Scenario: buildStart에서 초기화 및 emit + buildEnd에서 리소스 정리
  it("initializes facade in buildStart and disposes in buildEnd", async () => {
    const plugin = sdAngularPlugin({ pkg: "basic-app"});
    await initPlugin(plugin);
    await (plugin as any).buildEnd?.call({});
  });

  // Scenario: Angular 컴포넌트 .ts 파일 수정 시 컴포넌트 HMR
  it("updates emit cache and returns affected modules when handleHotUpdate is called", async () => {
    const onBuildStart = vi.fn();
    const onBuild = vi.fn();

    const plugin = sdAngularPlugin({
      pkg: "basic-app",
     
      onBuildStart,
      onBuild,
    });
    await initPlugin(plugin);

    const appComponentPath = path
      .join(PKG_DIR, "src/app.component.ts")
      .replace(/\\/g, "/");

    const initialResult = await (plugin as any).transform?.call({}, "", appComponentPath);
    expect(initialResult).toBeDefined();
    expect(initialResult.code.length).toBeGreaterThan(0);

    expect((plugin as any).handleHotUpdate).toBeDefined();

    const mockModule = { file: appComponentPath, id: appComponentPath };
    const hmrResult = (plugin as any).handleHotUpdate?.({
      file: appComponentPath,
      modules: [mockModule],
      server: { watcher: { emit: vi.fn() } },
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    // 100ms 배치 타이머 + 비동기 Angular 재컴파일 완료 대기
    await vi.waitFor(() => {
      expect(onBuildStart).toHaveBeenCalled();
    }, { timeout: 10000, interval: 50 });
    expect(onBuild).toHaveBeenCalledWith(
      expect.objectContaining({ success: expect.any(Boolean) }),
    );
    expect(Array.isArray(hmrResult)).toBe(true);

    const afterResult = await (plugin as any).transform?.call({}, "", appComponentPath);
    expect(afterResult).toBeDefined();
    expect(afterResult.code.length).toBeGreaterThan(0);

    await (plugin as any).buildEnd?.call({});
  });

  // Scenario: ngHmrMode define 설정
  it("sets ngHmrMode in dev mode and disables in prod mode", async () => {
    const devPlugin = sdAngularPlugin({ pkg: "basic-app"});
    const prodPlugin = sdAngularPlugin({ pkg: "basic-app"});

    const devConfig = await (devPlugin as any).config?.({}, { mode: "development", command: "serve" });
    const prodConfig = await (prodPlugin as any).config?.({}, { mode: "production", command: "build" });

    expect(devConfig?.define?.ngHmrMode).toBeUndefined();
    expect(prodConfig?.define?.ngHmrMode).toBe("false");
  });

  // Scenario: 컴파일 에러 발생 및 복구
  it("calls onBuild with success=false when handleHotUpdate encounters compile error", async () => {
    const onBuild = vi.fn();
    const plugin = sdAngularPlugin({
      pkg: "basic-app",
     
      onBuild,
    });
    await initPlugin(plugin);

    const _hmrResult = await (plugin as any).handleHotUpdate?.({
      file: path.join(PKG_DIR, "src/nonexistent-file.ts").replace(/\\/g, "/"),
      modules: [],
      server: { watcher: { emit: vi.fn() } },
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    expect(onBuild).toHaveBeenCalled();
    await (plugin as any).buildEnd?.call({});
  });

  // Scenario: non-Angular .ts 파일 수정 — handleHotUpdate passes through
  it("handleHotUpdate skips non-ts/html/scss files", async () => {
    const onBuildStart = vi.fn();
    const plugin = sdAngularPlugin({
      pkg: "basic-app",
     
      onBuildStart,
    });
    await initPlugin(plugin);

    const result = await (plugin as any).handleHotUpdate?.({
      file: "/some/file.json",
      modules: [],
      server: {},
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    expect(result).toBeUndefined();
    expect(onBuildStart).not.toHaveBeenCalled();
    await (plugin as any).buildEnd?.call({});
  });

  // Scenario: dev 모드에서 buildEnd 후 facade 유지
  it("keeps facade alive after buildEnd in dev mode", async () => {
    const plugin = sdAngularPlugin({ pkg: "basic-app"});
    await initPlugin(plugin);
    await (plugin as any).buildEnd?.call({});

    const appComponentPath = path
      .join(PKG_DIR, "src/app.component.ts")
      .replace(/\\/g, "/");
    const result = await (plugin as any).transform?.call({}, "", appComponentPath);
    expect(result).toBeDefined();
    expect(result.code.length).toBeGreaterThan(0);
  });

  // Scenario: optimizeDeps에 Angular Linker esbuild 플러그인이 등록된다
  it("registers angular-vite-optimize-deps esbuild plugin in optimizeDeps config", async () => {
    const plugin = sdAngularPlugin({ pkg: "basic-app"});
    const config = await (plugin as any).config?.({}, { mode: "development", command: "serve" });

    const esbuildPlugins = config?.optimizeDeps?.esbuildOptions?.plugins as
      | { name: string }[]
      | undefined;
    expect(esbuildPlugins).toBeDefined();
    expect(esbuildPlugins!.some((p) => p.name === "angular-vite-optimize-deps")).toBe(true);
  });

  // Scenario: replaceDeps 없을 때 .js 변경은 무시
  it("handleHotUpdate ignores .js files when no replaceDeps configured", async () => {
    const plugin = sdAngularPlugin({ pkg: "basic-app"});
    await initPlugin(plugin);

    const mockHotSend = vi.fn();
    const mockServer = {
      middlewares: { use: vi.fn() },
      httpServer: { on: vi.fn() },
      config: { base: "/" },
      hot: { send: mockHotSend },
    };
    (plugin as any).configureServer?.(mockServer);

    const hmrResult = await (plugin as any).handleHotUpdate?.({
      file: "/some/external/lib.js",
      modules: [],
      server: mockServer,
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    expect(hmrResult).toBeUndefined();
    await (plugin as any).buildEnd?.call({});
  });

  // Scenario: .mjs 파일이 JavaScriptTransformer를 통과한다
  it("transforms .mjs files through JavaScriptTransformer", async () => {
    const plugin = sdAngularPlugin({ pkg: "basic-app"});
    await initPlugin(plugin);

    const result = await (plugin as any).transform?.call(
      {},
      "export const x = 1;",
      "/some/library/module.mjs",
    );

    expect(result).toBeDefined();
    expect(result.code).toBeDefined();
    expect(typeof result.code).toBe("string");
    await (plugin as any).buildEnd?.call({});
  });

  // Scenario: .js 파일이 JavaScriptTransformer를 통과한다
  it("transforms .js files through JavaScriptTransformer", async () => {
    const plugin = sdAngularPlugin({ pkg: "basic-app"});
    await initPlugin(plugin);

    const result = await (plugin as any).transform?.call(
      {},
      "export const y = 2;",
      "/some/library/module.js",
    );

    expect(result).toBeDefined();
    expect(result.code).toBeDefined();
    expect(typeof result.code).toBe("string");
    await (plugin as any).buildEnd?.call({});
  });

  // Scenario: 비대상 파일(.css 등)은 transform하지 않는다
  it("returns undefined for non-JS files like .css", async () => {
    const plugin = sdAngularPlugin({ pkg: "basic-app"});
    await initPlugin(plugin);

    const result = await (plugin as any).transform?.call(
      {},
      "body { color: red; }",
      "/some/styles.css",
    );

    expect(result).toBeUndefined();
    await (plugin as any).buildEnd?.call({});
  });

  // Scenario: Angular .ts 파일 transform (prod 모드)
  it("transforms emitted .ts files with compiled JS", async () => {
    const plugin = sdAngularPlugin({ pkg: "basic-app"});
    await initPlugin(plugin, { mode: "production", command: "build" });

    const appComponentPath = path
      .join(PKG_DIR, "src/app.component.ts")
      .replace(/\\/g, "/");

    const result = await (plugin as any).transform?.call({}, "", appComponentPath);

    if (result != null) {
      expect(result).toHaveProperty("code");
      expect(typeof result.code).toBe("string");
      expect(result.code.length).toBeGreaterThan(0);
    }

    await (plugin as any).buildEnd?.call({});
  });

  // Scenario: legacyModule이 sd.config.ts에서 resolve되어 HMR 비활성화
  it("resolves legacyModule from sd.config.ts and disables HMR", async () => {
    mockLoadSdConfig.mockResolvedValue(
      createTestSdConfig({ browserSupport: { legacyModule: true } }),
    );

    const plugin = sdAngularPlugin({ pkg: "basic-app" });
    const config = await (plugin as any).config?.({}, { mode: "development", command: "serve" });

    expect(config?.define?.ngHmrMode).toBe("false");
  });

  // Scenario: browserSupport 미설정 시 기본값 동작
  it("works when browserSupport is not set in sd.config.ts", async () => {
    mockLoadSdConfig.mockResolvedValue(createTestSdConfig());

    const plugin = sdAngularPlugin({ pkg: "basic-app" });

    await initPlugin(plugin);

    const appComponentPath = PKG_DIR.replace(/\\/g, "/") + "/src/app.component.ts";
    const result = await (plugin as any).transform?.call({}, "", appComponentPath);
    expect(result).toBeDefined();

    await (plugin as any).buildEnd?.call({});
  });
});
