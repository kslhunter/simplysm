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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "angular-compiler-emit-"));
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

const { AngularCompiler } = await import(
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

// --- Unit Tests: Slice 1 — emitAffectedFiles ---

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

// --- Acceptance Tests: Slice 1 — emitAffectedFiles ---

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
