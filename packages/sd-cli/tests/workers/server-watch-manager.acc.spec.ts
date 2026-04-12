import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ConsolaInstance } from "consola";

//#region Mocks

const mockWatcherOnChange = vi.fn();
const mockWatcherClose = vi.fn();

vi.mock("@simplysm/core-node", () => ({
  FsWatcher: {
    watch: vi.fn(() =>
      Promise.resolve({ onChange: mockWatcherOnChange, close: mockWatcherClose }),
    ),
  },
  pathx: {
    posix: vi.fn((p: string) => p.replace(/\\/g, "/")),
    posixResolve: vi.fn((...args: string[]) => {
      // Simple path join for testing
      return args.join("/").replace(/\/+/g, "/");
    }),
  },
}));

vi.mock("fs", () => ({
  default: {
    realpathSync: vi.fn((p: string) => p),
  },
}));

vi.mock("../../src/workers/server-esbuild-context", () => ({
  hasContext: vi.fn(() => true),
  getMetafile: vi.fn(() => undefined),
  recreateContext: vi.fn(() => Promise.resolve()),
}));

vi.mock("../../src/workers/build-change-filter", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/workers/build-change-filter")>();
  return actual;
});

vi.mock("../../src/utils/tsconfig", () => ({
  parseTsconfig: vi.fn(() => ({
    options: { target: 1, module: 99 },
    fileNames: ["/workspace/packages/my-server/src/main.ts"],
    errors: [],
  })),
  getPackageSourceFiles: vi.fn(() => ["/workspace/packages/my-server/src/main.ts"]),
}));

vi.mock("../../src/deps/server-externals/server-production-files", () => ({
  collectAllExternals: vi.fn(() => []),
}));

//#endregion

const { FsWatcher } = await import("@simplysm/core-node");
const esbuildCtx = await import("../../src/workers/server-esbuild-context");
const { collectAllExternals } = await import("../../src/deps/server-externals/server-production-files");
const { startServerWatchLoop } = await import("../../src/workers/server-watch-manager");

const mockLogger = { debug: vi.fn(), warn: vi.fn() } as unknown as ConsolaInstance;

function createConfig(overrides?: Partial<Parameters<typeof startServerWatchLoop>[0]>) {
  return {
    info: {
      name: "my-server",
      cwd: "/workspace",
      pkgDir: "/workspace/packages/my-server",
      output: { js: true, dts: false },
      externals: undefined as string[] | undefined,
    },
    watchPaths: ["/workspace/packages/my-server/src/**/*"],
    logger: mockLogger,
    initialExternals: [],
    onBuildStart: vi.fn(),
    onBuild: vi.fn(),
    onError: vi.fn(),
    rebuild: vi.fn(() =>
      Promise.resolve({
        build: { success: true },
        mainJsPath: "/workspace/packages/my-server/dist/main.js",
      }),
    ),
    ...overrides,
  };
}

describe("startServerWatchLoop", () => {
  beforeEach(() => {
    mockWatcherOnChange.mockClear();
    mockWatcherClose.mockClear();
    vi.mocked(FsWatcher.watch).mockClear();
    vi.mocked(esbuildCtx.hasContext).mockReturnValue(true);
    vi.mocked(esbuildCtx.getMetafile).mockReturnValue(undefined);
    vi.mocked(esbuildCtx.recreateContext).mockResolvedValue();
    vi.mocked(collectAllExternals).mockReturnValue([]);
    (mockLogger.debug as unknown as ReturnType<typeof vi.fn>).mockClear();
  });

  // Acceptance: 파일 추가 시 context 재생성 + 리빌드
  it("recreates esbuild context and triggers rebuild on file add", async () => {
    const config = createConfig();
    await startServerWatchLoop(config);

    // onChange 핸들러 추출
    const onChangeHandler = mockWatcherOnChange.mock.calls[0][1] as (
      changes: Array<{ event: string; path: string }>,
    ) => Promise<void>;

    await onChangeHandler([
      { event: "add", path: "/workspace/packages/my-server/src/new.ts" },
    ]);

    expect(config.onBuildStart).toHaveBeenCalledOnce();
    expect(esbuildCtx.recreateContext).toHaveBeenCalled();
    expect(config.rebuild).toHaveBeenCalledOnce();
    expect(config.onBuild).toHaveBeenCalledOnce();
  });

  // Acceptance: metafile 기반 필터링으로 불필요한 리빌드 건너뜀
  it("skips rebuild when changed file is not in metafile.inputs", async () => {
    vi.mocked(esbuildCtx.getMetafile).mockReturnValue({
      inputs: { "packages/my-server/src/main.ts": {} as any },
      outputs: {},
    });

    const config = createConfig();
    await startServerWatchLoop(config);

    const onChangeHandler = mockWatcherOnChange.mock.calls[0][1] as (
      changes: Array<{ event: string; path: string }>,
    ) => Promise<void>;

    await onChangeHandler([
      { event: "change", path: "/workspace/packages/my-server/src/unrelated.ts" },
    ]);

    expect(config.onBuildStart).not.toHaveBeenCalled();
    expect(config.rebuild).not.toHaveBeenCalled();
  });

  // Acceptance: onChange 에러 시 onError 콜백 호출
  it("calls onError when onChange handler throws", async () => {
    const config = createConfig({
      rebuild: vi.fn().mockRejectedValue(new Error("rebuild failed")),
    });

    vi.mocked(esbuildCtx.hasContext).mockReturnValue(false);

    await startServerWatchLoop(config);

    const onChangeHandler = mockWatcherOnChange.mock.calls[0][1] as (
      changes: Array<{ event: string; path: string }>,
    ) => Promise<void>;

    await onChangeHandler([
      { event: "change", path: "/workspace/packages/my-server/src/main.ts" },
    ]);

    expect(config.onError).toHaveBeenCalledWith("rebuild failed");
  });
});
