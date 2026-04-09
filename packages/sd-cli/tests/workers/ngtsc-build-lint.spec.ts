import { describe, it, expect, vi, beforeEach } from "vitest";

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

vi.mock("../../src/utils/lint-with-program", () => ({
  LintWithProgramRunner: MockLintWithProgramRunner,
}));

const mockTsProgram = { getSourceFiles: () => [] };

const mockPipelineInstance = {
  initialize: vi.fn().mockResolvedValue({
    affectedFiles: new Set(),
    diagnostics: { errors: [], warnings: [] },
    scssErrors: [],
  }),
  writeEmitResults: vi.fn(),
  collectRawDiagnostics: vi.fn().mockReturnValue([]),
  getDiagnostics: vi.fn().mockReturnValue({ errors: [], warnings: [] }),
  getScssErrors: vi.fn().mockReturnValue([]),
  getTsProgram: vi.fn().mockReturnValue(mockTsProgram),
  findAffectedByScss: vi.fn().mockReturnValue([]),
  clearScssDependencies: vi.fn(),
  update: vi.fn().mockResolvedValue({
    affectedFiles: new Set(),
    diagnostics: { errors: [], warnings: [] },
    scssErrors: [],
  }),
};

vi.mock("../../src/utils/angular-build-pipeline", () => ({
  AngularBuildPipeline: vi.fn().mockImplementation(function () {
    return mockPipelineInstance;
  }),
}));

vi.mock("../../src/utils/ngtsc-build-core", () => ({
  buildCompilerOptions: vi.fn(() => ({})),
  buildScssLoadPaths: vi.fn(() => []),
  compileSideEffectScss: vi.fn(),
  compileGlobalScss: vi.fn(() => []),
}));

vi.mock("../../src/utils/tsconfig", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/utils/tsconfig")>();
  return {
    ...original,
    parseTsconfig: vi.fn(() => ({ options: {}, fileNames: [], errors: [] })),
  };
});

vi.mock("../../src/utils/worker-utils", () => ({
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
  pathx: {
    posix: vi.fn((p: string) => p.replace(/\\/g, "/")),
    posixResolve: vi.fn((...parts: string[]) => parts.join("/")),
  },
}));

const workerMethods: Record<string, Function> = {};

await import("../../src/workers/ngtsc-build.worker");

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  mockLintFn.mockResolvedValue({
    success: true,
    errorCount: 0,
    warningCount: 0,
    formattedOutput: "",
  });
  mockPipelineInstance.initialize.mockResolvedValue({
    affectedFiles: new Set(),
    diagnostics: { errors: [], warnings: [] },
    scssErrors: [],
  });
  mockPipelineInstance.collectRawDiagnostics.mockReturnValue([]);
  mockPipelineInstance.getDiagnostics.mockReturnValue({ errors: [], warnings: [] });
  mockPipelineInstance.getScssErrors.mockReturnValue([]);
  mockPipelineInstance.getTsProgram.mockReturnValue(mockTsProgram);
});

describe("ngtsc-build.worker lint integration (Slice 4)", () => {
  describe("Scenario: ngtsc-build.worker runs lint after typecheck (one-time build)", () => {
    it("returns lint result when lint is enabled", async () => {
      const result = await workerMethods["build"]({
        name: "my-angular-lib",
        cwd: "/workspace",
        pkgDir: "/workspace/packages/my-angular-lib",
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
    it("does not run lint when output.lint is not set", async () => {
      const result = await workerMethods["build"]({
        name: "my-angular-lib",
        cwd: "/workspace",
        pkgDir: "/workspace/packages/my-angular-lib",
        output: { js: true, dts: true },
      });

      expect(result.lint).toBeUndefined();
    });
  });
});
