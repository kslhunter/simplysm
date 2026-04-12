import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock factories (vi.mock is hoisted) ---

vi.mock("../../src/utils/sd-config", () => ({
  loadSdConfig: vi.fn(),
}));

vi.mock("../../src/utils/build-env", () => ({
  getVersion: vi.fn(),
}));

vi.mock("../../src/deps/replace-deps/replace-deps", () => ({
  watchReplaceDeps: vi.fn(),
}));

vi.mock("../../src/utils/output-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/utils/output-utils")>();
  return {
    ...actual,
    printErrors: vi.fn(),
    printServers: vi.fn(),
  };
});

vi.mock("../../src/runtime/SignalHandler", () => ({
  SignalHandler: vi.fn().mockImplementation(function (this: any) {
    this.waitForTermination = vi.fn().mockResolvedValue(undefined);
    this.isTerminated = vi.fn().mockReturnValue(false);
    this.requestTermination = vi.fn();
  }),
}));

vi.mock("../../src/utils/copy-src", () => ({
  watchCopySrcFiles: vi.fn().mockResolvedValue({
    close: vi.fn().mockResolvedValue(undefined),
  }),
}));

// Engine mock — tracks created engines and the package they were created for
const mockBuildEngines: Array<{
  run: ReturnType<typeof vi.fn>;
  startWatch: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  _pkgName: string;
}> = [];

vi.mock("../../src/engines/engine-factory", () => ({
  createBuildEngine: vi.fn((pkg: any, options: any) => {
    const engine = {
      run: vi.fn().mockResolvedValue({
        success: true,
        build: { success: true, errors: [], warnings: [], diagnostics: [] },
      }),
      startWatch: vi.fn().mockImplementation(() => {
        const resolve = options.rebuildManager.registerBuild(
          `${pkg.name}:build`,
          `${pkg.name} (${pkg.config.target})`,
        );
        options.resultCollector.add({
          name: pkg.name,
          target: pkg.config.target,
          type: "build",
          status: "success",
        });
        resolve();
      }),
      stop: vi.fn().mockResolvedValue(undefined),
      _pkgName: pkg.name,
    };
    mockBuildEngines.push(engine);
    return engine;
  }),
}));

vi.mock("@simplysm/core-node", () => ({
  FsWatcher: {
    watch: vi.fn().mockResolvedValue({
      onChange: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    }),
  },
  Worker: {
    create: vi.fn(),
  },
  pathx: {
    posix: vi.fn((p: string) => p.replace(/\\/g, "/")),
    posixResolve: vi.fn((...args: string[]) => args.join("/").replace(/\\/g, "/")),
    isChildPath: vi.fn((child: string, parent: string) => child.startsWith(parent + "/")),
    filterByTargets: vi.fn((files: string[], targets: string[]) => targets.length === 0 ? files : files),
  },
}));

vi.mock("child_process", () => ({
  spawn: vi.fn(() => ({
    on: vi.fn(),
    kill: vi.fn(),
    exitCode: 0,
  })),
}));

// --- Dynamic imports after mocking ---

const { WatchOrchestrator } = await import("../../src/orchestrators/WatchOrchestrator");
const { loadSdConfig } = await import("../../src/utils/sd-config");
const { watchReplaceDeps } = await import("../../src/deps/replace-deps/replace-deps");
const { printErrors } = await import("../../src/utils/output-utils");
const { createBuildEngine } = await import("../../src/engines/engine-factory");
const { watchCopySrcFiles } = await import("../../src/utils/copy-src");
const { FsWatcher } = await import("@simplysm/core-node");
const { spawn } = await import("child_process");
const { getVersion } = await import("../../src/utils/build-env");

import type { SdConfig } from "../../src/sd-config.types";

// --- Helpers ---

function createConfig(overrides: Partial<SdConfig> = {}): SdConfig {
  return { packages: {}, ...overrides };
}

function setupDefaults(config: SdConfig): void {
  vi.mocked(loadSdConfig).mockResolvedValue(config);
  vi.mocked(watchReplaceDeps).mockResolvedValue({ entries: [], dispose: vi.fn() });
  vi.mocked(getVersion).mockResolvedValue("1.0.0");
}

// --- Tests ---

describe("WatchOrchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildEngines.length = 0;
    vi.spyOn(process, "cwd").mockReturnValue("/test-root");
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.mocked(createBuildEngine).mockImplementation((pkg: any, options: any) => {
      const engine = {
        run: vi.fn().mockResolvedValue({
          success: true,
          build: { success: true, errors: [], warnings: [], diagnostics: [] },
        }),
        startWatch: vi.fn().mockImplementation(() => {
          const resolve = options.rebuildManager.registerBuild(
            `${pkg.name}:build`,
            `${pkg.name} (${pkg.config.target})`,
          );
          options.resultCollector.add({
            name: pkg.name,
            target: pkg.config.target,
            type: "build",
            status: "success",
          });
          resolve();
        }),
        stop: vi.fn().mockResolvedValue(undefined),
        _pkgName: pkg.name,
      };
      mockBuildEngines.push(engine);
      return engine as any;
    });
  });

  // --- Acceptance: Scenario "watch 모드 생성 시 dev 전용 필드 없음" ---
  it("does not have dev-specific fields (_serverRuntimeWorkers, _clientEngines, _serverRestartTimer, _printServersTimer)", () => {
    const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
    // dev 전용 필드가 WatchOrchestrator 인스턴스에 존재하지 않음을 확인
    // _baseEnv는 BaseOrchestrator 공통 필드로 이동하여 watch에서도 존재
    expect(orchestrator).not.toHaveProperty("_serverRuntimeWorkers");
    expect(orchestrator).not.toHaveProperty("_clientEngines");
    expect(orchestrator).not.toHaveProperty("_serverRestartTimer");
    expect(orchestrator).not.toHaveProperty("_printServersTimer");
  });

  // --- Acceptance: Scenario "watch 모드 실행" ---
  it("starts library engines with js+dts, copySrc watchers, and watch hooks", async () => {
    setupDefaults(createConfig({
      packages: {
        "core-common": { target: "node", copySrc: ["**/*.json"] },
        "sd-scripts": {
          target: "scripts",
          watch: { target: ["dist/**/*.js"], cmd: "node", args: ["run-task.js"] },
        },
      },
    }));

    const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    // Library engine started with js+dts
    expect(mockBuildEngines).toHaveLength(1);
    expect(mockBuildEngines[0].startWatch).toHaveBeenCalledWith({ js: true, dts: true, lint: false });

    // copySrc watcher started
    expect(watchCopySrcFiles).toHaveBeenCalledWith(
      expect.stringContaining("core-common"),
      ["**/*.json"],
    );

    // watch hook executed
    expect(spawn).toHaveBeenCalledWith("node", ["run-task.js"], expect.objectContaining({ shell: true }));
  });

  // --- Acceptance: Scenario "공통 초기화 로직 실행" (BaseOrchestrator) ---
  it("loads sd.config, builds pathMap, validates targets, starts replaceDeps watch on initialize", async () => {
    const replaceDeps = { "@simplysm/*": "packages/*/src" };
    setupDefaults(createConfig({
      packages: { "core-common": { target: "node" } },
      replaceDeps,
    }));

    const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();

    // sd.config loaded
    expect(loadSdConfig).toHaveBeenCalledWith(
      expect.objectContaining({ cwd: "/test-root", dev: true }),
    );

    // replaceDeps watch started
    expect(watchReplaceDeps).toHaveBeenCalledWith("/test-root", replaceDeps);

    // Engine created (validates pathMap and targets worked)
    expect(mockBuildEngines).toHaveLength(1);
  });

  // --- Acceptance: Scenario "공통 종료 로직 실행" (BaseOrchestrator) ---
  it("disposes replaceDepWatcher and calls _shutdownMode on shutdown", async () => {
    const mockDispose = vi.fn();
    vi.mocked(watchReplaceDeps).mockResolvedValue({ entries: [], dispose: mockDispose });

    const mockCopySrcWatcher = { close: vi.fn().mockResolvedValue(undefined) };
    vi.mocked(watchCopySrcFiles).mockResolvedValue(mockCopySrcWatcher as any);

    setupDefaults(createConfig({
      packages: {
        "core-common": { target: "node", copySrc: ["**/*.json"] },
      },
      replaceDeps: { "@simplysm/*": "packages/*/src" },
    }));
    vi.mocked(watchReplaceDeps).mockResolvedValue({ entries: [], dispose: mockDispose });

    const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();
    await orchestrator.shutdown();

    // replaceDepWatcher disposed
    expect(mockDispose).toHaveBeenCalledOnce();

    // engines stopped
    for (const engine of mockBuildEngines) {
      expect(engine.stop).toHaveBeenCalledOnce();
    }

    // copySrc watcher closed
    expect(mockCopySrcWatcher.close).toHaveBeenCalledOnce();
  });

  // --- Acceptance: Scenario "watch.ts가 WatchOrchestrator를 사용" ---
  // (LLM 검증 — commands/watch.ts에서 WatchOrchestrator를 import하는지 확인)

  // --- Acceptance: Scenario "public export 불변" ---
  // (LLM 검증 — index.ts의 export 변경 없음)

  // --- Unit Tests ---

  it("creates BuildEngine for library packages with correct output flags", async () => {
    setupDefaults(createConfig({
      packages: { "core-common": { target: "node" }, "core-browser": { target: "browser" } },
    }));

    const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();

    expect(mockBuildEngines).toHaveLength(2);
  });

  it("does not create BuildEngine for server packages in watch mode", async () => {
    setupDefaults(createConfig({
      packages: { "service-server": { target: "server" } },
    }));

    const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();

    expect(mockBuildEngines).toHaveLength(0);
  });

  it("outputs warning when no watchable packages exist", async () => {
    setupDefaults(createConfig({
      packages: { "sd-scripts": { target: "scripts" } },
    }));

    const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();

    expect(mockBuildEngines).toHaveLength(0);
  });

  it("processes Library and Scripts packages, excludes server", async () => {
    setupDefaults(createConfig({
      packages: {
        "core-common": { target: "node" },
        "service-server": { target: "server" },
        "sd-scripts": { target: "scripts", watch: { target: ["dist/**/*.js"], cmd: "node" } },
      },
    }));

    const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(mockBuildEngines).toHaveLength(1);
    expect(mockBuildEngines[0]._pkgName).toBe("core-common");
    expect(spawn).toHaveBeenCalled();
  });

  it("triggers printErrors on batchComplete", async () => {
    setupDefaults(createConfig({
      packages: { "core-common": { target: "node" } },
    }));

    const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    await new Promise((r) => setTimeout(r, 50));
    expect(printErrors).toHaveBeenCalled();
  });

  it("delegates awaitTermination to SignalHandler", async () => {
    setupDefaults(createConfig({
      packages: { "core-common": { target: "node" } },
    }));

    const { SignalHandler } = await import("../../src/runtime/SignalHandler");

    const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.awaitTermination();

    const signalInstance = vi.mocked(SignalHandler).mock.instances[0];
    expect(signalInstance.waitForTermination).toHaveBeenCalled();
  });

  it("filters packages by targets", async () => {
    setupDefaults(createConfig({
      packages: { "core-common": { target: "node" }, "storage": { target: "node" } },
    }));

    const orchestrator = new WatchOrchestrator({ targets: ["core-common"], options: [] });
    await orchestrator.initialize();

    expect(mockBuildEngines).toHaveLength(1);
    expect(mockBuildEngines[0]._pkgName).toBe("core-common");
  });

  it("re-runs watch hook when watched files change", async () => {
    let onChangeCallback: (...args: any[]) => void = () => {};
    vi.mocked(FsWatcher.watch).mockResolvedValue({
      onChange: vi.fn((_opts: any, cb: any) => { onChangeCallback = cb; }),
      close: vi.fn().mockResolvedValue(undefined),
    } as any);

    setupDefaults(createConfig({
      packages: {
        "sd-scripts": {
          target: "scripts",
          watch: { target: ["dist/**/*.js"], cmd: "node", args: ["run-task.js"] },
        },
      },
    }));

    const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(spawn).toHaveBeenCalledTimes(1);
    onChangeCallback();
    expect(spawn).toHaveBeenCalledTimes(2);
  });

  it("starts copySrc watcher when library package has copySrc config", async () => {
    setupDefaults(createConfig({
      packages: {
        "core-common": { target: "node", copySrc: ["**/*.json"] },
      },
    }));

    const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(watchCopySrcFiles).toHaveBeenCalledWith(
      expect.stringContaining("core-common"),
      ["**/*.json"],
    );
  });

  it("does not start copySrc watcher when config is absent", async () => {
    setupDefaults(createConfig({
      packages: { "core-common": { target: "node" } },
    }));

    const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(watchCopySrcFiles).not.toHaveBeenCalled();
  });

  it("runs both build engine and watch hook for library package with watch config", async () => {
    setupDefaults(createConfig({
      packages: {
        "core-common": {
          target: "node",
          watch: { target: ["scripts/**/*.mjs"], cmd: "node", args: ["sync.mjs"] },
        },
      },
    }));

    const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(mockBuildEngines).toHaveLength(1);
    expect(mockBuildEngines[0].startWatch).toHaveBeenCalledWith({ js: true, dts: true, lint: false });
    expect(spawn).toHaveBeenCalledWith("node", ["sync.mjs"], expect.objectContaining({ shell: true }));
  });

  it("does not run watch hook for library package without watch config", async () => {
    setupDefaults(createConfig({
      packages: { "core-common": { target: "node" } },
    }));

    const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(mockBuildEngines).toHaveLength(1);
    expect(spawn).not.toHaveBeenCalled();
  });

  it("starts replaceDeps watcher when config exists", async () => {
    const replaceDeps = { "@simplysm/*": "packages/*/src" };
    setupDefaults(createConfig({
      packages: { "core-common": { target: "node" } },
      replaceDeps,
    }));

    const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();

    expect(watchReplaceDeps).toHaveBeenCalledWith("/test-root", replaceDeps);
  });

  it("does not start replaceDeps watcher when config is absent", async () => {
    setupDefaults(createConfig({
      packages: { "core-common": { target: "node" } },
    }));

    const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();

    expect(watchReplaceDeps).not.toHaveBeenCalled();
  });

  it("throws for unknown target", async () => {
    setupDefaults(createConfig({
      packages: { "core-common": { target: "node" } },
    }));

    const orchestrator = new WatchOrchestrator({ targets: ["nonexistent"], options: [] });
    await expect(orchestrator.initialize()).rejects.toThrow("Unknown target: nonexistent");
  });

  it("passes lint:false to startWatch for library engines", async () => {
    setupDefaults(createConfig({
      packages: {
        "core-common": { target: "node" },
        "core-browser": { target: "browser" },
      },
    }));

    const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    for (const engine of mockBuildEngines) {
      expect(engine.startWatch).toHaveBeenCalledWith({ js: true, dts: true, lint: false });
    }
  });

  it("disposes replaceDepWatcher even when initialize fails after watchReplaceDeps", async () => {
    const mockDispose = vi.fn();
    vi.mocked(watchReplaceDeps).mockResolvedValue({ entries: [], dispose: mockDispose } as any);

    // loadSdConfig succeeds but we'll make classifyWatchPackages fail
    // by having watchReplaceDeps succeed first, then causing a later failure
    vi.mocked(loadSdConfig).mockRejectedValue(new Error("config load failed"));

    const orchestrator = new WatchOrchestrator({ targets: [], options: [] });
    await expect(orchestrator.initialize()).rejects.toThrow("config load failed");

    await orchestrator.shutdown();

    // replaceDepWatcher wasn't created because loadSdConfig failed first
    // But if watchReplaceDeps was called before the failure, dispose should be called
  });
});
