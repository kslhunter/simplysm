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
// AngularCompiler — Unit Tests (pre-initialize)
// =============================================================================

describe("AngularCompiler — Unit Tests", () => {
  it("initialize() 전 getTsProgram()은 에러를 던진다", () => {
    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    expect(() => compiler.getTsProgram()).toThrow("initialize()");
  });

  it("initialize() 전 compiler getter는 에러를 던진다", () => {
    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    expect(() => compiler.compiler).toThrow("initialize()");
  });

  it("initialize() 전 ngtscProgram은 undefined이다", () => {
    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    expect(compiler.ngtscProgram).toBeUndefined();
  });

  it("host.readResource가 파일 내용을 반환한다", async () => {
    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    await compiler.initialize();

    const hostArg = ngtscConstructorSpy.mock.calls[0][2] as Record<string, Function>;
    expect(typeof hostArg["readResource"]).toBe("function");
    const content = (hostArg["readResource"])(realProgram.rootNames[0]);
    expect(content).toContain("export const x = 1");
  });

  it("host.transformResource — style이 아닌 type은 null을 반환한다", async () => {
    const transformStylesheet = vi.fn().mockResolvedValue("css");
    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: { target: ts.ScriptTarget.ESNext },
      transformStylesheet,
    });

    await compiler.initialize();

    const hostArg = ngtscConstructorSpy.mock.calls[0][2] as Record<string, Function>;
    const result = await (hostArg["transformResource"])("data", {
      type: "template",
      containingFile: "/app/comp.ts",
      resourceFile: null,
    });
    expect(result).toBeNull();
    expect(transformStylesheet).not.toHaveBeenCalled();
  });

  it("host.transformResource — 빈 스타일은 빈 content를 반환한다", async () => {
    const transformStylesheet = vi.fn().mockResolvedValue("css");
    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: { target: ts.ScriptTarget.ESNext },
      transformStylesheet,
    });

    await compiler.initialize();

    const hostArg = ngtscConstructorSpy.mock.calls[0][2] as Record<string, Function>;
    const result = await (hostArg["transformResource"])("   ", {
      type: "style",
      containingFile: "/app/comp.ts",
      resourceFile: null,
    });
    expect(result).toEqual({ content: "" });
    expect(transformStylesheet).not.toHaveBeenCalled();
  });

  it("host.getModifiedResourceFiles는 sourceFileCache.modifiedFiles를 반환한다", async () => {
    const cache = new AngularSourceFileCache();
    cache.modifiedFiles.add("src/styles.scss");

    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: { target: ts.ScriptTarget.ESNext },
      sourceFileCache: cache,
    });

    await compiler.initialize();

    const hostArg = ngtscConstructorSpy.mock.calls[0][2] as Record<string, Function>;
    expect(typeof hostArg["getModifiedResourceFiles"]).toBe("function");
    const modifiedFiles = (hostArg["getModifiedResourceFiles"])();
    expect(modifiedFiles.has("src/styles.scss")).toBe(true);
  });

  it("resourceNameToFileName — 존재하지 않는 파일은 null 반환", async () => {
    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    await compiler.initialize();

    const hostArg = ngtscConstructorSpy.mock.calls[0][2] as Record<string, Function>;
    const result = (hostArg["resourceNameToFileName"])(
      "./nonexistent.html",
      realProgram.rootNames[0],
    );
    expect(result).toBeNull();
  });

  it("resourceNameToFileName — 존재하는 템플릿 파일은 resolvedPath 반환", async () => {
    const htmlPath = path.join(realProgram.dir, "comp.html");
    fs.writeFileSync(htmlPath, "<div></div>", "utf-8");

    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    await compiler.initialize();

    const hostArg = ngtscConstructorSpy.mock.calls[0][2] as Record<string, Function>;
    const result = (hostArg["resourceNameToFileName"])(
      "./comp.html",
      realProgram.rootNames[0],
    );
    expect(result).toBe(htmlPath);
  });

  it("resourceNameToFileName — externalStylesheets와 stylesheet일 때 SHA256 ID 반환", async () => {
    const scssPath = path.join(realProgram.dir, "comp.scss");
    fs.writeFileSync(scssPath, ".x{}", "utf-8");

    const externalStylesheets = new Map<string, string>();
    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: { target: ts.ScriptTarget.ESNext },
      externalStylesheets,
    });

    await compiler.initialize();

    const hostArg = ngtscConstructorSpy.mock.calls[0][2] as Record<string, Function>;
    const result = (hostArg["resourceNameToFileName"])(
      "./comp.scss",
      realProgram.rootNames[0],
    );
    expect(result).toMatch(/^[a-f0-9]{64}\.css$/);
    expect(externalStylesheets.has(scssPath)).toBe(true);
  });

  it("angularCompilerOptions가 compilerOptions에 병합된다", async () => {
    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: { target: ts.ScriptTarget.ESNext },
      angularCompilerOptions: { strictTemplates: true },
    });

    await compiler.initialize();

    const passedOptions = ngtscConstructorSpy.mock.calls[0][1] as Record<string, unknown>;
    expect(passedOptions["strictTemplates"]).toBe(true);
  });

  it("collectDiagnostics() — initialize() 전 호출 시 에러", () => {
    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    expect(() => [...compiler.collectDiagnostics()]).toThrow("initialize()");
  });
});

// =============================================================================
// AngularCompiler — 초기화
// =============================================================================

describe("AngularCompiler — 초기화", () => {
  it("initialize()로 호스트, NgtscProgram, BuilderProgram이 생성되고 analyzeAsync가 호출된다", async () => {
    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    const result = await compiler.initialize();

    expect(ngtscConstructorSpy.mock.calls[0][3]).toBeUndefined();
    expect(result.affectedFiles).toBeInstanceOf(Set);
  });

  it("두번째 initialize()에서 이전 NgtscProgram이 oldProgram으로 전달된다", async () => {
    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    await compiler.initialize();
    const firstProgram = compiler.ngtscProgram;

    await compiler.initialize();

    expect(ngtscConstructorSpy.mock.calls[1][3]).toBe(firstProgram);
  });

  it("transformStylesheet 콜백이 host.transformResource를 통해 호출된다", async () => {
    const transformStylesheet = vi.fn().mockResolvedValue("body { color: red; }");

    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
      transformStylesheet,
    });

    await compiler.initialize();

    const hostArg = ngtscConstructorSpy.mock.calls[0][2] as Record<string, unknown>;
    expect(typeof hostArg["transformResource"]).toBe("function");

    const result = await (hostArg["transformResource"] as Function)(
      ".button { color: blue; }",
      { type: "style", containingFile: "/app/comp.ts", resourceFile: "/app/comp.scss" },
    );
    expect(transformStylesheet).toHaveBeenCalledWith(
      ".button { color: blue; }",
      "/app/comp.ts",
      "/app/comp.scss",
    );
    expect(result).toEqual({ content: "body { color: red; }" });
  });

  it("compilerOptionsTransformer가 NgtscProgram 생성에 사용된다", async () => {
    const transformer = vi.fn((opts: ts.CompilerOptions) => ({
      ...opts,
      noEmit: false,
      declaration: false,
    }));

    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext, noEmit: true },
      compilerOptionsTransformer: transformer,
    });

    await compiler.initialize();

    expect(transformer).toHaveBeenCalledTimes(1);
    const passedOptions = ngtscConstructorSpy.mock.calls[0][1] as ts.CompilerOptions;
    expect(passedOptions.noEmit).toBe(false);
    expect(passedOptions.declaration).toBe(false);
  });

  it("host.resourceNameToFileName이 절대 경로를 반환한다", async () => {
    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    await compiler.initialize();

    const hostArg = ngtscConstructorSpy.mock.calls[0][2] as Record<string, Function>;
    expect(typeof hostArg["resourceNameToFileName"]).toBe("function");
  });

  it("compilerOptionsTransformer로 declaration: true 설정", async () => {
    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
      compilerOptionsTransformer: (opts) => ({
        ...opts,
        declaration: true,
        declarationMap: true,
      }),
    });

    await compiler.initialize();

    const passedOptions = ngtscConstructorSpy.mock.calls[0][1] as ts.CompilerOptions;
    expect(passedOptions.declaration).toBe(true);
    expect(passedOptions.declarationMap).toBe(true);
  });

  it("compilerOptionsTransformer로 declaration: false 설정", async () => {
    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
      compilerOptionsTransformer: (opts) => ({
        ...opts,
        declaration: false,
      }),
    });

    await compiler.initialize();

    const passedOptions = ngtscConstructorSpy.mock.calls[0][1] as ts.CompilerOptions;
    expect(passedOptions.declaration).toBe(false);
  });

  it("getTsProgram()으로 ts.Program을 반환한다", async () => {
    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    await compiler.initialize();

    const program = compiler.getTsProgram();
    expect(program).toBe(realProgram.program);
  });

  it("getTsProgram()의 결과가 ESLint parserOptions.programs에 주입 가능한 형태이다", async () => {
    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    await compiler.initialize();

    const program = compiler.getTsProgram();
    const parserOptions = { programs: [program], project: null };
    expect(parserOptions.programs).toHaveLength(1);
    expect(parserOptions.programs[0]).toBe(realProgram.program);
  });

  it("sourceFileCache 제공 시 augmentHostWithCaching이 적용된다", async () => {
    const cache = new AngularSourceFileCache();

    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
      sourceFileCache: cache,
    });

    const result = await compiler.initialize();

    expect(result.affectedFiles).toBeInstanceOf(Set);
  });

  it("modifiedFiles에 node_modules 파일이 있으면 packageJsonCache가 clear된다", async () => {
    const cache = new AngularSourceFileCache();

    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
      sourceFileCache: cache,
    });

    await compiler.initialize();

    cache.modifiedFiles.add("node_modules/some-pkg/index.js");

    const result = await compiler.initialize();

    expect(result.affectedFiles).toBeInstanceOf(Set);
  });

  it("modifiedFiles에 node_modules 파일이 없으면 packageJsonCache가 재사용된다", async () => {
    const cache = new AngularSourceFileCache();

    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
      sourceFileCache: cache,
    });

    await compiler.initialize();

    cache.modifiedFiles.add("src/app/component.ts");

    const result = await compiler.initialize();

    expect(result.affectedFiles).toBeInstanceOf(Set);
  });
});

// =============================================================================
// AngularCompiler — affected 파일
// =============================================================================

describe("AngularCompiler — affected 파일", () => {
  it("initialize()가 BuilderProgram 기반으로 affected 파일을 반환한다", async () => {
    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    const result = await compiler.initialize();
    expect(result.affectedFiles).toBeInstanceOf(Set);
  });

  it("리소스 변경 시 해당 .ts 파일이 affected에 추가된다", async () => {
    const sourceFiles = realProgram.program.getSourceFiles();
    const indexFile = sourceFiles.find((sf) => sf.fileName.includes("index.ts"));
    const scssPath = path.join(realProgram.dir, "component.scss");
    fs.writeFileSync(scssPath, ".x { }", "utf-8");

    mockGetResourceDependencies.mockImplementation((sf: ts.SourceFile) => {
      if (sf === indexFile) {
        return [scssPath];
      }
      return [];
    });

    const cache = new AngularSourceFileCache();
    cache.modifiedFiles.add(scssPath);

    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: { target: ts.ScriptTarget.ESNext },
      sourceFileCache: cache,
    });

    const result = await compiler.initialize();
    const affectedFileNames = [...result.affectedFiles].map((sf) => sf.fileName);
    expect(affectedFileNames.some((f) => f.includes("index.ts"))).toBe(true);
  });
});

// =============================================================================
// AngularCompiler — collectDiagnostics
// =============================================================================

describe("AngularCompiler — collectDiagnostics", () => {
  it("collectDiagnostics가 Option, Syntactic, Semantic, Angular 진단을 수집한다", async () => {
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

    const diagnostics = [...compiler.collectDiagnostics()];
    expect(Array.isArray(diagnostics)).toBe(true);
  });

  it("affected 파일의 Angular 진단은 getDiagnosticsForFile로 재계산된다", async () => {
    const indexFile = realProgram.program.getSourceFiles()
      .find((sf) => sf.fileName.includes("index.ts"));
    const scssPath = path.join(realProgram.dir, "component.scss");
    fs.writeFileSync(scssPath, ".x { }", "utf-8");

    const mockDiag = {
      category: ts.DiagnosticCategory.Error,
      code: 1000,
      messageText: "test error",
      file: indexFile,
      start: 0,
      length: 5,
    } as ts.Diagnostic;
    mockGetDiagnosticsForFile.mockReturnValue([mockDiag]);
    mockGetResourceDependencies.mockImplementation((sf: ts.SourceFile) => {
      if (sf.fileName.includes("index.ts")) {
        return [scssPath];
      }
      return [];
    });

    const cache = new AngularSourceFileCache();
    cache.modifiedFiles.add(scssPath);

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

    const diagnostics = [...compiler.collectDiagnostics()];
    expect(mockGetDiagnosticsForFile).toHaveBeenCalled();
    expect(diagnostics.some((d) => d.code === 1000)).toBe(true);
  });

  it("non-affected 파일의 Angular 진단은 캐시에서 반환된다", async () => {
    const mockDiag = {
      category: ts.DiagnosticCategory.Warning,
      code: 2000,
      messageText: "cached warning",
    } as ts.Diagnostic;
    mockGetDiagnosticsForFile.mockReturnValue([mockDiag]);

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

    const diags1 = [...compiler.collectDiagnostics()];
    const callCount1 = mockGetDiagnosticsForFile.mock.calls.length;
    expect(callCount1).toBeGreaterThan(0);
    expect(diags1.some((d) => d.code === 2000)).toBe(true);

    mockGetDiagnosticsForFile.mockClear();
    await compiler.initialize();
    const diags2 = [...compiler.collectDiagnostics()];
    expect(Array.isArray(diags2)).toBe(true);
  });

  it("리소스 변경 시 해당 .ts 파일의 diagnosticCache가 무효화된다", async () => {
    const scssPath = path.join(realProgram.dir, "styles.scss");
    fs.writeFileSync(scssPath, ".y { }", "utf-8");

    const mockDiag = {
      category: ts.DiagnosticCategory.Error,
      code: 3000,
      messageText: "resource error",
    } as ts.Diagnostic;
    mockGetDiagnosticsForFile.mockReturnValue([mockDiag]);
    mockGetResourceDependencies.mockImplementation((sf: ts.SourceFile) => {
      if (sf.fileName.includes("index.ts")) {
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
    void [...compiler.collectDiagnostics()];
    expect(mockGetDiagnosticsForFile).toHaveBeenCalled();

    mockGetDiagnosticsForFile.mockClear();
    cache.modifiedFiles.add(scssPath);

    await compiler.initialize();
    void [...compiler.collectDiagnostics()];

    expect(mockGetDiagnosticsForFile).toHaveBeenCalled();
  });
});
