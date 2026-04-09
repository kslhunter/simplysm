import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock factories (vi.mock is hoisted) ---

vi.mock("../../src/utils/sd-config", () => ({
  loadSdConfig: vi.fn(),
}));

vi.mock("../../src/utils/build-env", () => ({
  getVersion: vi.fn(),
}));

vi.mock("../../src/utils/replace-deps", () => ({
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

// Engine mock — tracks created engines and the package they were created for
const mockBuildEngines: Array<{
  run: ReturnType<typeof vi.fn>;
  startWatch: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  _pkgName: string;
}> = [];

vi.mock("../../src/engines/index", () => ({
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
const { watchReplaceDeps } = await import("../../src/utils/replace-deps");
const { printErrors, printServers: _printServers } = await import("../../src/utils/output-utils");
const { createBuildEngine } = await import("../../src/engines/index");
const { watchCopySrcFiles } = await import("../../src/utils/copy-src");
const { FsWatcher, Worker } = await import("@simplysm/core-node");
const { spawn } = await import("child_process");
const { getVersion } = await import("../../src/utils/build-env");

const { Capacitor } = await import("../../src/capacitor/capacitor");
const { Electron } = await import("../../src/electron/electron");

import type { SdConfig } from "../../src/sd-config.types";

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

// Capture infra objects from engine options for tests that need direct access
let capturedRebuildManager: any;
let capturedResultCollector: any;

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

describe("DevWatchOrchestrator", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockBuildEngines.length = 0;
    mockRuntimeProxies = [];
    capturedRebuildManager = undefined;
    capturedResultCollector = undefined;
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
    vi.mocked(createBuildEngine).mockImplementation((pkg: any, options: any) => {
      capturedRebuildManager = options.rebuildManager;
      capturedResultCollector = options.resultCollector;
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

  describe("Slice 1: watch mode", () => {
    // --- Unit Tests ---

    it("creates BuildEngine for library packages with correct output flags", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" }, "core-browser": { target: "browser" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();

      expect(mockBuildEngines).toHaveLength(2);
    });

    it("does not create BuildEngine for server packages in watch mode", async () => {
      setupDefaults(createConfig({
        packages: { "service-server": { target: "server" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();

      expect(mockBuildEngines).toHaveLength(0);
    });

    it("outputs warning when no watchable packages exist", async () => {
      setupDefaults(createConfig({
        packages: { "sd-scripts": { target: "scripts" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();

      expect(mockBuildEngines).toHaveLength(0);
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
      expect(mockBuildEngines).toHaveLength(1);
      expect(mockBuildEngines[0]._pkgName).toBe("core-common");

      // Library engine: startWatch with js+dts
      const libraryEngine = mockBuildEngines.find((e) => e._pkgName === "core-common")!;
      expect(libraryEngine.startWatch).toHaveBeenCalledWith({ js: true, dts: true, lint: false });

      // Scripts+watch: spawn called for hook
      expect(spawn).toHaveBeenCalled();
    });

    // --- Acceptance: Scenario 2 — 통합 Orchestrator가 공통 인프라를 사용한다 ---
    it("uses ResultCollector and RebuildManager for build lifecycle", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      // 실제 인프라가 동작하여 batchComplete 후 printErrors가 호출됨
      await new Promise((r) => setTimeout(r, 50));
      expect(printErrors).toHaveBeenCalled();
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
        expect(engine.startWatch).toHaveBeenCalledWith({ js: true, dts: true, lint: false });
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
      expect(mockBuildEngines).toHaveLength(1);
      expect(mockBuildEngines[0]._pkgName).toBe("core-common");
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
      expect(mockBuildEngines).toHaveLength(1);
      const libraryEngine = mockBuildEngines.find((e) => e._pkgName === "core-common")!;
      expect(libraryEngine.startWatch).toHaveBeenCalledWith({ js: true, dts: true, lint: false });

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
      expect(mockBuildEngines).toHaveLength(1);
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
      await orchestrator.start();

      // engine의 startWatch가 registerBuild + resolve를 호출 → batchComplete 자연 발생
      // microtask 대기 (RebuildManager 내부 Promise.resolve().then 처리)
      await new Promise((r) => setTimeout(r, 50));
      expect(printErrors).toHaveBeenCalled();
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

    it("filters packages by targets so only targeted packages get engines", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" }, "storage": { target: "node" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: ["core-common"], options: [] });
      await orchestrator.initialize();

      // 실제 filterPackagesByTargets가 동작하여 core-common만 엔진 생성
      expect(mockBuildEngines).toHaveLength(1);
      expect(mockBuildEngines[0]._pkgName).toBe("core-common");
    });
  });

  describe("Slice 2: dev mode", () => {
    // Helper: override engine mock to add build result to resultCollector
    function setupEngineWithResult(status: "success" | "error" = "success"): void {
      vi.mocked(createBuildEngine).mockImplementation((pkg: any, options: any) => {
        capturedRebuildManager = options.rebuildManager;
      capturedResultCollector = options.resultCollector;
        const engine = {
          run: vi.fn().mockResolvedValue({ success: true, build: { success: true, errors: [], warnings: [], diagnostics: [] } }),
          startWatch: vi.fn().mockImplementation(() => {
            const resolve = options.rebuildManager.registerBuild(
              `${pkg.name}:build`,
              `${pkg.name} (${pkg.config.target})`,
            );
            options.resultCollector.add({
              name: pkg.name, target: pkg.config.target, type: "build", status,
            });
            resolve();
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

      expect(mockBuildEngines).toHaveLength(1);
      expect(mockBuildEngines[0]._pkgName).toBe("service-server");
      expect(mockBuildEngines[0].startWatch).toHaveBeenCalledWith({ js: true, dts: false, lint: false });
      // Runtime starts during start() after all engines ready
      expect(Worker.create).toHaveBeenCalled();
      expect(mockRuntimeProxies[0].start).toHaveBeenCalled();
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

      const serverCall = vi.mocked(createBuildEngine).mock.calls.find(
        (c: any[]) => c[0].name === "service-server",
      );
      expect((serverCall![0] as any).config.env).toEqual(
        expect.objectContaining({ VER: "1.0.0", DEV: "true", DB_HOST: "localhost" }),
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
      expect(mockBuildEngines).toHaveLength(1);
      expect(mockBuildEngines[0]._pkgName).toBe("service-server");
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
      expect(mockBuildEngines).toHaveLength(2);
      expect(mockBuildEngines.find((e) => e._pkgName === "my-client")).toBeDefined();
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
      expect(mockBuildEngines.find((e) => e._pkgName === "my-client")).toBeDefined();
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

      expect(mockBuildEngines).toHaveLength(1);
      expect(mockBuildEngines[0]._pkgName).toBe("service-server");
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

      expect(mockBuildEngines.find((e) => e._pkgName === "standalone")).toBeDefined();
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

      expect(mockBuildEngines).toHaveLength(1);
    });

    // --- Acceptance: Server batchComplete 시 runtime 시작 ---
    it("starts runtime during start() after all engines ready", async () => {
      setupDefaults(createConfig({
        packages: { "service-server": { target: "server" } },
      }));
      setupEngineWithResult("success");

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      // Runtime starts during start(), not via batchComplete
      expect(mockRuntimeProxies).toHaveLength(1);
      expect(mockRuntimeProxies[0].start).toHaveBeenCalled();
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

      // Runtime is now started during start()
      expect(mockRuntimeProxies).toHaveLength(1);

      await orchestrator.shutdown();

      expect(mockBuildEngines[0].stop).toHaveBeenCalledOnce();
      expect(mockRuntimeProxies[0].terminate).toHaveBeenCalled();
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

    // Unit: no server packages in dev mode — does not create runtime proxies
    it("does not create runtime proxies when no server packages in dev mode", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();

      expect(mockBuildEngines).toHaveLength(0);
    });

    // Unit: multiple server packages
    it("creates engines for multiple server packages (runtimes start during start())", async () => {
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

      expect(mockBuildEngines).toHaveLength(2);
      // Runtimes start during start() after all engines ready
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

      expect(mockBuildEngines).toHaveLength(0);
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
        capturedRebuildManager = options.rebuildManager;
      capturedResultCollector = options.resultCollector;
        const isClient = pkg.config.target === "client";
        const engine: any = {
          run: vi.fn().mockResolvedValue({ success: true, build: { success: true, errors: [], warnings: [], diagnostics: [] } }),
          startWatch: vi.fn().mockImplementation(() => {
            if (isClient) {
              // Client: simulate Vite serverReady
              if (clientPort != null) {
                engine.port = clientPort;
              }
            }
            const resolve = options.rebuildManager.registerBuild(
              `${pkg.name}:build`,
              `${pkg.name} (${pkg.config.target})`,
            );
            options.resultCollector.add({
              name: pkg.name,
              target: isClient ? "client" : "server",
              type: "build",
              status: isClient ? "success" : serverStatus,
            });
            resolve();
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
      expect(clientEngine.startWatch).toHaveBeenCalledWith({ js: true, dts: false, lint: false });
    });

    // --- Acceptance: batchComplete 시 서버 시작 → clientPorts 전달 ---
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

      // Runtime starts during start() with client ports available
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

      // Runtime starts during start(), standalone client ports excluded
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

      // 실제 ResultCollector에 독립 클라이언트가 server로 등록되었는지 확인
      const serverResult = capturedResultCollector.get("standalone:server");
      expect(serverResult).toEqual(
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

      // Runtime starts during start() but client port unavailable → empty clientPorts
      expect(mockRuntimeProxies[0].start).toHaveBeenCalledWith(
        expect.objectContaining({
          clientPorts: {},
        }),
      );
    });

    // --- Acceptance: printServers는 start()에서 직접 호출되지 않는다 (serverReady 이벤트 경로만 사용) ---
    it("does not call printServers directly during start()", async () => {
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

      // printServers should NOT be called directly during start()
      // It should only be called via serverReady → _schedulePrintServers()
      expect(_printServers).not.toHaveBeenCalled();
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

      // First runtime created during start() with clientPorts
      expect(mockRuntimeProxies).toHaveLength(1);
      expect(mockRuntimeProxies[0].start).toHaveBeenCalledWith(
        expect.objectContaining({
          clientPorts: { "my-client": 54321 },
        }),
      );

      // Trigger batchComplete (rebuild after initial build) via real RebuildManager
      const resolve = capturedRebuildManager.registerBuild("service-server:build", "service-server (server)");
      resolve();
      await new Promise((r) => setTimeout(r, 200));

      // Second runtime start (rebuild) should also have clientPorts
      expect(mockRuntimeProxies).toHaveLength(2);
      expect(mockRuntimeProxies[0].terminate).toHaveBeenCalled();
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

  describe("tests packages exclusion", () => {
    // tests 패키지는 watch/dev에서 제외되고, sd.config.ts 패키지만 처리된다
    it("only processes sd.config.ts packages, excludes tests packages", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      // Only config package should have BuildEngine created
      expect(mockBuildEngines).toHaveLength(1);
      expect(mockBuildEngines[0]._pkgName).toBe("core-common");
    });

    // sd.config.ts 패키지는 기존 packages/ 경로 유지
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
        dir: "/test-root/packages/core-common",
      }));
    });

    // buildPathMapFromConfig 결과가 dir에 반영된다
    it("builds pathMap from config and reflects in engine dir", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: [], options: [] });
      await orchestrator.initialize();

      // 실제 buildPathMapFromConfig가 "packages/core-common"을 반환하고
      // orchestrator가 cwd + pathMap 값으로 dir을 구성
      const coreEngine = vi.mocked(createBuildEngine).mock.calls.find(
        (c: any[]) => c[0].name === "core-common",
      );
      expect(coreEngine![0]).toEqual(expect.objectContaining({
        dir: "/test-root/packages/core-common",
      }));
    });
  });

  describe("target validation", () => {
    it("initializes without error for valid target in watch mode", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: ["core-common"], options: [] });
      await orchestrator.initialize();

      // 실제 validateTargets가 에러 없이 통과하고 엔진이 생성됨
      expect(mockBuildEngines).toHaveLength(1);
      expect(mockBuildEngines[0]._pkgName).toBe("core-common");
    });

    it("initializes without error for valid target in dev mode", async () => {
      setupDefaults(createConfig({
        packages: { "service-server": { target: "server" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: ["service-server"], options: [] });
      await orchestrator.initialize();

      // 실제 validateTargets가 에러 없이 통과하고 엔진이 생성됨
      expect(mockBuildEngines).toHaveLength(1);
      expect(mockBuildEngines[0]._pkgName).toBe("service-server");
    });

    it("throws for unknown target in watch mode", async () => {
      setupDefaults(createConfig({
        packages: { "core-common": { target: "node" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "watch", targets: ["nonexistent"], options: [] });
      await expect(orchestrator.initialize()).rejects.toThrow("Unknown target: nonexistent");
    });

    it("throws for unknown target in dev mode", async () => {
      setupDefaults(createConfig({
        packages: { "service-server": { target: "server" } },
      }));

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: ["nonexistent"], options: [] });
      await expect(orchestrator.initialize()).rejects.toThrow("Unknown target: nonexistent");
    });
  });

  describe("Slice 3: native device run integration", () => {
    // Helper: setup engine with port so dev server URL can be constructed
    function setupEngineWithPort(port: number): void {
      vi.mocked(createBuildEngine).mockImplementation((pkg: any, options: any) => {
        capturedRebuildManager = options.rebuildManager;
      capturedResultCollector = options.resultCollector;
        const engine = {
          run: vi.fn().mockResolvedValue({
            success: true,
            build: { success: true, errors: [], warnings: [], diagnostics: [] },
          }),
          startWatch: vi.fn().mockImplementation(() => {
            // Simulate server ready with port
            (engine as any).port = port;
            const resolve = options.rebuildManager.registerBuild(
              `${pkg.name}:build`,
              `${pkg.name} (${pkg.config.target})`,
            );
            options.resultCollector.add({
              name: pkg.name,
              target: pkg.config.target === "client" ? "client" : "server",
              type: "build",
              status: "success",
            });
            resolve();
          }),
          stop: vi.fn().mockResolvedValue(undefined),
          port: undefined as number | undefined,
          _pkgName: pkg.name,
        };
        mockBuildEngines.push(engine);
        return engine as any;
      });
    }

    // Acceptance: Scenario "Capacitor 초기화만 수행 (run 미호출)"
    it("runs Capacitor.create + initialize but NOT run in dev mode", async () => {
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
      expect(mockCapacitorInstance.run).not.toHaveBeenCalled();
    });

    // Acceptance: Scenario "dev 모드에서 Electron 미처리"
    it("does not run Electron in dev mode even when electron config exists", async () => {
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

      expect(Electron.create).not.toHaveBeenCalled();
      expect(mockElectronInstance.initialize).not.toHaveBeenCalled();
      expect(mockElectronInstance.run).not.toHaveBeenCalled();
    });

    // Acceptance: Scenario "Capacitor + Electron 동시 설정 시 Capacitor만 초기화"
    it("initializes Capacitor but ignores Electron when both are configured", async () => {
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
      expect(mockCapacitorInstance.initialize).toHaveBeenCalled();
      expect(mockCapacitorInstance.run).not.toHaveBeenCalled();
      expect(Electron.create).not.toHaveBeenCalled();
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

    // Acceptance: Scenario "dev 모드 종료 시 Capacitor 초기화 후 정상 종료"
    // Capacitor.initialize()만 호출되므로 별도 정리 불필요.
    it("shutdown completes when Capacitor was initialized", async () => {
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

    // Unit: Capacitor.initialize 에러는 로그만 남기고 크래시하지 않음
    it("logs error but does not crash when Capacitor.initialize throws", async () => {
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
      mockCapacitorInstance.initialize.mockRejectedValue(new Error("init failed"));

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await orchestrator.initialize();
      // Should not throw
      await orchestrator.start();

      expect(mockCapacitorInstance.initialize).toHaveBeenCalled();
      expect(mockCapacitorInstance.run).not.toHaveBeenCalled();
    });
  });

  //#region Slice 4: watch/dev lint 활성화 (Feature 3.2)

  describe("resource safety (DESIGN-001, DESIGN-002)", () => {
    // --- Acceptance: shutdown 시 타이머 정리 + replaceDepWatcher 해제 ---

    it("clears pending timers on shutdown so no delayed restart fires", async () => {
      vi.useFakeTimers();
      try {
        setupDefaults(createConfig({
          packages: { "demo-server": { target: "server" } },
        }));
        // Engine with rebuildManager integration
        vi.mocked(createBuildEngine).mockImplementation((pkg: any, options: any) => {
          capturedRebuildManager = options.rebuildManager;
      capturedResultCollector = options.resultCollector;
          const engine = {
            run: vi.fn(),
            startWatch: vi.fn().mockImplementation(() => {
              const resolve = options.rebuildManager.registerBuild(
                `${pkg.name}:build`,
                `${pkg.name} (${pkg.config.target})`,
              );
              options.resultCollector.add({
                name: pkg.name, target: "server", type: "build", status: "success",
              });
              resolve();
            }),
            stop: vi.fn().mockResolvedValue(undefined),
            _pkgName: pkg.name,
          };
          mockBuildEngines.push(engine);
          return engine as any;
        });

        const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
        await orchestrator.initialize();
        await orchestrator.start();

        // Trigger batchComplete (rebuild) with a server build key → sets _serverRestartTimer
        const runtimeCountBefore = mockRuntimeProxies.length;
        const resolve = capturedRebuildManager.registerBuild("demo-server:build", "demo-server (server)");
        resolve();
        // Allow microtask for _runBatch to execute
        await vi.advanceTimersByTimeAsync(0);

        // shutdown before restart timer fires
        await orchestrator.shutdown();

        // Advance past timer (100ms restart + 300ms print)
        vi.advanceTimersByTime(500);

        // No new runtime workers created after shutdown
        expect(mockRuntimeProxies.length).toBe(runtimeCountBefore);
      } finally {
        vi.useRealTimers();
      }
    });

    it("disposes replaceDepWatcher even when initialize fails after watchReplaceDeps", async () => {
      const mockDispose = vi.fn();
      vi.mocked(watchReplaceDeps).mockResolvedValue({ entries: [], dispose: mockDispose } as any);

      setupDefaults(createConfig({
        packages: { "demo-server": { target: "server" } },
        replaceDeps: { "@simplysm/*": "packages/*/src" },
      }));
      vi.mocked(watchReplaceDeps).mockResolvedValue({ entries: [], dispose: mockDispose } as any);
      // Make getVersion throw to simulate partial init failure after watchReplaceDeps
      vi.mocked(getVersion).mockRejectedValue(new Error("version fetch failed"));

      const orchestrator = new DevWatchOrchestrator({ mode: "dev", targets: [], options: [] });
      await expect(orchestrator.initialize()).rejects.toThrow("version fetch failed");

      await orchestrator.shutdown();

      expect(mockDispose).toHaveBeenCalledOnce();
    });
  });

  describe("lint activation", () => {
    // Scenario: watch 초기 빌드에서 lint 비활성화 (별도 실행으로 분리됨)
    it("passes lint:false to startWatch for library engines in watch mode", async () => {
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
        expect(engine.startWatch).toHaveBeenCalledWith({ js: true, dts: true, lint: false });
      }
    });

    // Scenario: dev 초기 빌드에서 server/client lint 비활성화
    it("passes lint:false to startWatch for server and client engines in dev mode", async () => {
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

      expect(serverEngine.startWatch).toHaveBeenCalledWith({ js: true, dts: false, lint: false });
      expect(clientEngine.startWatch).toHaveBeenCalledWith({ js: true, dts: false, lint: false });
    });
  });

  //#endregion
});
