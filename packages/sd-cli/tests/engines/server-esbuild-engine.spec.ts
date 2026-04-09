import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock factories ---

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
    build: { success: true, errors: undefined, warnings: undefined, diagnostics: [] },
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
    it("returns EngineResult with build success", async () => {
      const pkg = createMockPkg();
      const engine = new ServerEsbuildEngine({ cwd: "/root", pkg });

      const result = await engine.run({ js: true, dts: false });

      expect(result.build.success).toBe(true);
      await engine.stop();
    });

    // Acceptance: maps ServerBuildResult to EngineResult
    it("maps worker result to EngineResult with build field", async () => {
      mockWorker.build.mockResolvedValue({
        build: { success: false, errors: ["type error"], warnings: ["warn1"], diagnostics: [{ code: 2345, category: 1 }] },
        mainJsPath: "/packages/test-server/dist/main.js",
      });

      const engine = new ServerEsbuildEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: false });

      expect(result.build.warnings).toEqual(["warn1"]);
      expect(result.build.success).toBe(false);
      expect(result.build.diagnostics).toEqual([{ code: 2345, category: 1 }]);
      await engine.stop();
    });

    // Unit: build failure
    it("reflects build failure in result", async () => {
      mockWorker.build.mockResolvedValue({
        build: { success: false, errors: ["esbuild error"], warnings: undefined, diagnostics: [] },
        mainJsPath: "/packages/test-server/dist/main.js",
      });

      const engine = new ServerEsbuildEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: false });

      expect(result.build.success).toBe(false);
      expect(result.build.errors).toEqual(["esbuild error"]);
      await engine.stop();
    });
  });

  // shared startWatch() behavior (resolve, ResultCollector) is tested in base-engine.spec.ts

  // shared stop() behavior (watch mode, 미실행 시) is tested in base-engine.spec.ts
  describe("stop()", () => {
    it("skips stopWatch in run mode", async () => {
      const engine = new ServerEsbuildEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.run({ js: true, dts: false });
      await engine.stop();

      expect(mockWorker.stopWatch).not.toHaveBeenCalled();
      expect(mockWorker.terminate).toHaveBeenCalled();
    });
  });
});
