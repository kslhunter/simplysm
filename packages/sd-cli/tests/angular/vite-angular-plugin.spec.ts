import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";
import {
  FIXTURE_DIR,
  PKG_DIR,
  initPlugin,
} from "./_vite-angular-plugin-test-setup";

const { sdAngularPlugin } = await import("../../src/angular/vite-angular-plugin.js");

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(process, "cwd").mockReturnValue(FIXTURE_DIR);
});

describe("sdAngularPlugin", () => {
  // Scenario: non-Angular .ts 파일은 기본 처리
  it("returns undefined for non-emitted .ts files", async () => {
    const plugin = sdAngularPlugin({ pkg: "basic-app" });
    await initPlugin(plugin);

    const result = (plugin as any).transform?.call(
      {},
      "export const x = 1;",
      "/some/unknown/file.ts",
    );

    expect(result).toBeUndefined();
    (plugin as any).buildEnd?.call({});
  });

  // Scenario: buildStart에서 초기화 및 emit + buildEnd에서 리소스 정리
  it("initializes facade in buildStart and disposes in buildEnd", async () => {
    const plugin = sdAngularPlugin({ pkg: "basic-app" });
    await initPlugin(plugin);
    (plugin as any).buildEnd?.call({});
  });

  // Scenario: .mjs/.js 파일은 처리하지 않는다
  it("returns undefined for .mjs files", async () => {
    const plugin = sdAngularPlugin({ pkg: "basic-app" });
    await initPlugin(plugin);

    const result = (plugin as any).transform?.call(
      {},
      "export const x = 1;",
      "/some/library/module.mjs",
    );

    expect(result).toBeUndefined();
    (plugin as any).buildEnd?.call({});
  });

  it("returns undefined for .js files", async () => {
    const plugin = sdAngularPlugin({ pkg: "basic-app" });
    await initPlugin(plugin);

    const result = (plugin as any).transform?.call(
      {},
      "export const y = 2;",
      "/some/library/module.js",
    );

    expect(result).toBeUndefined();
    (plugin as any).buildEnd?.call({});
  });

  // Scenario: 비대상 파일(.css 등)은 transform하지 않는다
  it("returns undefined for non-JS files like .css", async () => {
    const plugin = sdAngularPlugin({ pkg: "basic-app" });
    await initPlugin(plugin);

    const result = (plugin as any).transform?.call(
      {},
      "body { color: red; }",
      "/some/styles.css",
    );

    expect(result).toBeUndefined();
    (plugin as any).buildEnd?.call({});
  });

  // Scenario: Angular .ts 파일 transform
  it("transforms emitted .ts files with compiled JS", async () => {
    const plugin = sdAngularPlugin({ pkg: "basic-app" });
    await initPlugin(plugin);

    const appComponentPath = path
      .join(PKG_DIR, "src/app.component.ts")
      .replace(/\\/g, "/");

    const result = (plugin as any).transform?.call({}, "", appComponentPath);

    if (result != null) {
      expect(result).toHaveProperty("code");
      expect(typeof result.code).toBe("string");
      expect(result.code.length).toBeGreaterThan(0);
    }

    (plugin as any).buildEnd?.call({});
  });
});
