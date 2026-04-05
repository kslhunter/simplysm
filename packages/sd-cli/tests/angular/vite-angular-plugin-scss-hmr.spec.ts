import { describe, it, expect, beforeAll, afterAll } from "vitest";
import path from "path";
import { sdAngularPlugin } from "../../src/angular/vite-angular-plugin.js";

const FIXTURE_DIR = path.resolve(import.meta.dirname, "fixtures/basic-app");
const TSCONFIG_PATH = path.join(FIXTURE_DIR, "tsconfig.json");

function mockEnvironmentContext() {
  return {
    environment: {
      moduleGraph: {
        getModulesByFile: (file: string) => {
          return new Set([{ file, id: file }]);
        },
      },
    },
  };
}

describe("sdAngularPlugin SCSS @use HMR", () => {
  let plugin: ReturnType<typeof sdAngularPlugin>;

  beforeAll(async () => {
    plugin = sdAngularPlugin({ tsconfig: TSCONFIG_PATH, dev: true });
    await (plugin as any).buildStart?.call({});
  });

  afterAll(async () => {
    await (plugin as any).buildEnd?.call({});
  });

  // Acceptance: inline styles의 직접 @use 의존성 변경 시 재컴파일
  it("recompiles when inline SCSS @use dependency changes", async () => {
    const variablesPath = path
      .join(FIXTURE_DIR, "scss/_variables.scss")
      .replace(/\\/g, "/");

    const ctx = mockEnvironmentContext();
    const result = await (plugin as any).hotUpdate?.call(ctx, {
      file: variablesPath,
      modules: [],
      server: {},
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    expect(result).toBeDefined();
    expect(result!.length).toBeGreaterThan(0);
  });

  // Acceptance: inline styles의 간접 @use 의존성 변경 시 재컴파일 (체이닝)
  it("recompiles when chained @use dependency changes", async () => {
    const colorsPath = path
      .join(FIXTURE_DIR, "scss/_colors.scss")
      .replace(/\\/g, "/");

    const ctx = mockEnvironmentContext();
    const result = await (plugin as any).hotUpdate?.call(ctx, {
      file: colorsPath,
      modules: [],
      server: {},
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    expect(result).toBeDefined();
    expect(result!.length).toBeGreaterThan(0);
  });

  // Acceptance: 무관한 SCSS 변경 시 재빌드하지 않음
  it("does not recompile when unrelated SCSS changes", async () => {
    const unrelatedPath = path
      .join(FIXTURE_DIR, "scss/_unrelated.scss")
      .replace(/\\/g, "/");

    const ctx = mockEnvironmentContext();
    const result = await (plugin as any).hotUpdate?.call(ctx, {
      file: unrelatedPath,
      modules: [],
      server: {},
      timestamp: Date.now(),
      read: () => Promise.resolve(""),
    });

    expect(result).toBeUndefined();
  });
});
