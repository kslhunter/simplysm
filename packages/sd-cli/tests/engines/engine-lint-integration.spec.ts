import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

vi.mock("consola", () => ({
  consola: {
    withTag: vi.fn(() => ({
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
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

const { TscEngine } = await import("../../src/engines/TscEngine");
import type { BuildPackageInfo, BuildOutput } from "../../src/engines/types";
import type { BuildResult } from "../../src/infra/ResultCollector";

// --- Helpers ---

function createMockPkg(): BuildPackageInfo {
  return {
    name: "test-pkg",
    dir: "/packages/test-pkg",
    config: { target: "node" } as any,
  };
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  mockWorker.build.mockResolvedValue({
    js: { success: true },
    dts: { success: true, diagnostics: [] },
    lint: { success: true, errorCount: 0, warningCount: 0, formattedOutput: "" },
  });
  mockWorker.terminate.mockResolvedValue(undefined);
  mockWorker.stopWatch.mockResolvedValue(undefined);
});

describe("엔진 lint 통합 (Slice 2)", () => {
  describe("Scenario: BuildOutput.lint flag controls lint execution", () => {
    it("BuildOutput이 lint 불리언 플래그를 수용", () => {
      const output: BuildOutput = { js: true, dts: true, lint: true };
      expect(output.lint).toBe(true);
    });

    it("BuildOutput.lint는 미설정 시 undefined가 기본값", () => {
      const output: BuildOutput = { js: true, dts: true };
      expect(output.lint).toBeUndefined();
    });
  });

  describe("Scenario: EngineResult includes lint field", () => {
    it("run() returns EngineResult with lint field when worker provides it", async () => {
      mockWorker.build.mockResolvedValue({
        js: { success: true },
        dts: { success: true, diagnostics: [] },
        lint: { success: false, errorCount: 3, warningCount: 1, formattedOutput: "lint errors" },
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
        js: { success: true },
        dts: { success: true, diagnostics: [] },
      });

      const engine = new TscEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: true });

      expect(result.lint).toBeUndefined();

      await engine.stop();
    });
  });

  describe("Scenario: BaseEngine.startWatch reports lint BuildResult", () => {
    it("adds lint BuildResult to ResultCollector when build event has lint", async () => {
      const mockResultCollector = { add: vi.fn() };

      mockWorker.startWatch.mockImplementation(() => {
        const buildHandler = mockWorker.on.mock.calls.find(
          (call: any[]) => call[0] === "build",
        )?.[1];
        buildHandler?.({
          js: { success: true },
          dts: { success: true },
          lint: { success: false, errorCount: 2, warningCount: 0, formattedOutput: "errors" },
        });
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
          js: { success: true },
          dts: { success: true },
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

  describe("Scenario: ResultCollector supports lint type", () => {
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
