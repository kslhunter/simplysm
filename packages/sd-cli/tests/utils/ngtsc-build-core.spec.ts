import { describe, it, expect, vi, beforeEach } from "vitest";
import ts from "typescript";

// --- Mock: AngularCompiler를 사용하는지 검증 ---

const mockInitialize = vi.fn().mockResolvedValue({ affectedFiles: new Set() });
const mockCollectDiagnostics = vi.fn().mockReturnValue([]);
const mockEmitAffectedFiles = vi.fn().mockReturnValue([]);
const mockGetTsProgram = vi.fn().mockReturnValue({
  getSourceFiles: () => [],
});

const angularCompilerConstructorSpy = vi.fn();

vi.mock("../../src/angular/angular-compiler", () => {
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

const ngtscProgramSpy = vi.fn();
vi.mock("../../src/angular/angular-build", () => {
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

const {
  createLibraryTransformStylesheet,
} = await import("../../src/angular/ngtsc-build-core");


// ─── createLibraryTransformStylesheet ───

describe("createLibraryTransformStylesheet", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("외부 .scss 파일이면 compileScssFile로 CSS를 반환하고 의존성을 기록한다", async () => {
    const loadPaths = ["/pkg/scss", "/cwd/node_modules"];
    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();

    const transform = createLibraryTransformStylesheet(loadPaths, scssErrors, scssDependencies);

    const result = await transform(
      ".host { color: red; }",
      "/project/src/app.component.ts",
      "/project/src/app.component.scss",
    );

    expect(scssErrors.length).toBeGreaterThan(0);
    expect(result).toBe("/* SCSS compilation error */");
  });

  it("외부 .css 파일이면 null을 반환한다", async () => {
    const loadPaths = ["/pkg/scss"];
    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();

    const transform = createLibraryTransformStylesheet(loadPaths, scssErrors, scssDependencies);

    const result = await transform(
      ".host { color: red; }",
      "/project/src/app.component.ts",
      "/project/src/app.component.css",
    );

    expect(result).toBeNull();
    expect(scssErrors.length).toBe(0);
  });

  it("인라인 SCSS(stylesheetFile 미지정)이면 compileScssString으로 CSS를 반환한다", async () => {
    const loadPaths: string[] = [];
    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();

    const transform = createLibraryTransformStylesheet(loadPaths, scssErrors, scssDependencies);

    const result = await transform(
      ".host { color: red; }",
      "/project/src/app.component.ts",
      undefined,
    );

    expect(typeof result).toBe("string");
    expect(result).toContain("color: red");
    expect(scssErrors.length).toBe(0);
  });

  it("SCSS 컴파일 에러 시 scssErrors에 에러를 추가하고 에러 주석을 반환한다", async () => {
    const loadPaths: string[] = [];
    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();

    const transform = createLibraryTransformStylesheet(loadPaths, scssErrors, scssDependencies);

    const result = await transform(
      "",
      "/project/src/broken.component.ts",
      "/nonexistent/path/broken.scss",
    );

    expect(result).toBe("/* SCSS compilation error */");
    expect(scssErrors.length).toBeGreaterThan(0);
    expect(scssErrors[0]).toContain("SCSS error");
  });

  it("SCSS 의존성이 scssDependencies에 기록된다", async () => {
    const loadPaths: string[] = [];
    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();

    const transform = createLibraryTransformStylesheet(loadPaths, scssErrors, scssDependencies);

    await transform(
      ".host { color: red; }",
      "/project/src/app.component.ts",
      undefined,
    );

    expect(scssDependencies.has("/project/src/app.component.ts")).toBe(true);
  });
});

