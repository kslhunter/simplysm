import { describe, it, expect, vi, beforeEach } from "vitest";
import ts from "typescript";

// --- Unit Tests: runNgtscBuild가 AngularCompiler를 사용하는지 검증 ---

// Mock AngularCompiler to verify runNgtscBuild uses it
const mockInitialize = vi.fn().mockResolvedValue({ affectedFiles: new Set() });
const mockCollectDiagnostics = vi.fn().mockReturnValue([]);
const mockEmitAffectedFiles = vi.fn().mockReturnValue([]);
const mockGetTsProgram = vi.fn().mockReturnValue({
  getSourceFiles: () => [],
} as unknown as ts.Program);

const angularCompilerConstructorSpy = vi.fn();

vi.mock("../../src/utils/angular-compiler", () => {
  class AngularCompiler {
    constructor(options: unknown) {
      angularCompilerConstructorSpy(options);
    }
    initialize = mockInitialize;
    *collectDiagnostics() {
      yield* mockCollectDiagnostics();
    }
    *emitAffectedFiles() {
      yield* mockEmitAffectedFiles();
    }
    getTsProgram = mockGetTsProgram;
  }

  class AngularSourceFileCache extends Map<string, ts.SourceFile> {
    readonly modifiedFiles = new Set<string>();
    invalidate(_files: Iterable<string>): void {
      // no-op
    }
  }

  return {
    AngularCompiler,
    AngularSourceFileCache,
    augmentHostWithCaching: vi.fn(),
  };
});

// Mock tsconfig module to avoid filesystem access
vi.mock("../../src/utils/tsconfig", () => ({
  parseTsconfig: vi.fn().mockReturnValue({
    options: {
      target: ts.ScriptTarget.ESNext,
      module: ts.ModuleKind.ESNext,
      moduleResolution: ts.ModuleResolutionKind.Bundler,
      strict: false,
      skipLibCheck: true,
    },
    fileNames: ["/workspace/packages/test-pkg/src/main.ts"],
  }),
  getPackageSourceFiles: vi
    .fn()
    .mockReturnValue(["/workspace/packages/test-pkg/src/main.ts"]),
  getCompilerOptionsForEnv: vi.fn().mockImplementation((opts: ts.CompilerOptions) => opts),
}));

// Mock NgtscProgram should NOT be used after migration
const ngtscProgramSpy = vi.fn();
vi.mock("../../src/utils/angular-build", () => {
  class NgtscProgram {
    constructor(...args: unknown[]) {
      ngtscProgramSpy(...args);
    }
    compiler = {
      analyzeAsync: vi.fn().mockResolvedValue(undefined),
      getDiagnosticsForFile: vi.fn().mockReturnValue([]),
      getOptionDiagnostics: vi.fn().mockReturnValue([]),
      getResourceDependencies: vi.fn().mockReturnValue([]),
      ignoreForDiagnostics: new Set(),
      ignoreForEmit: new Set(),
      incrementalCompilation: {
        safeToSkipEmit: vi.fn().mockReturnValue(false),
        recordSuccessfulEmit: vi.fn(),
      },
      prepareEmit: vi.fn().mockReturnValue({ transformers: { before: [], after: [] } }),
    };
    getTsProgram() {
      return { getSourceFiles: () => [] } as unknown as ts.Program;
    }
  }
  return {
    NgtscProgram,
    OptimizeFor: { WholeProgram: 0, SingleFile: 1 },
  };
});

const { runNgtscBuild } = await import("../../src/utils/ngtsc-build-core");

// Use real workspace root so ts.readConfigFile can find tsconfig.json
const { resolve } = await import("node:path");
const workspaceRoot = resolve(import.meta.dirname, "../../../..");

describe("runNgtscBuild가 AngularCompiler를 사용한다", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCollectDiagnostics.mockReturnValue([]);
    mockEmitAffectedFiles.mockReturnValue([]);
  });

  it("runNgtscBuild가 AngularCompiler를 생성하고 initialize()를 호출한다", async () => {
    const result = await runNgtscBuild({
      name: "test-pkg",
      cwd: workspaceRoot,
      pkgDir: resolve(workspaceRoot, "packages/test-pkg"),
      output: { js: true, dts: true },
    });

    // AngularCompiler가 생성됨
    expect(angularCompilerConstructorSpy).toHaveBeenCalledTimes(1);
    // initialize()가 호출됨
    expect(mockInitialize).toHaveBeenCalledTimes(1);
    // NgtscProgram이 직접 생성되지 않음
    expect(ngtscProgramSpy).not.toHaveBeenCalled();

    // 결과 구조 확인
    expect(result.build).toHaveProperty("success");
    expect(result.build).toHaveProperty("diagnostics");
  });

  it("AngularCompiler 생성자에 transformStylesheet가 전달된다", async () => {
    await runNgtscBuild({
      name: "test-pkg",
      cwd: workspaceRoot,
      pkgDir: resolve(workspaceRoot, "packages/test-pkg"),
      output: { js: true, dts: false },
    });

    const options = angularCompilerConstructorSpy.mock.calls[0]?.[0];
    expect(options).toHaveProperty("transformStylesheet");
    expect(typeof options.transformStylesheet).toBe("function");
  });

  it("collectDiagnostics()가 호출되어 진단이 수집된다", async () => {
    await runNgtscBuild({
      name: "test-pkg",
      cwd: workspaceRoot,
      pkgDir: resolve(workspaceRoot, "packages/test-pkg"),
      output: { js: true, dts: true },
    });

    expect(mockCollectDiagnostics).toHaveBeenCalled();
  });

  it("emitAffectedFiles()가 호출되어 emit이 수행된다", async () => {
    await runNgtscBuild({
      name: "test-pkg",
      cwd: workspaceRoot,
      pkgDir: resolve(workspaceRoot, "packages/test-pkg"),
      output: { js: true, dts: true },
    });

    expect(mockEmitAffectedFiles).toHaveBeenCalled();
  });

  it("output.js=false, output.dts=false이면 noEmit=true가 설정된다", async () => {
    await runNgtscBuild({
      name: "test-pkg",
      cwd: workspaceRoot,
      pkgDir: resolve(workspaceRoot, "packages/test-pkg"),
      output: { js: false, dts: false },
    });

    const options = angularCompilerConstructorSpy.mock.calls[0]?.[0];
    expect(options.compilerOptions.noEmit).toBe(true);
  });
});
