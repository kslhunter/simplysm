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
    printDiagnostics: vi.fn(),
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

// Engine mock
const mockBuildEngines: Array<{
  run: ReturnType<typeof vi.fn>;
  startWatch: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
  _pkgName: string;
  port?: number;
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

const { DevOrchestrator } = await import("../../src/orchestrators/DevOrchestrator");
const { loadSdConfig } = await import("../../src/utils/sd-config");
const { watchReplaceDeps } = await import("../../src/deps/replace-deps/replace-deps");
const { printDiagnostics, printServers: _printServers } = await import("../../src/utils/output-utils");
const { createBuildEngine } = await import("../../src/engines/engine-factory");
const { Worker } = await import("@simplysm/core-node");
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

// Capture infra objects
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
    return engine;
  });
}

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
        if (isClient && clientPort != null) {
          engine.port = clientPort;
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

// --- Tests ---

describe("DevOrchestrator", () => {
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
    mockCapacitorInstance.initialize.mockResolvedValue(undefined);
    mockCapacitorInstance.build.mockResolvedValue(undefined);
    mockCapacitorInstance.run.mockResolvedValue(undefined);
    mockElectronInstance.initialize.mockResolvedValue(undefined);
    mockElectronInstance.build.mockResolvedValue(undefined);
    mockElectronInstance.run.mockResolvedValue(undefined);
    vi.mocked(Capacitor.create).mockResolvedValue(mockCapacitorInstance as any);
    vi.mocked(Electron.create).mockResolvedValue(mockElectronInstance as any);
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
      return engine;
    });
  });

  // --- Acceptance: Scenario "dev 모드 생성 시 watch 전용 필드 없음" ---
  it("does not have watch-specific fields (_libraryEngines, _copySrcWatchers, _distDeleteWatchers, _watchHookWatchers, _watchHookChildren)", () => {
    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    expect(orchestrator).not.toHaveProperty("_libraryEngines");
    expect(orchestrator).not.toHaveProperty("_copySrcWatchers");
    expect(orchestrator).not.toHaveProperty("_distDeleteWatchers");
    expect(orchestrator).not.toHaveProperty("_watchHookWatchers");
    expect(orchestrator).not.toHaveProperty("_watchHookChildren");
  });

  // --- Acceptance: Scenario "dev 모드 실행" ---
  it("starts server/client engines and ServerRuntimeManager for server runtime", async () => {
    setupDefaults(createConfig({
      packages: { "service-server": { target: "server" } },
    }));
    setupEngineWithResult("success");

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(mockBuildEngines).toHaveLength(1);
    expect(mockBuildEngines[0]._pkgName).toBe("service-server");
    expect(mockBuildEngines[0].startWatch).toHaveBeenCalledWith({ js: true, dts: false, lint: false, includeTests: false });
    expect(Worker.create).toHaveBeenCalled();
    expect(mockRuntimeProxies[0].start).toHaveBeenCalled();
  });

  // --- Acceptance: Scenario "서버 런타임 시작" (ServerRuntimeManager) ---
  it("creates Worker and registers event handlers for server runtime", async () => {
    setupDefaults(createConfig({
      packages: { "service-server": { target: "server" } },
    }));
    setupEngineWithResult("success");

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(Worker.create).toHaveBeenCalled();
    expect(mockRuntimeProxies[0].on).toHaveBeenCalledWith("serverReady", expect.any(Function));
    expect(mockRuntimeProxies[0].on).toHaveBeenCalledWith("error", expect.any(Function));
    expect(mockRuntimeProxies[0].start).toHaveBeenCalled();
  });

  // --- Acceptance: Scenario "서버 재시작 (기존 워커 존재)" ---
  it("terminates existing worker before creating new one on rebuild", async () => {
    setupDefaults(createConfig({
      packages: { "service-server": { target: "server" } },
    }));
    setupEngineWithResult("success");

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(mockRuntimeProxies).toHaveLength(1);

    // Trigger rebuild
    vi.useFakeTimers();
    const resolve = capturedRebuildManager.registerBuild("service-server:build", "service-server (server)");
    resolve();
    await vi.advanceTimersByTimeAsync(200);
    vi.useRealTimers();

    expect(mockRuntimeProxies).toHaveLength(2);
    expect(mockRuntimeProxies[0].terminate).toHaveBeenCalled();
  });

  // --- Acceptance: Scenario "전체 종료" (ServerRuntimeManager) ---
  it("terminates all runtime workers on shutdown", async () => {
    setupDefaults(createConfig({
      packages: { "service-server": { target: "server" } },
    }));
    setupEngineWithResult("success");

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();
    await orchestrator.shutdown();

    expect(mockBuildEngines[0].stop).toHaveBeenCalledOnce();
    expect(mockRuntimeProxies[0].terminate).toHaveBeenCalled();
  });

  // --- Unit: env merging ---
  it("passes merged env (VER+DEV+config.env) to engine and runtime", async () => {
    setupDefaults(createConfig({
      packages: {
        "service-server": { target: "server", env: { DB_HOST: "localhost" } },
      },
    }));
    setupEngineWithResult("success");

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    const serverCall = vi.mocked(createBuildEngine).mock.calls.find(
      (c: any[]) => c[0].name === "service-server",
    );
    expect((serverCall![0] as any).config.env).toEqual(
      expect.objectContaining({ VER: "1.0.0", DEV: "true", DB_HOST: "localhost" }),
    );
  });

  // --- Unit: build fails → no runtime ---
  it("does not start runtime when build fails", async () => {
    setupDefaults(createConfig({
      packages: { "service-server": { target: "server" } },
    }));
    setupEngineWithResult("error");

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(Worker.create).not.toHaveBeenCalled();
    expect(printDiagnostics).toHaveBeenCalled();
  });

  // --- Unit: excludes library packages ---
  it("excludes library packages from dev mode", async () => {
    setupDefaults(createConfig({
      packages: {
        "core-common": { target: "node" },
        "service-server": { target: "server" },
      },
    }));
    setupEngineWithResult("success");

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(mockBuildEngines).toHaveLength(1);
    expect(mockBuildEngines[0]._pkgName).toBe("service-server");
  });

  // --- Unit: client engine creation ---
  it("creates engine for client packages in dev mode", async () => {
    setupDefaults(createConfig({
      packages: {
        "service-server": { target: "server" },
        "my-client": { target: "client", server: "service-server" },
      },
    }));
    setupEngineWithResult("success");

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();

    expect(mockBuildEngines).toHaveLength(2);
    expect(mockBuildEngines.find((e) => e._pkgName === "my-client")).toBeDefined();
  });

  // --- Unit: multiple server packages ---
  it("creates engines for multiple server packages", async () => {
    setupDefaults(createConfig({
      packages: {
        "service-server": { target: "server" },
        "api-server": { target: "server" },
      },
    }));
    setupEngineWithResult("success");

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(mockBuildEngines).toHaveLength(2);
    expect(Worker.create).toHaveBeenCalledTimes(2);
  });

  // --- Unit: replaceDeps watcher ---
  it("starts replaceDeps watcher in dev mode", async () => {
    const replaceDeps = { "@simplysm/*": "packages/*/src" };
    setupDefaults(createConfig({
      packages: { "service-server": { target: "server" } },
      replaceDeps,
    }));
    setupEngineWithResult("success");

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();

    expect(watchReplaceDeps).toHaveBeenCalledWith("/test-root", replaceDeps);
  });

  // --- Unit: disposes replaceDeps on shutdown ---
  it("disposes replaceDeps watcher on dev shutdown", async () => {
    const mockDispose = vi.fn();
    vi.mocked(watchReplaceDeps).mockResolvedValue({ entries: [], dispose: mockDispose });

    setupDefaults(createConfig({
      packages: { "service-server": { target: "server" } },
      replaceDeps: { "@simplysm/*": "packages/*/src" },
    }));
    vi.mocked(watchReplaceDeps).mockResolvedValue({ entries: [], dispose: mockDispose });
    setupEngineWithResult("success");

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();
    await orchestrator.shutdown();

    expect(mockDispose).toHaveBeenCalledOnce();
  });

  // --- Client integration ---

  it("starts client engines with startWatch({ js: true, dts: false })", async () => {
    setupDefaults(createConfig({
      packages: {
        "service-server": { target: "server" },
        "my-client": { target: "client", server: "service-server" },
      },
    }));
    setupEngineWithClientPort("success");

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    const clientEngine = mockBuildEngines.find((e) => e._pkgName === "my-client")!;
    expect(clientEngine.startWatch).toHaveBeenCalledWith({ js: true, dts: false, lint: false, includeTests: false });
  });

  it("passes clientPorts to server runtime for connected clients", async () => {
    setupDefaults(createConfig({
      packages: {
        "service-server": { target: "server" },
        "my-client": { target: "client", server: "service-server" },
      },
    }));
    setupEngineWithClientPort("success", 54321);

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(Worker.create).toHaveBeenCalled();
    expect(mockRuntimeProxies[0].start).toHaveBeenCalledWith(
      expect.objectContaining({
        clientPorts: { "my-client": 54321 },
      }),
    );
  });

  it("does not include standalone client ports in server runtime clientPorts", async () => {
    setupDefaults(createConfig({
      packages: {
        "service-server": { target: "server" },
        "standalone": { target: "client", server: 4200 },
      },
    }));
    setupEngineWithClientPort("success", 4200);

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(mockRuntimeProxies[0].start).toHaveBeenCalledWith(
      expect.objectContaining({
        clientPorts: {},
      }),
    );
  });

  it("registers standalone client as running server in ResultCollector", async () => {
    setupDefaults(createConfig({
      packages: {
        "standalone": { target: "client", server: 4200 },
      },
    }));
    setupEngineWithClientPort("success", 4200);

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

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

  it("starts server without proxy when client port is unavailable", async () => {
    setupDefaults(createConfig({
      packages: {
        "service-server": { target: "server" },
        "my-client": { target: "client", server: "service-server" },
      },
    }));
    setupEngineWithClientPort("success", null);

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(mockRuntimeProxies[0].start).toHaveBeenCalledWith(
      expect.objectContaining({
        clientPorts: {},
      }),
    );
  });

  it("does not call printServers directly during start()", async () => {
    setupDefaults(createConfig({
      packages: {
        "service-server": { target: "server" },
        "my-client": { target: "client", server: "service-server" },
      },
    }));
    setupEngineWithClientPort("success", 54321);

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(_printServers).not.toHaveBeenCalled();
  });

  it("passes clientPorts on server rebuild restart", async () => {
    setupDefaults(createConfig({
      packages: {
        "service-server": { target: "server" },
        "my-client": { target: "client", server: "service-server" },
      },
    }));
    setupEngineWithClientPort("success", 54321);

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(mockRuntimeProxies).toHaveLength(1);
    expect(mockRuntimeProxies[0].start).toHaveBeenCalledWith(
      expect.objectContaining({
        clientPorts: { "my-client": 54321 },
      }),
    );

    vi.useFakeTimers();
    const resolve = capturedRebuildManager.registerBuild("service-server:build", "service-server (server)");
    resolve();
    await vi.advanceTimersByTimeAsync(200);
    vi.useRealTimers();

    expect(mockRuntimeProxies).toHaveLength(2);
    expect(mockRuntimeProxies[0].terminate).toHaveBeenCalled();
    expect(mockRuntimeProxies[1].start).toHaveBeenCalledWith(
      expect.objectContaining({
        clientPorts: { "my-client": 54321 },
      }),
    );
  });

  it("stops client engines on shutdown", async () => {
    setupDefaults(createConfig({
      packages: {
        "service-server": { target: "server" },
        "my-client": { target: "client", server: "service-server" },
      },
    }));
    setupEngineWithClientPort("success", 54321);

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();
    await orchestrator.shutdown();

    const clientEngine = mockBuildEngines.find((e) => e._pkgName === "my-client")!;
    expect(clientEngine.stop).toHaveBeenCalledOnce();
  });

  it("passes merged baseEnv + config.env to client engine config", async () => {
    setupDefaults(createConfig({
      packages: {
        "my-client": { target: "client", server: 4200, env: { API_URL: "http://example.com" } },
      },
    }));
    setupEngineWithClientPort("success", 4200);

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
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

  // --- Capacitor/Electron ---

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
    setupEngineWithClientPort("success", 4200);

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
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
    setupEngineWithClientPort("success", 4200);

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(Electron.create).not.toHaveBeenCalled();
  });

  it("does not run native apps when no capacitor/electron configured", async () => {
    setupDefaults(createConfig({
      packages: {
        "my-client": { target: "client", server: 4200 },
      },
    }));
    setupEngineWithClientPort("success", 4200);

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(Capacitor.create).not.toHaveBeenCalled();
    expect(Electron.create).not.toHaveBeenCalled();
  });

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
    setupEngineWithClientPort("success", 4200);
    mockCapacitorInstance.initialize.mockRejectedValue(new Error("init failed"));

    const orchestrator = new DevOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(mockCapacitorInstance.initialize).toHaveBeenCalled();
    expect(mockCapacitorInstance.run).not.toHaveBeenCalled();
  });

  // --- Resource safety ---

  it("clears pending timers on shutdown so no delayed restart fires", async () => {
    vi.useFakeTimers();
    try {
      setupDefaults(createConfig({
        packages: { "demo-server": { target: "server" } },
      }));
      setupEngineWithResult("success");

      const orchestrator = new DevOrchestrator({ targets: [], options: [] });
      await orchestrator.initialize();
      await orchestrator.start();

      const runtimeCountBefore = mockRuntimeProxies.length;
      const resolve = capturedRebuildManager.registerBuild("demo-server:build", "demo-server (server)");
      resolve();
      await vi.advanceTimersByTimeAsync(100);

      await orchestrator.shutdown();

      vi.advanceTimersByTime(500);

      expect(mockRuntimeProxies.length).toBe(runtimeCountBefore);
    } finally {
      vi.useRealTimers();
    }
  });
});
