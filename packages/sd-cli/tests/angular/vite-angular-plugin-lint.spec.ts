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

const mockTsProgram = {
  getSourceFiles: () => [
    { fileName: "/workspace/packages/client/src/main.ts" },
    { fileName: "/workspace/packages/client/src/app.ts" },
  ],
};

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

vi.mock("@angular/build/private", () => ({
  JavaScriptTransformer: vi.fn().mockImplementation(function () {
    return {
      transformData: vi.fn().mockResolvedValue(new Uint8Array()),
      close: vi.fn().mockResolvedValue(undefined),
    };
  }),
}));

vi.mock("../../src/angular/client-transform-stylesheet", () => ({
  createClientTransformStylesheet: vi.fn(() => vi.fn()),
}));

vi.mock("typescript", async (importOriginal) => {
  const actual = await importOriginal<typeof import("typescript")>();
  return {
    ...actual,
    default: {
      ...actual,
      readConfigFile: vi.fn(() => ({ config: { compilerOptions: {}, fileNames: [] } })),
      parseJsonConfigFileContent: vi.fn(() => ({
        options: {},
        fileNames: ["/workspace/packages/client/src/main.ts"],
        raw: {},
      })),
      sys: actual.sys,
    },
  };
});

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

const { sdAngularPlugin } = await import("../../src/angular/vite-angular-plugin");

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  mockLintFn.mockResolvedValue({
    success: true,
    errorCount: 0,
    warningCount: 0,
    formattedOutput: "",
  });
  mockCompiler.initialize.mockResolvedValue({ affectedFiles: new Set() });
  mockCompiler.collectDiagnostics.mockReturnValue([]);
  mockCompiler.emitAffectedFiles.mockReturnValue([]);
  mockCompiler.getTsProgram.mockReturnValue(mockTsProgram);
  mockCompiler.update.mockResolvedValue({ affectedFiles: new Set() });
});

describe("vite-angular-plugin lint integration (Slice 5)", () => {
  describe("Scenario: lint runs in buildStart when enableLint is true", () => {
    it("runs lint after compilation in buildStart and includes result in onBuild", async () => {
      const onBuildResults: any[] = [];

      const plugin = sdAngularPlugin({
        tsconfig: "/workspace/packages/client/tsconfig.json",
        dev: true,
        enableLint: true,
        onBuild: (result) => onBuildResults.push(result),
      });

      // Call buildStart
      const buildStart = (plugin as any).buildStart;
      await buildStart.call({});

      // LintWithProgramRunner should have been created and lint called
      expect(MockLintWithProgramRunner).toHaveBeenCalled();
      expect(mockLintFn).toHaveBeenCalledWith({
        program: mockTsProgram,
      });
    });
  });

  describe("Scenario: lint does not run when enableLint is false", () => {
    it("does not run lint when enableLint is not set", async () => {
      const plugin = sdAngularPlugin({
        tsconfig: "/workspace/packages/client/tsconfig.json",
        dev: true,
      });

      const buildStart = (plugin as any).buildStart;
      await buildStart.call({});

      expect(MockLintWithProgramRunner).not.toHaveBeenCalled();
      expect(mockLintFn).not.toHaveBeenCalled();
    });
  });

  describe("Scenario: lint runs in handleHotUpdate", () => {
    it("runs lint after incremental compilation and passes result to onBuild", async () => {
      const onBuildResults: any[] = [];

      const plugin = sdAngularPlugin({
        tsconfig: "/workspace/packages/client/tsconfig.json",
        dev: true,
        enableLint: true,
        onBuild: (result) => onBuildResults.push(result),
      });

      // Initialize via buildStart first
      await (plugin as any).buildStart.call({});
      vi.clearAllMocks();

      mockLintFn.mockResolvedValue({
        success: false,
        errorCount: 2,
        warningCount: 0,
        formattedOutput: "lint errors found",
      });

      // Call handleHotUpdate
      const handleHotUpdate = (plugin as any).handleHotUpdate;
      await handleHotUpdate.call({}, {
        file: "/workspace/packages/client/src/app.ts",
        modules: [],
        server: {},
        timestamp: Date.now(),
        read: () => "",
      });

      expect(mockLintFn).toHaveBeenCalled();
      expect(onBuildResults.length).toBeGreaterThan(0);
      const lastResult = onBuildResults[onBuildResults.length - 1];
      expect(lastResult.lint).toEqual({
        success: false,
        errorCount: 2,
        warningCount: 0,
        formattedOutput: "lint errors found",
      });
    });
  });
});
