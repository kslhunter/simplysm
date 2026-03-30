import { describe, it, expect, beforeAll } from "vitest";
import type { Plugin } from "vite";
import { resolve } from "node:path";

const workspaceRoot = resolve(import.meta.dirname, "../../..");
const angularTsconfig = resolve(workspaceRoot, "packages/angular/tsconfig.json");

async function callTransform(
  plugin: Plugin,
  code: string,
  id: string,
): Promise<{ code: string; map?: unknown } | undefined> {
  if (typeof plugin.transform !== "function") return undefined;
  const result = await (plugin.transform as (code: string, id: string) => Promise<unknown>).call(
    {},
    code,
    id,
  );
  return result as { code: string; map?: unknown } | undefined;
}

// Scenario 3: cwd 옵션으로 워크스페이스 루트를 지정한다
describe("angularVitestPlugin with explicit cwd", () => {
  let plugin: Plugin;

  beforeAll(async () => {
    const { angularVitestPlugin } = await import("../src/vitest-plugin");
    plugin = angularVitestPlugin({ tsconfig: angularTsconfig, cwd: workspaceRoot });
    if (typeof plugin.buildStart === "function") {
      await (plugin.buildStart as () => Promise<void>).call({});
    }
  }, 30_000);

  it("compiles Angular source successfully with explicit cwd", async () => {
    const filePath = resolve(
      workspaceRoot,
      "packages/angular/src/core/providers/sd-theme-provider.ts",
    );
    const result = await callTransform(plugin, "", filePath);

    expect(result).toBeDefined();
    expect(result!.code).toContain("ɵprov");
  });
});

// Scenario 4: cwd 미지정 시 tsconfig 기준 상위 2단계를 사용한다
describe("angularVitestPlugin without cwd (fallback)", () => {
  let plugin: Plugin;

  beforeAll(async () => {
    const { angularVitestPlugin } = await import("../src/vitest-plugin");
    plugin = angularVitestPlugin({ tsconfig: angularTsconfig });
    if (typeof plugin.buildStart === "function") {
      await (plugin.buildStart as () => Promise<void>).call({});
    }
  }, 30_000);

  it("compiles Angular source successfully with default cwd", async () => {
    const filePath = resolve(
      workspaceRoot,
      "packages/angular/src/core/providers/sd-theme-provider.ts",
    );
    const result = await callTransform(plugin, "", filePath);

    expect(result).toBeDefined();
    expect(result!.code).toContain("ɵprov");
  });
});
