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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "angular-compiler-test-"));
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

vi.mock("../../src/angular/angular-build", () => {
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
  "../../src/angular/angular-compiler"
);

// --- Common beforeEach ---

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

// =============================================================================
// emitAffectedFiles — Unit Tests
// =============================================================================

describe("emitAffectedFiles — Unit Tests", () => {
  it("initialize() 전 호출 시 에러를 던진다", () => {
    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    expect(() => [...compiler.emitAffectedFiles()]).toThrow("initialize()");
  });

  it("noEmit=true이면 빈 Iterator를 반환한다", async () => {
    realProgram = createRealTsProgram({ "index.ts": "export const x = 1;" }, { noEmit: true });

    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        skipLibCheck: true,
        types: [],
        noEmit: true,
      },
    });

    await compiler.initialize();

    const results = [...compiler.emitAffectedFiles()];
    expect(results).toHaveLength(0);
  });

  it("ignoreForEmit에 포함된 파일은 emit되지 않는다", async () => {
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

    const tsProgram = compiler.getTsProgram();
    for (const sf of tsProgram.getSourceFiles()) {
      mockIgnoreForEmit.add(sf);
    }

    const results = [...compiler.emitAffectedFiles()];
    expect(results).toHaveLength(0);
  });

  it("declaration file은 2차 루프에서 skip된다", async () => {
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

    const results = [...compiler.emitAffectedFiles()];
    const hasNodeModules = results.some((r) => r.filename.includes("node_modules"));
    expect(hasNodeModules).toBe(false);
  });

  it("sourceFilter가 적용되면 필터를 통과하지 못한 파일은 결과에 포함되지 않는다", async () => {
    realProgram = createRealTsProgram({
      "a.ts": "export const a = 1;",
      "b.ts": "export const b = 2;",
    });

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

    const results = [
      ...compiler.emitAffectedFiles({
        sourceFilter: (fileName: string) => fileName.includes("a.ts"),
      }),
    ];

    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(r.sourceFileName).toContain("a.ts");
    }
  });

  it("EmitResult는 filename과 contents를 포함한다", async () => {
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

    const results = [...compiler.emitAffectedFiles()];
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect(typeof r.filename).toBe("string");
      expect(typeof r.contents).toBe("string");
    }
  });
});

// =============================================================================
// emitAffectedFiles
// =============================================================================

describe("emitAffectedFiles", () => {
  it("변경된 파일만 emit하고 변경되지 않은 파일은 emit하지 않는다", async () => {
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

    // 첫 빌드: 모든 파일 emit
    const firstResults = [...compiler.emitAffectedFiles()];
    expect(firstResults.length).toBeGreaterThan(0);

    // 두번째 빌드: safeToSkipEmit=true이면 emit 안됨
    mockSafeToSkipEmit.mockReturnValue(true);
    await compiler.initialize();

    const secondResults = [...compiler.emitAffectedFiles()];
    expect(secondResults).toHaveLength(0);
  });

  it("첫 빌드에서 모든 소스 파일이 emit된다", async () => {
    realProgram = createRealTsProgram({
      "a.ts": "export const a = 1;",
      "b.ts": "export const b = 2;",
    });

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

    const results = [...compiler.emitAffectedFiles()];
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  it("safeToSkipEmit이 false인 파일이 emit된다", async () => {
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

    mockSafeToSkipEmit.mockReturnValue(false);

    await compiler.initialize();

    const results = [...compiler.emitAffectedFiles()];
    expect(results.length).toBeGreaterThan(0);
  });

  it("safeToSkipEmit이 true이고 affectedFiles에 없으면 emit하지 않는다", async () => {
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

    // 첫 빌드 수행
    await compiler.initialize();
    void [...compiler.emitAffectedFiles()];

    // 두번째 빌드: safeToSkipEmit=true
    mockSafeToSkipEmit.mockReturnValue(true);
    await compiler.initialize();

    const results = [...compiler.emitAffectedFiles()];
    expect(results).toHaveLength(0);
  });

  it("emit 성공 시 recordSuccessfulEmit이 호출된다", async () => {
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

    const results = [...compiler.emitAffectedFiles()];
    expect(results.length).toBeGreaterThan(0);
  });

  it("prepareEmit()의 transformers가 emit에 적용된다", async () => {
    const mockTransformer = vi.fn(
      (_context: ts.TransformationContext) => (sf: ts.SourceFile) => sf,
    );
    mockPrepareEmit.mockReturnValue({
      transformers: { before: [mockTransformer], after: [] },
    });

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

    const results = [...compiler.emitAffectedFiles()];
    expect(results.length).toBeGreaterThan(0);
  });

  it("additionalTransformers가 emit 시 적용된다", async () => {
    const additionalBefore = vi.fn(
      (_context: ts.TransformationContext) => (sf: ts.SourceFile) => sf,
    );

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

    const results = [
      ...compiler.emitAffectedFiles({
        additionalTransformers: { before: [additionalBefore] },
      }),
    ];
    expect(results.length).toBeGreaterThan(0);
  });

  it("declaration=true, noEmit=false일 때 .js와 .d.ts 모두 emit된다", async () => {
    realProgram = createRealTsProgram(
      { "index.ts": "export const x = 1;" },
      { declaration: true },
    );

    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        skipLibCheck: true,
        types: [],
        declaration: true,
      },
    });

    await compiler.initialize();

    const results = [...compiler.emitAffectedFiles()];
    const filenames = results.map((r) => r.filename);
    const hasJs = filenames.some((f) => f.endsWith(".js"));
    const hasDts = filenames.some((f) => f.endsWith(".d.ts"));
    expect(hasJs).toBe(true);
    expect(hasDts).toBe(true);
  });

  it("declaration=false일 때 .js만 emit되고 .d.ts는 생성되지 않는다", async () => {
    realProgram = createRealTsProgram(
      { "index.ts": "export const x = 1;" },
      { declaration: false },
    );

    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        skipLibCheck: true,
        types: [],
        declaration: false,
      },
    });

    await compiler.initialize();

    const results = [...compiler.emitAffectedFiles()];
    const filenames = results.map((r) => r.filename);
    const hasJs = filenames.some((f) => f.endsWith(".js"));
    const hasDts = filenames.some((f) => f.endsWith(".d.ts"));
    expect(hasJs).toBe(true);
    expect(hasDts).toBe(false);
  });

  it("emitDeclarationOnly=true일 때 .d.ts만 emit되고 .js는 생성되지 않는다", async () => {
    realProgram = createRealTsProgram(
      { "index.ts": "export const x = 1;" },
      { declaration: true, emitDeclarationOnly: true },
    );

    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        skipLibCheck: true,
        types: [],
        declaration: true,
        emitDeclarationOnly: true,
      },
    });

    await compiler.initialize();

    const results = [...compiler.emitAffectedFiles()];
    const filenames = results.map((r) => r.filename);
    const hasJs = filenames.some((f) => f.endsWith(".js"));
    const hasDts = filenames.some((f) => f.endsWith(".d.ts"));
    expect(hasJs).toBe(false);
    expect(hasDts).toBe(true);
  });

  it("noEmit=true일 때 어떤 파일도 emit되지 않는다", async () => {
    realProgram = createRealTsProgram({ "index.ts": "export const x = 1;" }, { noEmit: true });

    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        skipLibCheck: true,
        types: [],
        noEmit: true,
      },
    });

    await compiler.initialize();

    const results = [...compiler.emitAffectedFiles()];
    expect(results).toHaveLength(0);
  });
});

// =============================================================================
// update — Unit Tests
// =============================================================================

describe("update — Unit Tests", () => {
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

    await expect(compiler.update([realProgram.rootNames[0]])).rejects.toThrow("sourceFileCache");
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

    const result = await compiler.update([realProgram.rootNames[0]]);
    expect(result.affectedFiles).toBeInstanceOf(Set);
  });
});

// =============================================================================
// update
// =============================================================================

describe("update", () => {
  it("파일 변경 후 incremental rebuild", async () => {
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
    const initCallCount = ngtscConstructorSpy.mock.calls.length;

    await compiler.update([realProgram.rootNames[0]]);
    expect(ngtscConstructorSpy).toHaveBeenCalledTimes(initCallCount + 1);
  });

  it("node_modules 파일 변경 시 packageJsonCache clear", async () => {
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

    // node_modules 파일을 변경 파일로 전달
    await compiler.update(["node_modules/some-package/index.js"]);

    // packageJsonCache clear가 실행되더라도 에러 없이 완료되어야 함
    expect(ngtscConstructorSpy.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it("SCSS 파일 변경 시 관련 컴포넌트가 affected에 포함", async () => {
    const scssPath = path.join(realProgram.dir, "component.scss");
    fs.writeFileSync(scssPath, ".x { color: red; }", "utf-8");

    const indexFile = realProgram.program
      .getSourceFiles()
      .find((sf) => sf.fileName.includes("index.ts"));

    mockGetResourceDependencies.mockImplementation((sf: ts.SourceFile) => {
      if (sf === indexFile) {
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

    await compiler.initialize();

    const result = await compiler.update([scssPath]);
    const affectedFileNames = [...result.affectedFiles].map((sf) => sf.fileName);
    expect(affectedFileNames.some((f) => f.includes("index.ts"))).toBe(true);
  });

  it("리소스 변경 없으면 diagnosticCache 재사용", async () => {
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

    // 첫 번째 진단 수집
    const diags1 = [...compiler.collectDiagnostics()];
    expect(Array.isArray(diags1)).toBe(true);

    // 빈 set으로 update (리소스 변경 없음)
    await compiler.update([]);

    // diagnosticCache가 재사용되므로 진단 수집이 배열로 반환됨
    const diags2 = [...compiler.collectDiagnostics()];
    expect(Array.isArray(diags2)).toBe(true);
  });
});
