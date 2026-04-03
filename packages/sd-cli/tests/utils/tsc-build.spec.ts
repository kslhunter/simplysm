import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";
import type ts from "typescript";

// Mocks

const PKG_DIR = path.resolve("/pkg");
const SRC_DIR = path.join(PKG_DIR, "src");
const SRC_INDEX = path.join(SRC_DIR, "index.ts");
const SRC_UTIL = path.join(SRC_DIR, "util.ts");
const TEST_INDEX = path.join(PKG_DIR, "tests", "index.spec.ts");

const mockParsedConfig: ts.ParsedCommandLine = {
  options: { target: 1, module: 99, strict: true },
  fileNames: [SRC_INDEX, SRC_UTIL, TEST_INDEX],
  errors: [],
};

const mockGetCompilerOptionsForEnv = vi.fn(
  (baseOptions: ts.CompilerOptions, _env: string, _pkgDir: string) => ({
    ...baseOptions,
    __envApplied: true,
  }),
);

vi.mock("../../src/utils/tsconfig", () => ({
  parseTsconfig: vi.fn(() => mockParsedConfig),
  getPackageSourceFiles: vi.fn(() => [SRC_INDEX, SRC_UTIL]),
  getPackageFiles: vi.fn(() => [SRC_INDEX, SRC_UTIL, TEST_INDEX]),
  getCompilerOptionsForEnv: (baseOptions: ts.CompilerOptions, env: string, pkgDir: string) => mockGetCompilerOptionsForEnv(baseOptions, env, pkgDir),
}));

const mockRewritePath = vi.fn(
  (fileName: string, content: string) => [fileName, content] as [string, string],
);
vi.mock("../../src/utils/output-path-rewriter", () => ({
  createOutputPathRewriter: vi.fn(() => mockRewritePath),
  addJsExtensionToImports: vi.fn((text: string) => text + "/* js-ext-applied */"),
}));

vi.mock("../../src/utils/typecheck-serialization", () => ({
  serializeDiagnostic: vi.fn((d: any) => ({ code: d.code, category: d.category })),
}));

vi.mock("@simplysm/core-node", () => ({
  pathx: {
    isChildPath: vi.fn((filePath: string, parentDir: string) => filePath.startsWith(parentDir)),
    posix: vi.fn((p: string) => p.replace(/\\/g, "/")),
  },
}));

let mockEmitResult: { diagnostics: ts.Diagnostic[] };
let mockTsProgram: Record<string, unknown>;
let mockProgram: {
  emit: ReturnType<typeof vi.fn>;
  getConfigFileParsingDiagnostics: ReturnType<typeof vi.fn>;
  getSyntacticDiagnostics: ReturnType<typeof vi.fn>;
  getOptionsDiagnostics: ReturnType<typeof vi.fn>;
  getGlobalDiagnostics: ReturnType<typeof vi.fn>;
  getSemanticDiagnostics: ReturnType<typeof vi.fn>;
  getSemanticDiagnosticsOfNextAffectedFile: ReturnType<typeof vi.fn>;
  getProgram: ReturnType<typeof vi.fn>;
};
let capturedOptions: ts.CompilerOptions | undefined;
let capturedHost: any;

vi.mock("typescript", () => {
  const DiagnosticCategory = { Warning: 0, Error: 1, Suggestion: 2, Message: 3 };
  return {
    default: {
      DiagnosticCategory,
      createIncrementalCompilerHost: vi.fn((options: ts.CompilerOptions) => {
        capturedOptions = options;
        capturedHost = { writeFile: vi.fn() };
        return capturedHost;
      }),
      createEmitAndSemanticDiagnosticsBuilderProgram: vi.fn(() => mockProgram),
      flattenDiagnosticMessageText: vi.fn((msg: string) => msg),
    },
  };
});

describe("runTscPackageBuild", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    capturedOptions = undefined;
    capturedHost = undefined;
    mockEmitResult = { diagnostics: [] };
    mockTsProgram = { __isTsProgram: true };
    mockProgram = {
      emit: vi.fn(() => mockEmitResult),
      getConfigFileParsingDiagnostics: vi.fn(() => []),
      getSyntacticDiagnostics: vi.fn(() => []),
      getOptionsDiagnostics: vi.fn(() => []),
      getGlobalDiagnostics: vi.fn(() => []),
      getSemanticDiagnostics: vi.fn(() => []),
      getSemanticDiagnosticsOfNextAffectedFile: vi.fn(() => undefined),
      getProgram: vi.fn(() => mockTsProgram),
    };
  });

  // Acceptance: Scenario "JS + DTS 모두 emit"
  it("output {js:true, dts:true} sets JS+DTS compilerOptions", async () => {
    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    const result = runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: true, dts: true },
    });

    expect(result.success).toBe(true);
    expect(capturedOptions!.noEmit).toBe(false);
    expect(capturedOptions!.declaration).toBe(true);
    expect(capturedOptions!.declarationMap).toBe(true);
    expect(capturedOptions!.emitDeclarationOnly).toBe(false);
    expect(capturedOptions!.sourceMap).toBe(true);
    expect(capturedOptions!.outDir).toBe(path.join(PKG_DIR, "dist"));
  });

  // Acceptance: Scenario "JS만 emit"
  it("output {js:true, dts:false} sets JS-only compilerOptions", async () => {
    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: true, dts: false },
    });

    expect(capturedOptions!.noEmit).toBe(false);
    expect(capturedOptions!.declaration).toBe(false);
    expect(capturedOptions!.declarationMap).toBe(false);
    expect(capturedOptions!.emitDeclarationOnly).toBe(false);
    expect(capturedOptions!.sourceMap).toBe(true);
    expect(capturedOptions!.outDir).toBe(path.join(PKG_DIR, "dist"));
  });

  // Acceptance: Scenario "DTS만 emit"
  it("output {js:false, dts:true} sets DTS-only compilerOptions", async () => {
    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: false, dts: true },
    });

    expect(capturedOptions!.noEmit).toBe(false);
    expect(capturedOptions!.declaration).toBe(true);
    expect(capturedOptions!.declarationMap).toBe(true);
    expect(capturedOptions!.emitDeclarationOnly).toBe(true);
    expect(capturedOptions!.sourceMap).toBe(false);
    expect(capturedOptions!.outDir).toBe(path.join(PKG_DIR, "dist"));
  });

  // Acceptance: Scenario "typecheck만 실행 (emit 없음)"
  it("output {js:false, dts:false} sets noEmit compilerOptions", async () => {
    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: false, dts: false },
    });

    expect(capturedOptions!.noEmit).toBe(true);
    expect(capturedOptions!.declaration).toBe(false);
    expect(capturedOptions!.declarationMap).toBe(false);
  });

  // Unit: emit modes use src files, typecheck uses all files
  it("emit mode uses only source files as rootNames", async () => {
    const tsModule = await import("typescript");
    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");

    runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: true, dts: true },
    });

    // createEmitAndSemanticDiagnosticsBuilderProgram(rootNames, options, host, oldBuilderProgram)
    expect(vi.mocked(tsModule.default.createEmitAndSemanticDiagnosticsBuilderProgram)).toHaveBeenCalledWith(
      [SRC_INDEX, SRC_UTIL],
      expect.any(Object),
      expect.any(Object),
      undefined,
    );
  });

  it("typecheck mode without includeTests uses only source files as rootNames", async () => {
    const tsModule = await import("typescript");
    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");

    runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: false, dts: false },
    });

    expect(vi.mocked(tsModule.default.createEmitAndSemanticDiagnosticsBuilderProgram)).toHaveBeenCalledWith(
      [SRC_INDEX, SRC_UTIL],
      expect.any(Object),
      expect.any(Object),
      undefined,
    );
  });

  it("typecheck mode with includeTests uses all package files as rootNames", async () => {
    const tsModule = await import("typescript");
    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");

    runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: false, dts: false },
      includeTests: true,
    });

    expect(vi.mocked(tsModule.default.createEmitAndSemanticDiagnosticsBuilderProgram)).toHaveBeenCalledWith(
      [SRC_INDEX, SRC_UTIL, TEST_INDEX],
      expect.any(Object),
      expect.any(Object),
      undefined,
    );
  });

  // Unit: tsBuildInfoFile path differs by emit vs typecheck
  it("emit mode uses build.tsbuildinfo", async () => {
    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: true, dts: true },
    });
    expect(capturedOptions!.tsBuildInfoFile).toBe(path.join(PKG_DIR, ".cache", "build.tsbuildinfo"));
  });

  it("typecheck mode uses typecheck.tsbuildinfo", async () => {
    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: false, dts: false },
    });
    expect(capturedOptions!.tsBuildInfoFile).toBe(path.join(PKG_DIR, ".cache", "typecheck.tsbuildinfo"));
  });

  // Unit: path rewriter is applied in emit modes
  it("applies path rewriter in emit mode", async () => {
    const { createOutputPathRewriter } = await import("../../src/utils/output-path-rewriter");
    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");

    runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: true, dts: true },
    });
    expect(createOutputPathRewriter).toHaveBeenCalledWith(PKG_DIR);
  });

  it("does not apply path rewriter in typecheck mode", async () => {
    const { createOutputPathRewriter } = await import("../../src/utils/output-path-rewriter");
    vi.mocked(createOutputPathRewriter).mockClear();

    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: false, dts: false },
    });
    expect(createOutputPathRewriter).not.toHaveBeenCalled();
  });

  // Unit: JS extension rewriter is applied to .js files in writeFile hook
  it("applies addJsExtensionToImports for .js files via writeFile hook", async () => {
    const { addJsExtensionToImports } = await import("../../src/utils/output-path-rewriter");
    vi.mocked(addJsExtensionToImports).mockClear();
    mockRewritePath.mockImplementation(
      (fileName: string, content: string) => [fileName, content] as [string, string],
    );

    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: true, dts: true },
    });

    // Simulate writeFile call with a .js file
    const hookedWriteFile = capturedHost.writeFile;
    hookedWriteFile("dist/index.js", 'import { x } from "./foo";', false);

    expect(addJsExtensionToImports).toHaveBeenCalledWith('import { x } from "./foo";');
  });

  it("does not apply addJsExtensionToImports for .d.ts files", async () => {
    const { addJsExtensionToImports } = await import("../../src/utils/output-path-rewriter");
    vi.mocked(addJsExtensionToImports).mockClear();
    mockRewritePath.mockImplementation(
      (fileName: string, content: string) => [fileName, content] as [string, string],
    );

    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: false, dts: true },
    });

    // Simulate writeFile call with a .d.ts file
    const hookedWriteFile = capturedHost.writeFile;
    hookedWriteFile("dist/index.d.ts", 'import type { x } from "./foo";', false);

    expect(addJsExtensionToImports).not.toHaveBeenCalled();
  });

  // Unit: diagnostics are collected and returned
  it("collects error diagnostics and returns failure", async () => {
    const errorDiag: Partial<ts.Diagnostic> = {
      category: 1, // Error
      code: 2345,
      messageText: "Type 'string' is not assignable to type 'number'",
      file: { fileName: SRC_INDEX, getLineAndCharacterOfPosition: () => ({ line: 5, character: 10 }) } as any,
      start: 100,
    };
    mockProgram.getSemanticDiagnostics.mockReturnValue([errorDiag]);

    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    const result = runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: true, dts: true },
    });

    expect(result.success).toBe(false);
    expect(result.errorCount).toBe(1);
    expect(result.errors![0]).toContain("TS2345");
  });

  // Unit: includes workspace diagnostics, excludes node_modules
  it("includes workspace diagnostics and excludes node_modules", async () => {
    const CWD = path.resolve("/");
    const ownDiag: Partial<ts.Diagnostic> = {
      category: 1,
      code: 1001,
      messageText: "own error",
      file: { fileName: SRC_INDEX, getLineAndCharacterOfPosition: () => ({ line: 0, character: 0 }) } as any,
      start: 0,
    };
    const depDiag: Partial<ts.Diagnostic> = {
      category: 1,
      code: 1003,
      messageText: "workspace dep error",
      file: { fileName: path.join(CWD, "other-pkg", "src", "index.ts"), getLineAndCharacterOfPosition: () => ({ line: 0, character: 0 }) } as any,
      start: 0,
    };
    const nodeModulesDiag: Partial<ts.Diagnostic> = {
      category: 1,
      code: 1002,
      messageText: "node_modules error",
      file: { fileName: path.join(CWD, "node_modules", "dep", "index.ts"), getLineAndCharacterOfPosition: () => ({ line: 0, character: 0 }) } as any,
      start: 0,
    };
    mockProgram.getSemanticDiagnostics.mockReturnValue([ownDiag, depDiag, nodeModulesDiag]);

    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    const result = runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: CWD,
      output: { js: true, dts: true },
    });

    // Workspace diagnostics included (own + dep), node_modules excluded
    expect(result.errorCount).toBe(2);
    expect(result.errors![0]).toContain("TS1001");
    expect(result.errors![1]).toContain("TS1003");
  });

  // Unit: parsedConfig passed → skips parseTsconfig
  it("uses provided parsedConfig instead of calling parseTsconfig", async () => {
    const { parseTsconfig } = await import("../../src/utils/tsconfig");
    vi.mocked(parseTsconfig).mockClear();

    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: true, dts: true },
      parsedConfig: mockParsedConfig as any,
    });

    expect(parseTsconfig).not.toHaveBeenCalled();
  });

  // Unit: exception handling
  it("returns error result on exception", async () => {
    const { parseTsconfig } = await import("../../src/utils/tsconfig");
    vi.mocked(parseTsconfig).mockImplementationOnce(() => { throw new Error("tsconfig not found"); });

    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    const result = runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: true, dts: true },
    });

    expect(result.success).toBe(false);
    expect(result.errorCount).toBe(1);
    expect(result.errors![0]).toBe("tsconfig not found");
  });

  // Acceptance: Scenario "build 시 패키지 tsconfig의 lib/types 유지" (env 미설정)
  it("does not call getCompilerOptionsForEnv when env is not set", async () => {
    mockGetCompilerOptionsForEnv.mockClear();

    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: true, dts: true },
    });

    expect(mockGetCompilerOptionsForEnv).not.toHaveBeenCalled();
  });

  // Acceptance: Scenario "typecheck 명령에서만 env 조작"
  it("calls getCompilerOptionsForEnv when env is set", async () => {
    mockGetCompilerOptionsForEnv.mockClear();

    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: false, dts: false },
      env: "node",
    });

    expect(mockGetCompilerOptionsForEnv).toHaveBeenCalledWith(
      mockParsedConfig.options,
      "node",
      PKG_DIR,
    );
  });

  // Unit: env-adjusted options are used in compilerOptions
  it("uses env-adjusted options as base for compilerOptions", async () => {
    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: false, dts: false },
      env: "browser",
    });

    expect((capturedOptions as any).__envApplied).toBe(true);
  });

  // Unit: tsBuildInfoFile includes env suffix for typecheck mode
  it("uses typecheck-node.tsbuildinfo when env is node", async () => {
    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: false, dts: false },
      env: "node",
    });
    expect(capturedOptions!.tsBuildInfoFile).toBe(
      path.join(PKG_DIR, ".cache", "typecheck-node.tsbuildinfo"),
    );
  });

  it("uses typecheck-browser.tsbuildinfo when env is browser", async () => {
    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: false, dts: false },
      env: "browser",
    });
    expect(capturedOptions!.tsBuildInfoFile).toBe(
      path.join(PKG_DIR, ".cache", "typecheck-browser.tsbuildinfo"),
    );
  });

  // Unit: env suffix IS applied in emit mode (distinguishes build artifacts by env)
  it("adds env suffix to tsBuildInfoFile in emit mode", async () => {
    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: true, dts: true },
      env: "node",
    });
    expect(capturedOptions!.tsBuildInfoFile).toBe(
      path.join(PKG_DIR, ".cache", "build-node.tsbuildinfo"),
    );
  });

  // Acceptance: Scenario "tsc-build exposes affected files for incremental lint"
  it("returns affectedFiles set from builder program diagnostics iteration", async () => {
    // Set up builder program mock to return affected files via getSemanticDiagnosticsOfNextAffectedFile
    const affectedFile1 = { fileName: SRC_INDEX } as any;
    const affectedFile2 = { fileName: SRC_UTIL } as any;
    let callCount = 0;
    mockProgram.getSemanticDiagnosticsOfNextAffectedFile = vi.fn(() => {
      callCount++;
      if (callCount === 1) return { affected: affectedFile1, result: [] };
      if (callCount === 2) return { affected: affectedFile2, result: [] };
      return undefined;
    });

    const { runTscPackageBuild } = await import("../../src/utils/tsc-build");
    const result = runTscPackageBuild({
      pkgDir: PKG_DIR,
      cwd: path.resolve("/"),
      output: { js: true, dts: true },
    });

    expect(result.affectedFiles).toBeDefined();
    expect(result.affectedFiles!.has(SRC_INDEX.replace(/\\/g, "/"))).toBe(true);
    expect(result.affectedFiles!.has(SRC_UTIL.replace(/\\/g, "/"))).toBe(true);
  });

});
