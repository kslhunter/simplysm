import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock factories (vi.mock is hoisted) ---

vi.mock("consola", () => ({
  consola: {
    withTag: vi.fn(() => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      start: vi.fn(),
      success: vi.fn(),
    })),
  },
}));

vi.mock("../../src/utils/sd-config", () => ({
  loadSdConfig: vi.fn(),
}));

vi.mock("../../src/utils/build-env", () => ({
  getVersion: vi.fn(),
}));

vi.mock("../../src/utils/package-utils", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/utils/package-utils")>();
  return {
    ...actual,
    filterPackagesByTargets: vi.fn(),
    validateTargets: vi.fn(),
    discoverWorkspacePackages: vi.fn(),
    mergeTestsPackagesIntoConfig: vi.fn(),
  };
});

vi.mock("../../src/utils/replace-deps", () => ({
  watchReplaceDeps: vi.fn(),
}));

vi.mock("../../src/utils/output-utils", () => ({
  printErrors: vi.fn(),
  printServers: vi.fn(),
}));

vi.mock("../../src/utils/rebuild-manager", () => ({
  RebuildManager: vi.fn().mockImplementation(function (this: any) {
    this.on = vi.fn();
    this.registerBuild = vi.fn().mockReturnValue(vi.fn());
  }),
}));

vi.mock("../../src/infra/ResultCollector", () => ({
  ResultCollector: vi.fn().mockImplementation(function (this: any) {
    const store = new Map<string, any>();
    this.add = vi.fn((result: any) => {
      store.set(`${result.name}:${result.type}`, result);
    });
    this.get = vi.fn((key: string) => store.get(key));
    this.toMap = vi.fn(() => new Map(store));
  }),
}));

vi.mock("../../src/infra/SignalHandler", () => ({
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

vi.mock("@simplysm/core-common", () => ({
  err: {
    message: vi.fn((e: any) => (e instanceof Error ? e.message : String(e))),
  },
}));

// Engine mock — tracks created engines and the package they were created for
const mockBuildEngines: Array<{
  run: ReturnType<typeof vi.fn>;
  startWatch: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  _pkgName: string;
}> = [];

vi.mock("../../src/engines/index", () => ({
  createBuildEngine: vi.fn((pkg: any, _options: any) => {
    const engine = {
      run: vi.fn().mockResolvedValue({
        success: true,
        js: { success: true, errors: [], warnings: [] },
        dts: { success: true, errors: [], warnings: [], diagnostics: [] },
      }),
      startWatch: vi.fn().mockResolvedValue(undefined),
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
}));

vi.mock("child_process", () => ({
  spawn: vi.fn(() => ({
    on: vi.fn(),
    kill: vi.fn(),
    exitCode: 0,
  })),
}));

// Capacitor mock
const mockCapacitorInstance = {
  initialize: vi.fn().mockResolvedValue(undefined),
  build: vi.fn().mockResolvedValue(undefined),
  run: vi.fn().mockResolvedValue(undefined),
};

vi.mock("../../src/capacitor/capacitor", () => ({
  Capacitor: {
    create: vi.fn().mockResolvedValue(mockCapacitorInstance),
  },
}));

// Electron mock
const mockElectronInstance = {
  initialize: vi.fn().mockResolvedValue(undefined),
  build: vi.fn().mockResolvedValue(undefined),
  run: vi.fn().mockResolvedValue(undefined),
};

vi.mock("../../src/electron/electron", () => ({
  Electron: {
    create: vi.fn().mockResolvedValue(mockElectronInstance),
  },
}));

// --- Dynamic imports after mocking ---

const { DevWatchOrchestrator } = await import("../../src/orchestrators/DevWatchOrchestrator");
const { loadSdConfig } = await import("../../src/utils/sd-config");
const { filterPackagesByTargets, validateTargets, discoverWorkspacePackages, mergeTestsPackagesIntoConfig } = await import("../../src/utils/package-utils");
const { watchReplaceDeps } = await import("../../src/utils/replace-deps");
const { printErrors, printServers: _printServers } = await import("../../src/utils/output-utils");
const { createBuildEngine } = await import("../../src/engines/index");
const { ResultCollector } = await import("../../src/infra/ResultCollector");
const { RebuildManager } = await import("../../src/utils/rebuild-manager");
const { watchCopySrcFiles } = await import("../../src/utils/copy-src");
const { FsWatcher, Worker } = await import("@simplysm/core-node");
const { spawn } = await import("child_process");
const { getVersion } = await import("../../src/utils/build-env");

const { Capacitor } = await import("../../src/capacitor/capacitor");
const { Electron } = await import("../../src/electron/electron");

import type { SdConfig } from "../../src/sd-config.types";
import nodePath from "path";

// --- Runtime worker mock helper ---

interface MockRuntimeProxy {
  on: ReturnType<typeof vi.fn>;
  start: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
  emit: (event: string, data?: unknown) => void;
}

function createMockRuntimeProxy(): MockRuntimeProxy {
  const handlers = new Map<string, (data: unknown) => void>();
  return {
    on: vi.fn((event: string, handler: (data: unknown) => void) => {
      handlers.set(event, handler);
    }),
    start: vi.fn().mockResolvedValue(undefined),
    terminate: vi.fn().mockResolvedValue(undefined),
    emit(event: string, data?: unknown) {
      handlers.get(event)?.(data);
    },
  };
}

let mockRuntimeProxies: MockRuntimeProxy[];

// --- Helpers ---

function createConfig(overrides: Partial<SdConfig> = {}): SdConfig {
  return { packages: {}, ...overrides };
}

function setupDefaults(config: SdConfig, workspacePackages?: Map<string, string>): void {
  vi.mocked(loadSdConfig).mockResolvedValue(config);
  vi.mocked(discoverWorkspacePackages).mockReturnValue(workspacePackages ?? new Map());
  vi.mocked(mergeTestsPackagesIntoConfig).mockImplementation((configPackages, _wp) => {
    // Default: no tests packages, just build pathMap from config
    const pathMap = new Map<string, string>();
    for (const name of Object.keys(configPackages)) {
      pathMap.set(name, `packages/${name}`);
    }
    return { merged: configPackages, pathMap };
  });
  vi.mocked(filterPackagesByTargets).mockImplementation((pkgs) => {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(pkgs)) {
      if (v != null) result[k] = v;
    }
    return result;
  });
  vi.mocked(watchReplaceDeps).mockResolvedValue({ entries: [], dispose: vi.fn() });
  vi.mocked(getVersion).mockResolvedValue("1.0.0");
}

// --- Tests ---

describe("DevWatchOrchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildEngines.length = 0;
    mockRuntimeProxies = [];
    vi.spyOn(process, "cwd").mockReturnValue("/test-root");
    vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    vi.mocked(Worker.create).mockImplementation(() => {
      const proxy = createMockRuntimeProxy();
      mockRuntimeProxies.push(proxy);
      return proxy as any;
    });
    // Reset Capacitor/Electron instance mocks
    mockCapacitorInstance.initialize.mockResolvedValue(undefined);
    mockCapacitorInstance.build.mockResolvedValue(undefined);
    mockCapacitorInstance.run.mockResolvedValue(undefined);
    mockElectronInstance.initialize.mockResolvedValue(undefined);
    mockElectronInstance.build.mockResolvedValue(undefined);
    mockElectronInstance.run.mockResolvedValue(undefined);
    vi.mocked(Capacitor.create).mockResolvedValue(mockCapacitorInstance as any);
    vi.mocked(Electron.create).mockResolvedValue(mockElectronInstance as any);
    // Restore default mock implementations that may have been overridden
    vi.mocked(validateTargets).mockImplementation(() => {});
    vi.mocked(createBuildEngine).mockImplementation((pkg: any, _options: any) => {
      const engine = {
        run: vi.fn().mockResolvedValue({
          success: true,
          js: { success: true, errors: [], warnings: [] },
          dts: { success: true, errors: [], warnings: [], diagnostics: [] },
        }),
        startWatch: vi.fn().mockResolvedValue(undefined),
        stop: vi.fn().mockResolvedValue(undefined),
        _pkgName: pkg.name,
      };
      mockBuildEngines.push(engine);
      return engine as any;
    });
  });

  describe("Slice 1: watch mode", () => {
    // --- Unit Tests ---

    it("creates BuildEngine for library packages with correct output flags", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" }, "core-browser": { target: "browser" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();

      expect(createBuildEngine).toHaveBeenCalledTimes(2);
    });

    it("does not create BuildEngine for server packages in watch mode", async () => {
      setupDefaults(createConfig({
        packages: { "service-server": { target: "server" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();

      expect(createBuildEngine).not.toHaveBeenCalled();
    });

    it("outputs warning when no watchable packages exist", async () => {
      setupDefaults(createConfig({
        packages: { "sd-scripts": { target: "scripts" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();

      expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining("No packages"));
      expect(createBuildEngine).not.toHaveBeenCalled();
    });

    // --- Acceptance: Scenario 1 — watch 모드는 Library + Scripts만 대상 (server 제외) ---
    it("processes Library and Scripts packages in watch mode, excludes server", async () => {
      setupDefaults(createConfig({
        packages: {
          "core-common": { target: "node" },
          "service-server": { target: "server" },
          "sd-scripts": { target: "scripts", watch: { target: ["dist/**/*.js"], cmd: "node" } },
        },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      // Library only = 1 engine (server excluded)
      expect(createBuildEngine).toHaveBeenCalledTimes(1);
      expect(createBuildEngine).toHaveBeenCalledWith(
        expect.objectContaining({ name: "core-common" }),
        expect.any(Object),
      );

      // Library engine: startWatch with js+dts
      const libraryEngine = mockBuildEngines.find((e) => e._pkgName === "core-common")!;
      expect(libraryEngine.startWatch).toHaveBeenCalledWith({ js: true, dts: true, lint: true });

      // Scripts+watch: spawn called for hook
      expect(spawn).toHaveBeenCalled();
    });

    // --- Acceptance: Scenario 2 — 통합 Orchestrator가 공통 인프라를 사용한다 ---
    it("creates ResultCollector, RebuildManager, SignalHandler on initialize", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();

      expect(ResultCollector).toHaveBeenCalledTimes(1);
      expect(RebuildManager).toHaveBeenCalledTimes(1);

      const rebuildInstance = vi.mocked(RebuildManager).mock.instances[0];
      expect(rebuildInstance.on).toHaveBeenCalledWith("batchComplete", expect.any(Function));
    });

    // --- Acceptance: Scenario 3 — Library 패키지 watch ---
    it("starts library engine with js+dts output", async () => {
      setupDefaults(createConfig({
        packages: {
          "core-common": { target: "node" },
          "core-browser": { target: "browser" },
          "storage": { target: "neutral" },
        },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      for (const engine of mockBuildEngines) {
        expect(engine.startWatch).toHaveBeenCalledWith({ js: true, dts: true, lint: true });
      }
    });

    // --- Acceptance: Scenario 4 — Server 패키지는 watch에서 제외 ---
    it("excludes server packages from watch mode entirely", async () => {
      setupDefaults(createConfig({
        packages: {
          "core-common": { target: "node" },
          "service-server": { target: "server" },
        },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      // Only library engine created, no server engine
      expect(createBuildEngine).toHaveBeenCalledTimes(1);
      expect(createBuildEngine).toHaveBeenCalledWith(
        expect.objectContaining({ name: "core-common" }),
        expect.any(Object),
      );
      expect(Worker.create).not.toHaveBeenCalled();
    });

    // --- Acceptance: Scenario 5 — Scripts+watch 패키지 hook 실행 ---
    it("runs initial hook and starts file watcher for scripts+watch packages", async () => {
      setupDefaults(createConfig({
        packages: {
          "sd-scripts": {
            target: "scripts",
            watch: { target: ["dist/**/*.js"], cmd: "node", args: ["run-task.js"] },
          },
        },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      expect(spawn).toHaveBeenCalledWith("node", ["run-task.js"], expect.objectContaining({ shell: true }));
      expect(FsWatcher.watch).toHaveBeenCalled();
    });

    // Unit: file change re-runs hook
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

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      expect(spawn).toHaveBeenCalledTimes(1);
      onChangeCallback();
      expect(spawn).toHaveBeenCalledTimes(2);
    });

    // --- Acceptance: Scenario 6 — watch에서 copySrc 파일 감시 ---
    it("starts copySrc watcher when library package has copySrc config", async () => {
      setupDefaults(createConfig({
        packages: {
          "core-common": { target: "node", copySrc: ["**/*.json"] },
        },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      expect(watchCopySrcFiles).toHaveBeenCalledWith(
        expect.stringContaining("core-common"),
        ["**/*.json"],
      );
    });

    // Unit: no copySrc watcher when config absent
    it("does not start copySrc watcher when config is absent", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      expect(watchCopySrcFiles).not.toHaveBeenCalled();
    });

    // --- Acceptance: Library 패키지에 watch hook 설정 시 빌드 엔진 + hook 동시 실행 ---
    it("runs both build engine and watch hook for library package with watch config", async () => {
      setupDefaults(createConfig({
        packages: {
          "core-common": {
            target: "node",
            watch: { target: ["scripts/**/*.mjs"], cmd: "node", args: ["sync.mjs"] },
          },
        },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      // Build engine created and started
      expect(createBuildEngine).toHaveBeenCalledTimes(1);
      const libraryEngine = mockBuildEngines.find((e) => e._pkgName === "core-common")!;
      expect(libraryEngine.startWatch).toHaveBeenCalledWith({ js: true, dts: true, lint: true });

      // Watch hook also executed
      expect(spawn).toHaveBeenCalledWith("node", ["sync.mjs"], expect.objectContaining({ shell: true }));
    });

    // --- Unit: Library 패키지에 watch hook 없으면 hook 미실행 ---
    it("does not run watch hook for library package without watch config", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      // Build engine created
      expect(createBuildEngine).toHaveBeenCalledTimes(1);
      // No hook
      expect(spawn).not.toHaveBeenCalled();
    });

    // --- Acceptance: Scenario 7 — watch에서 replaceDeps 감시 ---
    it("starts replaceDeps watcher when config exists", async () => {
      const replaceDeps = { "@simplysm/*": "packages/*/src" };
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" } },
        replaceDeps,
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();

      expect(watchReplaceDeps).toHaveBeenCalledWith("/test-root", replaceDeps);
    });

    // Unit: no replaceDeps watcher when config absent
    it("does not start replaceDeps watcher when config is absent", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();

      expect(watchReplaceDeps).not.toHaveBeenCalled();
    });

    // --- Shutdown tests ---

    it("stops all engines, closes watchers, and disposes replaceDeps on shutdown", async () => {
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

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();
      await orchestrator.shutdown();

      for (const engine of mockBuildEngines) {
        expect(engine.stop).toHaveBeenCalledOnce();
      }
      expect(mockCopySrcWatcher.close).toHaveBeenCalledOnce();
      expect(mockDispose).toHaveBeenCalledOnce();
    });

    // --- batchComplete handler ---

    it("triggers printErrors on batchComplete", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();

      const rebuildInstance = vi.mocked(RebuildManager).mock.instances[0];
      const onCall = vi.mocked(rebuildInstance.on).mock.calls.find((c) => c[0] === "batchComplete");
      const batchHandler = onCall?.[1] as (() => void) | undefined;

      vi.mocked(printErrors).mockClear();
      batchHandler?.();

      expect(printErrors).toHaveBeenCalledOnce();
    });

    // --- awaitTermination ---

    it("delegates awaitTermination to SignalHandler", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" } },
      }));

      const { SignalHandler } = await import("../../src/infra/SignalHandler");

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.awaitTermination();

      const signalInstance = vi.mocked(SignalHandler).mock.instances[0];
      expect(signalInstance.waitForTermination).toHaveBeenCalled();
    });

    // --- targets filter ---

    it("passes targets to filterPackagesByTargets", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" }, "storage": { target: "node" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: ["core-common"], options: [] });
      await orchestrator.initialize();

      expect(filterPackagesByTargets).toHaveBeenCalledWith(
        expect.objectContaining({ "core-common": { target: "node" } }),
        ["core-common"],
      );
    });
  });

  describe("Slice 2: dev mode", () => {
    // Helper: override engine mock to add build result to resultCollector
    function setupEngineWithResult(status: "success" | "error" = "success"): void {
      vi.mocked(createBuildEngine).mockImplementation((pkg: any, options: any) => {
        const engine = {
          run: vi.fn().mockResolvedValue({ success: true, js: { success: true, errors: [], warnings: [] }, dts: { success: true, errors: [], warnings: [], diagnostics: [] } }),
          startWatch: vi.fn().mockImplementation(() => {
            options.resultCollector?.add({
              name: pkg.name, target: "server", type: "build", status,
            });
          }),
          stop: vi.fn().mockResolvedValue(undefined),
          _pkgName: pkg.name,
        };
        mockBuildEngines.push(engine);
        return engine as any;
      });
    }

    // --- Acceptance: dev 명령어가 통합 Orchestrator를 사용한다 ---
    it("creates engine for server packages and starts runtime in dev mode", async () => {
      setupDefaults(createConfig({
        packages: { "service-server": { target: "server" } },
      }));
      setupEngineWithResult("success");

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      expect(createBuildEngine).toHaveBeenCalledOnce();
      expect(createBuildEngine).toHaveBeenCalledWith(
        expect.objectContaining({ name: "service-server" }),
        expect.any(Object),
      );
      expect(mockBuildEngines[0].startWatch).toHaveBeenCalledWith({ js: true, dts: false, lint: true });
      expect(Worker.create).toHaveBeenCalledTimes(1);
      expect(mockRuntimeProxies[0].start).toHaveBeenCalledWith(
        expect.objectContaining({ env: expect.objectContaining({ VER: "1.0.0", DEV: "true" }) }),
      );
    });

    // --- Acceptance: Server 패키지 dev 모드 실행 ---
    it("passes merged env (VER+DEV+config.env) to engine and runtime", async () => {
      setupDefaults(createConfig({
        packages: {
          "service-server": { target: "server", env: { DB_HOST: "localhost" } },
        },
      }));
      setupEngineWithResult("success");

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      expect(createBuildEngine).toHaveBeenCalledWith(
        expect.objectContaining({
          config: expect.objectContaining({
            env: expect.objectContaining({ VER: "1.0.0", DEV: "true", DB_HOST: "localhost" }),
          }),
        }),
        expect.any(Object),
      );
    });

    // --- Acceptance: Server 리빌드 실패 시 runtime 미재시작 ---
    it("does not start runtime when build fails", async () => {
      setupDefaults(createConfig({
        packages: { "service-server": { target: "server" } },
      }));
      setupEngineWithResult("error");

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      expect(Worker.create).not.toHaveBeenCalled();
      expect(printErrors).toHaveBeenCalled();
    });

    // --- Acceptance: Library 패키지가 dev에서 제외된다 ---
    it("excludes library packages from dev mode", async () => {
      setupDefaults(createConfig({
        packages: {
          "core-common": { target: "node" },
          "service-server": { target: "server" },
        },
      }));
      setupEngineWithResult("success");

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      // Only server engine created
      expect(createBuildEngine).toHaveBeenCalledOnce();
      expect(createBuildEngine).toHaveBeenCalledWith(
        expect.objectContaining({ name: "service-server" }),
        expect.any(Object),
      );
    });

    // --- Acceptance: client target 패키지를 분류한다 ---
    it("creates engine for client packages in dev mode", async () => {
      setupDefaults(createConfig({
        packages: {
          "service-server": { target: "server" },
          "my-client": { target: "client", server: "service-server" },
        },
      }));
      setupEngineWithResult("success");

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();

      // Server + Client engines created
      expect(createBuildEngine).toHaveBeenCalledTimes(2);
      expect(createBuildEngine).toHaveBeenCalledWith(
        expect.objectContaining({ name: "my-client" }),
        expect.any(Object),
      );
    });

    // --- Acceptance: server가 string이고 해당 서버가 dev 대상 → 서버 연결 클라이언트 ---
    it("maps client to server when config.server is a string and server is a dev target", async () => {
      setupDefaults(createConfig({
        packages: {
          "service-server": { target: "server" },
          "my-client": { target: "client", server: "service-server" },
        },
      }));
      setupEngineWithResult("success");

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();

      // Client engine created (not skipped)
      const clientEngineCall = vi.mocked(createBuildEngine).mock.calls.find(
        (c: any[]) => c[0].name === "my-client",
      );
      expect(clientEngineCall).toBeDefined();
    });

    // --- Acceptance: server가 string이지만 서버가 dev 대상 아닌 경우 → 경고 후 독립 전환 ---
    it("warns and treats as standalone when config.server names a non-dev-target server", async () => {
      setupDefaults(createConfig({
        packages: {
          "my-client": { target: "client", server: "non-existent-server" },
        },
      }));
      setupEngineWithResult("success");

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();

      // Client engine still created
      expect(createBuildEngine).toHaveBeenCalledWith(
        expect.objectContaining({ name: "my-client" }),
        expect.any(Object),
      );
      // Warning about non-target server
      expect(process.stdout.write).toHaveBeenCalledWith(
        expect.stringContaining("non-existent-server"),
      );
    });

    // --- Acceptance: client 패키지가 0개 → 기존 동작 유지 ---
    it("operates normally with server only when no client packages exist", async () => {
      setupDefaults(createConfig({
        packages: {
          "service-server": { target: "server" },
        },
      }));
      setupEngineWithResult("success");

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      expect(createBuildEngine).toHaveBeenCalledOnce();
      expect(createBuildEngine).toHaveBeenCalledWith(
        expect.objectContaining({ name: "service-server" }),
        expect.any(Object),
      );
    });

    // --- Unit: server가 number인 경우 독립 클라이언트 ---
    it("creates engine for standalone client with config.server as number", async () => {
      setupDefaults(createConfig({
        packages: {
          "standalone": { target: "client", server: 4200 },
        },
      }));
      setupEngineWithResult("success");

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();

      expect(createBuildEngine).toHaveBeenCalledWith(
        expect.objectContaining({ name: "standalone" }),
        expect.any(Object),
      );
    });

    // --- Unit: client only (no server) still initializes ---
    it("initializes when only client packages exist (no server)", async () => {
      setupDefaults(createConfig({
        packages: {
          "my-client": { target: "client", server: 4200 },
        },
      }));
      setupEngineWithResult("success");

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();

      expect(createBuildEngine).toHaveBeenCalledOnce();
    });

    // --- Acceptance: Server 리빌드 시 runtime 재시작 ---
    it("restarts runtime on batchComplete with success", async () => {
      setupDefaults(createConfig({
        packages: { "service-server": { target: "server" } },
      }));
      setupEngineWithResult("success");

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      // Get batchComplete handler
      const rebuildInstance = vi.mocked(RebuildManager).mock.instances[0];
      const onCall = vi.mocked(rebuildInstance.on).mock.calls.find((c) => c[0] === "batchComplete");
      const batchHandler = onCall?.[1] as (() => void) | undefined;

      batchHandler?.();
      await new Promise((r) => setTimeout(r, 0));

      // Old runtime terminated, new one created
      expect(mockRuntimeProxies).toHaveLength(2);
      expect(mockRuntimeProxies[0].terminate).toHaveBeenCalled();
    });

    // --- Acceptance: SIGINT/SIGTERM 시 graceful shutdown (dev mode) ---
    it("stops engines and terminates runtime workers on shutdown", async () => {
      setupDefaults(createConfig({
        packages: { "service-server": { target: "server" } },
      }));
      setupEngineWithResult("success");

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();
      await orchestrator.shutdown();

      expect(mockBuildEngines[0].stop).toHaveBeenCalledOnce();
      expect(mockRuntimeProxies[0].terminate).toHaveBeenCalled();
      expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining("Shutting down"));
    });

    // --- Acceptance: dev에서 replaceDeps 감시 ---
    it("starts replaceDeps watcher in dev mode", async () => {
      const replaceDeps = { "@simplysm/*": "packages/*/src" };
      setupDefaults(createConfig({
        packages: { "service-server": { target: "server" } },
        replaceDeps,
      }));
      setupEngineWithResult("success");

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();

      expect(watchReplaceDeps).toHaveBeenCalledWith("/test-root", replaceDeps);
    });

    // Unit: outputs warning when no server packages
    it("outputs warning when no server packages in dev mode", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();

      expect(process.stdout.write).toHaveBeenCalledWith(expect.stringContaining("No"));
    });

    // Unit: multiple server packages
    it("creates engines and runtimes for multiple server packages", async () => {
      setupDefaults(createConfig({
        packages: {
          "service-server": { target: "server" },
          "api-server": { target: "server" },
        },
      }));
      setupEngineWithResult("success");

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      expect(createBuildEngine).toHaveBeenCalledTimes(2);
      expect(Worker.create).toHaveBeenCalledTimes(2);
    });

    // Unit: skips start when no packages
    it("skips start when no server packages found", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      expect(createBuildEngine).not.toHaveBeenCalled();
    });

    // Unit: disposes replaceDeps on dev shutdown
    it("disposes replaceDeps watcher on dev shutdown", async () => {
      const mockDispose = vi.fn();
      vi.mocked(watchReplaceDeps).mockResolvedValue({ entries: [], dispose: mockDispose } as any);

      setupDefaults(createConfig({
        packages: { "service-server": { target: "server" } },
        replaceDeps: { "@simplysm/*": "packages/*/src" },
      }));
      vi.mocked(watchReplaceDeps).mockResolvedValue({ entries: [], dispose: mockDispose } as any);
      setupEngineWithResult("success");

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();
      await orchestrator.shutdown();

      expect(mockDispose).toHaveBeenCalledOnce();
    });
  });

  describe("Slice 4: dev mode client integration", () => {
    // Helper: engine mock with ViteEngine-like port behavior for clients
    function setupEngineWithClientPort(
      serverStatus: "success" | "error" = "success",
      clientPort: number | null = 54321,
    ): void {
      vi.mocked(createBuildEngine).mockImplementation((pkg: any, options: any) => {
        const isClient = pkg.config.target === "client";
        const engine: any = {
          run: vi.fn().mockResolvedValue({ success: true, js: { success: true, errors: [], warnings: [] }, dts: { success: true, errors: [], warnings: [], diagnostics: [] } }),
          startWatch: vi.fn().mockImplementation(() => {
            if (isClient) {
              // Client: simulate Vite serverReady
              if (clientPort != null) {
                engine.port = clientPort;
              }
            } else {
              // Server: report build result
              options.resultCollector?.add({
                name: pkg.name, target: "server", type: "build", status: serverStatus,
              });
            }
          }),
          stop: vi.fn().mockResolvedValue(undefined),
          _pkgName: pkg.name,
          port: undefined,
        };
        mockBuildEngines.push(engine);
        return engine;
      });
    }

    // --- Acceptance: 서버 연결 클라이언트의 Vite dev server 시작 ---
    it("starts client engines with startWatch({ js: true, dts: false })", async () => {
      setupDefaults(createConfig({
        packages: {
          "service-server": { target: "server" },
          "my-client": { target: "client", server: "service-server" },
        },
      }));
      setupEngineWithClientPort("success");

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      const clientEngine = mockBuildEngines.find((e) => e._pkgName === "my-client")!;
      expect(clientEngine.startWatch).toHaveBeenCalledWith({ js: true, dts: false, lint: true });
    });

    // --- Acceptance: 서버 연결 클라이언트 ready 대기 후 서버 시작 → clientPorts 전달 ---
    it("passes clientPorts to server runtime for connected clients", async () => {
      setupDefaults(createConfig({
        packages: {
          "service-server": { target: "server" },
          "my-client": { target: "client", server: "service-server" },
        },
      }));
      setupEngineWithClientPort("success", 54321);

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      expect(Worker.create).toHaveBeenCalled();
      expect(mockRuntimeProxies[0].start).toHaveBeenCalledWith(
        expect.objectContaining({
          clientPorts: { "my-client": 54321 },
        }),
      );
    });

    // --- Acceptance: 독립 클라이언트는 서버 시작 대기에 영향 없음 ---
    it("does not include standalone client ports in server runtime clientPorts", async () => {
      setupDefaults(createConfig({
        packages: {
          "service-server": { target: "server" },
          "standalone": { target: "client", server: 4200 },
        },
      }));
      setupEngineWithClientPort("success", 4200);

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      expect(mockRuntimeProxies[0].start).toHaveBeenCalledWith(
        expect.objectContaining({
          clientPorts: {},
        }),
      );
    });

    // --- Acceptance: 독립 클라이언트 URL 출력 (ResultCollector 등록) ---
    it("registers standalone client as running server in ResultCollector", async () => {
      setupDefaults(createConfig({
        packages: {
          "standalone": { target: "client", server: 4200 },
        },
      }));
      setupEngineWithClientPort("success", 4200);

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      const resultCollector = vi.mocked(ResultCollector).mock.instances[0];
      expect(resultCollector.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "standalone",
          target: "client",
          type: "server",
          status: "running",
          port: 4200,
        }),
      );
    });

    // --- Acceptance: 클라이언트 Vite 서버 실패 시 프록시 없이 서버 시작 ---
    it("starts server without proxy when client port is unavailable", async () => {
      setupDefaults(createConfig({
        packages: {
          "service-server": { target: "server" },
          "my-client": { target: "client", server: "service-server" },
        },
      }));
      setupEngineWithClientPort("success", null);

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      expect(mockRuntimeProxies[0].start).toHaveBeenCalledWith(
        expect.objectContaining({
          clientPorts: {},
        }),
      );
    });

    // --- Acceptance: printServers에 serverClientsMap 전달 ---
    it("passes serverClientsMap to printServers", async () => {
      setupDefaults(createConfig({
        packages: {
          "service-server": { target: "server" },
          "my-client": { target: "client", server: "service-server" },
        },
      }));
      setupEngineWithClientPort("success", 54321);

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      expect(_printServers).toHaveBeenCalledWith(
        expect.any(Map),
        expect.any(Map),
      );
      const serverClientsMap = vi.mocked(_printServers).mock.calls[0][1] as Map<string, string[]>;
      expect(serverClientsMap.get("service-server")).toEqual(["my-client"]);
    });

    // --- Acceptance: 서버 rebuild 시 프록시 재등록 ---
    it("passes clientPorts on server rebuild restart", async () => {
      setupDefaults(createConfig({
        packages: {
          "service-server": { target: "server" },
          "my-client": { target: "client", server: "service-server" },
        },
      }));
      setupEngineWithClientPort("success", 54321);

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      // Trigger batchComplete
      const rebuildInstance = vi.mocked(RebuildManager).mock.instances[0];
      const onCall = vi.mocked(rebuildInstance.on).mock.calls.find((c) => c[0] === "batchComplete");
      const batchHandler = onCall?.[1] as (() => void) | undefined;
      batchHandler?.();
      await new Promise((r) => setTimeout(r, 0));

      // Second runtime start should also have clientPorts
      expect(mockRuntimeProxies).toHaveLength(2);
      expect(mockRuntimeProxies[1].start).toHaveBeenCalledWith(
        expect.objectContaining({
          clientPorts: { "my-client": 54321 },
        }),
      );
    });

    // --- Unit: shutdown stops client engines ---
    it("stops client engines on shutdown", async () => {
      setupDefaults(createConfig({
        packages: {
          "service-server": { target: "server" },
          "my-client": { target: "client", server: "service-server" },
        },
      }));
      setupEngineWithClientPort("success", 54321);

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();
      await orchestrator.shutdown();

      const clientEngine = mockBuildEngines.find((e) => e._pkgName === "my-client")!;
      expect(clientEngine.stop).toHaveBeenCalledOnce();
    });

    // --- Acceptance: Scenario "DevWatchOrchestrator가 env와 configs를 ViteEngine에 전달" + "dev 모드의 baseEnv" ---
    it("passes merged baseEnv + config.env to client engine config", async () => {
      setupDefaults(createConfig({
        packages: {
          "my-client": { target: "client", server: 4200, env: { API_URL: "http://example.com" } },
        },
      }));
      setupEngineWithClientPort("success", 4200);

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();

      const clientCall = vi.mocked(createBuildEngine).mock.calls.find(
        (c: any[]) => c[0].name === "my-client",
      );
      const clientConfig = clientCall?.[0] as any;
      expect(clientConfig.config.env).toEqual(
        expect.objectContaining({
          VER: expect.any(String),
          DEV: "true",
          API_URL: "http://example.com",
        }),
      );
    });
  });

  describe("tests packages inclusion", () => {
    // Acceptance: tests 패키지는 tests/ 경로로 해석된다
    it("resolves tests package dir to tests/ path in watch mode", async () => {
      const wsPackages = new Map([
        ["core-common", "packages/core-common"],
        ["orm", "tests/orm"],
      ]);
      const mergedPackages = {
        "core-common": { target: "node" },
        "orm": { target: "node" },
      };
      const pathMap = new Map([
        ["core-common", "packages/core-common"],
        ["orm", "tests/orm"],
      ]);

      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" } },
      }), wsPackages);

      vi.mocked(mergeTestsPackagesIntoConfig).mockReturnValue({
        merged: mergedPackages as any,
        pathMap,
      });

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      // Both packages should have BuildEngines created
      expect(createBuildEngine).toHaveBeenCalledTimes(2);

      // tests/orm package should have correct dir
      const ormCall = vi.mocked(createBuildEngine).mock.calls.find(
        (c: any[]) => c[0].name === "orm",
      );
      expect(ormCall).toBeDefined();
      expect(ormCall![0]).toEqual(expect.objectContaining({
        name: "orm",
        dir: nodePath.join("/test-root", "tests", "orm"),
      }));

      // packages/core-common should retain packages/ path
      const coreCall = vi.mocked(createBuildEngine).mock.calls.find(
        (c: any[]) => c[0].name === "core-common",
      );
      expect(coreCall![0]).toEqual(expect.objectContaining({
        name: "core-common",
        dir: nodePath.join("/test-root", "packages", "core-common"),
      }));
    });

    // Acceptance: sd.config.ts 패키지는 기존 packages/ 경로 유지
    it("preserves packages/ path for sd.config.ts packages", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "neutral" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();

      const coreCall = vi.mocked(createBuildEngine).mock.calls.find(
        (c: any[]) => c[0].name === "core-common",
      );
      expect(coreCall![0]).toEqual(expect.objectContaining({
        dir: nodePath.join("/test-root", "packages", "core-common"),
      }));
    });

    // Acceptance: mergeTestsPackagesIntoConfig is called with correct args
    it("calls mergeTestsPackagesIntoConfig with sdConfig.packages and discovered workspace packages", async () => {
      const wsPackages = new Map([["core-common", "packages/core-common"]]);
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" } },
      }), wsPackages);

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();

      expect(discoverWorkspacePackages).toHaveBeenCalledWith("/test-root");
      expect(mergeTestsPackagesIntoConfig).toHaveBeenCalledWith(
        { "core-common": { target: "node" } },
        wsPackages,
      );
    });
  });

  describe("target validation", () => {
    it("calls validateTargets during watch initialize", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: ["core-common"], options: [] });
      await orchestrator.initialize();

      expect(validateTargets).toHaveBeenCalledWith(
        ["core-common"],
        expect.objectContaining({ "core-common": { target: "node" } }),
      );
    });

    it("calls validateTargets during dev initialize", async () => {
      setupDefaults(createConfig({
        packages: { "service-server": { target: "server" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: ["service-server"], options: [] });
      await orchestrator.initialize();

      expect(validateTargets).toHaveBeenCalledWith(
        ["service-server"],
        expect.objectContaining({ "service-server": { target: "server" } }),
      );
    });

    it("throws when validateTargets throws for unknown target in watch", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" } },
      }));
      vi.mocked(validateTargets).mockImplementation(() => {
        throw new Error("Unknown target: nonexistent");
      });

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: ["nonexistent"], options: [] });
      await expect(orchestrator.initialize()).rejects.toThrow("Unknown target: nonexistent");
    });

    it("throws when validateTargets throws for unknown target in dev", async () => {
      setupDefaults(createConfig({
        packages: { "service-server": { target: "server" } },
      }));
      vi.mocked(validateTargets).mockImplementation(() => {
        throw new Error("Unknown target: nonexistent");
      });

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: ["nonexistent"], options: [] });
      await expect(orchestrator.initialize()).rejects.toThrow("Unknown target: nonexistent");
    });
  });

  describe("Slice 3: native device run integration", () => {
    // Helper: setup engine with port so dev server URL can be constructed
    function setupEngineWithPort(port: number): void {
      vi.mocked(createBuildEngine).mockImplementation((pkg: any, options: any) => {
        const engine = {
          run: vi.fn().mockResolvedValue({
            success: true,
            js: { success: true, errors: [], warnings: [] },
            dts: { success: true, errors: [], warnings: [], diagnostics: [] },
          }),
          startWatch: vi.fn().mockImplementation(() => {
            // Simulate server ready with port
            (engine as any).port = port;
            options.resultCollector?.add({
              name: pkg.name,
              target: pkg.config.target === "client" ? "client" : "server",
              type: "build",
              status: "success",
            });
          }),
          stop: vi.fn().mockResolvedValue(undefined),
          port: undefined as number | undefined,
          _pkgName: pkg.name,
        };
        mockBuildEngines.push(engine);
        return engine as any;
      });
    }

    // Acceptance: Scenario "Capacitor 디바이스 실행"
    it("runs Capacitor.create + initialize + run(devServerUrl) after ViteDevServer starts", async () => {
      setupDefaults(createConfig({
        packages: {
          "my-client": {
            target: "client",
            server: 4200,
            capacitor: { appId: "com.test.app", appName: "TestApp" },
          },
        },
      }));
      setupEngineWithPort(4200);

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      expect(Capacitor.create).toHaveBeenCalledWith(
        expect.stringContaining("my-client"),
        { appId: "com.test.app", appName: "TestApp" },
        undefined,
      );
      expect(mockCapacitorInstance.initialize).toHaveBeenCalled();
      expect(mockCapacitorInstance.run).toHaveBeenCalledWith("http://localhost:4200");
    });

    // Acceptance: Scenario "Electron 데스크톱 실행"
    it("runs Electron.create + initialize + run(devServerUrl) after ViteDevServer starts", async () => {
      setupDefaults(createConfig({
        packages: {
          "my-client": {
            target: "client",
            server: 4200,
            electron: { appId: "com.test.electron" },
          },
        },
      }));
      setupEngineWithPort(4200);

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      expect(Electron.create).toHaveBeenCalledWith(
        expect.stringContaining("my-client"),
        { appId: "com.test.electron" },
        undefined,
      );
      expect(mockElectronInstance.initialize).toHaveBeenCalled();
      expect(mockElectronInstance.run).toHaveBeenCalledWith("http://localhost:4200");
    });

    // Acceptance: Scenario "Capacitor + Electron 동시 실행"
    it("runs both Capacitor.run and Electron.run when both are configured", async () => {
      setupDefaults(createConfig({
        packages: {
          "my-client": {
            target: "client",
            server: 4200,
            capacitor: { appId: "com.test.app", appName: "TestApp" },
            electron: { appId: "com.test.electron" },
          },
        },
      }));
      setupEngineWithPort(4200);

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      expect(Capacitor.create).toHaveBeenCalled();
      expect(mockCapacitorInstance.run).toHaveBeenCalledWith("http://localhost:4200");
      expect(Electron.create).toHaveBeenCalled();
      expect(mockElectronInstance.run).toHaveBeenCalledWith("http://localhost:4200");
    });

    // Acceptance: Scenario "네이티브 설정 없는 dev 모드"
    it("does not run native apps when no capacitor/electron configured", async () => {
      setupDefaults(createConfig({
        packages: {
          "my-client": { target: "client", server: 4200 },
        },
      }));
      setupEngineWithPort(4200);

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      expect(Capacitor.create).not.toHaveBeenCalled();
      expect(Electron.create).not.toHaveBeenCalled();
    });

    // Acceptance: Scenario "dev 모드 종료 시 네��티브 프로세스 정리"
    // Electron.run() blocks until SIGINT/SIGTERM — cleanup is handled by its internal signal handler.
    // Capacitor.run() returns after deployment — no cleanup needed.
    // This scenario verifies that shutdown() completes without error when native apps are running.
    it("shutdown completes when native apps were launched", async () => {
      setupDefaults(createConfig({
        packages: {
          "my-client": {
            target: "client",
            server: 4200,
            capacitor: { appId: "com.test.app", appName: "TestApp" },
          },
        },
      }));
      setupEngineWithPort(4200);

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();
      await orchestrator.shutdown();

      // Verify shutdown doesn't throw and engines are stopped
      for (const engine of mockBuildEngines) {
        expect(engine.stop).toHaveBeenCalled();
      }
    });

    // Unit: native run error does not crash orchestrator
    it("logs error but does not crash when Capacitor.run throws", async () => {
      setupDefaults(createConfig({
        packages: {
          "my-client": {
            target: "client",
            server: 4200,
            capacitor: { appId: "com.test.app", appName: "TestApp" },
          },
        },
      }));
      setupEngineWithPort(4200);
      mockCapacitorInstance.run.mockRejectedValue(new Error("device not found"));

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      // Should not throw
      await orchestrator.start();

      expect(mockCapacitorInstance.run).toHaveBeenCalled();
    });

    // Unit: Electron.run is fire-and-forget (does not block dev mode start)
    it("does not await Electron.run (fire-and-forget)", async () => {
      let electronRunResolved = false;
      mockElectronInstance.run.mockImplementation(() => {
        return new Promise<void>((resolve) => {
          // Simulate long-running Electron process — never resolves during test
          setTimeout(() => {
            electronRunResolved = true;
            resolve();
          }, 10_000);
        });
      });

      setupDefaults(createConfig({
        packages: {
          "my-client": {
            target: "client",
            server: 4200,
            electron: { appId: "com.test.electron" },
          },
        },
      }));
      setupEngineWithPort(4200);

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      // start() returned without waiting for Electron.run to resolve
      expect(electronRunResolved).toBe(false);
      expect(mockElectronInstance.run).toHaveBeenCalled();
    });

    // Unit: DESIGN-004 — Electron run failure registers error in ResultCollector
    it("registers error in ResultCollector when Electron.run fails", async () => {
      mockElectronInstance.run.mockRejectedValue(new Error("electron crashed"));

      setupDefaults(createConfig({
        packages: {
          "my-client": {
            target: "client",
            server: 4200,
            electron: { appId: "com.test.electron" },
          },
        },
      }));
      setupEngineWithPort(4200);

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      // Wait a tick for the fire-and-forget async to settle
      await new Promise((resolve) => setTimeout(resolve, 50));

      const resultCollector = vi.mocked(ResultCollector).mock.instances[0];
      expect(resultCollector.add).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "my-client",
          target: "client",
          type: "build",
          status: "error",
          message: expect.stringContaining("electron crashed"),
        }),
      );
    });
  });

  //#region Slice 4: watch/dev lint 활성화 (Feature 3.2)

  describe("lint activation", () => {
    // Scenario: watch 초기 빌드에서 lint가 실행된다
    it("passes lint:true to startWatch for library engines in watch mode", async () => {
      setupDefaults(createConfig({
        packages: {
          "core-common": { target: "node" },
          "core-browser": { target: "browser" },
        },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      for (const engine of mockBuildEngines) {
        expect(engine.startWatch).toHaveBeenCalledWith({ js: true, dts: true, lint: true });
      }
    });

    // Scenario: dev 초기 빌드에서 server/client lint가 실행된다
    it("passes lint:true to startWatch for server and client engines in dev mode", async () => {
      setupDefaults(createConfig({
        packages: {
          "demo-server": { target: "server" },
          "my-client": { target: "client", server: "demo-server" } as any,
        },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      const serverEngine = mockBuildEngines.find((e) => e._pkgName === "demo-server")!;
      const clientEngine = mockBuildEngines.find((e) => e._pkgName === "my-client")!;

      expect(serverEngine.startWatch).toHaveBeenCalledWith({ js: true, dts: false, lint: true });
      expect(clientEngine.startWatch).toHaveBeenCalledWith({ js: true, dts: false, lint: true });
    });
  });

  //#endregion
});
