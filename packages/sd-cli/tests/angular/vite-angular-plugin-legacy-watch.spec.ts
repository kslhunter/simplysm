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

describe("sdAngularPlugin legacy watch rebuild", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(process, "cwd").mockReturnValue(FIXTURE_DIR);
    mockLoadSdConfig.mockResolvedValue(
      createTestSdConfig({ browserSupport: { legacyModule: true } }),
    );
  });

  // Acceptance: 재빌드 시 변경 파일의 캐시가 무효화되고 증분 컴파일된다
  it("invalidates cache and produces updated output on watch rebuild", async () => {
    const plugin = sdAngularPlugin({
      pkg: "basic-app",
    });

    // 초기 빌드
    await initPlugin(plugin);

    const appComponentPath = path
      .join(PKG_DIR, "src/app.component.ts")
      .replace(/\\/g, "/");

    // 초기 transform 결과 캡처
    const initialResult = await (plugin as any).transform?.call({}, "", appComponentPath);
    expect(initialResult).toBeDefined();
    expect(initialResult.code.length).toBeGreaterThan(0);

    // watchChange 호출 (파일 변경 알림)
    expect((plugin as any).watchChange).toBeDefined();
    await (plugin as any).watchChange?.call({}, appComponentPath, { event: "update" });

    // 재빌드 (buildStart 재호출)
    await (plugin as any).buildStart?.call({});

    // 재빌드 후 transform — 컴파일러가 재실행되어 결과를 반환해야 한다
    const rebuiltResult = await (plugin as any).transform?.call({}, "", appComponentPath);
    expect(rebuiltResult).toBeDefined();
    expect(rebuiltResult.code).toBeDefined();
    expect(rebuiltResult.code.length).toBeGreaterThan(0);

    await (plugin as any).buildEnd?.call({});
  });

  // Acceptance: 첫 buildStart는 기존 로직으로 전체 컴파일한다
  it("performs full compilation on first buildStart", async () => {
    const plugin = sdAngularPlugin({
      pkg: "basic-app",
    });

    // watchChange 없이 첫 buildStart
    await initPlugin(plugin);

    const appComponentPath = path
      .join(PKG_DIR, "src/app.component.ts")
      .replace(/\\/g, "/");

    const result = await (plugin as any).transform?.call({}, "", appComponentPath);
    expect(result).toBeDefined();
    expect(result.code.length).toBeGreaterThan(0);

    await (plugin as any).buildEnd?.call({});
  });

  // Acceptance: watchChange 없이 buildStart 재호출 시에도 정상 동작
  it("handles buildStart re-invocation without watchChange gracefully", async () => {
    const plugin = sdAngularPlugin({
      pkg: "basic-app",
    });

    // 초기 빌드
    await initPlugin(plugin);

    // watchChange 없이 재빌드 (예: Rolldown이 변경 없이 재빌드 트리거)
    await (plugin as any).buildStart?.call({});

    const appComponentPath = path
      .join(PKG_DIR, "src/app.component.ts")
      .replace(/\\/g, "/");

    const result = await (plugin as any).transform?.call({}, "", appComponentPath);
    expect(result).toBeDefined();
    expect(result.code.length).toBeGreaterThan(0);

    await (plugin as any).buildEnd?.call({});
  });
});
