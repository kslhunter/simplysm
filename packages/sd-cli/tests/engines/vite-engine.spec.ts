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

afterEach(() => {
  vi.restoreAllMocks();
});

describe("ViteEngine", () => {
  describe("run()", () => {
    // Acceptance: Scenario "프로덕션 빌드 성공"
    it("creates worker, calls build, and returns EngineResult with js success and dts always-success", async () => {
      mockWorker.build.mockResolvedValue({
        success: true,
      });

      const engine = new ViteEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: false });

      const { Worker } = await import("@simplysm/core-node");
      expect(Worker.create).toHaveBeenCalledTimes(1);
      expect(mockWorker.build).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "my-client",
          pkgDir: "/packages/my-client",
        }),
      );
      expect(result.success).toBe(true);
      expect(result.build.success).toBe(true);
      expect(result.build.errors).toEqual([]);
      expect(result.build.diagnostics).toEqual([]);
      await engine.stop();
    });

    // Acceptance: Scenario "빌드 실패"
    it("returns failure EngineResult when build fails", async () => {
      mockWorker.build.mockResolvedValue({
        success: false,
        errors: ["TS2345: Argument of type..."],
      });

      const engine = new ViteEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: false });

      expect(result.success).toBe(false);
      expect(result.build.success).toBe(false);
      expect(result.build.errors).toContain("TS2345: Argument of type...");
      await engine.stop();
    });

    // Unit: warnings are mapped through
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

    // Acceptance: Scenario "env 전달"
    it("passes env from config to worker build call", async () => {
      mockWorker.build.mockResolvedValue({ success: true });

      const engine = new ViteEngine({
        cwd: "/root",
        pkg: createMockPkg({
          config: {
            target: "client",
            server: "my-server",
            env: { VER: "1.0.0", DEV: "false", API_HOST: "https://api.com" },
          } as any,
        }),
      });
      await engine.run({ js: true, dts: false });

      expect(mockWorker.build).toHaveBeenCalledWith(
        expect.objectContaining({
          env: { VER: "1.0.0", DEV: "false", API_HOST: "https://api.com" },
        }),
      );
      await engine.stop();
    });

    // Acceptance: Scenario "configs 전달"
    it("passes configs from config to worker build call", async () => {
      mockWorker.build.mockResolvedValue({ success: true });

      const engine = new ViteEngine({
        cwd: "/root",
        pkg: createMockPkg({
          config: {
            target: "client",
            server: "my-server",
            configs: { dbHost: "db.prod.com" },
          } as any,
        }),
      });
      await engine.run({ js: true, dts: false });

      expect(mockWorker.build).toHaveBeenCalledWith(
        expect.objectContaining({
          configs: { dbHost: "db.prod.com" },
        }),
      );
      await engine.stop();
    });

    // Acceptance: Scenario "browserSupport 전달" (Feature 5.1)
    it("passes browserSupport from config to worker build call", async () => {
      mockWorker.build.mockResolvedValue({ success: true });

      const engine = new ViteEngine({
        cwd: "/root",
        pkg: createMockPkg({
          config: {
            target: "client",
            server: "my-server",
            browserSupport: {
              browserslist: "last 2 Chrome versions",
              postCss: { plugins: ["autoprefixer"] },
              legacyModule: true,
            },
          } as any,
        }),
      });
      await engine.run({ js: true, dts: false });

      expect(mockWorker.build).toHaveBeenCalledWith(
        expect.objectContaining({
          browserSupport: {
            browserslist: "last 2 Chrome versions",
            postCss: { plugins: ["autoprefixer"] },
            legacyModule: true,
          },
        }),
      );
      await engine.stop();
    });

    // Unit: build failure reflects in result
    it("reflects build failure in result", async () => {
      mockWorker.build.mockResolvedValue({
        success: false,
        errors: ["error"],
      });

      const engine = new ViteEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: false });

      expect(result.build.success).toBe(false);
      await engine.stop();
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
    // Acceptance: Scenario "개발 서버 시작 및 initial build 완료"
    it("resolves when startWatch returns success", async () => {
      mockWorker.startWatch.mockResolvedValue({ success: true });

      const { Worker } = await import("@simplysm/core-node");
      const engine = new ViteEngine({ cwd: "/root", pkg: createMockPkg() });

      await engine.startWatch({ js: true, dts: false });

      expect(Worker.create).toHaveBeenCalledTimes(1);
      expect(mockWorker.on).toHaveBeenCalledWith("serverReady", expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith("error", expect.any(Function));

      await engine.stop();
    });

    // Acceptance: Scenario "ResultCollector에 결과 보고"
    it("reports build result to ResultCollector", async () => {
      const mockResultCollector = { add: vi.fn() };

      mockWorker.startWatch.mockResolvedValue({ success: true });

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

    // Acceptance: Scenario "dev server 포트가 ViteEngine에 보고된다"
    it("stores port from serverReady event", async () => {
      mockWorker.startWatch.mockImplementation(() => {
        // Emit serverReady before resolving
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

    // Acceptance: Scenario "env와 configs 전달"
    it("passes env and configs from config to worker startWatch call", async () => {
      mockWorker.startWatch.mockResolvedValue({ success: true });

      const engine = new ViteEngine({
        cwd: "/root",
        pkg: createMockPkg({
          config: {
            target: "client",
            server: "my-server",
            env: { VER: "1.0.0", DEV: "true" },
            configs: { debug: true },
          } as any,
        }),
      });

      await engine.startWatch({ js: true, dts: false });

      expect(mockWorker.startWatch).toHaveBeenCalledWith(
        expect.objectContaining({
          env: { VER: "1.0.0", DEV: "true" },
          configs: { debug: true },
        }),
      );

      await engine.stop();
    });

    // Acceptance: Scenario "browserSupport 전달 (watch)" (Feature 5.1)
    it("passes browserSupport from config to worker startWatch call", async () => {
      mockWorker.startWatch.mockResolvedValue({ success: true });

      const engine = new ViteEngine({
        cwd: "/root",
        pkg: createMockPkg({
          config: {
            target: "client",
            server: "my-server",
            browserSupport: {
              browserslist: ["ie 11", "last 2 versions"],
              legacyModule: true,
            },
          } as any,
        }),
      });

      await engine.startWatch({ js: true, dts: false });

      expect(mockWorker.startWatch).toHaveBeenCalledWith(
        expect.objectContaining({
          browserSupport: {
            browserslist: ["ie 11", "last 2 versions"],
            legacyModule: true,
          },
        }),
      );

      await engine.stop();
    });

    // Acceptance: Scenario "독립 클라이언트의 Vite dev server 시작 (지정 포트)"
    it("passes port to worker startWatch when config.server is a number", async () => {
      mockWorker.startWatch.mockResolvedValue({ success: true });

      const engine = new ViteEngine({
        cwd: "/root",
        pkg: createMockPkg({
          config: { target: "client", server: 3000 } as any,
        }),
      });

      await engine.startWatch({ js: true, dts: false });

      expect(mockWorker.startWatch).toHaveBeenCalledWith(
        expect.objectContaining({ port: 3000 }),
      );

      await engine.stop();
    });

    // Unit: server: string does not pass port
    it("does not pass port when config.server is a string", async () => {
      mockWorker.startWatch.mockResolvedValue({ success: true });

      const engine = new ViteEngine({
        cwd: "/root",
        pkg: createMockPkg({
          config: { target: "client", server: "my-server" } as any,
        }),
      });

      await engine.startWatch({ js: true, dts: false });

      const callArgs = mockWorker.startWatch.mock.calls[0][0];
      expect(callArgs.port).toBeUndefined();

      await engine.stop();
    });

    // Acceptance: Scenario "buildStart/build 이벤트를 RebuildManager에 연동" (Feature 3.3)
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

      // Simulate buildStart event from worker
      const buildStartHandler = mockWorker.on.mock.calls.find(
        (call: any[]) => call[0] === "buildStart",
      )?.[1];
      expect(buildStartHandler).toBeDefined();

      // First call is initial build, subsequent calls register with RebuildManager
      buildStartHandler?.({});

      expect(mockRebuildManager.registerBuild).toHaveBeenCalled();

      await engine.stop();
    });

    // Acceptance: Scenario "build 이벤트로 ResultCollector 갱신 + resolver 호출" (Feature 3.3)
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

      // Get handlers
      const buildStartHandler = mockWorker.on.mock.calls.find(
        (call: any[]) => call[0] === "buildStart",
      )?.[1];
      const buildHandler = mockWorker.on.mock.calls.find(
        (call: any[]) => call[0] === "build",
      )?.[1];

      // Trigger rebuild cycle
      buildStartHandler?.({});
      buildHandler?.({ success: true });

      // resolver should be called
      expect(mockResolver).toHaveBeenCalled();

      // ResultCollector should be updated
      const buildResult = mockResultCollector.add.mock.calls.find(
        (c: any[]) => c[0].type === "build" && c[0].status === "success",
      );
      expect(buildResult).toBeDefined();

      await engine.stop();
    });

    // Unit: error event reports to ResultCollector
    it("reports error from error event to ResultCollector", async () => {
      const mockResultCollector = { add: vi.fn() };

      mockWorker.startWatch.mockImplementation(() => {
        // Emit error event
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
});
