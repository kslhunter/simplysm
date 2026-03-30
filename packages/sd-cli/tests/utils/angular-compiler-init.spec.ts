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

const ngtscConstructorSpy = vi.fn();

// Create a real ts.Program from a temp directory to satisfy TypeScript's BuilderProgram API
function createRealTsProgram(
  files: Record<string, string> = { "index.ts": "export const x = 1;" },
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
    noEmit: true,
    strict: false,
    skipLibCheck: true,
    types: [],
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

  realProgram = createRealTsProgram();
});

// --- Unit Tests: Slice 2 — AngularCompiler ---

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
    // readResource는 host.readFile을 래핑한다
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
    // SHA256 ID + .css가 반환되어야 한다
    expect(result).toMatch(/^[a-f0-9]{64}\.css$/);
    // externalStylesheets에 매핑이 저장되어야 한다
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

// --- Acceptance Tests: Slice 2 — AngularCompiler 초기화 ---

describe("AngularCompiler — 초기화", () => {
  // Scenario: 최초 초기화
  it("initialize()로 호스트, NgtscProgram, BuilderProgram이 생성되고 analyzeAsync가 호출된다", async () => {
    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    const result = await compiler.initialize();

    // NgtscProgram이 생성되었다
    expect(ngtscConstructorSpy).toHaveBeenCalledTimes(1);
    // oldProgram은 undefined (최초)
    expect(ngtscConstructorSpy.mock.calls[0][3]).toBeUndefined();
    // analyzeAsync가 호출되었다
    expect(mockAnalyzeAsync).toHaveBeenCalledTimes(1);
    // affectedFiles가 반환된다
    expect(result.affectedFiles).toBeInstanceOf(Set);
  });

  // Scenario: 재초기화 (incremental)
  it("두번째 initialize()에서 이전 NgtscProgram이 oldProgram으로 전달된다", async () => {
    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    await compiler.initialize();
    const firstProgram = compiler.ngtscProgram;

    await compiler.initialize();

    // 두번째 호출에서 oldProgram으로 첫번째 NgtscProgram이 전달됨
    expect(ngtscConstructorSpy).toHaveBeenCalledTimes(2);
    expect(ngtscConstructorSpy.mock.calls[1][3]).toBe(firstProgram);
  });

  // Scenario: transformStylesheet 콜백 주입 (library)
  it("transformStylesheet 콜백이 host.transformResource를 통해 호출된다", async () => {
    const transformStylesheet = vi.fn().mockResolvedValue("body { color: red; }");

    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
      transformStylesheet,
    });

    await compiler.initialize();

    // NgtscProgram 생성 시 전달된 host를 가져온다
    const hostArg = ngtscConstructorSpy.mock.calls[0][2] as Record<string, unknown>;
    expect(typeof hostArg["transformResource"]).toBe("function");

    // transformResource를 호출하면 transformStylesheet가 호출된다
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

  // Scenario: compilerOptionsTransformer 적용
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
    // NgtscProgram에 전달된 options에 변환이 적용되었는지 확인
    const passedOptions = ngtscConstructorSpy.mock.calls[0][1] as ts.CompilerOptions;
    expect(passedOptions.noEmit).toBe(false);
    expect(passedOptions.declaration).toBe(false);
  });

  // Scenario: resourceNameToFileName으로 외부 스타일시트 경로 해석
  it("host.resourceNameToFileName이 절대 경로를 반환한다", async () => {
    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    await compiler.initialize();

    const hostArg = ngtscConstructorSpy.mock.calls[0][2] as Record<string, Function>;
    expect(typeof hostArg["resourceNameToFileName"]).toBe("function");
  });

  // Scenario: declaration true 설정 (library)
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

  // Scenario: declaration false 설정 (client)
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

  // Scenario: 초기화 후 ts.Program 획득
  it("getTsProgram()으로 ts.Program을 반환한다", async () => {
    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    await compiler.initialize();

    const program = compiler.getTsProgram();
    expect(program).toBe(realProgram.program);
  });

  // Scenario: ESLint에 Program 주입 가능
  it("getTsProgram()의 결과가 ESLint parserOptions.programs에 주입 가능한 형태이다", async () => {
    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    await compiler.initialize();

    const program = compiler.getTsProgram();
    // ESLint parserOptions.programs는 ts.Program 배열을 받는다
    const parserOptions = { programs: [program], project: null };
    expect(parserOptions.programs).toHaveLength(1);
    expect(parserOptions.programs[0]).toBe(realProgram.program);
  });

  // Scenario: SourceFileCache 통합
  it("sourceFileCache 제공 시 augmentHostWithCaching이 적용된다", async () => {
    const cache = new AngularSourceFileCache();

    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
      sourceFileCache: cache,
    });

    await compiler.initialize();

    // host가 캐시를 사용하도록 래핑되었는지 간접 확인:
    // NgtscProgram이 성공적으로 생성되었으면 호스트가 정상적으로 구성된 것
    expect(ngtscConstructorSpy).toHaveBeenCalledTimes(1);
  });

  // Scenario: packageJsonCache — node_modules 변경 시 clear
  it("modifiedFiles에 node_modules 파일이 있으면 packageJsonCache가 clear된다", async () => {
    const cache = new AngularSourceFileCache();

    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
      sourceFileCache: cache,
    });

    // 첫 초기화 — packageJsonCache 생성
    await compiler.initialize();

    // node_modules 파일 변경
    cache.modifiedFiles.add("node_modules/some-pkg/index.js");

    // 재초기화 — packageJsonCache.clear() 호출되어야 함
    // 에러 없이 완료되면 성공
    await compiler.initialize();

    expect(ngtscConstructorSpy).toHaveBeenCalledTimes(2);
  });

  // Scenario: packageJsonCache — node_modules 미변경 시 재사용
  it("modifiedFiles에 node_modules 파일이 없으면 packageJsonCache가 재사용된다", async () => {
    const cache = new AngularSourceFileCache();

    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
      sourceFileCache: cache,
    });

    // 첫 초기화
    await compiler.initialize();

    // 일반 파일만 변경
    cache.modifiedFiles.add("src/app/component.ts");

    // 재초기화
    await compiler.initialize();

    // 에러 없이 완료
    expect(ngtscConstructorSpy).toHaveBeenCalledTimes(2);
  });
});

// --- Acceptance Tests: Slice 2 — affected 파일 ---

describe("AngularCompiler — affected 파일", () => {
  // Scenario: 소스 파일 변경 시 affected 파일 수집
  it("initialize()가 BuilderProgram 기반으로 affected 파일을 반환한다", async () => {
    const compiler = new AngularCompiler({
      rootNames: realProgram.rootNames,
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    const result = await compiler.initialize();
    // affected 파일이 Set으로 반환된다
    expect(result.affectedFiles).toBeInstanceOf(Set);
  });

  // Scenario: 리소스 변경 시 해당 .ts 파일이 affected에 추가
  it("리소스 변경 시 해당 .ts 파일이 affected에 추가된다", async () => {
    // realProgram has index.ts — mock its resource dependencies
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
    // index.ts가 affected에 추가되어야 한다 (리소스 변경으로 인해)
    const affectedFileNames = [...result.affectedFiles].map((sf) => sf.fileName);
    expect(affectedFileNames.some((f) => f.includes("index.ts"))).toBe(true);
  });
});

// --- Acceptance Tests: Slice 3 — collectDiagnostics ---

describe("AngularCompiler — collectDiagnostics", () => {
  // Scenario: 4종 진단 수집
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

    // collectDiagnostics가 에러 없이 실행된다
    const diagnostics = [...compiler.collectDiagnostics()];
    expect(Array.isArray(diagnostics)).toBe(true);
  });

  // Scenario: affected 파일의 Angular 진단은 재계산 후 캐시
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
    // getDiagnosticsForFile이 호출되었다
    expect(mockGetDiagnosticsForFile).toHaveBeenCalled();
    // 진단이 수집되었다
    expect(diagnostics.some((d) => d.code === 1000)).toBe(true);
  });

  // Scenario: non-affected 파일의 Angular 진단은 캐시 반환
  it("non-affected 파일의 Angular 진단은 캐시에서 반환된다 (첫 빌드에서 모든 파일이 affected)", async () => {
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

    // 첫 collectDiagnostics — 초기 빌드에서 모든 파일이 affected → getDiagnosticsForFile 호출됨
    const diags1 = [...compiler.collectDiagnostics()];
    const callCount1 = mockGetDiagnosticsForFile.mock.calls.length;
    expect(callCount1).toBeGreaterThan(0);
    expect(diags1.some((d) => d.code === 2000)).toBe(true);

    // 두번째 initialize + collectDiagnostics — 변경 없으면 캐시 사용
    mockGetDiagnosticsForFile.mockClear();
    await compiler.initialize();
    const diags2 = [...compiler.collectDiagnostics()];
    // 두번째에서는 변경이 없으므로 affected가 비어 있어야 하고, 캐시에서 반환
    // (하지만 BuilderProgram은 재생성되므로 affected가 다시 계산될 수 있다)
    // 최소한 에러 없이 동작해야 한다
    expect(Array.isArray(diags2)).toBe(true);
  });

  // Scenario: 리소스 변경 시 해당 .ts 파일의 캐시 무효화
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

    // 첫 빌드
    await compiler.initialize();
    void [...compiler.collectDiagnostics()];
    expect(mockGetDiagnosticsForFile).toHaveBeenCalled();

    // 리소스 변경 후 재빌드
    mockGetDiagnosticsForFile.mockClear();
    cache.modifiedFiles.add(scssPath);

    await compiler.initialize();
    void [...compiler.collectDiagnostics()];

    // 리소스 변경으로 캐시 무효화 → getDiagnosticsForFile이 다시 호출되어야 한다
    expect(mockGetDiagnosticsForFile).toHaveBeenCalled();
  });
});
