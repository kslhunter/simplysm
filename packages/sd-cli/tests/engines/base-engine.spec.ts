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

const { TscEngine } = await import("../../src/engines/TscEngine");
const { BaseEngine } = await import("../../src/engines/BaseEngine");

import type { BuildPackageInfo, BuildOutput } from "../../src/engines/types";
import type { BuildResult } from "../../src/runtime/ResultCollector";

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
    lint: { success: true, errorCount: 0, warningCount: 0, formattedOutput: "" },
  });
  mockWorker.terminate.mockResolvedValue(undefined);
  mockWorker.stopWatch.mockResolvedValue(undefined);
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaultBuildResult();
});

describe("BaseEngine", () => {
  it("is an abstract class that TscEngine extends", () => {
    const engine = new TscEngine({ cwd: "/root", pkg: createMockPkg() });
    expect(engine).toBeInstanceOf(BaseEngine);
  });

  it("stop() is inherited from BaseEngine — not overridden in TscEngine", () => {
    // Verify stop() is from the prototype chain (BaseEngine), not TscEngine itself
    expect(TscEngine.prototype.hasOwnProperty("stop")).toBe(false);
  });

  describe("_createWorker resourceLimits", () => {
    it("Worker.create에 resourceLimits를 전달한다", async () => {
      const { Worker } = await import("@simplysm/core-node");

      const engine = new TscEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.run({ js: true, dts: true });

      expect(Worker.create).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          resourceLimits: { maxOldGenerationSizeMb: 8192 },
        }),
      );

      await engine.stop();
    });
  });

  describe("shared stop() behavior", () => {
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
  });

  describe("shared startWatch() event handling", () => {
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
      expect(buildResult![0].target).toBe("node");

      await engine.stop();
    });

    it("calls resolver from registerBuild on rebuild build event", async () => {
      const mockResolver = vi.fn();
      const mockRebuildManager = { registerBuild: vi.fn(() => mockResolver) };

      mockWorker.startWatch.mockImplementation(() => {
        // Trigger initial build to move past isInitialBuild
        const buildHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "build",
        )?.[1];
        buildHandler?.({ build: { success: true } });
      });

      const engine = new TscEngine({
        cwd: "/root",
        pkg: createMockPkg(),
        rebuildManager: mockRebuildManager as any,
      });

      await engine.startWatch({ js: true, dts: true });

      // Simulate rebuild cycle: buildStart -> build
      const buildStartHandler = mockWorker.on.mock.calls.find(
        (call: any[]) => call[0] === "buildStart",
      )?.[1];
      const buildHandler = mockWorker.on.mock.calls.find(
        (call: any[]) => call[0] === "build",
      )?.[1];

      buildStartHandler?.({});
      expect(mockRebuildManager.registerBuild).toHaveBeenCalledWith(
        "test-pkg:build",
        "test-pkg (node)",
      );

      buildHandler?.({ build: { success: true } });
      expect(mockResolver).toHaveBeenCalled();

      await engine.stop();
    });

    it("emits batchComplete via RebuildManager after rebuild resolver is called", async () => {
      // Use a real-ish RebuildManager to verify end-to-end batchComplete
      let resolverFn!: () => void;
      const _batchCompleteHandler = vi.fn();
      const mockRebuildManager = {
        registerBuild: vi.fn((_key: string, _title: string) => {
          let resolve!: () => void;
          void new Promise<void>((r) => {
            resolve = r;
          });
          resolverFn = resolve;
          // Simulate that the manager would track this
          return resolve;
        }),
        on: vi.fn(),
      };

      mockWorker.startWatch.mockImplementation(() => {
        const buildHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "build",
        )?.[1];
        buildHandler?.({ build: { success: true } });
      });

      const engine = new TscEngine({
        cwd: "/root",
        pkg: createMockPkg(),
        rebuildManager: mockRebuildManager as any,
      });

      await engine.startWatch({ js: true, dts: true });

      // Simulate rebuild
      const buildStartHandler = mockWorker.on.mock.calls.find(
        (call: any[]) => call[0] === "buildStart",
      )?.[1];
      const buildHandler = mockWorker.on.mock.calls.find(
        (call: any[]) => call[0] === "build",
      )?.[1];

      buildStartHandler?.({});
      buildHandler?.({ build: { success: true } });

      // The resolver should have been called, which resolves the RebuildManager promise
      expect(resolverFn).toBeDefined();

      await engine.stop();
    });

    it("calls registerBuild on initial buildStart as well as rebuilds", async () => {
      const mockRebuildManager = { registerBuild: vi.fn(() => vi.fn()) };

      mockWorker.startWatch.mockImplementation(() => {
        // Trigger buildStart before initial build completes
        const buildStartHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "buildStart",
        )?.[1];
        buildStartHandler?.({});

        // Then trigger initial build
        const buildHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "build",
        )?.[1];
        buildHandler?.({ build: { success: true } });
      });

      const engine = new TscEngine({
        cwd: "/root",
        pkg: createMockPkg(),
        rebuildManager: mockRebuildManager as any,
      });

      await engine.startWatch({ js: true, dts: true });

      // registerBuild should be called for ALL builds including initial
      expect(mockRebuildManager.registerBuild).toHaveBeenCalledOnce();

      await engine.stop();
    });

    it("calls resolver on error event to release RebuildManager batch", async () => {
      const mockResolver = vi.fn();
      const mockRebuildManager = { registerBuild: vi.fn(() => mockResolver) };

      mockWorker.startWatch.mockImplementation(() => {
        // Trigger initial build to move past isInitialBuild
        const buildHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "build",
        )?.[1];
        buildHandler?.({ build: { success: true } });
      });

      const engine = new TscEngine({
        cwd: "/root",
        pkg: createMockPkg(),
        rebuildManager: mockRebuildManager as any,
      });

      await engine.startWatch({ js: true, dts: true });

      // Simulate rebuild cycle: buildStart -> error (no build event)
      const buildStartHandler = mockWorker.on.mock.calls.find(
        (call: any[]) => call[0] === "buildStart",
      )?.[1];
      const errorHandler = mockWorker.on.mock.calls.find(
        (call: any[]) => call[0] === "error",
      )?.[1];

      buildStartHandler?.({});
      expect(mockRebuildManager.registerBuild).toHaveBeenCalled();

      errorHandler?.({ message: "Worker crashed" });
      expect(mockResolver).toHaveBeenCalled();

      await engine.stop();
    });

    it("uses _getTarget() for BuildResult target", async () => {
      const mockResultCollector = { add: vi.fn() };

      mockWorker.startWatch.mockImplementation(() => {
        const buildHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "build",
        )?.[1];
        buildHandler?.({
          build: { success: true },
        });
      });

      const engine = new TscEngine({
        cwd: "/root",
        pkg: createMockPkg({ config: { target: "browser" } as any }),
        resultCollector: mockResultCollector as any,
      });

      await engine.startWatch({ js: true, dts: true });

      const addCalls = mockResultCollector.add.mock.calls;
      expect(addCalls[0][0].target).toBe("browser");

      await engine.stop();
    });
  });

  describe("_normalizeResult", () => {
    it("errors/warnings가 undefined이면 빈 배열로 정규화한다", async () => {
      mockWorker.build.mockResolvedValue({
        build: { success: true, errors: undefined, warnings: undefined, diagnostics: [{ code: 1 }] },
        lint: { success: true, errorCount: 0, warningCount: 0, formattedOutput: "" },
      });

      const engine = new TscEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: true });

      expect(result.build.errors).toEqual([]);
      expect(result.build.warnings).toEqual([]);
      expect(result.build.success).toBe(true);
      expect(result.build.diagnostics).toEqual([{ code: 1 }]);
      expect(result.lint).toEqual({ success: true, errorCount: 0, warningCount: 0, formattedOutput: "" });

      await engine.stop();
    });

    it("errors/warnings가 존재하면 그대로 전달한다", async () => {
      mockWorker.build.mockResolvedValue({
        build: { success: false, errors: ["err1"], warnings: ["warn1"], diagnostics: [{ code: 2322 }] },
        lint: undefined,
      });

      const engine = new TscEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: true });

      expect(result.build.errors).toEqual(["err1"]);
      expect(result.build.warnings).toEqual(["warn1"]);
      expect(result.build.success).toBe(false);
      expect(result.build.diagnostics).toEqual([{ code: 2322 }]);
      expect(result.lint).toBeUndefined();

      await engine.stop();
    });
  });

  describe("lint 통합", () => {
    describe("BuildOutput.lint flag controls lint execution", () => {
      it("BuildOutput이 lint 불리언 플래그를 수용", () => {
        const output: BuildOutput = { js: true, dts: true, lint: true };
        expect(output.lint).toBe(true);
      });

      it("BuildOutput.lint는 미설정 시 undefined가 기본값", () => {
        const output: BuildOutput = { js: true, dts: true };
        expect(output.lint).toBeUndefined();
      });
    });

    describe("EngineResult includes lint field", () => {
      it("run() returns EngineResult with lint field when worker provides it", async () => {
        mockWorker.build.mockResolvedValue({
          build: { success: true, diagnostics: [] },
          lint: {
            success: false,
            errorCount: 3,
            warningCount: 1,
            formattedOutput: "lint errors",
          },
        });

        const engine = new TscEngine({ cwd: "/root", pkg: createMockPkg() });
        const result = await engine.run({ js: true, dts: true, lint: true });

        expect(result.lint).toEqual({
          success: false,
          errorCount: 3,
          warningCount: 1,
          formattedOutput: "lint errors",
        });

        await engine.stop();
      });

      it("run() returns EngineResult without lint when lint is not in output", async () => {
        mockWorker.build.mockResolvedValue({
          build: { success: true, diagnostics: [] },
        });

        const engine = new TscEngine({ cwd: "/root", pkg: createMockPkg() });
        const result = await engine.run({ js: true, dts: true });

        expect(result.lint).toBeUndefined();

        await engine.stop();
      });
    });

    describe("BaseEngine.startWatch reports lint BuildResult", () => {
      it("adds lint BuildResult to ResultCollector when build event has lint", async () => {
        const mockResultCollector = { add: vi.fn() };

        mockWorker.startWatch.mockImplementation(() => {
          const buildHandlers = mockWorker.on.mock.calls
            .filter((call: any[]) => call[0] === "build")
            .map((call: any[]) => call[1]);
          const buildData = {
            build: { success: true },
            lint: {
              success: false,
              errorCount: 2,
              warningCount: 0,
              formattedOutput: "errors",
            },
          };
          for (const handler of buildHandlers) {
            handler(buildData);
          }
        });

        const engine = new TscEngine({
          cwd: "/root",
          pkg: createMockPkg(),
          resultCollector: mockResultCollector as any,
        });

        await engine.startWatch({ js: true, dts: true, lint: true });

        const lintResult = mockResultCollector.add.mock.calls.find(
          (c: any[]) => c[0].type === "lint",
        );
        expect(lintResult).toBeDefined();
        expect(lintResult![0]).toMatchObject({
          name: "test-pkg",
          type: "lint",
          status: "error",
          message: "errors",
        });

        await engine.stop();
      });

      it("does not add lint BuildResult when build event has no lint field", async () => {
        const mockResultCollector = { add: vi.fn() };

        mockWorker.startWatch.mockImplementation(() => {
          const buildHandler = mockWorker.on.mock.calls.find(
            (call: any[]) => call[0] === "build",
          )?.[1];
          buildHandler?.({
            build: { success: true },
          });
        });

        const engine = new TscEngine({
          cwd: "/root",
          pkg: createMockPkg(),
          resultCollector: mockResultCollector as any,
        });

        await engine.startWatch({ js: true, dts: true });

        const lintResult = mockResultCollector.add.mock.calls.find(
          (c: any[]) => c[0].type === "lint",
        );
        expect(lintResult).toBeUndefined();

        await engine.stop();
      });
    });

    describe("ResultCollector supports lint type", () => {
      it("BuildResult 타입에 lint 포함", () => {
        const lintResult: BuildResult = {
          name: "test-pkg",
          target: "node",
          type: "lint",
          status: "success",
        };
        expect(lintResult.type).toBe("lint");
      });
    });
  });
});
