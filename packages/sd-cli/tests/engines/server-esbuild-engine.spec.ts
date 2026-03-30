import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock factories ---

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

// --- Dynamic imports ---

const { ServerEsbuildEngine } = await import("../../src/engines/ServerEsbuildEngine");

import type { ServerPackageInfo } from "../../src/engines/types";

// --- Helpers ---

function createMockPkg(overrides: Partial<ServerPackageInfo> = {}): ServerPackageInfo {
  return {
    name: "test-server",
    dir: "/packages/test-server",
    config: {
      target: "server",
      env: { DB_HOST: "localhost" },
      configs: { port: 3000 },
      externals: ["bcrypt"],
      pm2: { name: "test-app" },
      packageManager: "mise",
    } as any,
    ...overrides,
  };
}

function setupDefaultBuildResult(): void {
  mockWorker.build.mockResolvedValue({
    js: { success: true, errors: undefined, warnings: undefined },
    dts: { success: true, errors: undefined, diagnostics: [] },
    mainJsPath: "/packages/test-server/dist/main.js",
  });
  mockWorker.terminate.mockResolvedValue(undefined);
  mockWorker.stopWatch.mockResolvedValue(undefined);
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  setupDefaultBuildResult();
});

describe("ServerEsbuildEngine", () => {
  describe("run()", () => {
    // Acceptance: creates single worker and calls build with server config
    it("creates worker and passes server config to build", async () => {
      const { Worker } = await import("@simplysm/core-node");
      const pkg = createMockPkg();
      const engine = new ServerEsbuildEngine({ cwd: "/root", pkg });

      const result = await engine.run({ js: true, dts: false });

      expect(Worker.create).toHaveBeenCalledTimes(1);
      expect(mockWorker.build).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "test-server",
          pkgDir: "/packages/test-server",
          output: { js: true, dts: false },
          env: { DB_HOST: "localhost" },
          configs: { port: 3000 },
          externals: ["bcrypt"],
          pm2: { name: "test-app" },
          packageManager: "mise",
        }),
      );
      expect(result.success).toBe(true);
      expect(result.js.success).toBe(true);
      expect(result.dts.success).toBe(true);
      await engine.stop();
    });

    // Acceptance: maps ServerBuildResult to EngineResult
    it("maps worker result to EngineResult with js/dts separation", async () => {
      mockWorker.build.mockResolvedValue({
        js: { success: true, errors: undefined, warnings: ["warn1"] },
        dts: { success: false, errors: ["type error"], diagnostics: [{ code: 2345, category: 1 }] },
        mainJsPath: "/packages/test-server/dist/main.js",
      });

      const engine = new ServerEsbuildEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: false });

      expect(result.success).toBe(false);
      expect(result.js.warnings).toEqual(["warn1"]);
      expect(result.dts.success).toBe(false);
      expect(result.dts.diagnostics).toEqual([{ code: 2345, category: 1 }]);
      await engine.stop();
    });

    // Unit: JS failure
    it("reflects JS build failure in result", async () => {
      mockWorker.build.mockResolvedValue({
        js: { success: false, errors: ["esbuild error"], warnings: undefined },
        dts: { success: true, errors: undefined, diagnostics: [] },
        mainJsPath: "/packages/test-server/dist/main.js",
      });

      const engine = new ServerEsbuildEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: false });

      expect(result.success).toBe(false);
      expect(result.js.success).toBe(false);
      expect(result.js.errors).toEqual(["esbuild error"]);
      expect(result.dts.success).toBe(true);
      await engine.stop();
    });
  });

  describe("startWatch()", () => {
    // Acceptance: resolves when initial build event arrives
    it("resolves when initial build event arrives", async () => {
      mockWorker.startWatch.mockImplementation(() => {
        const buildHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "build",
        )?.[1];
        buildHandler?.({
          js: { success: true },
          dts: { success: true },
          mainJsPath: "/packages/test-server/dist/main.js",
        });
      });

      const engine = new ServerEsbuildEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.startWatch({ js: true, dts: false });

      expect(mockWorker.on).toHaveBeenCalledWith("build", expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith("buildStart", expect.any(Function));
      expect(mockWorker.on).toHaveBeenCalledWith("error", expect.any(Function));

      await engine.stop();
    });

    // Acceptance: reports to ResultCollector
    it("reports build and dts results separately to ResultCollector", async () => {
      const mockResultCollector = { add: vi.fn() };

      mockWorker.startWatch.mockImplementation(() => {
        const buildHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "build",
        )?.[1];
        buildHandler?.({
          js: { success: true, errors: undefined },
          dts: { success: false, errors: ["type error"] },
          mainJsPath: "/packages/test-server/dist/main.js",
        });
      });

      const engine = new ServerEsbuildEngine({
        cwd: "/root",
        pkg: createMockPkg(),
        resultCollector: mockResultCollector as any,
      });

      await engine.startWatch({ js: true, dts: false });

      const addCalls = mockResultCollector.add.mock.calls;
      const buildResult = addCalls.find((c: any[]) => c[0].type === "build");
      const dtsResult = addCalls.find((c: any[]) => c[0].type === "dts");

      expect(buildResult).toBeDefined();
      expect(buildResult![0].status).toBe("success");
      expect(dtsResult).toBeDefined();
      expect(dtsResult![0].status).toBe("error");

      await engine.stop();
    });

    // Unit: passes server-specific config to worker
    it("passes server config to worker startWatch", async () => {
      mockWorker.startWatch.mockImplementation(() => {
        const buildHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "build",
        )?.[1];
        buildHandler?.({
          js: { success: true },
          dts: { success: true },
          mainJsPath: "/packages/test-server/dist/main.js",
        });
      });

      const pkg = createMockPkg();
      const engine = new ServerEsbuildEngine({ cwd: "/root", pkg });
      await engine.startWatch({ js: true, dts: false });

      expect(mockWorker.startWatch).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "test-server",
          env: { DB_HOST: "localhost" },
          configs: { port: 3000 },
          externals: ["bcrypt"],
        }),
      );

      await engine.stop();
    });
  });

  describe("stop()", () => {
    it("calls stopWatch and terminate on worker", async () => {
      mockWorker.startWatch.mockImplementation(() => {
        const buildHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "build",
        )?.[1];
        buildHandler?.({ js: { success: true }, dts: { success: true }, mainJsPath: "x" });
      });

      const engine = new ServerEsbuildEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.startWatch({ js: true, dts: false });
      await engine.stop();

      expect(mockWorker.stopWatch).toHaveBeenCalled();
      expect(mockWorker.terminate).toHaveBeenCalled();
    });

    it("handles stop without prior run/startWatch", async () => {
      const engine = new ServerEsbuildEngine({ cwd: "/root", pkg: createMockPkg() });
      await expect(engine.stop()).resolves.toBeUndefined();
    });

    it("skips stopWatch in run mode", async () => {
      const engine = new ServerEsbuildEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.run({ js: true, dts: false });
      await engine.stop();

      expect(mockWorker.stopWatch).not.toHaveBeenCalled();
      expect(mockWorker.terminate).toHaveBeenCalled();
    });
  });
});
