import { describe, it, expect, vi, beforeAll } from "vitest";
import type { Plugin } from "vite";
import { resolve } from "node:path";
import {
  FIXTURE_DIR,
  PKG_DIR,
} from "./_vite-angular-plugin-test-setup";

const { sdAngularPlugin } = await import("../../src/angular/vite-angular-plugin");

describe("sdAngularPlugin Vitest 지원", () => {
  let plugin: Plugin;

  beforeAll(async () => {
    vi.spyOn(process, "cwd").mockReturnValue(FIXTURE_DIR);

    plugin = sdAngularPlugin({ pkg: "basic-app" });
    await (plugin as any).config?.({}, { mode: "development", command: "serve" });
    await (plugin as any).buildStart?.call({});
  }, 60_000);

  // Scenario: @Component 소스 컴파일 및 ɵcmp 런타임 코드 서빙
  it("compiles @Component source and serves ɵcmp runtime code", () => {
    const filePath = resolve(PKG_DIR, "src/app.component.ts");
    const result = (plugin as any).transform?.call({}, "", filePath);

    expect(result).toBeDefined();
    expect(result!.code).toContain("ɵcmp");
    expect(result!.code).not.toContain("@Component");
  });

  // Scenario: node_modules .ts 파일은 AOT 대상이 아니므로 undefined 반환
  it("returns undefined for node_modules .ts path", () => {
    const result = (plugin as any).transform?.call(
      {},
      "",
      resolve(FIXTURE_DIR, "node_modules/@angular/core/index.ts"),
    );
    expect(result).toBeUndefined();
  });
});
