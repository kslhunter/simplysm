import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- Mock factories (vi.mock is hoisted) ---

vi.mock("consola", () => ({
  consola: {
    withTag: vi.fn(() => ({
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    })),
  },
}));

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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("NgtscEngine", () => {
  describe("run()", () => {
    // Acceptance: Scenario "@Injectable 데코레이터가 런타임 코드로 변환된다"
    // Acceptance: Scenario "@Directive 데코레이터가 런타임 코드로 변환된다"
    // Acceptance: Scenario ".d.ts 파일이 Angular 메타데이터를 포함하여 출력된다"
    // Acceptance: Scenario "run()으로 one-time 빌드를 수행한다"
    it("creates worker, calls build, and returns EngineResult with js/dts", async () => {
      mockWorker.build.mockResolvedValue({
        js: { success: true, errors: undefined, warnings: undefined },
        dts: { success: true, errors: undefined, diagnostics: [] },
      });

      const engine = new NgtscEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: true });

      const { Worker } = await import("@simplysm/core-node");
      expect(Worker.create).toHaveBeenCalledTimes(1);
      expect(mockWorker.build).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "angular",
          pkgDir: "/packages/angular",
          output: { js: true, dts: true },
        }),
      );
      expect(result.success).toBe(true);
      expect(result.js.success).toBe(true);
      expect(result.dts.success).toBe(true);
      expect(result.dts.diagnostics).toEqual([]);
      await engine.stop();
    });

    // Acceptance: Scenario "run()에서 dts: false면 .d.ts를 생략한다"
    it("passes dts:false output flag to worker", async () => {
      mockWorker.build.mockResolvedValue({
        js: { success: true, errors: undefined, warnings: undefined },
        dts: { success: true, errors: undefined, diagnostics: [] },
      });

      const engine = new NgtscEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.run({ js: true, dts: false });

      expect(mockWorker.build).toHaveBeenCalledWith(
        expect.objectContaining({ output: { js: true, dts: false } }),
      );
      await engine.stop();
    });

    // Acceptance: Scenario "TypeScript + Angular diagnostics를 통합 수집한다"
    it("includes diagnostics in result from worker", async () => {
      mockWorker.build.mockResolvedValue({
        js: { success: true, errors: undefined, warnings: undefined },
        dts: {
          success: false,
          errors: ["type error"],
          diagnostics: [{ code: 2322, category: 1, messageText: "Type error" }],
        },
      });

      const engine = new NgtscEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: true });

      expect(result.dts.success).toBe(false);
      expect(result.dts.diagnostics).toHaveLength(1);
      expect(result.dts.diagnostics[0].code).toBe(2322);
      await engine.stop();
    });

    // Acceptance: Scenario "타입 에러가 있어도 빌드 결과를 반환한다"
    it("returns result even when dts has errors", async () => {
      mockWorker.build.mockResolvedValue({
        js: { success: true, errors: undefined, warnings: undefined },
        dts: {
          success: false,
          errors: ["TS2322: Type error"],
          diagnostics: [{ code: 2322, category: 1, messageText: "Type error" }],
        },
      });

      const engine = new NgtscEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: true });

      expect(result.success).toBe(false);
      expect(result.js.success).toBe(true);
      expect(result.dts.success).toBe(false);
      expect(result.dts.errors).toContain("TS2322: Type error");
      await engine.stop();
    });

    // Unit: JS-only failure reflects in overall success
    it("reflects JS build failure in result", async () => {
      mockWorker.build.mockResolvedValue({
        js: { success: false, errors: ["ngtsc compilation error"], warnings: undefined },
        dts: { success: true, errors: undefined, diagnostics: [] },
      });

      const engine = new NgtscEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: true });

      expect(result.success).toBe(false);
      expect(result.js.success).toBe(false);
      expect(result.js.errors).toEqual(["ngtsc compilation error"]);
      expect(result.dts.success).toBe(true);
      await engine.stop();
    });

    // Unit: warnings are mapped through
    it("maps worker warnings to EngineResult", async () => {
      mockWorker.build.mockResolvedValue({
        js: { success: true, errors: undefined, warnings: ["deprecation warning"] },
        dts: { success: true, errors: undefined, diagnostics: [] },
      });

      const engine = new NgtscEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: true });

      expect(result.js.warnings).toEqual(["deprecation warning"]);
      await engine.stop();
    });
  });

  describe("stop()", () => {
    // Acceptance: Scenario "stop()으로 리소스를 정리한다"
    it("terminates worker on stop", async () => {
      mockWorker.build.mockResolvedValue({
        js: { success: true, errors: undefined, warnings: undefined },
        dts: { success: true, errors: undefined, diagnostics: [] },
      });

      const engine = new NgtscEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.run({ js: true, dts: true });
      await engine.stop();

      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it("handles stop without prior run", async () => {
      const engine = new NgtscEngine({ cwd: "/root", pkg: createMockPkg() });
      await expect(engine.stop()).resolves.toBeUndefined();
    });

    // Unit: run mode doesn't call stopWatch
    it("skips stopWatch in run mode", async () => {
      mockWorker.build.mockResolvedValue({
        js: { success: true, errors: undefined, warnings: undefined },
        dts: { success: true, errors: undefined, diagnostics: [] },
      });

      const engine = new NgtscEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.run({ js: true, dts: true });
      await engine.stop();

      expect(mockWorker.stopWatch).not.toHaveBeenCalled();
      expect(mockWorker.terminate).toHaveBeenCalled();
    });
  });

  describe("startWatch()", () => {
    // Unit: resolves when initial build event arrives
    it("resolves when initial build event arrives", async () => {
      mockWorker.startWatch.mockImplementation(() => {
        const buildHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "build",
        )?.[1];
        buildHandler?.({
          js: { success: true },
          dts: { success: true },
        });
      });

      const { Worker } = await import("@simplysm/core-node");
      const engine = new NgtscEngine({ cwd: "/root", pkg: createMockPkg() });

      await engine.startWatch({ js: true, dts: true });

      expect(Worker.create).toHaveBeenCalledTimes(1);
      expect(mockWorker.on).toHaveBeenCalledWith("build", expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith("buildStart", expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith("error", expect.any(Function));

      await engine.stop();
    });

    // Unit: watch mode results reported to ResultCollector
    it("reports build and dts results separately to ResultCollector", async () => {
      const mockResultCollector = { add: vi.fn() };

      mockWorker.startWatch.mockImplementation(() => {
        const buildHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "build",
        )?.[1];
        buildHandler?.({
          js: { success: true, errors: undefined },
          dts: { success: false, errors: ["type error"] },
        });
      });

      const engine = new NgtscEngine({
        cwd: "/root",
        pkg: createMockPkg(),
        resultCollector: mockResultCollector as any,
      });

      await engine.startWatch({ js: true, dts: true });

      const addCalls = mockResultCollector.add.mock.calls;
      const buildResult = addCalls.find((c: any[]) => c[0].type === "build");
      const dtsResult = addCalls.find((c: any[]) => c[0].type === "dts");

      expect(buildResult).toBeDefined();
      expect(buildResult![0].status).toBe("success");
      expect(dtsResult).toBeDefined();
      expect(dtsResult![0].status).toBe("error");

      await engine.stop();
    });
  });
});
