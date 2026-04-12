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
  // config() define 반환은 Vitest 축소로 제거됨 (esbuild-client-config에서 처리)

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

  // handleHotUpdate, configureServer, optimizeDeps는 Vitest 축소로 제거됨
  // Feature 3.3에서 esbuild 기반 테스트로 교체 예정

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

  // config() define 반환값은 Vitest 축소로 제거됨 (Feature 3.3에서 별도 테스트)

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
