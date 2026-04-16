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
    posixResolve: vi.fn((...args: string[]) => args.join("/").replace(/\/+/g, "/")),
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
    options: {},
    fileNames: ["/workspace/packages/my-server/src/main.ts"],
    errors: [],
  })),
  getPackageSourceFiles: vi.fn(() => ["/workspace/packages/my-server/src/main.ts"]),
}));

vi.mock("../../src/deps/server-externals/server-production-files", () => ({
  collectAllExternals: vi.fn(() => ({ bundleExternals: [], prodDependencies: [] })),
}));

//#endregion

const { FsWatcher } = await import("@simplysm/core-node");
const esbuildCtx = await import("../../src/workers/server-esbuild-context");
const { collectAllExternals } = await import("../../src/deps/server-externals/server-production-files");
const { startServerWatchLoop } = await import("../../src/workers/server-watch-manager");

const mockLogger = { debug: vi.fn(), warn: vi.fn() } as unknown as ConsolaInstance;

function createConfig(overrides?: Record<string, unknown>) {
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
    vi.mocked(FsWatcher.watch).mockClear();
    vi.mocked(esbuildCtx.hasContext).mockReset().mockReturnValue(true);
    vi.mocked(esbuildCtx.getMetafile).mockReset().mockReturnValue(undefined);
    vi.mocked(esbuildCtx.recreateContext).mockReset().mockResolvedValue();
    vi.mocked(collectAllExternals).mockReset().mockReturnValue({ bundleExternals: [], prodDependencies: [] });
    (mockLogger.debug as unknown as ReturnType<typeof vi.fn>).mockClear();
  });

  it("creates FsWatcher and registers onChange with 300ms delay", async () => {
    const config = createConfig();
    await startServerWatchLoop(config);

    expect(FsWatcher.watch).toHaveBeenCalledWith(config.watchPaths);
    expect(mockWatcherOnChange).toHaveBeenCalledWith(
      { delay: 300 },
      expect.any(Function),
    );
  });

  it("returns FsWatcher instance", async () => {
    const config = createConfig();
    const watcher = await startServerWatchLoop(config);

    expect(watcher).toBeDefined();
    expect(watcher.onChange).toBeDefined();
  });

  describe("onChange: file add/remove", () => {
    it("recreates context when output.js is true", async () => {
      const config = createConfig();
      await startServerWatchLoop(config);

      const handler = mockWatcherOnChange.mock.calls[0][1] as Function;
      await handler([{ event: "add", path: "/workspace/packages/my-server/src/new.ts" }]);

      expect(esbuildCtx.recreateContext).toHaveBeenCalled();
    });

    it("skips context recreation when output.js is false", async () => {
      const config = createConfig({
        info: {
          name: "my-server",
          cwd: "/workspace",
          pkgDir: "/workspace/packages/my-server",
          output: { js: false, dts: true },
        },
      });
      await startServerWatchLoop(config);

      const handler = mockWatcherOnChange.mock.calls[0][1] as Function;
      await handler([{ event: "add", path: "/workspace/packages/my-server/src/new.ts" }]);

      expect(esbuildCtx.recreateContext).not.toHaveBeenCalled();
      expect(config.rebuild).toHaveBeenCalled();
    });

    it("re-collects externals when package.json changed", async () => {
      const config = createConfig();
      await startServerWatchLoop(config);

      const handler = mockWatcherOnChange.mock.calls[0][1] as Function;
      await handler([
        { event: "add", path: "/workspace/packages/my-server/package.json" },
      ]);

      expect(collectAllExternals).toHaveBeenCalled();
    });
  });

  describe("onChange: file change (metafile filtering)", () => {
    it("rebuilds unconditionally when no context exists", async () => {
      vi.mocked(esbuildCtx.hasContext).mockReturnValue(false);
      const config = createConfig();
      await startServerWatchLoop(config);

      const handler = mockWatcherOnChange.mock.calls[0][1] as Function;
      await handler([{ event: "change", path: "/workspace/packages/my-server/src/main.ts" }]);

      expect(config.onBuildStart).toHaveBeenCalled();
      expect(config.rebuild).toHaveBeenCalled();
    });

    it("rebuilds unconditionally when metafile is not available", async () => {
      vi.mocked(esbuildCtx.getMetafile).mockReturnValue(undefined);
      const config = createConfig();
      await startServerWatchLoop(config);

      const handler = mockWatcherOnChange.mock.calls[0][1] as Function;
      await handler([{ event: "change", path: "/workspace/packages/my-server/src/main.ts" }]);

      expect(config.rebuild).toHaveBeenCalled();
    });

    it("rebuilds when changed file is in metafile.inputs", async () => {
      vi.mocked(esbuildCtx.getMetafile).mockReturnValue({
        inputs: { "packages/my-server/src/main.ts": {} as any },
        outputs: {},
      });
      const config = createConfig();
      await startServerWatchLoop(config);

      const handler = mockWatcherOnChange.mock.calls[0][1] as Function;
      // pathx.posixResolve("/workspace", "packages/my-server/src/main.ts")
      // → "/workspace/packages/my-server/src/main.ts"
      await handler([
        { event: "change", path: "/workspace/packages/my-server/src/main.ts" },
      ]);

      expect(config.rebuild).toHaveBeenCalled();
    });
  });
});
