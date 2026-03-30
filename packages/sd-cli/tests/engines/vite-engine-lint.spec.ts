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

const { ViteEngine } = await import("../../src/engines/ViteEngine");
import type { ClientPackageInfo } from "../../src/engines/types";

// --- Helpers ---

function createMockPkg(): ClientPackageInfo {
  return {
    name: "test-client",
    dir: "/packages/test-client",
    config: { type: "client" } as any,
  };
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  mockWorker.build.mockResolvedValue({ success: true });
  mockWorker.terminate.mockResolvedValue(undefined);
  mockWorker.stopWatch.mockResolvedValue(undefined);
});

describe("ViteEngine lint integration (Slice 2)", () => {
  describe("Scenario: ViteEngine run() returns lint in EngineResult", () => {
    it("passes lint result from worker to EngineResult", async () => {
      mockWorker.build.mockResolvedValue({
        success: true,
        lint: { success: false, errorCount: 2, warningCount: 1, formattedOutput: "lint output" },
      });

      const engine = new ViteEngine({ cwd: "/root", pkg: createMockPkg() });
      const result = await engine.run({ js: true, dts: false });

      expect(result.lint).toEqual({
        success: false,
        errorCount: 2,
        warningCount: 1,
        formattedOutput: "lint output",
      });

      await engine.stop();
    });
  });

  describe("Scenario: ViteEngine startWatch reports lint BuildResult", () => {
    it("adds lint BuildResult to ResultCollector when build event has lint", async () => {
      const mockResultCollector = { add: vi.fn() };

      mockWorker.startWatch.mockResolvedValue({ success: true });

      // Setup event handlers to fire after startWatch
      mockWorker.on.mockImplementation((event: string, handler: Function) => {
        if (event === "build") {
          // Schedule firing after startWatch resolves
          setTimeout(() => {
            handler({
              success: true,
              lint: { success: false, errorCount: 1, warningCount: 0, formattedOutput: "error" },
            });
          }, 0);
        }
      });

      const engine = new ViteEngine({
        cwd: "/root",
        pkg: createMockPkg(),
        resultCollector: mockResultCollector as any,
      });

      await engine.startWatch({ js: true, dts: false });

      // Wait for setTimeout to fire
      await new Promise((r) => setTimeout(r, 10));

      const lintResult = mockResultCollector.add.mock.calls.find(
        (c: any[]) => c[0].type === "lint",
      );
      expect(lintResult).toBeDefined();
      expect(lintResult![0]).toMatchObject({
        name: "test-client",
        target: "client",
        type: "lint",
        status: "error",
      });

      await engine.stop();
    });
  });
});
