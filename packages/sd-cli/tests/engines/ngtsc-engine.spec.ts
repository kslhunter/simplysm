import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock factories (vi.mock is hoisted) ---

const mockWorker = {
  build: vi.fn(),
  startWatch: vi.fn(),
  stopWatch: vi.fn(),
  terminate: vi.fn(),
  on: vi.fn(),
};

vi.mock("@simplysm/core-node", () => ({
  Worker: {
    create: vi.fn(() => mockWorker),
  },
}));

// --- Dynamic imports after mocking ---

const { NgtscEngine } = await import("../../src/engines/NgtscEngine");

import type { BuildPackageInfo } from "../../src/engines/types";

// --- Helpers ---

function createMockPkg(overrides: Partial<BuildPackageInfo> = {}): BuildPackageInfo {
  return {
    name: "angular",
    dir: "/packages/angular",
    config: { target: "browser" } as any,
    ...overrides,
  };
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  mockWorker.terminate.mockResolvedValue(undefined);
  mockWorker.stopWatch.mockResolvedValue(undefined);
});

describe("NgtscEngine", () => {
  describe("run()", () => {
    // Acceptance: Scenario "@Injectable 데코레이터가 런타임 코드로 변환된다"
    // Acceptance: Scenario "@Directive 데코레이터가 런타임 코드로 변환된다"
    // Acceptance: Scenario ".d.ts 파일이 Angular 메타데이터를 포함하여 출력된다"
    // Acceptance: Scenario "run()으로 one-time 빌드를 수행한다"
    it("returns EngineResult with build success and empty diagnostics", async () => {
      mockWorker.build.mockResolvedValue({
        build: { success: true, errors: undefined, warnings: undefined, diagnostics: [] },
      });

      const engine = new NgtscEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: true });

      expect(result.build.success).toBe(true);
      expect(result.build.diagnostics).toEqual([]);
      await engine.stop();
    });

    // Acceptance: Scenario "TypeScript + Angular diagnostics를 통합 수집한다"
    it("includes diagnostics in result from worker", async () => {
      mockWorker.build.mockResolvedValue({
        build: {
          success: false,
          errors: ["type error"],
          warnings: undefined,
          diagnostics: [{ code: 2322, category: 1, messageText: "Type error" }],
        },
      });

      const engine = new NgtscEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: true });

      expect(result.build.success).toBe(false);
      expect(result.build.diagnostics).toHaveLength(1);
      expect(result.build.diagnostics[0].code).toBe(2322);
      await engine.stop();
    });

    // Acceptance: Scenario "타입 에러가 있어도 빌드 결과를 반환한다"
    it("returns result even when build has errors", async () => {
      mockWorker.build.mockResolvedValue({
        build: {
          success: false,
          errors: ["TS2322: Type error"],
          warnings: undefined,
          diagnostics: [{ code: 2322, category: 1, messageText: "Type error" }],
        },
      });

      const engine = new NgtscEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: true });

      expect(result.build.success).toBe(false);
      expect(result.build.errors).toContain("TS2322: Type error");
      await engine.stop();
    });

    // Unit: warnings are mapped through
    it("maps worker warnings to EngineResult", async () => {
      mockWorker.build.mockResolvedValue({
        build: { success: true, errors: undefined, warnings: ["deprecation warning"], diagnostics: [] },
      });

      const engine = new NgtscEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: true });

      expect(result.build.warnings).toEqual(["deprecation warning"]);
      await engine.stop();
    });
  });

  describe("stop()", () => {
    // Acceptance: Scenario "stop()으로 리소스를 정리한다"
    it("terminates worker on stop", async () => {
      mockWorker.build.mockResolvedValue({
        build: { success: true, errors: undefined, warnings: undefined, diagnostics: [] },
      });

      const engine = new NgtscEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.run({ js: true, dts: true });
      await engine.stop();

      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    // shared stop() behavior (미실행 시) is tested in base-engine.spec.ts

    // Unit: run mode doesn't call stopWatch
    it("skips stopWatch in run mode", async () => {
      mockWorker.build.mockResolvedValue({
        build: { success: true, errors: undefined, warnings: undefined, diagnostics: [] },
      });

      const engine = new NgtscEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.run({ js: true, dts: true });
      await engine.stop();

      expect(mockWorker.stopWatch).not.toHaveBeenCalled();
      expect(mockWorker.terminate).toHaveBeenCalled();
    });
  });

  // shared startWatch() behavior (resolve, ResultCollector) is tested in base-engine.spec.ts
});
