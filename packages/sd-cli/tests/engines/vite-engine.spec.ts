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

const { ViteEngine } = await import("../../src/engines/ViteEngine");

import type { ClientPackageInfo } from "../../src/engines/types";

// --- Helpers ---

function createMockPkg(overrides: Partial<ClientPackageInfo> = {}): ClientPackageInfo {
  return {
    name: "my-client",
    dir: "/packages/my-client",
    config: { target: "client", server: "my-server" } as any,
    ...overrides,
  };
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  mockWorker.terminate.mockResolvedValue(undefined);
  mockWorker.stopWatch.mockResolvedValue(undefined);
});

describe("ViteEngine", () => {
  describe("run()", () => {
    describe("빌드 실행 및 결과 매핑", () => {
      it("returns EngineResult with build success", async () => {
        mockWorker.build.mockResolvedValue({
          success: true,
        });

        const engine = new ViteEngine({ cwd: "/root", pkg: createMockPkg() });
        const result = await engine.run({ js: true, dts: false });

        expect(result.build.success).toBe(true);
        expect(result.build.errors).toEqual([]);
        expect(result.build.diagnostics).toEqual([]);
        await engine.stop();
      });

      it("returns failure EngineResult when build fails", async () => {
        mockWorker.build.mockResolvedValue({
          success: false,
          errors: ["TS2345: Argument of type..."],
        });

        const engine = new ViteEngine({ cwd: "/root", pkg: createMockPkg() });
        const result = await engine.run({ js: true, dts: false });

        expect(result.build.success).toBe(false);
        expect(result.build.errors).toContain("TS2345: Argument of type...");
        await engine.stop();
      });

      it("maps worker warnings to EngineResult", async () => {
        mockWorker.build.mockResolvedValue({
          success: true,
          warnings: ["deprecation warning"],
        });

        const engine = new ViteEngine({ cwd: "/root", pkg: createMockPkg() });
        const result = await engine.run({ js: true, dts: false });

        expect(result.build.warnings).toEqual(["deprecation warning"]);
        await engine.stop();
      });

      it("does not include lint in EngineResult", async () => {
        mockWorker.build.mockResolvedValue({
          success: true,
          lint: {
            success: false,
            errorCount: 2,
            warningCount: 1,
            formattedOutput: "lint output",
          },
        });

        const engine = new ViteEngine({ cwd: "/root", pkg: createMockPkg() });
        const result = await engine.run({ js: true, dts: false });

        expect(result.lint).toBeUndefined();
        await engine.stop();
      });
    });
  });

  describe("stop()", () => {
    // Acceptance: Scenario "stop()으로 엔진 정리"
    it("terminates worker on stop", async () => {
      mockWorker.build.mockResolvedValue({ success: true });

      const engine = new ViteEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.run({ js: true, dts: false });
      await engine.stop();

      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it("handles stop without prior run", async () => {
      const engine = new ViteEngine({ cwd: "/root", pkg: createMockPkg() });
      await expect(engine.stop()).resolves.toBeUndefined();
    });

    // Unit: run mode doesn't call stopWatch
    it("skips stopWatch in run mode", async () => {
      mockWorker.build.mockResolvedValue({ success: true });

      const engine = new ViteEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.run({ js: true, dts: false });
      await engine.stop();

      expect(mockWorker.stopWatch).not.toHaveBeenCalled();
      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    // Unit: watch mode calls stopWatch
    it("calls stopWatch in watch mode before terminate", async () => {
      mockWorker.startWatch.mockResolvedValue({ success: true });

      const engine = new ViteEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.startWatch({ js: true, dts: false });
      await engine.stop();

      expect(mockWorker.stopWatch).toHaveBeenCalled();
      expect(mockWorker.terminate).toHaveBeenCalled();
    });
  });

  describe("startWatch()", () => {
    describe("초기화 및 이벤트 구독", () => {
      it("resolves when startWatch returns success", async () => {
        mockWorker.startWatch.mockResolvedValue({ success: true });

        const engine = new ViteEngine({ cwd: "/root", pkg: createMockPkg() });

        await expect(engine.startWatch({ js: true, dts: false })).resolves.toBeUndefined();

        await engine.stop();
      });

      it("stores port from serverReady event", async () => {
        mockWorker.startWatch.mockImplementation(() => {
          const serverReadyHandler = mockWorker.on.mock.calls.find(
            (call: any[]) => call[0] === "serverReady",
          )?.[1];
          serverReadyHandler?.({ port: 4200 });
          return Promise.resolve({ success: true });
        });

        const engine = new ViteEngine({ cwd: "/root", pkg: createMockPkg() });

        await engine.startWatch({ js: true, dts: false });

        expect(engine.port).toBe(4200);

        await engine.stop();
      });

      it("leaves port undefined when worker mock does not emit serverReady", async () => {
        mockWorker.startWatch.mockResolvedValue({ success: true });

        const engine = new ViteEngine({
          cwd: "/root",
          pkg: createMockPkg(),
        });

        await engine.startWatch({ js: true, dts: false });

        expect(engine.port).toBeUndefined();

        await engine.stop();
      });
    });

    describe("ResultCollector 보고", () => {
      it("reports build result to ResultCollector via build event only", async () => {
        const mockResultCollector = { add: vi.fn() };

        mockWorker.startWatch.mockImplementation(() => {
          const buildHandler = mockWorker.on.mock.calls.find(
            (call: any[]) => call[0] === "build",
          )?.[1];
          buildHandler?.({ success: true });
          return Promise.resolve({ success: true });
        });

        const engine = new ViteEngine({
          cwd: "/root",
          pkg: createMockPkg(),
          resultCollector: mockResultCollector as any,
        });

        await engine.startWatch({ js: true, dts: false });

        const addCalls = mockResultCollector.add.mock.calls;
        const buildResult = addCalls.find((c: any[]) => c[0].type === "build");

        expect(buildResult).toBeDefined();
        expect(buildResult![0].status).toBe("success");

        await engine.stop();
      });

      it("does not add lint BuildResult to ResultCollector even when build event has lint", async () => {
        const mockResultCollector = { add: vi.fn() };

        mockWorker.startWatch.mockImplementation(() => {
          const buildHandler = mockWorker.on.mock.calls.find(
            (call: any[]) => call[0] === "build",
          )?.[1];
          buildHandler?.({
            success: true,
            lint: {
              success: false,
              errorCount: 1,
              warningCount: 0,
              formattedOutput: "error",
            },
          });
          return Promise.resolve({ success: true });
        });

        const engine = new ViteEngine({
          cwd: "/root",
          pkg: createMockPkg(),
          resultCollector: mockResultCollector as any,
        });

        await engine.startWatch({ js: true, dts: false });

        const lintResult = mockResultCollector.add.mock.calls.find(
          (c: any[]) => c[0].type === "lint",
        );
        expect(lintResult).toBeUndefined();

        await engine.stop();
      });

      it("reports initial build result exactly once to ResultCollector", async () => {
        const mockResultCollector = { add: vi.fn() };

        mockWorker.startWatch.mockImplementation(() => {
          const buildHandler = mockWorker.on.mock.calls.find(
            (call: any[]) => call[0] === "build",
          )?.[1];
          buildHandler?.({ success: true });
          return Promise.resolve({ success: true });
        });

        const engine = new ViteEngine({
          cwd: "/root",
          pkg: createMockPkg(),
          resultCollector: mockResultCollector as any,
        });

        await engine.startWatch({ js: true, dts: false });

        const buildAddCalls = mockResultCollector.add.mock.calls.filter(
          (c: any[]) => c[0].type === "build",
        );
        expect(buildAddCalls).toHaveLength(1);

        await engine.stop();
      });

      it("reports error from error event to ResultCollector", async () => {
        const mockResultCollector = { add: vi.fn() };

        mockWorker.startWatch.mockImplementation(() => {
          const errorHandler = mockWorker.on.mock.calls.find(
            (call: any[]) => call[0] === "error",
          )?.[1];
          errorHandler?.({ message: "Build failed" });
          return Promise.resolve({ success: false, errors: ["Build failed"] });
        });

        const engine = new ViteEngine({
          cwd: "/root",
          pkg: createMockPkg(),
          resultCollector: mockResultCollector as any,
        });

        await engine.startWatch({ js: true, dts: false });

        const addCalls = mockResultCollector.add.mock.calls;
        const errorResult = addCalls.find((c: any[]) => c[0].status === "error");
        expect(errorResult).toBeDefined();

        await engine.stop();
      });
    });

    describe("RebuildManager 연동", () => {
      it("forwards buildStart event to RebuildManager.registerBuild", async () => {
        const mockRebuildManager = { registerBuild: vi.fn(() => vi.fn()) };

        mockWorker.startWatch.mockImplementation(() => {
          return Promise.resolve({ success: true });
        });

        const engine = new ViteEngine({
          cwd: "/root",
          pkg: createMockPkg(),
          rebuildManager: mockRebuildManager as any,
        });

        await engine.startWatch({ js: true, dts: false });

        const buildStartHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "buildStart",
        )?.[1];
        expect(buildStartHandler).toBeDefined();

        buildStartHandler?.({});

        expect(mockRebuildManager.registerBuild).toHaveBeenCalled();

        await engine.stop();
      });

      it("registers with RebuildManager using '{name}:build' key pattern", async () => {
        const mockRebuildManager = { registerBuild: vi.fn(() => vi.fn()) };

        mockWorker.startWatch.mockImplementation(() => {
          return Promise.resolve({ success: true });
        });

        const engine = new ViteEngine({
          cwd: "/root",
          pkg: createMockPkg({ name: "my-client" }),
          rebuildManager: mockRebuildManager as any,
        });

        await engine.startWatch({ js: true, dts: false });

        const buildStartHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "buildStart",
        )?.[1];
        buildStartHandler?.({});

        expect(mockRebuildManager.registerBuild).toHaveBeenCalledWith(
          "my-client:build",
          expect.any(String),
        );

        await engine.stop();
      });

      it("resolves rebuild when build event arrives after buildStart", async () => {
        const mockResolver = vi.fn();
        const mockRebuildManager = { registerBuild: vi.fn(() => mockResolver) };
        const mockResultCollector = { add: vi.fn() };

        mockWorker.startWatch.mockImplementation(() => {
          return Promise.resolve({ success: true });
        });

        const engine = new ViteEngine({
          cwd: "/root",
          pkg: createMockPkg(),
          rebuildManager: mockRebuildManager as any,
          resultCollector: mockResultCollector as any,
        });

        await engine.startWatch({ js: true, dts: false });

        const buildStartHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "buildStart",
        )?.[1];
        const buildHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "build",
        )?.[1];

        buildStartHandler?.({});
        buildHandler?.({ success: true });

        expect(mockResolver).toHaveBeenCalled();

        const buildResult = mockResultCollector.add.mock.calls.find(
          (c: any[]) => c[0].type === "build" && c[0].status === "success",
        );
        expect(buildResult).toBeDefined();

        await engine.stop();
      });
    });
  });
});
