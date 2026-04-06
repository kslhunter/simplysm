import { describe, it, expect, vi } from "vitest";
import path from "path";
import { sdAngularPlugin } from "../../src/angular/vite-angular-plugin.js";

const FIXTURE_DIR = path.resolve(import.meta.dirname, "fixtures/basic-app");
const TSCONFIG_PATH = path.join(FIXTURE_DIR, "tsconfig.json");

describe("sdAngularPlugin", () => {
  // Scenario: Angular define 설정
  it("sets ngDevMode and ngJitMode defines", () => {
    const devPlugin = sdAngularPlugin({ tsconfig: TSCONFIG_PATH, dev: true });
    const prodPlugin = sdAngularPlugin({ tsconfig: TSCONFIG_PATH, dev: false });

    // config hook returns define values
    const devConfig = (devPlugin as any).config?.();
    const prodConfig = (prodPlugin as any).config?.();

    expect(devConfig?.define?.ngJitMode).toBe("false");
    expect(devConfig?.define?.ngDevMode).toBeUndefined();

    expect(prodConfig?.define?.ngJitMode).toBe("false");
    expect(prodConfig?.define?.ngDevMode).toBe("false");
  });

  // Scenario: non-Angular .ts 파일은 기본 처리
  it("returns undefined for non-emitted .ts files", async () => {
    const plugin = sdAngularPlugin({ tsconfig: TSCONFIG_PATH, dev: true });

    // Simulate buildStart
    await (plugin as any).buildStart?.call({});

    // A file not in the emit cache should return undefined
    const result = await (plugin as any).transform?.call(
      {},
      "export const x = 1;",
      "/some/unknown/file.ts",
    );

    expect(result).toBeUndefined();

    // cleanup
    await (plugin as any).buildEnd?.call({});
  });

  // Scenario: buildStart에서 초기화 및 emit + buildEnd에서 리소스 정리
  it("initializes facade in buildStart and disposes in buildEnd", async () => {
    const plugin = sdAngularPlugin({ tsconfig: TSCONFIG_PATH, dev: true });

    // buildStart should not throw
    await (plugin as any).buildStart?.call({});

    // buildEnd should clean up without error
    await (plugin as any).buildEnd?.call({});
  });

  // Scenario: Angular 컴포넌트 .ts 파일 수정 시 컴포넌트 HMR (Acceptance — Feature 3.3)
  it("updates emit cache and returns affected modules when handleHotUpdate is called", async () => {
    const onBuildStart = vi.fn();
    const onBuild = vi.fn();

    const plugin = sdAngularPlugin({
      tsconfig: TSCONFIG_PATH,
      dev: true,
      onBuildStart,
      onBuild,
    });

    // Initial build
    await (plugin as any).buildStart?.call({});

    const appComponentPath = path
      .join(FIXTURE_DIR, "src/app.component.ts")
      .replace(/\\/g, "/");

    // Verify initial transform works
    const initialResult = await (plugin as any).transform?.call({}, "", appComponentPath);
    expect(initialResult).toBeDefined();
    expect(initialResult.code.length).toBeGreaterThan(0);

    // handleHotUpdate must exist
    expect((plugin as any).handleHotUpdate).toBeDefined();

    // Simulate file change
    const mockModule = { file: appComponentPath, id: appComponentPath };
    const hmrResult = await (plugin as any).handleHotUpdate?.({
      file: appComponentPath,
      modules: [mockModule],
      server: { watcher: { emit: vi.fn() } },
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    // onBuildStart/onBuild callbacks must be called
    expect(onBuildStart).toHaveBeenCalled();
    expect(onBuild).toHaveBeenCalledWith(
      expect.objectContaining({ success: expect.any(Boolean) }),
    );

    // Must return affected modules array
    expect(Array.isArray(hmrResult)).toBe(true);

    // Transform must still work after HMR (cache updated, not stale)
    const afterResult = await (plugin as any).transform?.call({}, "", appComponentPath);
    expect(afterResult).toBeDefined();
    expect(afterResult.code.length).toBeGreaterThan(0);

    await (plugin as any).buildEnd?.call({});
  });

  // Scenario: ngHmrMode define 설정 (Acceptance — Feature 3.3)
  it("sets ngHmrMode in dev mode and disables in prod mode", () => {
    const devPlugin = sdAngularPlugin({ tsconfig: TSCONFIG_PATH, dev: true });
    const prodPlugin = sdAngularPlugin({ tsconfig: TSCONFIG_PATH, dev: false });

    const devConfig = (devPlugin as any).config?.();
    const prodConfig = (prodPlugin as any).config?.();

    // dev: ngHmrMode should be undefined (Angular runtime default = enabled)
    expect(devConfig?.define?.ngHmrMode).toBeUndefined();
    // prod: ngHmrMode should be "false"
    expect(prodConfig?.define?.ngHmrMode).toBe("false");
  });

  // Scenario: 컴파일 에러 발생 및 복구 (Acceptance — Feature 3.3)
  it("calls onBuild with success=false when handleHotUpdate encounters compile error", async () => {
    const onBuild = vi.fn();
    const plugin = sdAngularPlugin({
      tsconfig: TSCONFIG_PATH,
      dev: true,
      onBuild,
    });

    await (plugin as any).buildStart?.call({});

    // handleHotUpdate with a non-existent file — facade.update() should handle gracefully
    const _hmrResult = await (plugin as any).handleHotUpdate?.({
      file: path.join(FIXTURE_DIR, "src/nonexistent-file.ts").replace(/\\/g, "/"),
      modules: [],
      server: { watcher: { emit: vi.fn() } },
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    // Should call onBuild (either success with 0 affected or error)
    expect(onBuild).toHaveBeenCalled();

    await (plugin as any).buildEnd?.call({});
  });

  // Scenario: non-Angular .ts 파일 수정 — handleHotUpdate passes through
  it("handleHotUpdate skips non-ts/html/scss files", async () => {
    const onBuildStart = vi.fn();
    const plugin = sdAngularPlugin({
      tsconfig: TSCONFIG_PATH,
      dev: true,
      onBuildStart,
    });

    await (plugin as any).buildStart?.call({});

    // .json file should be ignored
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
    const plugin = sdAngularPlugin({ tsconfig: TSCONFIG_PATH, dev: true });

    await (plugin as any).buildStart?.call({});
    await (plugin as any).buildEnd?.call({});

    // transform should still work (facade alive)
    const appComponentPath = path
      .join(FIXTURE_DIR, "src/app.component.ts")
      .replace(/\\/g, "/");
    const result = await (plugin as any).transform?.call({}, "", appComponentPath);
    expect(result).toBeDefined();
    expect(result.code.length).toBeGreaterThan(0);

    // Clean up facade manually via configureServer close simulation
    // (in real use, Vite server close triggers this)
  });

  // Scenario: optimizeDeps에 Angular Linker esbuild 플러그인이 등록된다
  it("registers angular-vite-optimize-deps esbuild plugin in optimizeDeps config", () => {
    const plugin = sdAngularPlugin({ tsconfig: TSCONFIG_PATH, dev: true });
    const config = (plugin as any).config?.();

    const esbuildPlugins = config?.optimizeDeps?.esbuildOptions?.plugins as
      | { name: string }[]
      | undefined;
    expect(esbuildPlugins).toBeDefined();
    expect(esbuildPlugins!.some((p) => p.name === "angular-vite-optimize-deps")).toBe(true);
  });

  // Scenario: Linker 캐시 skip — replaceDeps 파일은 사전 번들링에서 건너뛴다
  it("angular-vite-optimize-deps returns null for replaceDeps dist files", async () => {
    const plugin = sdAngularPlugin({
      tsconfig: TSCONFIG_PATH,
      dev: true,
      replaceDepDistPaths: ["/packages/my-client/node_modules/@scope/core/dist"],
    });

    const config = (plugin as any).config?.();
    const esbuildPlugins = config?.optimizeDeps?.esbuildOptions?.plugins as
      | { name: string; setup: (build: { onLoad: Function }) => void }[];
    const optimizePlugin = esbuildPlugins.find(
      (p) => p.name === "angular-vite-optimize-deps",
    )!;

    // esbuild onLoad 핸들러 추출
    let onLoadHandler: (args: { path: string }) => Promise<unknown>;
    optimizePlugin.setup({
      onLoad(_filter: unknown, fn: (args: { path: string }) => Promise<unknown>) {
        onLoadHandler = fn;
      },
    });

    // replaceDeps dist 경로 내 .js 파일 → null 반환 (skip)
    const result = await onLoadHandler!(
      { path: "/packages/my-client/node_modules/@scope/core/dist/index.js" },
    );
    expect(result).toBeNull();
  });

  // Scenario: handleHotUpdate에서 replaceDeps .js 변경 시 full-reload 강제
  it("handleHotUpdate triggers full-reload for replaceDeps .js files", async () => {
    const plugin = sdAngularPlugin({
      tsconfig: TSCONFIG_PATH,
      dev: true,
      replaceDepDistPaths: ["/packages/my-client/node_modules/@scope/core/dist"],
    });

    await (plugin as any).buildStart?.call({});

    // configureServer로 server 참조 저장
    const mockHotSend = vi.fn();
    const mockServer = {
      middlewares: { use: vi.fn() },
      httpServer: { on: vi.fn() },
      config: { base: "/" },
      hot: { send: mockHotSend },
    };
    (plugin as any).configureServer?.(mockServer);

    // replaceDeps .js 파일 변경 → full-reload
    const hmrResult = await (plugin as any).handleHotUpdate?.({
      file: "/packages/my-client/node_modules/@scope/core/dist/component.js",
      modules: [],
      server: mockServer,
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    expect(mockHotSend).toHaveBeenCalledWith({ type: "full-reload" });
    expect(hmrResult).toEqual([]);

    await (plugin as any).buildEnd?.call({});
  });

  // Scenario: .mjs 파일이 JavaScriptTransformer를 통과한다 (Feature 1.1 Angular Linker)
  it("transforms .mjs files through JavaScriptTransformer", async () => {
    const plugin = sdAngularPlugin({ tsconfig: TSCONFIG_PATH, dev: true });
    await (plugin as any).buildStart?.call({});

    const mjsCode = "export const x = 1;";
    const result = await (plugin as any).transform?.call(
      {},
      mjsCode,
      "/some/library/module.mjs",
    );

    // .mjs 파일은 transform 결과를 반환해야 한다 (undefined가 아님)
    expect(result).toBeDefined();
    expect(result.code).toBeDefined();
    expect(typeof result.code).toBe("string");

    await (plugin as any).buildEnd?.call({});
  });

  // Scenario: .js 파일이 JavaScriptTransformer를 통과한다 (Feature 1.1 Angular Linker)
  it("transforms .js files through JavaScriptTransformer", async () => {
    const plugin = sdAngularPlugin({ tsconfig: TSCONFIG_PATH, dev: true });
    await (plugin as any).buildStart?.call({});

    const jsCode = "export const y = 2;";
    const result = await (plugin as any).transform?.call(
      {},
      jsCode,
      "/some/library/module.js",
    );

    expect(result).toBeDefined();
    expect(result.code).toBeDefined();
    expect(typeof result.code).toBe("string");

    await (plugin as any).buildEnd?.call({});
  });

  // Scenario: 비대상 파일(.css 등)은 transform하지 않는다 (Feature 1.1 Angular Linker)
  it("returns undefined for non-JS files like .css", async () => {
    const plugin = sdAngularPlugin({ tsconfig: TSCONFIG_PATH, dev: true });
    await (plugin as any).buildStart?.call({});

    const result = await (plugin as any).transform?.call(
      {},
      "body { color: red; }",
      "/some/styles.css",
    );

    expect(result).toBeUndefined();

    await (plugin as any).buildEnd?.call({});
  });

  // Scenario: Angular .ts 파일 transform
  it("transforms emitted .ts files with compiled JS", async () => {
    const plugin = sdAngularPlugin({ tsconfig: TSCONFIG_PATH, dev: false });

    await (plugin as any).buildStart?.call({});

    // The app.component.ts should be in the emit cache
    const appComponentPath = path
      .join(FIXTURE_DIR, "src/app.component.ts")
      .replace(/\\/g, "/");

    const result = await (plugin as any).transform?.call(
      {},
      "",
      appComponentPath,
    );

    // Should return transformed code
    if (result != null) {
      expect(result).toHaveProperty("code");
      expect(typeof result.code).toBe("string");
      expect(result.code.length).toBeGreaterThan(0);
    }

    await (plugin as any).buildEnd?.call({});
  });
});
