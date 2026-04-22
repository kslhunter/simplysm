import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";

//#region Mocks

let workerFns: Record<string, (...args: any[]) => any>;
let mockSend: ReturnType<typeof vi.fn>;

// Guard reset function (set by worker-utils mock factory)
let resetGuard: () => void;

// fs mock tracking
const writtenFiles = new Map<string, string>();
const mockWriteFileSync = vi.fn((filePath: string, content: string) => {
  writtenFiles.set(filePath, content);
});
const mockReadFileSync = vi.fn();
const mockExistsSync = vi.fn();

// FsWatcher mock
const mockOnChange = vi.fn();
const mockWatcherClose = vi.fn();

// esbuild context mock
const mockRebuild = vi.fn();
const mockDispose = vi.fn();
let mockMetafileInputs: Record<string, unknown> = {};

// SdTsCompiler mock (js=false path)
const mockCompileAsync = vi.fn(() => Promise.resolve({
  program: { getSourceFiles: () => [] },
  builderProgram: {},
  isForAngular: false,
  affectedFiles: undefined,
  diagnostics: [] as unknown[],
  errorCount: 0,
  warningCount: 0,
  errors: undefined as string[] | undefined,
  emitResults: undefined,
  lint: undefined,
  scssErrors: [],
  scssDependencies: new Map(),
}));
const MockSdTsCompiler = vi.fn().mockImplementation(function () {
  return { compileAsync: mockCompileAsync };
});

const mockCpxSpawnSync = vi.fn().mockReturnValue({ stdout: "v20.11.0", stderr: "", exitCode: 0 });

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
  cpx: {
    spawn: vi.fn().mockResolvedValue({ stdout: "", stderr: "", exitCode: 0 }),
    spawnSync: mockCpxSpawnSync,
  },
}));

vi.mock("esbuild", () => ({
  default: {
    context: vi.fn(() => {
      mockRebuild.mockResolvedValue({
        errors: [],
        warnings: [],
        outputFiles: [],
        metafile: { inputs: mockMetafileInputs, outputs: {} },
      });
      return Promise.resolve({ rebuild: mockRebuild, dispose: mockDispose });
    }),
    build: vi.fn(() => Promise.resolve({
      errors: [],
      warnings: [],
      outputFiles: [{ path: "/workspace/packages/my-server/dist/main.js", text: "export {}" }],
    })),
  },
  formatMessagesSync: (messages: Array<{ text: string }>, _opts: unknown) =>
    messages.map((m) => m.text),
}));

vi.mock("fs", () => ({
  default: {
    readFileSync: (...args: unknown[]) => mockReadFileSync(...(args as [string])),
    writeFileSync: (...args: unknown[]) => mockWriteFileSync(...(args as [string, string])),
    existsSync: (...args: unknown[]) => mockExistsSync(...(args as [string])),
  },
  readFileSync: (...args: unknown[]) => mockReadFileSync(...(args as [string])),
  writeFileSync: (...args: unknown[]) => mockWriteFileSync(...(args as [string, string])),
  existsSync: (...args: unknown[]) => mockExistsSync(...(args as [string])),
}));


// Mock lockfile content for resolveLockedVersion
let mockLockfileContent = "";


vi.mock("../../src/utils/tsconfig", () => ({
  parseTsconfig: vi.fn(() => ({
    options: { target: 1, module: 99 },
    fileNames: ["/workspace/packages/my-server/src/main.ts"],
    errors: [],
  })),
  getPackageSourceFiles: vi.fn(() => ["/workspace/packages/my-server/src/main.ts"]),
}));

vi.mock("../../src/esbuild/esbuild-config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/esbuild/esbuild-config")>();
  return {
    ...actual,
    collectAllDependencyExternals: vi.fn(() => ({ optionalPeerDeps: [], nativeModules: [] })),
    writeChangedOutputFiles: vi.fn(() => Promise.resolve(true)),
  };
});

vi.mock("../../src/ts-compiler/SdTsCompiler", () => ({
  SdTsCompiler: MockSdTsCompiler,
}));

// tsc plugin mock (build() js=true path uses createTscPlugin)
const mockTscPlugin = {
  plugin: { name: "sd-tsc", setup: vi.fn() },
  getProgram: vi.fn(),
  getAffectedFiles: vi.fn(),
  getDiagnostics: vi.fn((): unknown[] => []),
  getErrors: vi.fn((): string[] | undefined => undefined),
  getLintResult: vi.fn((): unknown => undefined),
  resetBuilderProgram: vi.fn(),
};

vi.mock("../../src/esbuild/esbuild-tsc-plugin", () => ({
  createTscPlugin: vi.fn(() => mockTscPlugin),
}));

vi.mock("../../src/workers/shared-worker-lifecycle", () => {
  let guardCalled = false;
  resetGuard = () => { guardCalled = false; };
  return {
    setupWorkerLifecycle: vi.fn(() => ({
      logger: { debug: vi.fn(), warn: vi.fn() },
      guardStartWatch: () => {
        if (guardCalled) throw new Error("startWatch can only be called once per Worker");
        guardCalled = true;
      },
    })),
  };
});

vi.mock("../../src/deps/replace-deps/collect-deps", () => ({
  collectDeps: vi.fn(() => ({ workspaceDeps: [], replaceDeps: [] })),
}));

vi.mock("../../src/utils/copy-public", () => ({
  copyPublicFiles: vi.fn(() => Promise.resolve()),
  watchPublicFiles: vi.fn(() => Promise.resolve(undefined)),
}));

//#endregion

// Import triggers createWorker, capturing the functions
await import("../../src/workers/server-build.worker");

const esbuild = (await import("esbuild")).default;
const { FsWatcher } = await import("@simplysm/core-node");
const { copyPublicFiles, watchPublicFiles } = await import("../../src/utils/copy-public");
const { collectAllDependencyExternals } =
  await import("../../src/esbuild/esbuild-config");

describe("server-build.worker build()", () => {
  const baseBuildInfo = {
    name: "my-server",
    cwd: "/workspace",
    pkgDir: "/workspace/packages/my-server",
    output: { js: true, dts: false },
  };

  beforeEach(() => {
    writtenFiles.clear();
    mockWriteFileSync.mockClear();
    mockReadFileSync.mockReset();
    mockExistsSync.mockReset();
    vi.mocked(esbuild.build).mockClear();
    vi.mocked(copyPublicFiles).mockClear();
    vi.mocked(collectAllDependencyExternals).mockReturnValue({
      optionalPeerDeps: [],
      nativeModules: [],
    });
    mockCompileAsync.mockResolvedValue({
      program: { getSourceFiles: () => [] },
      builderProgram: {},
      isForAngular: false,
      affectedFiles: undefined,
      diagnostics: [],
      errorCount: 0,
      warningCount: 0,
      errors: undefined,
      emitResults: undefined,
      lint: undefined,
      scssErrors: [],
      scssDependencies: new Map(),
    });

    // Reset tsc plugin mock (used for js=true path)
    mockTscPlugin.getProgram.mockReset();
    mockTscPlugin.getAffectedFiles.mockReset();
    mockTscPlugin.getDiagnostics.mockReset().mockReturnValue([]);
    mockTscPlugin.getErrors.mockReset().mockReturnValue(undefined);
    mockTscPlugin.getLintResult.mockReset().mockReturnValue(undefined);
    mockTscPlugin.resetBuilderProgram.mockReset();

    // Reset lockfile content and cache
    mockLockfileContent = "";
    // Clear lockfile cache (module-level variable in worker)
    // The cache is per-import, so re-importing clears it

    mockExistsSync.mockImplementation((fp: string) => {
      if (String(fp).endsWith("pnpm-lock.yaml")) return mockLockfileContent !== "";
      return false;
    });

    mockReadFileSync.mockImplementation((filePath: string) => {
      const fp = String(filePath);
      if (fp.endsWith("pnpm-lock.yaml")) {
        return mockLockfileContent;
      }
      if (fp.endsWith("package.json")) {
        return JSON.stringify({
          name: "@simplysm/my-server",
          version: "1.0.0",
          type: "module",
          dependencies: {},
        });
      }
      return "";
    });
  });

  // Acceptance: production build includes worker bundle plugin
  it("includes worker bundle plugin in esbuild.build() plugins", async () => {
    await workerFns["build"](baseBuildInfo);

    expect(esbuild.build).toHaveBeenCalledWith(
      expect.objectContaining({
        plugins: [
          expect.objectContaining({ name: "sd-worker-bundle" }),
          mockTscPlugin.plugin,
        ],
      }),
    );
  });

  // Acceptance: esbuild + typecheck parallel execution
  it("runs esbuild and tsc in parallel for server build", async () => {
    const result = await workerFns["build"](baseBuildInfo);

    expect(result.build.success).toBe(true);
    expect(result.mainJsPath).toBe(path.resolve(baseBuildInfo.pkgDir, "dist", "main.js").replace(/\\/g, "/"));
  });

  // Acceptance: type error detected via tsc plugin (js=true)
  it("reports typecheck error in build field", async () => {
    mockTscPlugin.getErrors.mockReturnValue(["TS2345: type error"]);
    mockTscPlugin.getDiagnostics.mockReturnValue([{ code: 2345, category: 1 }]);

    const result = await workerFns["build"](baseBuildInfo);

    expect(result.build.success).toBe(false);
    expect(result.build.errors).toContain("TS2345: type error");
    expect(result.build.diagnostics).toHaveLength(1);
  });

  // Acceptance: esbuild + tsc both error — merged
  it("merges esbuild and tsc errors when both fail", async () => {
    vi.mocked(esbuild.build).mockResolvedValueOnce({
      errors: [{ text: "esbuild syntax error" }],
      warnings: [],
      outputFiles: [],
    } as any);
    mockTscPlugin.getErrors.mockReturnValue(["TS2322: type mismatch"]);

    const result = await workerFns["build"](baseBuildInfo);

    expect(result.build.success).toBe(false);
    expect(result.build.errors).toContain("esbuild syntax error");
    expect(result.build.errors).toContain("TS2322: type mismatch");
  });

  // Acceptance: diagnostics from tsc plugin (js=true)
  it("includes diagnostics from tsc plugin in build result", async () => {
    mockTscPlugin.getDiagnostics.mockReturnValue([
      { code: 2322, category: 1, messageText: "Type mismatch" },
    ]);

    const result = await workerFns["build"](baseBuildInfo);

    expect(result.build.diagnostics).toHaveLength(1);
    expect(result.build.diagnostics[0]).toEqual(
      expect.objectContaining({ code: 2322 }),
    );
  });

  // Acceptance: js=false uses SdTsCompiler directly
  it("uses SdTsCompiler directly when output.js=false", async () => {
    mockCompileAsync.mockResolvedValueOnce({
      program: { getSourceFiles: () => [] },
      builderProgram: {},
      isForAngular: false,
      affectedFiles: undefined,
      diagnostics: [{ code: 2345, category: 1 }],
      errorCount: 1,
      warningCount: 0,
      errors: ["TS2345: type error"],
      emitResults: undefined,
      lint: undefined,
      scssErrors: [],
      scssDependencies: new Map(),
    });

    const result = await workerFns["build"]({
      ...baseBuildInfo,
      output: { js: false, dts: true },
    });

    expect(result.build.success).toBe(false);
    expect(result.build.errors).toContain("TS2345: type error");
  });

  // Acceptance: esbuild error detected
  it("reports esbuild error in build field", async () => {
    vi.mocked(esbuild.build).mockResolvedValueOnce({
      errors: [{ text: "syntax error" }],
      warnings: [],
      outputFiles: [],
    } as any);

    const result = await workerFns["build"](baseBuildInfo);

    expect(result.build.success).toBe(false);
    expect(result.build.errors).toContain("syntax error");
  });

  // Unit: esbuild exception handling
  it("handles esbuild exception gracefully", async () => {
    vi.mocked(esbuild.build).mockRejectedValueOnce(new Error("esbuild crash"));

    const result = await workerFns["build"](baseBuildInfo);

    expect(result.build.success).toBe(false);
    expect(result.build.errors).toContain("esbuild crash");
  });

  // --- Production artifacts ---

  describe("production artifacts", () => {
    it("writes .config.json with configs data", async () => {
    await workerFns["build"]({
      ...baseBuildInfo,
      configs: { db: { host: "localhost", port: 5432 } },
    });

    const configPath = path.join(baseBuildInfo.pkgDir, "dist", ".config.json");
    expect(writtenFiles.has(configPath)).toBe(true);
    expect(JSON.parse(writtenFiles.get(configPath)!)).toEqual({ db: { host: "localhost", port: 5432 } });
  });

  it("generates dist/package.json with externals using versions from pnpm-lock.yaml", async () => {
    vi.mocked(collectAllDependencyExternals).mockReturnValue({
      optionalPeerDeps: [],
      nativeModules: ["bcrypt"],
    });

    mockLockfileContent = [
      "packages:",
      "",
      "  'bcrypt@5.1.1':",
      "    resolution: {integrity: sha512-abc}",
      "",
      "  'some-pkg@2.0.3':",
      "    resolution: {integrity: sha512-def}",
    ].join("\n");

    mockExistsSync.mockImplementation((fp: string) => {
      if (String(fp).endsWith("pnpm-lock.yaml")) return true;
      return false;
    });

    await workerFns["build"]({
      ...baseBuildInfo,
      externals: ["some-pkg"],
    });

    const pkgJsonPath = path.join(baseBuildInfo.pkgDir, "dist", "package.json");
    const pkg = JSON.parse(writtenFiles.get(pkgJsonPath)!);
    expect(pkg.name).toBe("@simplysm/my-server");
    expect(pkg.dependencies["bcrypt"]).toBe("5.1.1");
    expect(pkg.dependencies["some-pkg"]).toBe("2.0.3");
  });

  it("generates dist/openssl.cnf with legacy provider config", async () => {
    await workerFns["build"](baseBuildInfo);

    const opensslPath = path.join(baseBuildInfo.pkgDir, "dist", "openssl.cnf");
    expect(writtenFiles.has(opensslPath)).toBe(true);
    expect(writtenFiles.get(opensslPath)!).toContain("[legacy_sect]");
  });

  it("generates dist/pm2.config.cjs when pm2 option is provided", async () => {
    await workerFns["build"]({
      ...baseBuildInfo,
      pm2: { name: "my-app", ignoreWatchPaths: ["logs"] },
    });

    const pm2Path = path.join(baseBuildInfo.pkgDir, "dist", "pm2.config.cjs");
    expect(writtenFiles.has(pm2Path)).toBe(true);
    expect(writtenFiles.get(pm2Path)!).toContain('"my-app"');
  });

  it("generates dist/mise.toml when packageManager=mise", async () => {
    mockExistsSync.mockImplementation((filePath: string) =>
      String(filePath).endsWith("mise.toml"),
    );
    mockReadFileSync.mockImplementation((filePath: string) => {
      if (String(filePath).endsWith("mise.toml")) return '[tools]\nnode = "22.5.0"';
      return JSON.stringify({ name: "@simplysm/my-server", version: "1.0.0", type: "module" });
    });

    await workerFns["build"]({
      ...baseBuildInfo,
      packageManager: "mise",
    });

    const misePath = path.join(baseBuildInfo.pkgDir, "dist", "mise.toml");
    expect(writtenFiles.get(misePath)).toContain('node = "22.5.0"');
  });

  it("adds volta field to dist/package.json when packageManager=volta", async () => {
    await workerFns["build"]({
      ...baseBuildInfo,
      packageManager: "volta",
    });

    const pkgJsonPath = path.join(baseBuildInfo.pkgDir, "dist", "package.json");
    const pkg = JSON.parse(writtenFiles.get(pkgJsonPath)!);
    expect(pkg.volta).toBeDefined();
    expect(pkg.volta.node).toBe("v20.11.0");
  });

  it("includes nativeModules and manual externals in dist/package.json but excludes missing optional peer deps", async () => {
    vi.mocked(collectAllDependencyExternals).mockReturnValue({
      optionalPeerDeps: ["opt-dep"],
      nativeModules: ["native-mod"],
    });

    mockLockfileContent = [
      "packages:",
      "",
      "  'native-mod@2.4.0':",
      "    resolution: {integrity: sha512-b}",
      "",
      "  'manual-ext@3.1.0':",
      "    resolution: {integrity: sha512-c}",
    ].join("\n");

    mockExistsSync.mockImplementation((fp: string) => {
      if (String(fp).endsWith("pnpm-lock.yaml")) return true;
      return false;
    });

    await workerFns["build"]({
      ...baseBuildInfo,
      externals: ["manual-ext"],
    });

    const pkgJsonPath = path.join(baseBuildInfo.pkgDir, "dist", "package.json");
    const pkg = JSON.parse(writtenFiles.get(pkgJsonPath)!);
    expect(pkg.dependencies["opt-dep"]).toBeUndefined();
    expect(pkg.dependencies["native-mod"]).toBe("2.4.0");
    expect(pkg.dependencies["manual-ext"]).toBe("3.1.0");
  });

  // Unit: reports error when a nativeModule/manual external is missing from lockfile
  it("reports error for external dependency not in lockfile", async () => {
    vi.mocked(collectAllDependencyExternals).mockReturnValue({
      optionalPeerDeps: [],
      nativeModules: ["unknown-native"],
    });

    mockLockfileContent = [
      "packages:",
      "",
      "  'other-pkg@1.0.0':",
      "    resolution: {integrity: sha512-abc}",
    ].join("\n");

    mockExistsSync.mockImplementation((fp: string) => {
      if (String(fp).endsWith("pnpm-lock.yaml")) return true;
      return false;
    });

    const result = await workerFns["build"](baseBuildInfo);
    expect(result.build.success).toBe(false);
    expect(result.build.errors[0]).toContain("unknown-native");
    expect(result.build.errors[0]).toContain("not found in pnpm-lock.yaml");
  });

  // Unit: uses locked version for native module externals
  it("uses locked version for native module externals", async () => {
    vi.mocked(collectAllDependencyExternals).mockReturnValue({
      optionalPeerDeps: [],
      nativeModules: ["native-opt"],
    });

    mockLockfileContent = [
      "packages:",
      "",
      "  'native-opt@4.2.1':",
      "    resolution: {integrity: sha512-xyz}",
    ].join("\n");

    mockExistsSync.mockImplementation((fp: string) => {
      if (String(fp).endsWith("pnpm-lock.yaml")) return true;
      return false;
    });

    await workerFns["build"](baseBuildInfo);

    const pkgJsonPath = path.join(baseBuildInfo.pkgDir, "dist", "package.json");
    const pkg = JSON.parse(writtenFiles.get(pkgJsonPath)!);
    expect(pkg.dependencies["native-opt"]).toBe("4.2.1");
  });
  });

});

describe("server-build.worker startWatch()", () => {
  const watchInfo = {
    name: "my-server",
    cwd: "/workspace",
    pkgDir: "/workspace/packages/my-server",
    output: { js: true, dts: false },
  };

  beforeEach(() => {
    resetGuard();
    mockMetafileInputs = {};
    writtenFiles.clear();
    mockWriteFileSync.mockClear();
    mockRebuild.mockClear();
    mockDispose.mockClear();
    mockOnChange.mockClear();
    mockWatcherClose.mockClear();
    mockSend.mockClear();
    vi.mocked(esbuild.context).mockClear();
    vi.mocked(FsWatcher.watch).mockClear();
    vi.mocked(watchPublicFiles).mockClear();
    mockCompileAsync.mockResolvedValue({
      program: { getSourceFiles: () => [] },
      builderProgram: {},
      isForAngular: false,
      affectedFiles: undefined,
      diagnostics: [],
      errorCount: 0,
      warningCount: 0,
      errors: undefined,
      emitResults: undefined,
      lint: undefined,
      scssErrors: [],
      scssDependencies: new Map(),
    });

    // Reset tsc plugin mock (used for watch mode rebuild)
    mockTscPlugin.getProgram.mockReset();
    mockTscPlugin.getAffectedFiles.mockReset();
    mockTscPlugin.getDiagnostics.mockReset().mockReturnValue([]);
    mockTscPlugin.getErrors.mockReset().mockReturnValue(undefined);
    mockTscPlugin.resetBuilderProgram.mockReset();

    mockReadFileSync.mockImplementation((filePath: string) => {
      if (String(filePath).endsWith("package.json")) {
        return JSON.stringify({
          name: "@simplysm/my-server",
          version: "1.0.0",
          type: "module",
        });
      }
      return "";
    });
  });

  // Acceptance: initial build with typecheck
  it("sends build event with build results after initial build", async () => {
    await workerFns["startWatch"](watchInfo);

    expect(mockSend).toHaveBeenCalledWith("build", expect.objectContaining({
      build: expect.objectContaining({ success: true }),
      mainJsPath: path.resolve(watchInfo.pkgDir, "dist", "main.js").replace(/\\/g, "/"),
    }));
  });

  // Acceptance: metafile-based filtering
  it("skips rebuild when changed file is not in metafile.inputs", async () => {
    mockMetafileInputs = { "packages/my-server/src/main.ts": {} };

    await workerFns["startWatch"](watchInfo);

    const onChangeHandler = mockOnChange.mock.calls[0][1] as (
      changes: Array<{ event: string; path: string }>,
    ) => Promise<void>;

    mockRebuild.mockClear();
    mockSend.mockClear();
    const absPath = path.resolve("/workspace", "packages/my-server/src/unrelated.ts").replace(/\\/g, "/");
    await onChangeHandler([{ event: "change", path: absPath }]);

    // buildStart must NOT be sent when rebuild is skipped (LOGIC-001 fix)
    expect(mockSend).not.toHaveBeenCalledWith("buildStart", expect.anything());
  });

  // Acceptance: watch mode doesn't generate production artifacts
  it("writes .config.json but not production files in watch mode", async () => {
    await workerFns["startWatch"]({
      ...watchInfo,
      configs: { key: "value" },
    });

    const configPath = path.join(watchInfo.pkgDir, "dist", ".config.json");
    expect(writtenFiles.has(configPath)).toBe(true);

    // Production files should NOT be generated
    const pkgJsonPath = path.join(watchInfo.pkgDir, "dist", "package.json");
    expect(writtenFiles.has(pkgJsonPath)).toBe(false);
  });

  // Unit: guard prevents duplicate startWatch
  it("prevents duplicate startWatch calls", async () => {
    await workerFns["startWatch"](watchInfo);
    await expect(workerFns["startWatch"](watchInfo)).rejects.toThrow("can only be called once");
  });

  // Acceptance: esbuild context creation failure leaves safe state (LOGIC-001)
  it("allows tsc-only rebuilds after esbuild context recreation failure", async () => {
    // Provide metafile inputs so subsequent change passes the metafile filter
    mockMetafileInputs = { "packages/my-server/src/main.ts": {} };

    await workerFns["startWatch"](watchInfo);

    const onChangeHandler = mockOnChange.mock.calls[0][1] as (
      changes: Array<{ event: string; path: string }>,
    ) => Promise<void>;

    // After dispose, rebuild should throw (simulates real disposed context)
    mockDispose.mockImplementation(() => {
      mockRebuild.mockRejectedValue(new Error("Build context already disposed"));
    });

    // Make context() throw to simulate creation failure
    vi.mocked(esbuild.context).mockRejectedValueOnce(new Error("context creation failed"));
    mockSend.mockClear();

    // File add triggers context recreation → fails → sends "error"
    await onChangeHandler([{ event: "add", path: "/workspace/packages/my-server/src/new.ts" }]);

    // Subsequent file change should work without "disposed" errors
    mockSend.mockClear();
    const absPath = path.resolve("/workspace", "packages/my-server/src/main.ts").replace(/\\/g, "/");
    await onChangeHandler([{ event: "change", path: absPath }]);

    // Should NOT get "disposed" error
    const errorCalls = mockSend.mock.calls.filter((c) => c[0] === "error");
    for (const [, data] of errorCalls) {
      expect((data as { message: string }).message).not.toContain("disposed");
    }
    // Build event should be sent (tsc-only result)
    const buildCalls = mockSend.mock.calls.filter((c) => c[0] === "build");
    expect(buildCalls.length).toBeGreaterThanOrEqual(1);
  });

  // Acceptance: rebuildAll js=true — single esbuildCtx.rebuild() call, tsc not called directly
  it("uses esbuildCtx.rebuild() without direct tsc call in watch mode rebuild", async () => {
    mockMetafileInputs = { "packages/my-server/src/main.ts": {} };

    await workerFns["startWatch"](watchInfo);

    const onChangeHandler = mockOnChange.mock.calls[0][1] as (
      changes: Array<{ event: string; path: string }>,
    ) => Promise<void>;

    mockRebuild.mockClear();
    mockSend.mockClear();

    const absPath = path.resolve("/workspace", "packages/my-server/src/main.ts").replace(/\\/g, "/");
    await onChangeHandler([{ event: "change", path: absPath }]);

    // esbuild rebuild should have been called (tsc triggered by plugin inside)
    expect(mockRebuild).toHaveBeenCalled();
    // Build event should be sent
    expect(mockSend).toHaveBeenCalledWith("build", expect.objectContaining({
      build: expect.objectContaining({ success: true }),
    }));
  });

  // Acceptance: startWatch passes tsc options to createContext with worker plugin
  it("passes worker bundle plugin and tsc plugin to esbuildCtx.createContext", async () => {
    await workerFns["startWatch"]({
      ...watchInfo,
      output: { js: true, dts: true, env: "node" as any, includeTests: true },
    });

    expect(esbuild.context).toHaveBeenCalledWith(
      expect.objectContaining({
        plugins: [
          expect.objectContaining({ name: "sd-worker-bundle" }),
          mockTscPlugin.plugin,
        ],
      }),
    );
  });
});

describe("server-build.worker stopWatch()", () => {
  beforeEach(() => {
    resetGuard();
    mockDispose.mockClear();
    mockWatcherClose.mockClear();
    mockCompileAsync.mockResolvedValue({
      program: { getSourceFiles: () => [] },
      builderProgram: {},
      isForAngular: false,
      affectedFiles: undefined,
      diagnostics: [],
      errorCount: 0,
      warningCount: 0,
      errors: undefined,
      emitResults: undefined,
      lint: undefined,
      scssErrors: [],
      scssDependencies: new Map(),
    });
    mockReadFileSync.mockImplementation(() => JSON.stringify({ name: "x", version: "1.0.0", type: "module" }));
  });

  it("cleans up esbuild context and FsWatcher", async () => {
    await workerFns["startWatch"]({
      name: "my-server",
      cwd: "/workspace",
      pkgDir: "/workspace/packages/my-server",
      output: { js: true, dts: false },
    });
    await workerFns["stopWatch"]();

    expect(mockDispose).toHaveBeenCalled();
    expect(mockWatcherClose).toHaveBeenCalled();
  });
});
