import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";
import { consola } from "consola";
import * as tscBuild from "../../src/utils/tsc-build";
import * as packageUtils from "../../src/utils/package-utils";

//#region Mocks

let workerFns: Record<string, (...args: any[]) => any>;
let mockSend: ReturnType<typeof vi.fn>;

// FsWatcher mock
const mockOnChange = vi.fn();
const mockWatcherClose = vi.fn();

vi.mock("@simplysm/core-node", () => ({
  createWorker: vi.fn((fns: Record<string, Function>) => {
    workerFns = fns as any;
    mockSend = vi.fn();
    return { send: mockSend };
  }),
  FsWatcher: {
    watch: vi.fn(() => Promise.resolve({
      onChange: mockOnChange,
      close: mockWatcherClose,
    })),
  },
  pathx: {
    posix: vi.fn((p: string) => p.replace(/\\/g, "/")),
    posixResolve: vi.fn((...args: string[]) => path.resolve(...args).replace(/\\/g, "/")),
  },
}));

const mockDebug = vi.fn();
vi.spyOn(consola, "withTag").mockReturnValue({ debug: mockDebug, warn: vi.fn() } as any);

// tsc build spy
const mockRunTscPackageBuild = vi.spyOn(tscBuild, "runTscPackageBuild").mockReturnValue({
  success: true,
  errors: undefined,
  diagnostics: [],
  errorCount: 0,
  warningCount: 0,
  program: {
    getSourceFiles: () => [{ fileName: "/pkg/src/index.ts" }],
  },
} as any);

vi.mock("../../src/utils/worker-utils", () => ({
  setupWorkerConsola: vi.fn(),
  registerCleanupHandlers: vi.fn(),
  createOnceGuard: vi.fn(() => vi.fn()),
}));

// package-utils spy
const mockCollectDeps = vi.spyOn(packageUtils, "collectDeps").mockReturnValue({
  workspaceDeps: [],
  replaceDeps: [],
});

//#endregion

// Import triggers createWorker, capturing the functions
await import("../../src/workers/library-build.worker");

beforeEach(() => {
  vi.clearAllMocks();
  mockRunTscPackageBuild.mockReturnValue({
    success: true,
    errors: undefined,
    diagnostics: [],
    errorCount: 0,
    warningCount: 0,
    program: {
      getSourceFiles: () => [{ fileName: "/pkg/src/index.ts" }],
    },
  } as any);
  mockCollectDeps.mockReturnValue({ workspaceDeps: [], replaceDeps: [] });
});

const buildInfo = {
  name: "test-pkg",
  config: { target: "node" as const },
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
    mockRunTscPackageBuild.mockReturnValueOnce({
      success: false,
      errors: ["TS2345: type error"],
      diagnostics: [{ code: 2345, category: 1 }],
      errorCount: 1,
      warningCount: 0,
      program: {
        getSourceFiles: () => [{ fileName: "/pkg/src/index.ts" }],
      },
    } as any);

    const result = await workerFns["build"]({ ...buildInfo, output: { js: true, dts: true } });

    expect(result.build.success).toBe(false);
    expect(result.build.errors).toContain("TS2345: type error");
    expect(result.build.diagnostics).toHaveLength(1);
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

    mockRunTscPackageBuild.mockImplementationOnce(() => { throw new Error("tsc crash"); });
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
    mockRunTscPackageBuild.mockReturnValue({
      success: true,
      errors: undefined,
      diagnostics: [],
      errorCount: 0,
      warningCount: 0,
      program: createMockProgram(["/pkg/src/index.ts", "/pkg/src/utils.ts"]),
    } as any);
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

describe("library-build.worker stopWatch()", () => {
  it("cleans up FsWatcher", async () => {
    await workerFns["startWatch"]({ ...buildInfo, output: { js: true, dts: true } });
    await workerFns["stopWatch"]();

    expect(mockWatcherClose).toHaveBeenCalled();
  });
});
