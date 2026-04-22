import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mock factories (vi.mock is hoisted) ---

import { consola } from "consola";

const mockLogger = {
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  start: vi.fn(),
  success: vi.fn(),
};

vi.spyOn(consola, "withTag").mockReturnValue(mockLogger as any);

vi.mock("../../src/utils/sd-config", () => ({
  loadSdConfig: vi.fn(),
}));

vi.mock("../../src/utils/build-env", () => ({
  getVersion: vi.fn(),
}));

vi.mock("../../src/utils/copy-src", () => ({
  copySrcFiles: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../src/lint/lint-utils", () => ({
  runLintInWorker: vi.fn().mockResolvedValue({ success: true, errorCount: 0, warningCount: 0, formattedOutput: "" }),
}));

vi.mock("../../src/utils/output-utils", () => ({
  formatBuildMessages: vi.fn(
    (name: string, target: string, msgs: string[]) => `${name} (${target}): ${msgs.join(", ")}`,
  ),
}));

vi.mock("../../src/typecheck/typecheck-serialization", () => ({
  deserializeDiagnostic: vi.fn((d: any) => d),
}));

vi.mock("@simplysm/core-node", () => ({
  Worker: {
    create: vi.fn(),
  },
  fsx: {
    rm: vi.fn().mockResolvedValue(undefined),
  },
  pathx: {
    posixResolve: vi.fn((...args: string[]) => args.join("/").replace(/\\/g, "/")),
  },
}));

const mockEngines: Array<{
  run: ReturnType<typeof vi.fn>;
  startWatch: ReturnType<typeof vi.fn>;
  stop: ReturnType<typeof vi.fn>;
}> = [];

vi.mock("../../src/engines/engine-factory", () => ({
  createBuildEngine: vi.fn(() => {
    const engine = {
      run: vi.fn().mockResolvedValue({
        build: { success: true, errors: [], warnings: [], diagnostics: [] },
      }),
      startWatch: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
    };
    mockEngines.push(engine);
    return engine;
  }),
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

const { BuildOrchestrator, classifyPackages } = await import("../../src/orchestrators/BuildOrchestrator");
const { loadSdConfig } = await import("../../src/utils/sd-config");
const { getVersion } = await import("../../src/utils/build-env");
const { copySrcFiles } = await import("../../src/utils/copy-src");
const { Worker, fsx } = await import("@simplysm/core-node");
const { createBuildEngine } = await import("../../src/engines/engine-factory");

const { Capacitor } = await import("../../src/capacitor/capacitor");
const { Electron } = await import("../../src/electron/electron");

import type { SdConfig } from "../../src/sd-config.types";

// --- Helpers ---

interface MockWorkerProxy {
  build: ReturnType<typeof vi.fn>;
  terminate: ReturnType<typeof vi.fn>;
}

function createMockWorkerProxy(overrides: Partial<MockWorkerProxy> = {}): MockWorkerProxy {
  return {
    build: vi.fn().mockResolvedValue({ success: true, errors: [], warnings: [], diagnostics: [] }),
    terminate: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

function setupDefaults(config: Partial<SdConfig> = {}): void {
  vi.mocked(loadSdConfig).mockResolvedValue({ packages: {}, ...config });
  vi.mocked(getVersion).mockResolvedValue("1.0.0");
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  mockEngines.length = 0;
  // Reset process.exitCode
  process.exitCode = undefined;
  // Mock process.stdout.write
  vi.spyOn(process.stdout, "write").mockReturnValue(true);
  // Reset Capacitor/Electron instance mocks
  mockCapacitorInstance.initialize.mockResolvedValue(undefined);
  mockCapacitorInstance.build.mockResolvedValue(undefined);
  mockCapacitorInstance.run.mockResolvedValue(undefined);
  mockElectronInstance.initialize.mockResolvedValue(undefined);
  mockElectronInstance.build.mockResolvedValue(undefined);
  mockElectronInstance.run.mockResolvedValue(undefined);
  vi.mocked(Capacitor.create).mockResolvedValue(mockCapacitorInstance as any);
  vi.mocked(Electron.create).mockResolvedValue(mockElectronInstance as any);
  // Restore default createBuildEngine mock implementation
  vi.mocked(createBuildEngine).mockImplementation(() => {
    const engine = {
      run: vi.fn().mockResolvedValue({
        build: { success: true, errors: [], warnings: [], diagnostics: [] },

      }),
      startWatch: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn().mockResolvedValue(undefined),
    };
    mockEngines.push(engine);
    return engine;
  });
});

describe("BuildOrchestrator.initialize", () => {
  it("loads sd.config.ts with dev=false and classifies packages", async () => {
    setupDefaults({
      packages: {
        "core-common": { target: "neutral", publish: { type: "npm" } },
        "demo-server": { target: "server" },
      },
    });

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();

    expect(loadSdConfig).toHaveBeenCalledWith(
      expect.objectContaining({ dev: false }),
    );
  });

  it("throws and sets exitCode=1 when sd.config.ts load fails", async () => {
    vi.mocked(loadSdConfig).mockRejectedValue(new Error("syntax error"));
    vi.mocked(getVersion).mockResolvedValue("1.0.0");

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await expect(orchestrator.initialize()).rejects.toThrow("syntax error");
    expect(process.exitCode).toBe(1);
    expect(mockLogger.error).toHaveBeenCalled();
  });

  it("prepares VER and DEV environment variables", async () => {
    setupDefaults({
      packages: {
        "core-common": { target: "neutral", publish: { type: "npm" } },
      },
    });

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();

    expect(getVersion).toHaveBeenCalled();
  });

  it("passes options to loadSdConfig", async () => {
    setupDefaults();

    const orchestrator = new BuildOrchestrator({ targets: [], options: ["production"] });
    await orchestrator.initialize();

    expect(loadSdConfig).toHaveBeenCalledWith(
      expect.objectContaining({ opt: ["production"] }),
    );
  });

  it("returns false when only scripts packages exist", async () => {
    setupDefaults({
      packages: {
        "sd-claude": { target: "scripts" } as any,
      },
    });

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    const hasError = await orchestrator.start();

    expect(hasError).toBe(false);
    expect(mockLogger.info).toHaveBeenCalledWith("빌드할 패키지가 없습니다.");
  });
});

describe("BuildOrchestrator.start", () => {
  it("cleans dist folders before building", async () => {
    setupDefaults({
      packages: {
        "core-common": { target: "neutral", publish: { type: "npm" } },
      },
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(fsx.rm).toHaveBeenCalledWith(
      expect.stringContaining("core-common"),
    );
  });

  it("uses BuildEngine for buildPackages", async () => {
    setupDefaults({
      packages: {
        "core-common": { target: "browser", publish: { type: "npm" } },
      },
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    // BuildEngine should be created and run() called
    expect(createBuildEngine).toHaveBeenCalledOnce();
    expect(mockEngines[0].run).toHaveBeenCalledWith({ js: true, dts: true, lint: false, includeTests: false });
    expect(mockEngines[0].stop).toHaveBeenCalled();
  });

  it("creates BuildEngine for serverPackages with merged env", async () => {
    setupDefaults({
      packages: {
        "demo-server": {
          target: "server",
          env: { DB_HOST: "localhost" },
        },
      },
    });

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(createBuildEngine).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "demo-server",
        config: expect.objectContaining({
          target: "server",
          env: expect.objectContaining({
            VER: "1.0.0",
            DEV: "false",
            DB_HOST: "localhost",
          }),
        }),
      }),
      expect.any(Object),
    );
  });

  it("creates BuildEngine for serverPackages with pm2 config", async () => {
    setupDefaults({
      packages: {
        "demo-server": {
          target: "server",
          pm2: { name: "demo" },
        },
      },
    });

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(createBuildEngine).toHaveBeenCalledWith(
      expect.objectContaining({
        config: expect.objectContaining({
          pm2: { name: "demo" },
        }),
      }),
      expect.any(Object),
    );
  });

  it("calls copySrcFiles when copySrc is configured", async () => {
    setupDefaults({
      packages: {
        "core-node": {
          target: "node",
          publish: { type: "npm" },
          copySrc: ["README.md"],
        },
      },
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(copySrcFiles).toHaveBeenCalled();
  });

  it("does not call copySrcFiles when copySrc is not configured", async () => {
    setupDefaults({
      packages: {
        "core-common": { target: "neutral", publish: { type: "npm" } },
      },
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(copySrcFiles).not.toHaveBeenCalled();
  });

  it("stops engine even when build fails", async () => {
    setupDefaults({
      packages: {
        "core-common": { target: "neutral", publish: { type: "npm" } },
      },
    });
    // Override createBuildEngine to return engine with failing run()
    vi.mocked(createBuildEngine).mockReturnValue({
      run: vi.fn().mockRejectedValue(new Error("build failed")),
      startWatch: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    // Engine stop should be called even after failure
    const engineMock = vi.mocked(createBuildEngine).mock.results[0].value;
    expect(engineMock.stop).toHaveBeenCalled();
  });

  it("returns false when all builds succeed", async () => {
    setupDefaults({
      packages: {
        "core-common": { target: "neutral", publish: { type: "npm" } },
      },
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    const hasError = await orchestrator.start();

    expect(hasError).toBe(false);
  });

  it("returns true when any build fails", async () => {
    setupDefaults({
      packages: {
        "core-common": { target: "neutral", publish: { type: "npm" } },
      },
    });
    vi.mocked(createBuildEngine).mockReturnValue({
      run: vi.fn().mockResolvedValue({
        build: { success: false, errors: ["Module not found"], warnings: [], diagnostics: [] },
      }),
      startWatch: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    const hasError = await orchestrator.start();

    expect(hasError).toBe(true);
  });

  it("returns false when no packages to build", async () => {
    setupDefaults({
      packages: {
        "sd-claude": { target: "scripts" } as any,
      },
    });

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    const hasError = await orchestrator.start();

    expect(hasError).toBe(false);
  });

  it("limits concurrent build engine workers to maxConcurrency", async () => {
    // Use enough packages to exceed any reasonable CPU-based concurrency limit
    const pkgCount = 50;
    const packages: Record<string, any> = {};
    for (let i = 0; i < pkgCount; i++) {
      packages[`pkg-${i}`] = { target: "neutral", publish: { type: "npm" } };
    }
    setupDefaults({ packages });

    let active = 0;
    let maxActive = 0;

    vi.mocked(createBuildEngine).mockImplementation(() => {
      const engine = {
        run: vi.fn(async () => {
          active++;
          maxActive = Math.max(maxActive, active);
          await new Promise((resolve) => setTimeout(resolve, 5));
          active--;
          return {
            success: true,
            build: { success: true, errors: [], warnings: [], diagnostics: [] },
          };
        }),
        startWatch: vi.fn(),
        stop: vi.fn().mockResolvedValue(undefined),
      };
      mockEngines.push(engine);
      return engine;
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    // Without concurrency limit, all 50 would start simultaneously (maxActive = 50)
    // With limit, maxActive should be < pkgCount
    expect(maxActive).toBeLessThan(pkgCount);
    expect(maxActive).toBeGreaterThan(0);
    expect(mockEngines).toHaveLength(pkgCount);
    expect(mockEngines.every((e) => e.stop.mock.calls.length > 0)).toBe(true);
  });

  it("logs warnings from build results", async () => {
    setupDefaults({
      packages: {
        "core-common": { target: "neutral", publish: { type: "npm" } },
      },
    });
    vi.mocked(createBuildEngine).mockReturnValue({
      run: vi.fn().mockResolvedValue({
        success: true,
        build: { success: true, errors: [], warnings: ["Unused variable"], diagnostics: [] },
      }),
      startWatch: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(mockLogger.warn).toHaveBeenCalled();
  });

});

describe("classifyPackages", () => {
  // Acceptance: Scenario "client target 패키지 분류"
  it("classifies client target packages to clientPackages", () => {
    const result = classifyPackages(
      { "my-client": { target: "client", server: "my-server" } as any },
      [],
    );
    expect(result.clientPackages).toHaveLength(1);
    expect(result.clientPackages[0].name).toBe("my-client");
    expect(result.clientPackages[0].config.target).toBe("client");
  });

  // Acceptance: Scenario "targets 필터로 특정 client 패키지만 분류"
  it("filters clientPackages by targets", () => {
    const result = classifyPackages(
      {
        "client-a": { target: "client", server: "srv" } as any,
        "client-b": { target: "client", server: "srv" } as any,
      },
      ["client-a"],
    );
    expect(result.clientPackages).toHaveLength(1);
    expect(result.clientPackages[0].name).toBe("client-a");
  });

  // Acceptance: Scenario "targets 필터에 미포함된 client 패키지 제외"
  it("excludes client packages not in targets", () => {
    const result = classifyPackages(
      { "my-client": { target: "client", server: "srv" } as any },
      ["other-pkg"],
    );
    expect(result.clientPackages).toHaveLength(0);
  });

  // Acceptance: Scenario "scripts target은 여전히 제외"
  it("still excludes scripts target", () => {
    const result = classifyPackages(
      { "sd-claude": { target: "scripts" } },
      [],
    );
    expect(result.buildPackages).toHaveLength(0);
    expect(result.serverPackages).toHaveLength(0);
    expect(result.clientPackages).toHaveLength(0);
  });

  // Acceptance: Scenario "client 패키지가 0개인 경우"
  it("returns empty clientPackages when no client packages exist", () => {
    const result = classifyPackages(
      {
        "core-common": { target: "neutral", publish: { type: "npm" } } as any,
        "demo-server": { target: "server" } as any,
      },
      [],
    );
    expect(result.clientPackages).toHaveLength(0);
    expect(result.buildPackages).toHaveLength(1);
    expect(result.serverPackages).toHaveLength(1);
  });

  // Unit: mixed packages — all types classified correctly
  it("correctly classifies all package types together", () => {
    const result = classifyPackages(
      {
        "core-common": { target: "neutral", publish: { type: "npm" } } as any,
        "demo-server": { target: "server" } as any,
        "my-client": { target: "client", server: "srv" } as any,
        "sd-claude": { target: "scripts" },
      },
      [],
    );
    expect(result.buildPackages).toHaveLength(1);
    expect(result.buildPackages[0].name).toBe("core-common");
    expect(result.serverPackages).toHaveLength(1);
    expect(result.serverPackages[0].name).toBe("demo-server");
    expect(result.clientPackages).toHaveLength(1);
    expect(result.clientPackages[0].name).toBe("my-client");
  });
});

describe("BuildOrchestrator client build", () => {
  // Acceptance: Scenario "client 패키지 프로덕션 빌드 성공"
  it("uses ViteEngine for client packages with js:true dts:false", async () => {
    setupDefaults({
      packages: {
        "my-client": { target: "client", server: "my-server" } as any,
      },
    });
    vi.mocked(createBuildEngine).mockReturnValue({
      run: vi.fn().mockResolvedValue({
        build: { success: true, errors: [], warnings: [], diagnostics: [] },
      }),
      startWatch: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(createBuildEngine).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "my-client",
        config: expect.objectContaining({ target: "client" }),
      }),
      expect.any(Object),
    );
    const engineMock = vi.mocked(createBuildEngine).mock.results[0].value;
    expect(engineMock.run).toHaveBeenCalledWith({ js: true, dts: false, lint: false, includeTests: false });
    expect(engineMock.stop).toHaveBeenCalled();
  });

  // Acceptance: Scenario "client 패키지 빌드 실패"
  it("returns true when client build fails", async () => {
    setupDefaults({
      packages: {
        "my-client": { target: "client", server: "my-server" } as any,
      },
    });
    vi.mocked(createBuildEngine).mockReturnValue({
      run: vi.fn().mockResolvedValue({
        build: { success: false, errors: ["Template error"], warnings: [], diagnostics: [] },
      }),
      startWatch: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    const hasError = await orchestrator.start();

    expect(hasError).toBe(true);
  });

  // Acceptance: Scenario "BuildOrchestrator가 env를 ViteEngine에 전달" + "프로덕션 빌드의 baseEnv"
  it("injects baseEnv merged with config.env for client packages", async () => {
    setupDefaults({
      packages: {
        "my-client": {
          target: "client",
          server: "my-server",
          env: { API_HOST: "https://api.com" },
        } as any,
      },
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    const callArgs = vi.mocked(createBuildEngine).mock.calls[0][0] as any;
    expect(callArgs.config.env).toEqual(
      expect.objectContaining({
        VER: expect.any(String),
        DEV: "false",
        API_HOST: "https://api.com",
      }),
    );
  });

  // Acceptance: Scenario "client 패키지 dist 폴더 clean"
  it("cleans client package dist folder before building", async () => {
    setupDefaults({
      packages: {
        "my-client": { target: "client", server: "my-server" } as any,
      },
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(fsx.rm).toHaveBeenCalledWith(
      expect.stringContaining("my-client"),
    );
  });

  // Acceptance: Scenario "client 패키지 빌드 실행"
  it("runs client build engine and collects results", async () => {
    setupDefaults({
      packages: {
        "my-client": { target: "client", server: "my-server" } as any,
      },
    });

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    const hasError = await orchestrator.start();

    expect(createBuildEngine).toHaveBeenCalled();
    expect(hasError).toBe(false);
  });

  // Unit: client engine.stop() called even on failure
  it("stops client engine even when build fails", async () => {
    setupDefaults({
      packages: {
        "my-client": { target: "client", server: "my-server" } as any,
      },
    });
    vi.mocked(createBuildEngine).mockReturnValue({
      run: vi.fn().mockRejectedValue(new Error("build crashed")),
      startWatch: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    const engineMock = vi.mocked(createBuildEngine).mock.results[0].value;
    expect(engineMock.stop).toHaveBeenCalled();
  });
});

describe("BuildOrchestrator target validation", () => {
  it("throws error for unknown target during initialize", async () => {
    setupDefaults({
      packages: {
        "core-common": { target: "neutral", publish: { type: "npm" } },
      },
    });

    const orchestrator = new BuildOrchestrator({ targets: ["nonexistent"], options: [] });
    await expect(orchestrator.initialize()).rejects.toThrow("Unknown target: nonexistent");
  });

  it("passes with valid targets during initialize", async () => {
    setupDefaults({
      packages: {
        "core-common": { target: "neutral", publish: { type: "npm" } },
      },
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: ["core-common"], options: [] });
    await expect(orchestrator.initialize()).resolves.not.toThrow();
  });

  it("passes with empty targets during initialize", async () => {
    setupDefaults({
      packages: {
        "core-common": { target: "neutral", publish: { type: "npm" } },
      },
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await expect(orchestrator.initialize()).resolves.not.toThrow();
  });
});

describe("BuildOrchestrator native build - unit tests", () => {
  // Unit: Capacitor.create receives pkgDir and config.capacitor
  it("passes exclude to Capacitor.create when config has exclude", async () => {
    setupDefaults({
      packages: {
        "my-client": {
          target: "client",
          server: "my-server",
          capacitor: { appId: "com.test.app", appName: "TestApp" },
          exclude: ["better-sqlite3"],
        } as any,
      },
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(Capacitor.create).toHaveBeenCalledWith(
      expect.stringContaining("my-client"),
      { appId: "com.test.app", appName: "TestApp" },
      ["better-sqlite3"],
    );
  });

  // Unit: native build error sets hasError but doesn't crash
  it("sets hasError when Capacitor.build throws", async () => {
    setupDefaults({
      packages: {
        "my-client": {
          target: "client",
          server: "my-server",
          capacitor: { appId: "com.test.app", appName: "TestApp" },
        } as any,
      },
    });
    mockCapacitorInstance.build.mockRejectedValue(new Error("gradle failed"));
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    const hasError = await orchestrator.start();

    expect(hasError).toBe(true);
    expect(mockLogger.error).toHaveBeenCalled();
  });
});

describe("BuildOrchestrator native build integration (Slice 1)", () => {
  // Acceptance: Scenario "Capacitor 빌드 통합"
  it("runs Capacitor.create + initialize + build after ViteEngine build succeeds", async () => {
    setupDefaults({
      packages: {
        "my-client": {
          target: "client",
          server: "my-server",
          capacitor: { appId: "com.test.app", appName: "TestApp" },
        } as any,
      },
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    // ViteEngine should have been called
    expect(createBuildEngine).toHaveBeenCalled();
    const engineMock = vi.mocked(createBuildEngine).mock.results[0].value;
    expect(engineMock.run).toHaveBeenCalledWith({ js: true, dts: false, lint: false, includeTests: false });

    // Capacitor should have been created, initialized, and built
    expect(Capacitor.create).toHaveBeenCalledWith(
      expect.stringContaining("my-client"),
      { appId: "com.test.app", appName: "TestApp" },
      undefined,
    );
    expect(mockCapacitorInstance.initialize).toHaveBeenCalled();
    expect(mockCapacitorInstance.build).toHaveBeenCalledWith(
      expect.stringContaining("dist"),
    );
  });

  // Acceptance: Scenario "Electron 빌드 통합"
  it("runs Electron.create + initialize + build after ViteEngine build succeeds", async () => {
    setupDefaults({
      packages: {
        "my-client": {
          target: "client",
          server: "my-server",
          electron: { appId: "com.test.electron" },
        } as any,
      },
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(Electron.create).toHaveBeenCalledWith(
      expect.stringContaining("my-client"),
      { appId: "com.test.electron" },
      undefined,
    );
    expect(mockElectronInstance.initialize).toHaveBeenCalled();
    expect(mockElectronInstance.build).toHaveBeenCalledWith(
      expect.stringContaining("dist"),
    );
  });

  // Acceptance: Scenario "Capacitor + Electron 동시 빌드"
  it("runs both Capacitor and Electron build when both are configured", async () => {
    setupDefaults({
      packages: {
        "my-client": {
          target: "client",
          server: "my-server",
          capacitor: { appId: "com.test.app", appName: "TestApp" },
          electron: { appId: "com.test.electron" },
        } as any,
      },
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(Capacitor.create).toHaveBeenCalled();
    expect(mockCapacitorInstance.initialize).toHaveBeenCalled();
    expect(mockCapacitorInstance.build).toHaveBeenCalled();

    expect(Electron.create).toHaveBeenCalled();
    expect(mockElectronInstance.initialize).toHaveBeenCalled();
    expect(mockElectronInstance.build).toHaveBeenCalled();
  });

  // Acceptance: Scenario "네이티브 설정 없음"
  it("does not run native builds when no capacitor/electron configured", async () => {
    setupDefaults({
      packages: {
        "my-client": {
          target: "client",
          server: "my-server",
        } as any,
      },
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(Capacitor.create).not.toHaveBeenCalled();
    expect(Electron.create).not.toHaveBeenCalled();
  });

  // Acceptance: Scenario "ViteEngine 빌드 실패 시 네이티브 빌드 건너뜀"
  it("skips native builds when ViteEngine build fails", async () => {
    setupDefaults({
      packages: {
        "my-client": {
          target: "client",
          server: "my-server",
          capacitor: { appId: "com.test.app", appName: "TestApp" },
        } as any,
      },
    });
    vi.mocked(createBuildEngine).mockReturnValue({
      run: vi.fn().mockResolvedValue({
        build: { success: false, errors: ["Build error"], warnings: [], diagnostics: [] },
      }),
      startWatch: vi.fn(),
      stop: vi.fn().mockResolvedValue(undefined),
    });
    const mockProxy = createMockWorkerProxy();
    vi.mocked(Worker.create).mockReturnValue(mockProxy as any);

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    const hasError = await orchestrator.start();

    expect(hasError).toBe(true);
    expect(Capacitor.create).not.toHaveBeenCalled();
  });
});

//#region Slice 3: build 명령어 lint 통합 (Feature 3.2)

const { runLintInWorker } = await import("../../src/lint/lint-utils");

describe("BuildOrchestrator lint integration", () => {
  // build에서 lint를 실행하지 않는다 (lint는 check에서만 실행)
  it("passes lint:false to engine.run for all package types", async () => {
    setupDefaults({
      packages: {
        "core-common": { target: "neutral", publish: { type: "npm" } },
        "demo-server": { target: "server" },
        "my-client": { target: "client", server: "demo-server" } as any,
      },
    });

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(mockEngines).toHaveLength(3);
    for (const engine of mockEngines) {
      const runArgs = engine.run.mock.calls[0][0];
      expect(runArgs.lint).toBe(false);
    }
  });

  it("does not call runLint (separate lint worker)", async () => {
    setupDefaults({
      packages: {
        "core-common": { target: "neutral", publish: { type: "npm" } },
      },
    });

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(runLintInWorker).not.toHaveBeenCalled();
  });

  it("excludes scripts packages", async () => {
    setupDefaults({
      packages: {
        "core-common": { target: "neutral", publish: { type: "npm" } },
        "sd-claude": { target: "scripts" } as any,
      },
    });

    const orchestrator = new BuildOrchestrator({ targets: [], options: [] });
    await orchestrator.initialize();
    await orchestrator.start();

    expect(mockEngines).toHaveLength(1);
    expect(runLintInWorker).not.toHaveBeenCalled();
  });
});

//#endregion

//#endregion
