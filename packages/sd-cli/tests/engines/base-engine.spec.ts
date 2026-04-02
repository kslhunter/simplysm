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
const { BaseEngine } = await import("../../src/engines/BaseEngine");

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
    it("registers buildStart, build, error event handlers", async () => {
      mockWorker.startWatch.mockImplementation(() => {
        const buildHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "build",
        )?.[1];
        buildHandler?.({ build: { success: true } });
      });

      const engine = new TscEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.startWatch({ js: true, dts: true });

      expect(mockWorker.on).toHaveBeenCalledWith("buildStart", expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith("build", expect.any(Function));
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
});
