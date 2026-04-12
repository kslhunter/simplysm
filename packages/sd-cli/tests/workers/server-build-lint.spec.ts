import { describe, it, expect, vi, beforeEach } from "vitest";

// --- Mocks ---

const { mockLintFn, MockLintWithProgramRunner } = vi.hoisted(() => {
  const lintFn = vi.fn().mockResolvedValue({
    success: true,
    errorCount: 0,
    warningCount: 0,
    formattedOutput: "",
  });
  const RunnerCls = vi.fn().mockImplementation(function () {
    return { lint: lintFn };
  });
  return { mockLintFn: lintFn, MockLintWithProgramRunner: RunnerCls };
});

vi.mock("../../src/lint/lint-with-program", () => ({
  LintWithProgramRunner: MockLintWithProgramRunner,
}));

const mockTscResult = {
  success: true,
  errors: undefined,
  diagnostics: [],
  errorCount: 0,
  warningCount: 0,
  program: { getSourceFiles: () => [] },
};

vi.mock("../../src/utils/tsc-build", () => ({
  runTscPackageBuild: vi.fn(() => mockTscResult),
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
  mockLintFn.mockResolvedValue({
    success: true,
    errorCount: 0,
    warningCount: 0,
    formattedOutput: "",
  });
  mockTscResult.program = { getSourceFiles: () => [] } as any;
});

describe("server-build.worker lint integration (Slice 3)", () => {
  describe("Scenario: server-build.worker runs lint after typecheck", () => {
    it("returns lint result in build output when lint is enabled", async () => {
      const result = await workerMethods["build"]({
        name: "my-server",
        cwd: "/workspace",
        pkgDir: "/workspace/packages/my-server",
        output: { js: false, dts: false, lint: true },
      });

      expect(result).toHaveProperty("lint");
      expect(result.lint).toEqual({
        success: true,
        errorCount: 0,
        warningCount: 0,
        formattedOutput: "",
      });
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
