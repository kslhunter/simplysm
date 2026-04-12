import { describe, it, expect, vi, beforeAll } from "vitest";
import type { Plugin } from "vite";
import { resolve } from "node:path";
import type { SdConfig } from "../../src/sd-config.types";
import {
  FIXTURE_DIR,
  PKG_DIR,
  createTestSdConfig,
} from "./_vite-angular-plugin-test-setup";

const mockLoadSdConfig = vi.fn<(...args: unknown[]) => Promise<SdConfig>>();

vi.mock("../../src/utils/sd-config", () => ({
  loadSdConfig: (...args: unknown[]) => mockLoadSdConfig(...args),
}));

const { sdAngularPlugin } = await import("../../src/angular/vite-angular-plugin");

describe("sdAngularPlugin Vitest 지원", () => {
  let plugin: Plugin;

  beforeAll(async () => {
    vi.spyOn(process, "cwd").mockReturnValue(FIXTURE_DIR);
    mockLoadSdConfig.mockResolvedValue(createTestSdConfig());

    plugin = sdAngularPlugin({ pkg: "basic-app" });
    await (plugin as any).config?.({}, { mode: "development", command: "serve" });
    (plugin as any).configResolved?.({ build: { sourcemap: false } });
    await (plugin as any).buildStart?.call({});
  }, 60_000);

  // Scenario: @Component 소스 컴파일 및 ɵcmp 런타임 코드 서빙
  it("compiles @Component source and serves ɵcmp runtime code", async () => {
    const filePath = resolve(PKG_DIR, "src/app.component.ts");
    const result = await (plugin as any).transform?.call({}, "", filePath);

    expect(result).toBeDefined();
    expect(result!.code).toContain("ɵcmp");
    expect(result!.code).not.toContain("@Component");
  });

  // Scenario: node_modules .ts 파일은 AOT 대상이 아니므로 undefined 반환
  it("returns undefined for node_modules .ts path", async () => {
    const result = await (plugin as any).transform?.call(
      {},
      "",
      resolve(FIXTURE_DIR, "node_modules/@angular/core/index.ts"),
    );
    expect(result).toBeUndefined();
  });

  // Scenario: browser target 패키지에서 플러그인 초기화
  it("initializes successfully with non-client (browser target) package", async () => {
    mockLoadSdConfig.mockResolvedValue(
      createTestSdConfig({ target: "browser" } as any),
    );

    const browserPlugin = sdAngularPlugin({ pkg: "basic-app" });

    await (browserPlugin as any).config?.({}, { mode: "development", command: "serve" });
    (browserPlugin as any).configResolved?.({ build: { sourcemap: false } });
    await (browserPlugin as any).buildStart?.call({});

    const appComponentPath = resolve(PKG_DIR, "src/app.component.ts");
    const result = await (browserPlugin as any).transform?.call({}, "", appComponentPath);
    expect(result).toBeDefined();
    expect(result.code.length).toBeGreaterThan(0);

    await (browserPlugin as any).buildEnd?.call({});
  });
});
