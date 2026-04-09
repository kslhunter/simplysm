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
    it("returns EngineResult with build success", async () => {
      const engine = new TscEngine({ cwd: "/root", pkg: createMockPkg() });

      const result = await engine.run({ js: true, dts: true });

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

      expect(result.build.success).toBe(false);
      expect(result.build.errors).toEqual(["type error"]);
      expect(result.build.diagnostics).toHaveLength(1);
      await engine.stop();
    });

  });

  // Acceptance: Scenario "stop()으로 리소스 정리"
  // shared stop() behavior (watch mode, 미실행 시) is tested in base-engine.spec.ts
  describe("stop()", () => {
    it("skips stopWatch in run mode", async () => {
      const engine = new TscEngine({ cwd: "/root", pkg: createMockPkg() });
      await engine.run({ js: true, dts: true });
      await engine.stop();

      expect(mockWorker.stopWatch).not.toHaveBeenCalled();
      expect(mockWorker.terminate).toHaveBeenCalled();
    });
  });
});
