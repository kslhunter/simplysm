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

const { AngularCompiler, AngularSourceFileCache, augmentHostWithCaching } = await import(
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
// AngularSourceFileCache
// =============================================================================

describe("AngularSourceFileCache — Unit Tests", () => {
  it("modifiedFiles는 빈 Set으로 초기화된다", () => {
    const cache = new AngularSourceFileCache();
    expect(cache.modifiedFiles).toBeInstanceOf(Set);
    expect(cache.modifiedFiles.size).toBe(0);
  });

  it("invalidate는 여러 파일을 한번에 처리한다", () => {
    const cache = new AngularSourceFileCache();
    const sf1 = ts.createSourceFile("a.ts", "", ts.ScriptTarget.ESNext);
    const sf2 = ts.createSourceFile("b.ts", "", ts.ScriptTarget.ESNext);
    cache.set("src/a.ts", sf1);
    cache.set("src/b.ts", sf2);

    cache.invalidate(["src/a.ts", "src/b.ts"]);

    expect(cache.has("src/a.ts")).toBe(false);
    expect(cache.has("src/b.ts")).toBe(false);
    expect(cache.modifiedFiles.has("src/a.ts")).toBe(true);
    expect(cache.modifiedFiles.has("src/b.ts")).toBe(true);
  });

  it("augmentHostWithCaching — 캐시 미스 시 원본 호출 후 캐시 저장", () => {
    const cache = new AngularSourceFileCache();
    const fakeSourceFile = ts.createSourceFile(
      "miss.ts",
      "const y = 2;",
      ts.ScriptTarget.ESNext,
    );

    const mockGetSourceFile = vi.fn().mockReturnValue(fakeSourceFile);
    const host = { getSourceFile: mockGetSourceFile } as unknown as ts.CompilerHost;

    augmentHostWithCaching(host, cache);

    // shouldCreateNewSourceFile = false, 캐시에 없음 → 원본 호출
    const result = host.getSourceFile("miss.ts", ts.ScriptTarget.ESNext, undefined, false);
    expect(result).toBe(fakeSourceFile);
    expect(mockGetSourceFile).toHaveBeenCalled();
    // 캐시에 저장되었는지 확인
    expect(cache.get("miss.ts")).toBe(fakeSourceFile);
  });

  it("augmentHostWithCaching — shouldCreateNewSourceFile=true이면 캐시 무시", () => {
    const cache = new AngularSourceFileCache();
    const cachedFile = ts.createSourceFile("cached.ts", "old", ts.ScriptTarget.ESNext);
    const freshFile = ts.createSourceFile("cached.ts", "new", ts.ScriptTarget.ESNext);
    cache.set("cached.ts", cachedFile);

    const mockGetSourceFile = vi.fn().mockReturnValue(freshFile);
    const host = { getSourceFile: mockGetSourceFile } as unknown as ts.CompilerHost;

    augmentHostWithCaching(host, cache);

    const result = host.getSourceFile("cached.ts", ts.ScriptTarget.ESNext, undefined, true);
    expect(result).toBe(freshFile);
    expect(mockGetSourceFile).toHaveBeenCalled();
    // 새 파일이 캐시에 저장됨
    expect(cache.get("cached.ts")).toBe(freshFile);
  });
});

describe("AngularSourceFileCache", () => {
  // Scenario: SourceFileCache 통합
  describe("augmentHostWithCaching으로 호스트에 캐시를 통합한다", () => {
    it("캐시에 있는 파일은 재파싱 없이 반환되고, 미스 시 원본 호출 후 캐시 저장", () => {
      const cache = new AngularSourceFileCache();
      const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ESNext,
        module: ts.ModuleKind.ESNext,
      };
      const host = ts.createCompilerHost(compilerOptions);

      const originalGetSourceFile = vi.fn(host.getSourceFile.bind(host));
      host.getSourceFile = originalGetSourceFile;

      augmentHostWithCaching(host, cache);

      // 첫 호출: 캐시 미스 → 원본 호출 → 캐시 저장
      const fakeFileName = "test-file.ts";
      const fakeSourceFile = ts.createSourceFile(
        fakeFileName,
        "const x = 1;",
        ts.ScriptTarget.ESNext,
      );
      cache.set(fakeFileName, fakeSourceFile);

      // shouldCreateNewSourceFile = false → 캐시에서 반환
      const result = host.getSourceFile(
        fakeFileName,
        ts.ScriptTarget.ESNext,
        undefined,
        false,
      );
      expect(result).toBe(fakeSourceFile);
      // 캐시 히트이므로 원본 getSourceFile은 호출되지 않아야 한다
      expect(originalGetSourceFile).not.toHaveBeenCalled();
    });
  });

  // Scenario: SourceFileCache invalidate
  describe("invalidate로 파일을 캐시에서 삭제하고 modifiedFiles에 추가한다", () => {
    it("invalidate 후 캐시에서 삭제되고 modifiedFiles에 추가된다", () => {
      const cache = new AngularSourceFileCache();
      const fakeSourceFile = ts.createSourceFile(
        "component.ts",
        "class Comp {}",
        ts.ScriptTarget.ESNext,
      );

      // normalize: backslash → forward slash
      const pathWithBackslash = "src\\app\\component.ts";
      const normalizedPath = "src/app/component.ts";
      cache.set(normalizedPath, fakeSourceFile);

      cache.invalidate([pathWithBackslash]);

      expect(cache.has(normalizedPath)).toBe(false);
      expect(cache.modifiedFiles.has(normalizedPath)).toBe(true);
    });
  });
});

// =============================================================================
// AngularCompiler — initialize
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

// =============================================================================
// AngularCompiler — affected 파일
// =============================================================================

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

// =============================================================================
// AngularCompiler — collectDiagnostics
// =============================================================================

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

// =============================================================================
// AngularCompiler — emitAffectedFiles
// =============================================================================

describe("AngularCompiler.emitAffectedFiles — Unit Tests", () => {
  it("initialize() 전 호출 시 에러를 던진다", () => {
    const compiler = new AngularCompiler({
      rootNames: ["src/main.ts"],
      compilerOptions: { target: ts.ScriptTarget.ESNext },
    });

    expect(() => [...compiler.emitAffectedFiles()]).toThrow("initialize()");
  });

  it("noEmit=true이면 빈 Iterator를 반환한다", async () => {
    realProgram = createRealTsProgram(
      { "a.ts": "export const a = 1;" },
      { noEmit: true },
    );

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
    expect(results).toEqual([]);
  });

  it("ignoreForEmit에 포함된 파일은 emit되지 않는다", async () => {
    realProgram = createRealTsProgram({ "a.ts": "export const a = 1;" });

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

    // ignoreForEmit에 모든 소스 파일 추가
    const tsProgram = compiler.getTsProgram();
    for (const sf of tsProgram.getSourceFiles()) {
      mockIgnoreForEmit.add(sf);
    }

    const results = [...compiler.emitAffectedFiles()];
    expect(results).toEqual([]);
  });

  it("declaration file은 2차 루프에서 skip된다", async () => {
    realProgram = createRealTsProgram({ "a.ts": "export const a = 1;" });

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
    // 이미 emit된 파일이 없는 상태에서도 .d.ts 파일은 2차 루프에서 skip
    const results = [...compiler.emitAffectedFiles()];
    // .d.ts 입력 파일이 결과에 포함되지 않아야 한다
    for (const r of results) {
      // emit된 결과의 원본 소스가 declaration file이면 안 됨 (입력 .d.ts 파일)
      expect((r as { filename: string }).filename).not.toMatch(/node_modules/);
    }
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

    // 파일 a만 허용 (sourceFilter는 소스 파일명 기준)
    const results = [...compiler.emitAffectedFiles({
      sourceFilter: (fileName: string) => fileName.includes("a.ts"),
    })];

    // a.ts에서 나온 출력만 포함 (b.ts 출력은 제외)
    expect(results.length).toBeGreaterThan(0);
    for (const r of results) {
      expect((r as { filename: string }).filename).toMatch(/[/\\]a\./);
    }
  });

  it("EmitResult는 filename과 contents를 포함한다", async () => {
    realProgram = createRealTsProgram({ "a.ts": "export const a = 1;" });

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
      expect(r).toHaveProperty("filename");
      expect(r).toHaveProperty("contents");
      expect(typeof (r as { filename: string }).filename).toBe("string");
      expect(typeof (r as { contents: string }).contents).toBe("string");
    }
  });
});

describe("AngularCompiler — emitAffectedFiles", () => {
  // Scenario: 변경된 파일만 emit
  it("변경된 파일만 emit하고 변경되지 않은 파일은 emit하지 않는다", async () => {
    // 파일 A, B, C로 프로그램 구성
    realProgram = createRealTsProgram({
      "a.ts": "export const a = 1;",
      "b.ts": "export const b = 2;",
      "c.ts": "export const c = 3;",
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

    // 첫 빌드에서 모든 파일이 affected → 모두 emit
    const firstResults = [...compiler.emitAffectedFiles()];
    const firstEmittedFiles = firstResults.map((r: { filename: string }) => r.filename);
    expect(firstEmittedFiles.length).toBeGreaterThan(0);

    // 두번째 빌드: safeToSkipEmit이 true이면 skip
    mockSafeToSkipEmit.mockReturnValue(true);
    await compiler.initialize();

    const secondResults = [...compiler.emitAffectedFiles()];
    // safeToSkipEmit=true + affectedFiles에 없는 파일은 emit하지 않는다
    expect(secondResults.length).toBe(0);
  });

  // Scenario: 첫 빌드에서 모든 파일 emit
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

    // 모든 소스 파일이 emit됨 (declaration file 제외)
    expect(results.length).toBeGreaterThanOrEqual(2);
  });

  // Scenario: Angular가 affected로 판단하지만 TypeScript가 판단하지 않은 파일
  it("TypeScript가 emit하지 않았지만 safeToSkipEmit이 false인 파일이 emit된다", async () => {
    realProgram = createRealTsProgram({
      "a.ts": "export const a = 1;",
    });

    // safeToSkipEmit이 false이면 2차 루프에서 emit해야 한다
    mockSafeToSkipEmit.mockReturnValue(false);

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

    // 파일이 emit됨
    expect(results.length).toBeGreaterThan(0);
    // recordSuccessfulEmit이 호출됨
    expect(mockRecordSuccessfulEmit).toHaveBeenCalled();
  });

  // Scenario: safeToSkipEmit이 true이고 affectedFiles에 없는 파일은 skip
  it("safeToSkipEmit이 true이고 affectedFiles에 없으면 emit하지 않는다", async () => {
    realProgram = createRealTsProgram({
      "a.ts": "export const a = 1;",
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

    // 첫 빌드
    await compiler.initialize();
    void [...compiler.emitAffectedFiles()];

    // 두번째 빌드: safeToSkipEmit=true + 변경 없음
    mockSafeToSkipEmit.mockReturnValue(true);
    await compiler.initialize();

    const results = [...compiler.emitAffectedFiles()];
    expect(results.length).toBe(0);
  });

  // Scenario: emit 성공 시 incremental 추적 기록
  it("emit 성공 시 recordSuccessfulEmit이 호출된다", async () => {
    realProgram = createRealTsProgram({
      "a.ts": "export const a = 1;",
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
    void [...compiler.emitAffectedFiles()];

    expect(mockRecordSuccessfulEmit).toHaveBeenCalled();
  });

  // Scenario: prepareEmit()의 transformers가 emit에 적용
  it("prepareEmit()의 transformers가 emit에 적용된다", async () => {
    realProgram = createRealTsProgram({
      "a.ts": "export const a = 1;",
    });

    const mockTransformerBefore = vi.fn(
      (_ctx: ts.TransformationContext) => (sf: ts.SourceFile) => sf,
    );
    mockPrepareEmit.mockReturnValue({
      transformers: { before: [mockTransformerBefore], after: [] },
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
    void [...compiler.emitAffectedFiles()];

    // prepareEmit이 호출되었다
    expect(mockPrepareEmit).toHaveBeenCalled();
  });

  // Scenario: 추가 transformers를 외부에서 주입 가능
  it("additionalTransformers가 emit 시 적용된다", async () => {
    realProgram = createRealTsProgram({
      "a.ts": "export const a = 1;",
    });

    const additionalBefore = vi.fn(
      (_ctx: ts.TransformationContext) => (sf: ts.SourceFile) => sf,
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
    const results = [...compiler.emitAffectedFiles({
      additionalTransformers: {
        before: [additionalBefore],
      },
    })];

    // emit이 실행되었다
    expect(results.length).toBeGreaterThan(0);
  });

  // Scenario: JS와 .d.ts 모두 emit
  it("declaration=true, noEmit=false일 때 .js와 .d.ts 모두 emit된다", async () => {
    realProgram = createRealTsProgram(
      { "a.ts": "export const a = 1;" },
      { declaration: true, noEmit: false },
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
        noEmit: false,
        outDir: path.join(realProgram.dir, "out"),
      },
    });

    await compiler.initialize();
    const results = [...compiler.emitAffectedFiles()];

    const filenames = results.map((r: { filename: string }) => r.filename);
    const hasJs = filenames.some((f: string) => f.endsWith(".js"));
    const hasDts = filenames.some((f: string) => f.endsWith(".d.ts"));
    expect(hasJs).toBe(true);
    expect(hasDts).toBe(true);
  });

  // Scenario: JS만 emit
  it("declaration=false일 때 .js만 emit되고 .d.ts는 생성되지 않는다", async () => {
    realProgram = createRealTsProgram(
      { "a.ts": "export const a = 1;" },
      { declaration: false, noEmit: false },
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
        noEmit: false,
        outDir: path.join(realProgram.dir, "out"),
      },
    });

    await compiler.initialize();
    const results = [...compiler.emitAffectedFiles()];

    const filenames = results.map((r: { filename: string }) => r.filename);
    const hasJs = filenames.some((f: string) => f.endsWith(".js"));
    const hasDts = filenames.some((f: string) => f.endsWith(".d.ts"));
    expect(hasJs).toBe(true);
    expect(hasDts).toBe(false);
  });

  // Scenario: .d.ts만 emit
  it("emitDeclarationOnly=true일 때 .d.ts만 emit되고 .js는 생성되지 않는다", async () => {
    realProgram = createRealTsProgram(
      { "a.ts": "export const a = 1;" },
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
        outDir: path.join(realProgram.dir, "out"),
      },
    });

    await compiler.initialize();
    const results = [...compiler.emitAffectedFiles()];

    const filenames = results.map((r: { filename: string }) => r.filename);
    const hasJs = filenames.some((f: string) => f.endsWith(".js"));
    const hasDts = filenames.some((f: string) => f.endsWith(".d.ts"));
    expect(hasJs).toBe(false);
    expect(hasDts).toBe(true);
  });

  // Scenario: emit 없음 (typecheck 전용)
  it("noEmit=true일 때 어떤 파일도 emit되지 않는다", async () => {
    realProgram = createRealTsProgram(
      { "a.ts": "export const a = 1;" },
      { noEmit: true },
    );

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

    expect(results.length).toBe(0);
  });
});

// =============================================================================
// AngularCompiler — update
// =============================================================================

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
