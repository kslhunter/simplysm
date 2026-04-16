import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

// SdTsCompiler mock (js=false path) — lint result is part of compileAsync result
const mockLintResult = {
  success: true,
  errorCount: 0,
  warningCount: 0,
  formattedOutput: "",
};

const mockCompileAsync = vi.fn(() => Promise.resolve({
  program: { getSourceFiles: () => [] },
  builderProgram: {},
  isForAngular: false,
  affectedFiles: undefined,
  diagnostics: [],
  errorCount: 0,
  warningCount: 0,
  errors: undefined as string[] | undefined,
  emitResults: undefined,
  lint: undefined as typeof mockLintResult | undefined,
  scssErrors: [],
  scssDependencies: new Map(),
}));

const MockSdTsCompiler = vi.fn().mockImplementation(function () {
  return { compileAsync: mockCompileAsync };
});

vi.mock("../../src/ts-compiler/SdTsCompiler", () => ({
  SdTsCompiler: MockSdTsCompiler,
}));

// tsc plugin mock (build() js=true path)
const mockTscPlugin = {
  plugin: { name: "sd-tsc", setup: vi.fn() },
  getProgram: vi.fn(),
  getAffectedFiles: vi.fn(),
  getDiagnostics: vi.fn((): unknown[] => []),
  getErrors: vi.fn((): string[] | undefined => undefined),
  getLintResult: vi.fn((): typeof mockLintResult | undefined => undefined),
  resetBuilderProgram: vi.fn(),
};

vi.mock("../../src/esbuild/esbuild-tsc-plugin", () => ({
  createTscPlugin: vi.fn(() => mockTscPlugin),
}));

vi.mock("../../src/utils/tsconfig", () => ({
  parseTsconfig: vi.fn(() => ({ options: {}, fileNames: [] })),
  getPackageSourceFiles: vi.fn(() => []),
}));

vi.mock("../../src/esbuild/esbuild-config", () => ({
  createServerEsbuildOptions: vi.fn(() => ({})),
  collectAllDependencyExternals: vi.fn(() => ({ optionalPeerDeps: [], nativeModules: [] })),
  writeChangedOutputFiles: vi.fn(),
}));

vi.mock("esbuild", () => ({
  default: {
    build: vi.fn().mockResolvedValue({ errors: [], warnings: [], outputFiles: [] }),
    context: vi.fn().mockResolvedValue({ rebuild: vi.fn(), dispose: vi.fn() }),
  },
}));

vi.mock("../../src/runtime/worker-utils", () => ({
  registerCleanupHandlers: vi.fn(),
  createOnceGuard: vi.fn(() => vi.fn()),
  setupWorkerConsola: vi.fn(),
}));

vi.mock("../../src/utils/copy-public", () => ({
  copyPublicFiles: vi.fn(),
  watchPublicFiles: vi.fn(),
}));

vi.mock("../../src/deps/replace-deps/collect-deps", () => ({
  collectDeps: vi.fn(() => ({ workspaceDeps: [], replaceDeps: [] })),
}));

vi.mock("@simplysm/core-node", () => ({
  createWorker: vi.fn(
    (methods: Record<string, Function>) => {
      Object.assign(workerMethods, methods);
      return { send: vi.fn() };
    },
  ),
  FsWatcher: { watch: vi.fn() },
  pathx: {
    posix: vi.fn((p: string) => p.replace(/\\/g, "/")),
    posixResolve: vi.fn((...args: string[]) => args.join("/").replace(/\/+/g, "/").replace(/\\/g, "/")),
  },
}));

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn(() => false),
    readFileSync: vi.fn(() => '{"name":"test","version":"1.0.0","type":"module"}'),
    writeFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  },
}));

vi.mock("execa", () => ({
  execaSync: vi.fn(() => ({ stdout: "v20.0.0" })),
}));

const workerMethods: Record<string, Function> = {};

await import("../../src/workers/server-build.worker");

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
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

  // Reset tsc plugin mock
  mockTscPlugin.getProgram.mockReset();
  mockTscPlugin.getAffectedFiles.mockReset();
  mockTscPlugin.getDiagnostics.mockReset().mockReturnValue([]);
  mockTscPlugin.getErrors.mockReset().mockReturnValue(undefined);
  mockTscPlugin.getLintResult.mockReset().mockReturnValue(undefined);
  mockTscPlugin.resetBuilderProgram.mockReset();
});

describe("server-build.worker lint integration (Slice 3)", () => {
  describe("Scenario: js=false lint via SdTsCompiler", () => {
    it("returns lint result from SdTsCompiler when lint is enabled", async () => {
      mockCompileAsync.mockResolvedValueOnce({
        program: { getSourceFiles: () => [] },
        builderProgram: {},
        isForAngular: false,
        affectedFiles: undefined,
        diagnostics: [],
        errorCount: 0,
        warningCount: 0,
        errors: undefined,
        emitResults: undefined,
        lint: mockLintResult,
        scssErrors: [],
        scssDependencies: new Map(),
      });

      const result = await workerMethods["build"]({
        name: "my-server",
        cwd: "/workspace",
        pkgDir: "/workspace/packages/my-server",
        output: { js: false, dts: false, lint: true },
      });

      expect(result).toHaveProperty("lint");
      expect(result.lint).toEqual(mockLintResult);
    });
  });

  describe("Scenario: js=true lint via tscPlugin.getLintResult()", () => {
    it("returns lint result from tsc plugin when js=true and lint enabled", async () => {
      mockTscPlugin.getLintResult.mockReturnValue(mockLintResult);

      const result = await workerMethods["build"]({
        name: "my-server",
        cwd: "/workspace",
        pkgDir: "/workspace/packages/my-server",
        output: { js: true, dts: false, lint: true },
      });

      expect(result).toHaveProperty("lint");
      expect(result.lint).toEqual(mockLintResult);
    });
  });

  describe("Scenario: lint disabled", () => {
    it("does not run lint when output.lint is not set", async () => {
      const result = await workerMethods["build"]({
        name: "my-server",
        cwd: "/workspace",
        pkgDir: "/workspace/packages/my-server",
        output: { js: false, dts: false },
      });

      expect(result.lint).toBeUndefined();
    });
  });
});
