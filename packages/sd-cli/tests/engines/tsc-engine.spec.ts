import { describe, it, expect, vi, beforeEach } from "vitest";

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

const { TscEngine } = await import("../../src/engines/TscEngine");

import type { BuildPackageInfo } from "../../src/engines/types";

// --- Helpers ---

function createMockPkg(overrides: Partial<BuildPackageInfo> = {}): BuildPackageInfo {
  return {
    name: "test-pkg",
    dir: "/packages/test-pkg",
    config: { target: "node" } as any,
    ...overrides,
  };
}

function setupDefaultBuildResult(): void {
  mockWorker.build.mockResolvedValue({
    build: { success: true, errors: undefined, warnings: undefined, diagnostics: [] },
  });
  mockWorker.terminate.mockResolvedValue(undefined);
  mockWorker.stopWatch.mockResolvedValue(undefined);
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaultBuildResult();
});

describe("TscEngine", () => {
  // Acceptance: Scenario "run()으로 프로덕션 빌드 실행"
  describe("run()", () => {
    it("creates worker, calls build, and returns EngineResult", async () => {
      const { Worker } = await import("@simplysm/core-node");
      const engine = new TscEngine({ cwd: "/root", pkg: createMockPkg() });

      const result = await engine.run({ js: true, dts: true });

      expect(Worker.create).toHaveBeenCalledTimes(1);
      expect(mockWorker.build).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "test-pkg",
          pkgDir: "/packages/test-pkg",
          output: { js: true, dts: true },
        }),
      );
      expect(result.success).toBe(true);
      expect(result.build.success).toBe(true);
      await engine.stop();
    });

    it("maps worker result to EngineResult with build field", async () => {
      mockWorker.build.mockResolvedValue({
        build: { success: true, errors: undefined, warnings: ["warn1"], diagnostics: [{ code: 1, category: 0 }] },
      });

      const engine = new TscEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: true });

      expect(result.build.warnings).toEqual(["warn1"]);
      expect(result.build.diagnostics).toEqual([{ code: 1, category: 0 }]);
      await engine.stop();
    });

    it("reflects failure when tsc reports errors", async () => {
      mockWorker.build.mockResolvedValue({
        build: { success: false, errors: ["type error"], warnings: undefined, diagnostics: [{ code: 2322, category: 1 }] },
      });

      const engine = new TscEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: true });

      expect(result.success).toBe(false);
      expect(result.build.errors).toEqual(["type error"]);
      expect(result.build.diagnostics).toHaveLength(1);
      await engine.stop();
    });

    it("passes output flags to worker", async () => {
      const engine = new TscEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.run({ js: false, dts: true });
      expect(mockWorker.build).toHaveBeenCalledWith(
        expect.objectContaining({ output: { js: false, dts: true } }),
      );
      await engine.stop();
    });
  });

  // Acceptance: Scenario "startWatch()로 watch 모드 시작"
  describe("startWatch()", () => {
    it("resolves when initial build event arrives", async () => {
      mockWorker.startWatch.mockImplementation(() => {
        const buildHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "build",
        )?.[1];
        buildHandler?.({
          build: { success: true },
        });
      });

      const engine = new TscEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.startWatch({ js: true, dts: true });

      expect(mockWorker.on).toHaveBeenCalledWith("build", expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith("buildStart", expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith("error", expect.any(Function));

      await engine.stop();
    });

    it("reports build result to ResultCollector", async () => {
      const mockResultCollector = { add: vi.fn() };

      mockWorker.startWatch.mockImplementation(() => {
        const buildHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "build",
        )?.[1];
        buildHandler?.({
          build: { success: false, errors: ["type error"] },
        });
      });

      const engine = new TscEngine({
        cwd: "/root",
        pkg: createMockPkg(),
        resultCollector: mockResultCollector as any,
      });

      await engine.startWatch({ js: true, dts: true });

      const addCalls = mockResultCollector.add.mock.calls;
      const buildResult = addCalls.find((c: any[]) => c[0].type === "build");

      expect(buildResult).toBeDefined();
      expect(buildResult![0].status).toBe("error");

      await engine.stop();
    });
  });

  // Acceptance: Scenario "stop()으로 리소스 정리"
  describe("stop()", () => {
    it("calls stopWatch and terminate in watch mode", async () => {
      mockWorker.startWatch.mockImplementation(() => {
        const buildHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "build",
        )?.[1];
        buildHandler?.({ build: { success: true } });
      });

      const engine = new TscEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.startWatch({ js: true, dts: true });
      await engine.stop();

      expect(mockWorker.stopWatch).toHaveBeenCalled();
      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it("handles stop without prior run/startWatch", async () => {
      const engine = new TscEngine({ cwd: "/root", pkg: createMockPkg() });
      await expect(engine.stop()).resolves.toBeUndefined();
    });

    it("skips stopWatch in run mode", async () => {
      const engine = new TscEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.run({ js: true, dts: true });
      await engine.stop();

      expect(mockWorker.stopWatch).not.toHaveBeenCalled();
      expect(mockWorker.terminate).toHaveBeenCalled();
    });
  });
});
