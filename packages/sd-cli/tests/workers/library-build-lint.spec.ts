import { describe, it, expect, vi, beforeEach } from "vitest";
import * as tscBuildModule from "../../src/utils/tsc-build";

// --- Mocks ---

const { mockLintFn, MockLintWithProgramRunner } = vi.hoisted(() => {
  const lintFn = vi.fn().mockResolvedValue({
    success: true,
    errorCount: 0,
    warningCount: 0,
    formattedOutput: "",
  });
  const RunnerCls = vi.fn().mockImplementation(function () {
    return { lint: lintFn };
  });
  return { mockLintFn: lintFn, MockLintWithProgramRunner: RunnerCls };
});

vi.mock("../../src/lint/lint-with-program", () => ({
  LintWithProgramRunner: MockLintWithProgramRunner,
}));

const mockTscResult = {
  success: true,
  errors: undefined,
  diagnostics: [],
  errorCount: 0,
  warningCount: 0,
  program: { getSourceFiles: () => [] },
};

const runTscSpy = vi.spyOn(tscBuildModule, "runTscPackageBuild")
  .mockReturnValue(mockTscResult as any);

vi.mock("../../src/runtime/worker-utils", () => ({
  registerCleanupHandlers: vi.fn(),
  createOnceGuard: vi.fn(() => vi.fn()),
  setupWorkerConsola: vi.fn(),
}));

vi.mock("@simplysm/core-node", () => ({
  createWorker: vi.fn(
    (methods: Record<string, Function>) => {
      Object.assign(workerMethods, methods);
      return { send: vi.fn() };
    },
  ),
  FsWatcher: { watch: vi.fn() },
}));

vi.mock("../../src/deps/replace-deps/collect-deps", () => ({
  collectDeps: vi.fn(() => ({ workspaceDeps: [], replaceDeps: [] })),
}));

const workerMethods: Record<string, Function> = {};

await import("../../src/workers/library-build.worker");

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  runTscSpy.mockReturnValue(mockTscResult as any);
  mockLintFn.mockResolvedValue({
    success: true,
    errorCount: 0,
    warningCount: 0,
    formattedOutput: "",
  });
  mockTscResult.program = { getSourceFiles: () => [] } as any;
});

describe("library-build.worker lint integration (Slice 3)", () => {
  describe("Scenario: library-build.worker runs lint after typecheck", () => {
    it("returns lint result in build output when lint is enabled", async () => {
      const result = await workerMethods["build"]({
        name: "my-lib",
        config: { target: "node" },
        cwd: "/workspace",
        pkgDir: "/workspace/packages/my-lib",
        output: { js: true, dts: true, lint: true },
      });

      expect(result.lint).toEqual({
        success: true,
        errorCount: 0,
        warningCount: 0,
        formattedOutput: "",
      });
    });
  });

  describe("Scenario: lint disabled", () => {
    it("does not run lint when output.lint is false", async () => {
      const result = await workerMethods["build"]({
        name: "my-lib",
        config: { target: "node" },
        cwd: "/workspace",
        pkgDir: "/workspace/packages/my-lib",
        output: { js: true, dts: true },
      });

      expect(result.lint).toBeUndefined();
    });
  });
});
