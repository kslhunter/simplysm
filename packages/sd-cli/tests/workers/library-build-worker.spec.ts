import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";

import * as coreNode from "@simplysm/core-node";
import * as collectDepsModule from "../../src/deps/replace-deps/collect-deps";
import * as sdTsCompilerMod from "../../src/ts-compiler/SdTsCompiler";
import * as ngtscBuildCore from "../../src/angular/ngtsc-build-core";
import * as sharedWorkerLifecycle from "../../src/workers/shared-worker-lifecycle";

let workerFns: Record<string, (...args: any[]) => any>;
let mockSend: ReturnType<typeof vi.fn>;

const mockOnChange = vi.fn();
const mockWatcherClose = vi.fn();

const mockCompileAsync = vi.fn();
const mockSideEffectScssRegistry = new Map();
const MockSdTsCompiler = vi.fn().mockImplementation(function (this: any) {
  this.compileAsync = mockCompileAsync;
  this.sideEffectScssRegistry = mockSideEffectScssRegistry;
});
vi.spyOn(sdTsCompilerMod, "SdTsCompiler" as any).mockImplementation(MockSdTsCompiler as any);

const mockWriteEmitResults = vi.spyOn(ngtscBuildCore, "writeEmitResults").mockImplementation(() => undefined);
const mockCompileSideEffectScss = vi.spyOn(ngtscBuildCore, "compileSideEffectScss").mockImplementation(() => undefined);

vi.spyOn(coreNode, "createWorker").mockImplementation((fns: Record<string, Function>) => {
  workerFns = fns as any;
  mockSend = vi.fn();
  return { send: mockSend } as any;
});
vi.spyOn(coreNode.FsWatcher, "watch").mockImplementation(() =>
  Promise.resolve({ onChange: mockOnChange, close: mockWatcherClose } as any),
);
vi.spyOn(coreNode.pathx, "posix").mockImplementation((p: string) => p.replace(/\\/g, "/") as coreNode.pathx.PosixPath);
vi.spyOn(coreNode.pathx, "posixResolve").mockImplementation(
  (...args: string[]) => path.resolve(...args).replace(/\\/g, "/") as coreNode.pathx.PosixPath,
);

const mockDebug = vi.fn();
vi.spyOn(sharedWorkerLifecycle, "setupWorkerLifecycle").mockImplementation(() => ({
  logger: { debug: mockDebug, warn: vi.fn() },
  guardStartWatch: vi.fn(),
}) as any);

const mockCollectDeps = vi.spyOn(collectDepsModule, "collectDeps").mockReturnValue({
  workspaceDeps: [],
  replaceDeps: [],
});

const defaultCompileResult = {
  program: { getSourceFiles: () => [{ fileName: "/pkg/src/index.ts" }] },
  builderProgram: {},
  isForAngular: false,
  affectedFiles: new Set<string>(),
  diagnostics: [] as any[],
  errorCount: 0,
  warningCount: 0,
  errors: undefined as string[] | undefined,
  emitResults: undefined,
  lint: undefined,
  scssErrors: [] as string[],
  scssDependencies: new Map<string, Set<string>>(),
};

// Import triggers createWorker, capturing the functions
await import("../../src/workers/library-build.worker");

beforeEach(() => {
  vi.clearAllMocks();
  mockCompileAsync.mockResolvedValue({ ...defaultCompileResult });
  mockCollectDeps.mockReturnValue({ workspaceDeps: [], replaceDeps: [] });
  mockSideEffectScssRegistry.clear();
});

const buildInfo = {
  name: "test-pkg",
  cwd: "/",
  pkgDir: "/pkg",
  output: { js: true, dts: true },
};

describe("library-build.worker build()", () => {
  // Acceptance: tsc builds JS + DTS in single process
  it("runs tsc with output flags and returns combined result", async () => {
    const result = await workerFns["build"]({ ...buildInfo, output: { js: true, dts: true } });

    expect(result.build.success).toBe(true);
  });

  // Acceptance: DTS only build
  it("passes dts-only output to tsc", async () => {
    const result = await workerFns["build"]({ ...buildInfo, output: { js: false, dts: true } });

    expect(result.build.success).toBe(true);
  });

  // Acceptance: Typecheck only
  it("runs typecheck only when both false", async () => {
    const result = await workerFns["build"]({ ...buildInfo, output: { js: false, dts: false } });

    expect(result.build.success).toBe(true);
  });

  // Unit: tsc failure reflects in build result
  it("reports failure in build when tsc fails", async () => {
    mockCompileAsync.mockResolvedValueOnce({
      ...defaultCompileResult,
      errorCount: 1,
      warningCount: 0,
      errors: ["TS2345: type error"],
      diagnostics: [{ code: 2345, category: 1 }],
    });

    const result = await workerFns["build"]({ ...buildInfo, output: { js: true, dts: true } });

    expect(result.build.success).toBe(false);
    expect(result.build.errors).toContain("TS2345: type error");
    expect(result.build.diagnostics).toHaveLength(1);
  });

});

const angularBuildInfo = {
  name: "test-angular-lib",
  cwd: "/workspace",
  pkgDir: "/workspace/packages/test-angular-lib",
  output: { js: true, dts: true, globalScss: true },
};

const angularCompileResult = {
  ...defaultCompileResult,
  program: { getSourceFiles: () => [{ fileName: "/workspace/packages/test-angular-lib/src/index.ts" }] },
  isForAngular: true,
  emitResults: [
    { filename: "/workspace/packages/test-angular-lib/dist/index.js", contents: "export {};", sourceFileName: "/workspace/packages/test-angular-lib/src/index.ts" },
  ],
};

describe("library-build.worker build() — Angular", () => {
  // Acceptance: Angular one-shot build — writeEmitResults 호출
  it("calls writeEmitResults with emitResults filtered to src/", async () => {
    mockCompileAsync.mockResolvedValueOnce({
      ...angularCompileResult,
      emitResults: [
        { filename: "dist/src-file.js", contents: "a", sourceFileName: "/workspace/packages/test-angular-lib/src/src-file.ts" },
        { filename: "dist/ext.js", contents: "b", sourceFileName: "/workspace/packages/test-angular-lib/node_modules/ext.ts" },
      ],
    });

    await workerFns["build"](angularBuildInfo);

    expect(mockWriteEmitResults).toHaveBeenCalledTimes(1);
    const emitArg = mockWriteEmitResults.mock.calls[0][0] as any[];
    // src/ 하위만 필터됨
    expect(emitArg).toHaveLength(1);
    expect(emitArg[0].sourceFileName).toContain("src/src-file.ts");
    // pkgDir 전달
    expect(mockWriteEmitResults.mock.calls[0][1]).toBe(angularBuildInfo.pkgDir);
    // Angular build 모드에서 scss 옵션 전달
    expect(mockWriteEmitResults.mock.calls[0][2]).toEqual({
      loadPaths: [
        path.join(angularBuildInfo.pkgDir, "scss"),
        path.join(angularBuildInfo.cwd, "node_modules"),
      ],
      scssErrors: [],
      scssDependencies: expect.any(Map),
      registry: expect.any(Map),
      registryReverseIndex: expect.any(Map),
      sideEffectScssDeps: expect.any(Map),
    });
  });

  // Acceptance: Angular build with SCSS errors
  it("returns success=false when scssErrors exist", async () => {
    mockCompileAsync.mockResolvedValueOnce({
      ...angularCompileResult,
      scssErrors: ["SCSS error in styles.scss: variable not found"],
    });

    const result = await workerFns["build"](angularBuildInfo);

    expect(result.build.success).toBe(false);
    expect(result.build.errors).toContain("SCSS error in styles.scss: variable not found");
  });

  // Unit: ts errors + scss errors 병합
  it("merges both ts errors and scss errors into build.errors", async () => {
    mockCompileAsync.mockResolvedValueOnce({
      ...angularCompileResult,
      errorCount: 1,
      errors: ["TS2345: type error"],
      scssErrors: ["SCSS error"],
    });

    const result = await workerFns["build"](angularBuildInfo);

    expect(result.build.success).toBe(false);
    expect(result.build.errors).toEqual(["TS2345: type error", "SCSS error"]);
  });

  // Acceptance: Angular build 예외 처리
  it("catches exceptions and returns error result", async () => {
    mockCompileAsync.mockRejectedValueOnce(new Error("Fatal crash"));

    const result = await workerFns["build"](angularBuildInfo);

    expect(result.build.success).toBe(false);
    expect(result.build.errors).toContain("Fatal crash");
    expect(result.build.diagnostics).toEqual([]);
  });

  // Unit: emitResults가 undefined이면 writeEmitResults 미호출
  it("skips writeEmitResults when emitResults is undefined", async () => {
    mockCompileAsync.mockResolvedValueOnce({
      ...angularCompileResult,
      emitResults: undefined,
    });

    await workerFns["build"](angularBuildInfo);

    expect(mockWriteEmitResults).not.toHaveBeenCalled();
  });

  // Unit: globalScss 옵션이 SdTsCompiler에 전달됨
  it("passes globalScss to SdTsCompiler", async () => {
    mockCompileAsync.mockResolvedValueOnce({ ...angularCompileResult });

    await workerFns["build"](angularBuildInfo);

    expect(MockSdTsCompiler).toHaveBeenCalledWith(expect.objectContaining({
      globalScss: true,
    }));
  });
});

describe("library-build.worker startWatch()", () => {
  // Acceptance: Initial build completes before returning
  it("completes initial build and sends build event", async () => {
    await workerFns["startWatch"]({ ...buildInfo, output: { js: true, dts: true } });

    expect(mockSend).toHaveBeenCalledWith("build", expect.objectContaining({
      build: expect.objectContaining({ success: true }),
    }));
  });

  // Acceptance: FsWatcher is set up
  it("starts FsWatcher after initial build", async () => {
    await workerFns["startWatch"]({ ...buildInfo, output: { js: true, dts: true } });

    const { FsWatcher } = await import("@simplysm/core-node");
    expect(FsWatcher.watch).toHaveBeenCalledWith([
      expect.stringContaining("*.ts"),
    ]);
    expect(mockOnChange).toHaveBeenCalledWith(
      expect.objectContaining({ delay: 300 }),
      expect.any(Function),
    );
  });

  // Acceptance: File change triggers rebuild with buildStart event
  it("sends buildStart and build events on file change", async () => {
    await workerFns["startWatch"]({ ...buildInfo, output: { js: true, dts: true } });

    const onChangeCallback = mockOnChange.mock.calls[0][1];
    mockSend.mockClear();

    await onChangeCallback([{ event: "change", path: "/pkg/src/index.ts" }]);

    expect(mockSend).toHaveBeenCalledWith("buildStart", {});
    expect(mockSend).toHaveBeenCalledWith("build", expect.objectContaining({
      build: expect.objectContaining({ success: true }),
    }));
  });

  // Unit: error event on exception
  it("sends error event on rebuild exception", async () => {
    await workerFns["startWatch"]({ ...buildInfo, output: { js: true, dts: true } });

    mockCompileAsync.mockRejectedValueOnce(new Error("tsc crash"));
    const onChangeCallback = mockOnChange.mock.calls[0][1];
    mockSend.mockClear();

    await onChangeCallback([{ event: "change", path: "/pkg/src/index.ts" }]);

    expect(mockSend).toHaveBeenCalledWith("error", { message: "tsc crash" });
  });

  // Acceptance: Watches workspace dependency source directories
  it("includes workspace dependency src/ in watch paths", async () => {
    mockCollectDeps.mockReturnValue({ workspaceDeps: ["core-common", "core-node"], replaceDeps: [] });

    await workerFns["startWatch"]({ ...buildInfo, output: { js: true, dts: true } });

    const { FsWatcher } = await import("@simplysm/core-node");
    const watchPaths = vi.mocked(FsWatcher.watch).mock.calls[0][0];

    // Own src/ + 2 workspace deps' src/
    expect(watchPaths).toHaveLength(3);
    expect(watchPaths).toEqual(expect.arrayContaining([
      expect.stringContaining("core-common"),
      expect.stringContaining("core-node"),
    ]));
  });

  // Unit: no extra paths when no workspace deps
  it("watches only own src/ when no workspace deps", async () => {
    mockCollectDeps.mockReturnValue({ workspaceDeps: [], replaceDeps: [] });

    await workerFns["startWatch"]({ ...buildInfo, output: { js: true, dts: true } });

    const { FsWatcher } = await import("@simplysm/core-node");
    const watchPaths = vi.mocked(FsWatcher.watch).mock.calls[0][0];

    expect(watchPaths).toHaveLength(1);
    expect(watchPaths[0]).toContain("pkg");
  });

});

describe("library-build.worker startWatch() dependency filter", () => {
  const createMockProgram = (fileNames: string[]) => ({
    getSourceFiles: () => fileNames.map((f) => ({ fileName: f })),
  });

  const buildInfoWithProgram = () => {
    mockCompileAsync.mockResolvedValue({
      ...defaultCompileResult,
      program: createMockProgram(["/pkg/src/index.ts", "/pkg/src/utils.ts"]),
    });
  };

  // Acceptance: Skip rebuild when changed file is not in program
  it("skips rebuild when changed file is not in program source files", async () => {
    buildInfoWithProgram();
    await workerFns["startWatch"]({ ...buildInfo, output: { js: true, dts: true } });
    const onChangeCallback = mockOnChange.mock.calls[0][1];
    mockSend.mockClear();

    await onChangeCallback([{ event: "change", path: "/other/src/unrelated.ts" }]);

    expect(mockSend).not.toHaveBeenCalledWith("buildStart", {});
    expect(mockSend).not.toHaveBeenCalledWith("build", expect.anything());
  });

  // Acceptance: Rebuild when changed file is in program
  it("rebuilds when changed file is in program source files", async () => {
    buildInfoWithProgram();
    await workerFns["startWatch"]({ ...buildInfo, output: { js: true, dts: true } });
    const onChangeCallback = mockOnChange.mock.calls[0][1];
    mockSend.mockClear();

    await onChangeCallback([{ event: "change", path: "/pkg/src/index.ts" }]);

    expect(mockSend).toHaveBeenCalledWith("buildStart", {});
    expect(mockSend).toHaveBeenCalledWith("build", expect.anything());
  });

  // Acceptance: Always rebuild on file add
  it("always rebuilds on file add event regardless of program", async () => {
    buildInfoWithProgram();
    await workerFns["startWatch"]({ ...buildInfo, output: { js: true, dts: true } });
    const onChangeCallback = mockOnChange.mock.calls[0][1];
    mockSend.mockClear();

    await onChangeCallback([{ event: "add", path: "/pkg/src/brand-new.ts" }]);

    expect(mockSend).toHaveBeenCalledWith("buildStart", {});
    expect(mockSend).toHaveBeenCalledWith("build", expect.anything());
  });

  // Acceptance: Always rebuild on file unlink
  it("always rebuilds on file unlink event regardless of program", async () => {
    buildInfoWithProgram();
    await workerFns["startWatch"]({ ...buildInfo, output: { js: true, dts: true } });
    const onChangeCallback = mockOnChange.mock.calls[0][1];
    mockSend.mockClear();

    await onChangeCallback([{ event: "unlink", path: "/pkg/src/old-file.ts" }]);

    expect(mockSend).toHaveBeenCalledWith("buildStart", {});
    expect(mockSend).toHaveBeenCalledWith("build", expect.anything());
  });

  // Acceptance: Debug log when skipping rebuild
  it("logs debug message when skipping rebuild", async () => {
    buildInfoWithProgram();
    await workerFns["startWatch"]({ ...buildInfo, output: { js: true, dts: true } });
    const onChangeCallback = mockOnChange.mock.calls[0][1];
    mockDebug.mockClear();

    await onChangeCallback([{ event: "change", path: "/other/src/unrelated.ts" }]);

    expect(mockDebug).toHaveBeenCalledWith(
      expect.stringContaining("빌드에 포함되지 않아 리빌드 건너뜀"),
    );
  });
});

describe("library-build.worker startWatch() — Angular", () => {
  const angularWatchInfo = {
    ...angularBuildInfo,
    replaceDeps: undefined as Record<string, string> | undefined,
  };

  const angularWatchCompileResult = {
    ...angularCompileResult,
    program: {
      getSourceFiles: () => [
        { fileName: "/workspace/packages/test-angular-lib/src/index.ts" },
        { fileName: "/workspace/packages/test-angular-lib/src/comp.ts" },
      ],
    },
    scssDependencies: new Map<string, ReadonlySet<string>>(),
  };

  // Acceptance: Angular 초기 빌드 with SCSS globs
  it("starts FsWatcher with scss globs when globalScss is true", async () => {
    mockCompileAsync.mockResolvedValue({ ...angularWatchCompileResult });

    await workerFns["startWatch"](angularWatchInfo);

    const { FsWatcher } = await import("@simplysm/core-node");
    const watchPaths = vi.mocked(FsWatcher.watch).mock.calls[0][0];
    // src/**/*.{ts,scss,css} + scss/**/*.{scss,css}
    expect(watchPaths.length).toBeGreaterThanOrEqual(2);
    expect(watchPaths.some((p: string) => p.includes("*.{ts,scss,css}"))).toBe(true);
    expect(watchPaths.some((p: string) => p.includes("*.{scss,css}"))).toBe(true);
  });

  // Acceptance: Angular 초기 빌드 — writeEmitResults with scss option
  it("calls writeEmitResults with scss option in initial watch build", async () => {
    mockCompileAsync.mockResolvedValue({ ...angularWatchCompileResult });

    await workerFns["startWatch"](angularWatchInfo);

    expect(mockWriteEmitResults).toHaveBeenCalledWith(
      expect.any(Array),
      angularWatchInfo.pkgDir,
      expect.objectContaining({
        loadPaths: expect.any(Array),
        scssErrors: expect.any(Array),
        scssDependencies: expect.any(Map),
        registry: mockSideEffectScssRegistry,
      }),
    );
  });

  // Acceptance: globalScss가 SdTsCompiler에 전달됨
  it("passes globalScss to SdTsCompiler in watch mode", async () => {
    mockCompileAsync.mockResolvedValue({ ...angularWatchCompileResult });

    await workerFns["startWatch"](angularWatchInfo);

    expect(MockSdTsCompiler).toHaveBeenCalledWith(expect.objectContaining({
      globalScss: true,
    }));
  });

  // Acceptance: SCSS 의존성 역방향 탐색
  it("adds SCSS-dependent files to modifiedFiles via combinedScssDeps", async () => {
    const scssDeps = new Map<string, ReadonlySet<string>>();
    scssDeps.set(
      "/workspace/packages/test-angular-lib/src/comp.ts",
      new Set(["/workspace/packages/test-angular-lib/scss/shared.scss"]),
    );
    mockCompileAsync.mockResolvedValue({
      ...angularWatchCompileResult,
      scssDependencies: scssDeps,
    });

    await workerFns["startWatch"](angularWatchInfo);

    const onChangeCallback = mockOnChange.mock.calls[0][1];
    mockSend.mockClear();

    // shared.scss 변경 → comp.ts도 modifiedFiles에 추가
    await onChangeCallback([
      { event: "change", path: "/workspace/packages/test-angular-lib/scss/shared.scss" },
    ]);

    expect(mockSend).toHaveBeenCalledWith("buildStart", {});
    const compileCall = mockCompileAsync.mock.calls[mockCompileAsync.mock.calls.length - 1];
    const modifiedFiles = compileCall[0] as Set<string>;
    expect(modifiedFiles.has("/workspace/packages/test-angular-lib/scss/shared.scss")).toBe(true);
    expect(modifiedFiles.has("/workspace/packages/test-angular-lib/src/comp.ts")).toBe(true);
  });

  // Acceptance: SCSS 변경 시 compileSideEffectScss 호출
  it("calls compileSideEffectScss when scss files change", async () => {
    mockCompileAsync.mockResolvedValue({ ...angularWatchCompileResult });

    await workerFns["startWatch"](angularWatchInfo);

    const onChangeCallback = mockOnChange.mock.calls[0][1];
    mockCompileSideEffectScss.mockClear();

    await onChangeCallback([
      { event: "change", path: "/workspace/packages/test-angular-lib/src/styles.scss" },
      { event: "change", path: "/workspace/packages/test-angular-lib/src/index.ts" },
    ]);

    expect(mockCompileSideEffectScss).toHaveBeenCalledWith(
      mockSideEffectScssRegistry,
      expect.any(Array),
      expect.any(Array),
      expect.any(Map),
      expect.any(Set), // changedScssFiles
      expect.any(Map), // sideEffectScssDeps
    );
  });

  // Unit: SCSS 미변경 시 compileSideEffectScss 미호출
  it("does not call compileSideEffectScss when no scss changes", async () => {
    mockCompileAsync.mockResolvedValue({ ...angularWatchCompileResult });

    await workerFns["startWatch"](angularWatchInfo);

    const onChangeCallback = mockOnChange.mock.calls[0][1];
    mockCompileSideEffectScss.mockClear();

    await onChangeCallback([
      { event: "change", path: "/workspace/packages/test-angular-lib/src/index.ts" },
    ]);

    expect(mockCompileSideEffectScss).not.toHaveBeenCalled();
  });
});

describe("library-build.worker stopWatch()", () => {
  it("cleans up FsWatcher", async () => {
    await workerFns["startWatch"]({ ...buildInfo, output: { js: true, dts: true } });
    await workerFns["stopWatch"]();

    expect(mockWatcherClose).toHaveBeenCalled();
  });
});
