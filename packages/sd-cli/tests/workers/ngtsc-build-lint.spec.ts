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

const mockRunNgtscBuild = vi.fn().mockResolvedValue({
  js: { success: true },
  dts: { success: true, diagnostics: [] },
});

vi.mock("../../src/utils/ngtsc-build-core", () => ({
  runNgtscBuild: mockRunNgtscBuild,
  buildCompilerOptions: vi.fn(() => ({})),
  buildScssLoadPaths: vi.fn(() => []),
  createLibraryTransformStylesheet: vi.fn(() => vi.fn()),
  writeEmitResults: vi.fn(),
  compileGlobalScss: vi.fn(() => []),
}));

const mockCompiler = {
  initialize: vi.fn().mockResolvedValue({ affectedFiles: new Set() }),
  collectDiagnostics: vi.fn().mockReturnValue([]),
  emitAffectedFiles: vi.fn().mockReturnValue([]),
  getTsProgram: vi.fn().mockReturnValue(mockTsProgram),
  update: vi.fn().mockResolvedValue({ affectedFiles: new Set() }),
};

vi.mock("../../src/utils/angular-compiler", () => ({
  AngularCompiler: vi.fn().mockImplementation(function () {
    return mockCompiler;
  }),
  AngularSourceFileCache: vi.fn().mockImplementation(function () {
    return new Map();
  }),
}));

vi.mock("../../src/utils/tsconfig", () => ({
  parseTsconfig: vi.fn(() => ({ options: {}, fileNames: [] })),
  getPackageSourceFiles: vi.fn(() => []),
  getCompilerOptionsForEnv: vi.fn((opts: unknown) => opts),
}));

vi.mock("typescript", async (importOriginal) => {
  const actual = await importOriginal<typeof import("typescript")>();
  return {
    ...actual,
    default: {
      ...actual,
      readConfigFile: vi.fn(() => ({ config: {} })),
      DiagnosticCategory: actual.DiagnosticCategory,
    },
  };
});

vi.mock("../../src/utils/worker-utils", () => ({
  registerCleanupHandlers: vi.fn(),
  createOnceGuard: vi.fn(() => vi.fn()),
  applyDebugLevel: vi.fn(),
}));

vi.mock("../../src/utils/package-utils", () => ({
  collectDeps: vi.fn(() => ({ workspaceDeps: [], replaceDeps: [] })),
}));

const mockConsolaLogger = {
  debug: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
  withTag: vi.fn(),
};
mockConsolaLogger.withTag.mockReturnValue(mockConsolaLogger);

vi.mock("consola", () => ({
  consola: mockConsolaLogger,
  default: mockConsolaLogger,
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
  mockRunNgtscBuild.mockResolvedValue({
    js: { success: true },
    dts: { success: true, diagnostics: [] },
  });
});

describe("ngtsc-build.worker lint integration (Slice 4)", () => {
  describe("Scenario: ngtsc-build.worker runs lint after typecheck (one-time build)", () => {
    it("returns lint result when lint is enabled", async () => {
      mockRunNgtscBuild.mockResolvedValue({
        js: { success: true },
        dts: { success: true, diagnostics: [] },
        program: mockTsProgram,
      });

      const result = await workerMethods["build"]({
        name: "my-angular-lib",
        cwd: "/workspace",
        pkgDir: "/workspace/packages/my-angular-lib",
        output: { js: true, dts: true, lint: true },
      });

      expect(MockLintWithProgramRunner).toHaveBeenCalledWith({
        cwd: "/workspace",
        pkgName: "my-angular-lib",
      });
      expect(mockLintFn).toHaveBeenCalledWith({
        program: mockTsProgram,
      });
      expect(result).toHaveProperty("lint");
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

      expect(mockLintFn).not.toHaveBeenCalled();
      expect(result.lint).toBeUndefined();
    });
  });
});
