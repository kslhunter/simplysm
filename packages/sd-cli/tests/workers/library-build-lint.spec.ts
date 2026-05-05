import { describe, it, expect, vi, beforeEach } from "vitest";

import * as coreNode from "@simplysm/core-node";
import * as sdTsCompilerMod from "../../src/ts-compiler/SdTsCompiler";
import * as sharedWorkerLifecycle from "../../src/workers/shared-worker-lifecycle";
import * as collectDepsMod from "../../src/deps/replace-deps/collect-deps";

const mockCompileAsync = vi.fn();
const MockSdTsCompiler = vi.fn().mockImplementation(function () {
  return { compileAsync: mockCompileAsync };
});
vi.spyOn(sdTsCompilerMod, "SdTsCompiler" as any).mockImplementation(MockSdTsCompiler as any);

vi.spyOn(sharedWorkerLifecycle, "setupWorkerLifecycle").mockImplementation(() => ({
  logger: { debug: vi.fn(), warn: vi.fn() },
  guardStartWatch: vi.fn(),
}) as any);

vi.spyOn(coreNode, "createWorker").mockImplementation((methods: Record<string, Function>) => {
  Object.assign(workerMethods, methods);
  return { send: vi.fn() } as any;
});
vi.spyOn(coreNode.FsWatcher, "watch").mockImplementation(() => Promise.resolve(undefined as any));

vi.spyOn(collectDepsMod, "collectDeps").mockReturnValue({ workspaceDeps: [], replaceDeps: [] });

const defaultCompileResult = {
  program: { getSourceFiles: () => [] },
  builderProgram: {},
  isForAngular: false,
  affectedFiles: new Set<string>(),
  diagnostics: [] as any[],
  errorCount: 0,
  warningCount: 0,
  errors: undefined as string[] | undefined,
  emitResults: undefined,
  lint: undefined as any,
  scssErrors: [] as string[],
  scssDependencies: new Map<string, Set<string>>(),
};

const workerMethods: Record<string, Function> = {};

await import("../../src/workers/library-build.worker");

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  mockCompileAsync.mockResolvedValue({ ...defaultCompileResult });
});

describe("library-build.worker lint integration (Slice 3)", () => {
  describe("Scenario: library-build.worker runs lint after typecheck", () => {
    it("returns lint result in build output when lint is enabled", async () => {
      const lintResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        formattedOutput: "",
      };
      mockCompileAsync.mockResolvedValueOnce({
        ...defaultCompileResult,
        lint: lintResult,
      });

      const result = await workerMethods["build"]({
        name: "my-lib",
        cwd: "/workspace",
        pkgDir: "/workspace/packages/my-lib",
        output: { js: true, dts: true, lint: true },
      });

      expect(result.lint).toEqual(lintResult);
    });
  });

  describe("Scenario: lint disabled", () => {
    it("does not run lint when output.lint is false", async () => {
      const result = await workerMethods["build"]({
        name: "my-lib",
        cwd: "/workspace",
        pkgDir: "/workspace/packages/my-lib",
        output: { js: true, dts: true },
      });

      expect(result.lint).toBeUndefined();
    });
  });
});
