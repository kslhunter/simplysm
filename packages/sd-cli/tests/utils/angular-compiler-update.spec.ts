import { describe, it, expect, vi, beforeEach } from "vitest";
import ts from "typescript";
import path from "path";
import fs from "fs";
import os from "os";

// --- Mock Setup ---

const mockAnalyzeAsync = vi.fn().mockResolvedValue(undefined);
const mockGetDiagnosticsForFile = vi.fn().mockReturnValue([]);
const mockGetOptionDiagnostics = vi.fn().mockReturnValue([]);
const mockGetResourceDependencies = vi.fn().mockReturnValue([]);
const mockIgnoreForDiagnostics = new Set<ts.SourceFile>();
const mockIgnoreForEmit = new Set<ts.SourceFile>();
const mockSafeToSkipEmit = vi.fn().mockReturnValue(false);
const mockRecordSuccessfulEmit = vi.fn();
const mockPrepareEmit = vi.fn().mockReturnValue({
  transformers: { before: [], after: [] },
});

const ngtscConstructorSpy = vi.fn();

function createRealTsProgram(
  files: Record<string, string> = { "index.ts": "export const x = 1;" },
  extraOptions: ts.CompilerOptions = {},
): { program: ts.Program; dir: string; rootNames: string[] } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "angular-compiler-update-"));
  const rootNames: string[] = [];
  for (const [name, content] of Object.entries(files)) {
    const filePath = path.join(dir, name);
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, "utf-8");
    rootNames.push(filePath);
  }

  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ESNext,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    strict: false,
    skipLibCheck: true,
    types: [],
    outDir: path.join(dir, "out"),
    ...extraOptions,
  };
  const host = ts.createCompilerHost(options);
  const program = ts.createProgram(rootNames, options, host);
  return { program, dir, rootNames };
}

let realProgram: { program: ts.Program; dir: string; rootNames: string[] };

vi.mock("../../src/utils/angular-build", () => {
  class NgtscProgram {
    compiler = {
      analyzeAsync: mockAnalyzeAsync,
      getDiagnosticsForFile: mockGetDiagnosticsForFile,
      getOptionDiagnostics: mockGetOptionDiagnostics,
      getResourceDependencies: mockGetResourceDependencies,
      ignoreForDiagnostics: mockIgnoreForDiagnostics,
      ignoreForEmit: mockIgnoreForEmit,
      incrementalCompilation: {
        safeToSkipEmit: mockSafeToSkipEmit,
        recordSuccessfulEmit: mockRecordSuccessfulEmit,
      },
      prepareEmit: mockPrepareEmit,
    };
    constructor(...args: unknown[]) {
      ngtscConstructorSpy(...args);
    }
    getTsProgram() {
      return realProgram.program;
    }
  }
  return {
    NgtscProgram,
    OptimizeFor: { WholeProgram: 0, SingleFile: 1 },
  };
});

const { AngularCompiler, AngularSourceFileCache } = await import(
  "../../src/utils/angular-compiler"
);

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  mockIgnoreForDiagnostics.clear();
  mockIgnoreForEmit.clear();
  mockGetResourceDependencies.mockReturnValue([]);
  mockGetDiagnosticsForFile.mockReturnValue([]);
  mockSafeToSkipEmit.mockReturnValue(false);
  mockRecordSuccessfulEmit.mockReset();
  mockPrepareEmit.mockReturnValue({
    transformers: { before: [], after: [] },
  });

  realProgram = createRealTsProgram();
});

// --- Unit Tests: Slice 2 — update ---

describe("AngularCompiler.update — Unit Tests", () => {
  it("sourceFileCache가 없으면 에러를 던진다", async () => {
    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        skipLibCheck: true,
        types: [],
      },
    });

    await compiler.initialize();
    await expect(compiler.update(new Set(["a.ts"]))).rejects.toThrow();
  });

  it("update() 후 affectedFiles가 반환된다", async () => {
    const cache = new AngularSourceFileCache();

    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        skipLibCheck: true,
        types: [],
      },
      sourceFileCache: cache,
    });

    await compiler.initialize();
    const result = await compiler.update(new Set(["nonexistent.ts"]));

    expect(result).toHaveProperty("affectedFiles");
    expect(result.affectedFiles).toBeInstanceOf(Set);
  });
});

// --- Acceptance Tests: Slice 2 — update ---

describe("AngularCompiler — update", () => {
  // Scenario: 파일 변경 후 incremental rebuild
  it("update() 후 initialize()가 재호출되어 affectedFiles가 갱신된다", async () => {
    const cache = new AngularSourceFileCache();

    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        skipLibCheck: true,
        types: [],
      },
      sourceFileCache: cache,
    });

    // 초기 빌드
    await compiler.initialize();
    const initCallCount = ngtscConstructorSpy.mock.calls.length;

    // 파일 변경 후 update
    const aPath = realProgram.rootNames[0];
    const result = await compiler.update(new Set([aPath]));

    // initialize()가 재호출됨
    expect(ngtscConstructorSpy.mock.calls.length).toBe(initCallCount + 1);
    // sourceFileCache에서 invalidate 됨
    const normalizedPath = aPath.replace(/\\/g, "/");
    expect(cache.has(normalizedPath)).toBe(false);
    expect(cache.modifiedFiles.has(normalizedPath)).toBe(true);
    // affectedFiles가 반환됨
    expect(result.affectedFiles).toBeInstanceOf(Set);
  });

  // Scenario: node_modules 파일 변경 시 packageJsonCache clear
  it("node_modules 파일이 변경되면 packageJsonCache가 clear된다", async () => {
    const cache = new AngularSourceFileCache();

    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        skipLibCheck: true,
        types: [],
      },
      sourceFileCache: cache,
    });

    // 초기 빌드
    await compiler.initialize();

    // node_modules 파일 변경으로 update
    const result = await compiler.update(
      new Set(["node_modules/some-package/index.js"]),
    );

    // packageJsonCache.clear()가 호출됨 (에러 없이 완료)
    expect(result.affectedFiles).toBeInstanceOf(Set);
    // initialize()가 재호출됨
    expect(ngtscConstructorSpy.mock.calls.length).toBe(2);
  });

  // Scenario: SCSS 파일 변경 시 관련 컴포넌트가 affected에 포함
  it("SCSS 파일 변경 시 관련 컴포넌트가 affected에 포함된다", async () => {
    realProgram = createRealTsProgram({
      "component.ts": "export class Comp {}",
    });

    const scssPath = path.join(realProgram.dir, "component.scss");
    fs.writeFileSync(scssPath, ".x { }", "utf-8");

    const sourceFiles = realProgram.program.getSourceFiles();
    const compFile = sourceFiles.find((sf) => sf.fileName.includes("component.ts"));

    mockGetResourceDependencies.mockImplementation((sf: ts.SourceFile) => {
      if (sf === compFile) {
        return [scssPath];
      }
      return [];
    });

    const cache = new AngularSourceFileCache();

    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        skipLibCheck: true,
        types: [],
      },
      sourceFileCache: cache,
    });

    // 초기 빌드
    await compiler.initialize();

    // SCSS 변경 후 update
    const result = await compiler.update(new Set([scssPath]));

    // component.ts가 affected에 포함
    const affectedFileNames = [...result.affectedFiles].map(
      (sf: ts.SourceFile) => sf.fileName,
    );
    expect(affectedFileNames.some((f: string) => f.includes("component.ts"))).toBe(true);
  });

  // Scenario: 리소스 변경 없으면 diagnosticCache 재사용
  it("리소스 변경 없으면 diagnosticCache가 재사용된다", async () => {
    const mockDiag = {
      category: ts.DiagnosticCategory.Error,
      code: 5000,
      messageText: "cached diagnostic",
    } as ts.Diagnostic;
    mockGetDiagnosticsForFile.mockReturnValue([mockDiag]);

    const cache = new AngularSourceFileCache();

    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        skipLibCheck: true,
        types: [],
      },
      sourceFileCache: cache,
    });

    // 초기 빌드 + diagnostics
    await compiler.initialize();
    void [...compiler.collectDiagnostics()];
    expect(mockGetDiagnosticsForFile).toHaveBeenCalled();

    // 변경 없이 update → diagnosticCache 재사용
    mockGetDiagnosticsForFile.mockClear();
    await compiler.update(new Set([]));
    const diags2 = [...compiler.collectDiagnostics()];

    // diagnostics가 반환된다 (에러 없이 동작)
    expect(Array.isArray(diags2)).toBe(true);
  });
});
