import { describe, it, expect, vi, afterEach } from "vitest";

// --- Mock factories ---

const mockWatcher = {
  onChange: vi.fn(),
  close: vi.fn().mockResolvedValue(undefined),
};

vi.mock("@simplysm/core-node", () => ({
  FsWatcher: {
    watch: vi.fn(() => Promise.resolve(mockWatcher)),
  },
}));

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(() => true),
    realpathSync: vi.fn((p: string) => p.replace("/symlink/", "/real/")),
  },
}));

// --- Dynamic import after mocking ---

const { sdScopeWatchPlugin } = await import(
  "../../src/utils/vite-scope-watch-plugin"
);
const { FsWatcher } = await import("@simplysm/core-node");

afterEach(() => {
  vi.clearAllMocks();
});

describe("sdScopeWatchPlugin", () => {
  // Acceptance: Scenario "replaceDeps 패키지는 Vite pre-bundling에서 제외된다"
  it("adds replaceDeps packages to optimizeDeps.exclude", () => {
    const plugin = sdScopeWatchPlugin({
      pkgDir: "/packages/my-client",
      replaceDeps: [
        { packageName: "@scope/core", sourcePath: "/packages/core" },
        { packageName: "@scope/common", sourcePath: "/packages/common" },
      ],
    });

    const config = (plugin as any).config?.();

    expect(config?.optimizeDeps?.exclude).toContain("@scope/core");
    expect(config?.optimizeDeps?.exclude).toContain("@scope/common");
    expect(config?.optimizeDeps?.force).toBe(true);
  });

  // Acceptance: Scenario "라이브러리 재빌드로 의존성 변경"
  it("configureServer sets up FsWatcher on replaceDeps dist/ directories", async () => {
    const onScopeRebuild = vi.fn();

    const plugin = sdScopeWatchPlugin({
      pkgDir: "/packages/my-client",
      replaceDeps: [
        { packageName: "@scope/core", sourcePath: "/packages/core" },
      ],
      onScopeRebuild,
    });

    const mockServer = {
      watcher: { emit: vi.fn() },
      httpServer: { on: vi.fn() },
    };

    await (plugin as any).configureServer?.(mockServer);

    expect(FsWatcher.watch).toHaveBeenCalled();
    expect(mockWatcher.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ delay: 300 }),
      expect.any(Function),
    );
  });

  // Acceptance: Scenario "여러 라이브러리 파일 동시 변경 시 디바운스"
  it("onChange callback emits change events and calls onScopeRebuild", async () => {
    const onScopeRebuild = vi.fn();

    const plugin = sdScopeWatchPlugin({
      pkgDir: "/packages/my-client",
      replaceDeps: [
        { packageName: "@scope/core", sourcePath: "/packages/core" },
      ],
      onScopeRebuild,
    });

    const mockServer = {
      watcher: { emit: vi.fn() },
      httpServer: { on: vi.fn() },
    };

    await (plugin as any).configureServer?.(mockServer);

    // Get the onChange callback
    const onChangeCallback = mockWatcher.onChange.mock.calls[0][1];

    // Simulate file changes
    onChangeCallback([
      { path: "/packages/core/dist/index.js" },
      { path: "/packages/core/dist/utils.js" },
    ]);

    // Should emit change events to Vite watcher
    expect(mockServer.watcher.emit).toHaveBeenCalledWith(
      "change",
      "/packages/core/dist/index.js",
    );
    expect(mockServer.watcher.emit).toHaveBeenCalledWith(
      "change",
      "/packages/core/dist/utils.js",
    );

    // Should call onScopeRebuild
    expect(onScopeRebuild).toHaveBeenCalled();
  });

  // Acceptance: Scenario "replaceDeps가 없는 Client 패키지"
  it("does nothing when replaceDeps is empty", async () => {
    const plugin = sdScopeWatchPlugin({
      pkgDir: "/packages/my-client",
      replaceDeps: [],
    });

    const mockServer = {
      watcher: { emit: vi.fn() },
      httpServer: { on: vi.fn() },
    };

    await (plugin as any).configureServer?.(mockServer);

    expect(FsWatcher.watch).not.toHaveBeenCalled();
  });

  // Scenario: symlink 경로를 realpath로 해결하여 감시한다
  it("resolves symlink paths to realpath for watch directories", async () => {
    const plugin = sdScopeWatchPlugin({
      pkgDir: "/packages/my-client",
      replaceDeps: [
        { packageName: "@scope/core", sourcePath: "/packages/core" },
      ],
    });

    const mockServer = {
      watcher: { emit: vi.fn() },
      httpServer: { on: vi.fn() },
    };

    await (plugin as any).configureServer?.(mockServer);

    // fs.realpathSync가 dist 경로에 대해 호출되었는지 확인
    const fsModule = (await import("fs")).default;
    expect(fsModule.realpathSync).toHaveBeenCalled();
  });

  // Unit: server close cleans up watcher
  it("registers cleanup on server httpServer close", async () => {
    const plugin = sdScopeWatchPlugin({
      pkgDir: "/packages/my-client",
      replaceDeps: [
        { packageName: "@scope/core", sourcePath: "/packages/core" },
      ],
    });

    const closeHandler = vi.fn();
    const mockServer = {
      watcher: { emit: vi.fn() },
      httpServer: { on: vi.fn((event: string, cb: () => void) => { if (event === "close") closeHandler.mockImplementation(cb); }) },
    };

    await (plugin as any).configureServer?.(mockServer);

    // Trigger close
    closeHandler();

    expect(mockWatcher.close).toHaveBeenCalled();
  });
});
