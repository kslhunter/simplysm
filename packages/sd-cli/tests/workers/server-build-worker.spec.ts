import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";

//#region Mocks

let workerFns: Record<string, (...args: any[]) => any>;
let mockSend: ReturnType<typeof vi.fn>;

// Guard mock state
let guardCalled = false;

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

// tsc build mock
const mockRunTscPackageBuild = vi.fn(() => ({
  success: true,
  errors: undefined,
  diagnostics: [],
  errorCount: 0,
  warningCount: 0,
}));

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

vi.mock("@simplysm/core-common", () => ({
  err: { message: (e: any) => e?.message ?? String(e) },
}));

vi.mock("consola", () => ({
  consola: {
    withTag: vi.fn(() => ({
      debug: vi.fn(),
      warn: vi.fn(),
    })),
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

vi.mock("../../src/utils/esbuild-config", () => ({
  createServerEsbuildOptions: vi.fn(() => ({ plugins: [] })),
  collectAllDependencyExternals: vi.fn(() => ({ optionalPeerDeps: [], nativeModules: [] })),
  writeChangedOutputFiles: vi.fn(() => Promise.resolve(true)),
}));

vi.mock("../../src/utils/tsc-build", () => ({
  runTscPackageBuild: mockRunTscPackageBuild,
}));

vi.mock("../../src/utils/worker-utils", () => ({
  registerCleanupHandlers: vi.fn(),
  createOnceGuard: vi.fn(() => () => {
    if (guardCalled) throw new Error("startWatch has already been called");
    guardCalled = true;
  }),
  setupWorkerConsola: vi.fn(),
}));

vi.mock("../../src/utils/package-utils", () => ({
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
  await import("../../src/utils/esbuild-config");

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
    mockRunTscPackageBuild.mockReturnValue({
      success: true,
      errors: undefined,
      diagnostics: [],
      errorCount: 0,
      warningCount: 0,
      });

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

  // Acceptance: esbuild + typecheck parallel execution
  it("runs esbuild and tsc in parallel for server build", async () => {
    const result = await workerFns["build"](baseBuildInfo);

    expect(result.build.success).toBe(true);
    expect(result.mainJsPath).toBe(path.resolve(baseBuildInfo.pkgDir, "dist", "main.js").replace(/\\/g, "/"));

    // esbuild was called
    expect(esbuild.build).toHaveBeenCalled();

    // tsc was called with emit=false (server doesn't emit .d.ts)
    expect(mockRunTscPackageBuild).toHaveBeenCalledWith(
      expect.objectContaining({ output: { js: false, dts: false } }),
    );
  });

  // Acceptance: type error detected
  it("reports typecheck error in build field", async () => {
    mockRunTscPackageBuild.mockReturnValueOnce({
      success: false,
      errors: ["TS2345: type error"] as any,
      diagnostics: [{ code: 2345, category: 1 }] as any,
      errorCount: 1,
      warningCount: 0,
      });

    const result = await workerFns["build"](baseBuildInfo);

    expect(result.build.success).toBe(false);
    expect(result.build.errors).toContain("TS2345: type error");
    expect(result.build.diagnostics).toHaveLength(1);
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

  // Unit: .d.ts files are NOT generated (emit=false)
  it("never emits .d.ts files for server builds", async () => {
    await workerFns["build"](baseBuildInfo);

    expect(mockRunTscPackageBuild).toHaveBeenCalledWith(
      expect.objectContaining({ output: { js: false, dts: false } }),
    );
  });

  // Unit: esbuild exception handling
  it("handles esbuild exception gracefully", async () => {
    vi.mocked(esbuild.build).mockRejectedValueOnce(new Error("esbuild crash"));

    const result = await workerFns["build"](baseBuildInfo);

    expect(result.build.success).toBe(false);
    expect(result.build.errors).toContain("esbuild crash");
  });

  // Unit: tsconfig parsed and passed to tsc
  it("parses tsconfig and passes parsedConfig to tsc", async () => {
    const { parseTsconfig } = await import("../../src/utils/tsconfig");
    vi.mocked(parseTsconfig).mockClear();

    await workerFns["build"](baseBuildInfo);

    expect(parseTsconfig).toHaveBeenCalledTimes(1);
    expect(mockRunTscPackageBuild).toHaveBeenCalledWith(
      expect.objectContaining({ parsedConfig: expect.any(Object) }),
    );
  });

  // --- Production artifacts (from existing server.worker tests) ---

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

  it("calls copyPublicFiles with includeDev=false for production build", async () => {
    await workerFns["build"](baseBuildInfo);
    expect(copyPublicFiles).toHaveBeenCalledWith(baseBuildInfo.pkgDir, false);
  });

  it("collects externals from three sources", async () => {
    vi.mocked(collectAllDependencyExternals).mockReturnValue({
      optionalPeerDeps: ["opt-dep"],
      nativeModules: ["native-mod"],
    });

    mockLockfileContent = [
      "packages:",
      "",
      "  'opt-dep@1.2.3':",
      "    resolution: {integrity: sha512-a}",
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
    expect(pkg.dependencies["opt-dep"]).toBe("1.2.3");
    expect(pkg.dependencies["native-mod"]).toBe("2.4.0");
    expect(pkg.dependencies["manual-ext"]).toBe("3.1.0");
  });

  // Unit: reports error for externals not found in pnpm-lock.yaml
  it("reports error for external dependency not in lockfile", async () => {
    vi.mocked(collectAllDependencyExternals).mockReturnValue({
      optionalPeerDeps: ["unknown-dep"],
      nativeModules: [],
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
    expect(result.build.errors[0]).toContain("unknown-dep");
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

  // Acceptance: env from BuildOutput is passed through to runTscPackageBuild
  it("passes env from output to runTscPackageBuild", async () => {
    mockRunTscPackageBuild.mockClear();

    await workerFns["build"]({
      ...baseBuildInfo,
      output: { js: true, dts: false, env: "node" },
    });

    expect(mockRunTscPackageBuild).toHaveBeenCalledWith(
      expect.objectContaining({ env: "node" }),
    );
  });

  // Acceptance: env is undefined when not set in output
  it("passes undefined env when output.env is not set", async () => {
    mockRunTscPackageBuild.mockClear();

    await workerFns["build"](baseBuildInfo);

    expect(mockRunTscPackageBuild).toHaveBeenCalledWith(
      expect.objectContaining({ env: undefined }),
    );
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
    guardCalled = false;
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
    mockRunTscPackageBuild.mockReturnValue({
      success: true,
      errors: undefined,
      diagnostics: [],
      errorCount: 0,
      warningCount: 0,
      });

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

  // Acceptance: typecheck runs on rebuild
  it("runs tsc on file change rebuild", async () => {
    await workerFns["startWatch"](watchInfo);

    const onChangeHandler = mockOnChange.mock.calls[0][1] as (
      changes: Array<{ event: string; path: string }>,
    ) => Promise<void>;

    mockRunTscPackageBuild.mockClear();
    await onChangeHandler([{ event: "add", path: "/workspace/packages/my-server/src/new.ts" }]);

    expect(mockRunTscPackageBuild).toHaveBeenCalled();
  });

  // Acceptance: FsWatcher + dependency tracking
  it("creates esbuild context and starts FsWatcher", async () => {
    await workerFns["startWatch"](watchInfo);

    expect(esbuild.context).toHaveBeenCalled();
    expect(FsWatcher.watch).toHaveBeenCalled();
    expect(mockOnChange).toHaveBeenCalledWith({ delay: 300 }, expect.any(Function));
  });

  // Acceptance: workspace dependency source change triggers rebuild
  it("includes workspace dependency paths in FsWatcher", async () => {
    const { collectDeps } = await import("../../src/utils/package-utils");
    vi.mocked(collectDeps).mockReturnValue({
      workspaceDeps: ["core-common"],
      replaceDeps: [],
    } as any);

    await workerFns["startWatch"](watchInfo);

    const watchPaths = vi.mocked(FsWatcher.watch).mock.calls[0][0];
    expect(watchPaths.some((p) => p.includes("core-common"))).toBe(true);
  });

  // Acceptance: replaceDeps dist change triggers rebuild
  it("includes replaceDeps dist paths in FsWatcher", async () => {
    const { collectDeps } = await import("../../src/utils/package-utils");
    vi.mocked(collectDeps).mockReturnValue({
      workspaceDeps: [],
      replaceDeps: ["@other/lib"],
    } as any);

    await workerFns["startWatch"]({
      ...watchInfo,
      replaceDeps: { "@other/lib": "/external/lib" },
    });

    const watchPaths = vi.mocked(FsWatcher.watch).mock.calls[0][0];
    expect(watchPaths.some((p) => p.includes("@other") && p.includes("dist"))).toBe(true);
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

    expect(mockRebuild).not.toHaveBeenCalled();
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

  // Unit: file add recreates context
  it("recreates context on file add", async () => {
    await workerFns["startWatch"](watchInfo);

    const onChangeHandler = mockOnChange.mock.calls[0][1] as (
      changes: Array<{ event: string; path: string }>,
    ) => Promise<void>;

    vi.mocked(esbuild.context).mockClear();
    await onChangeHandler([{ event: "add", path: "/workspace/packages/my-server/src/new.ts" }]);

    expect(mockDispose).toHaveBeenCalled();
    expect(esbuild.context).toHaveBeenCalled();
  });

  // Unit: externals cached — not re-collected on non-package.json file add
  it("does not re-collect externals on file add when no package.json changed", async () => {
    await workerFns["startWatch"](watchInfo);

    const onChangeHandler = mockOnChange.mock.calls[0][1] as (
      changes: Array<{ event: string; path: string }>,
    ) => Promise<void>;

    vi.mocked(collectAllDependencyExternals).mockClear();
    await onChangeHandler([{ event: "add", path: "/workspace/packages/my-server/src/new.ts" }]);

    expect(collectAllDependencyExternals).not.toHaveBeenCalled();
  });

  // Unit: externals re-collected when package.json changes
  it("re-collects externals when package.json is among changed files", async () => {
    await workerFns["startWatch"](watchInfo);

    const onChangeHandler = mockOnChange.mock.calls[0][1] as (
      changes: Array<{ event: string; path: string }>,
    ) => Promise<void>;

    vi.mocked(collectAllDependencyExternals).mockClear();
    await onChangeHandler([
      { event: "add", path: "/workspace/packages/my-server/package.json" },
    ]);

    expect(collectAllDependencyExternals).toHaveBeenCalled();
  });

  // Unit: public files watched in dev mode
  it("calls watchPublicFiles with includeDev=true", async () => {
    await workerFns["startWatch"](watchInfo);
    expect(watchPublicFiles).toHaveBeenCalledWith(watchInfo.pkgDir, true);
  });

  // Acceptance: env is passed through in watch mode rebuild
  it("passes env to runTscPackageBuild on watch rebuild", async () => {
    await workerFns["startWatch"]({
      ...watchInfo,
      output: { js: true, dts: false, env: "node" },
    });

    const onChangeHandler = mockOnChange.mock.calls[0][1] as (
      changes: Array<{ event: string; path: string }>,
    ) => Promise<void>;

    mockRunTscPackageBuild.mockClear();
    await onChangeHandler([{ event: "add", path: "/workspace/packages/my-server/src/new.ts" }]);

    expect(mockRunTscPackageBuild).toHaveBeenCalledWith(
      expect.objectContaining({ env: "node" }),
    );
  });

  // Unit: guard prevents duplicate startWatch
  it("prevents duplicate startWatch calls", async () => {
    await workerFns["startWatch"](watchInfo);
    await expect(workerFns["startWatch"](watchInfo)).rejects.toThrow("already been called");
  });
});

describe("server-build.worker stopWatch()", () => {
  beforeEach(() => {
    guardCalled = false;
    mockDispose.mockClear();
    mockWatcherClose.mockClear();
    mockRunTscPackageBuild.mockReturnValue({
      success: true,
      errors: undefined,
      diagnostics: [],
      errorCount: 0,
      warningCount: 0,
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
