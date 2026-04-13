import { describe, it, expect, vi, beforeEach } from "vitest";
import type esbuild from "esbuild";
import type { TscPackageBuildResult } from "../../src/utils/tsc-build";

//#region Mocks

const mockRunTscPackageBuild = vi.fn<(...args: unknown[]) => TscPackageBuildResult>();

vi.mock("../../src/utils/tsc-build", () => ({
  runTscPackageBuild: (...args: unknown[]) => mockRunTscPackageBuild(...args),
}));

const mockParseTsconfig = vi.fn();

vi.mock("../../src/utils/tsconfig", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../src/utils/tsconfig")>();
  return {
    ...actual,
    parseTsconfig: (...args: unknown[]) => mockParseTsconfig(...args),
  };
});

//#endregion

const { createTscPlugin } = await import("../../src/esbuild/esbuild-tsc-plugin");

/** esbuild 플러그인 lifecycle을 시뮬레이션하는 헬퍼 */
function setupPlugin(plugin: esbuild.Plugin) {
  let onStartCb: (() => esbuild.OnStartResult | null | void | Promise<esbuild.OnStartResult | null | void>) | undefined;
  let onEndCb: ((result: esbuild.BuildResult) => esbuild.OnEndResult | null | void | Promise<esbuild.OnEndResult | null | void>) | undefined;

  const mockBuild = {
    onStart(cb: typeof onStartCb) { onStartCb = cb; },
    onEnd(cb: typeof onEndCb) { onEndCb = cb; },
  } as unknown as esbuild.PluginBuild;

  void plugin.setup(mockBuild);

  return {
    async invokeOnStart() {
      return (await onStartCb?.()) ?? null;
    },
    async invokeOnEnd(result?: Partial<esbuild.BuildResult>) {
      return (await onEndCb?.({
        errors: [],
        warnings: [],
        mangleCache: {},
        outputFiles: [],
        metafile: { inputs: {}, outputs: {} },
        ...result,
      } as esbuild.BuildResult)) ?? null;
    },
  };
}

const baseOptions = {
  pkgDir: "/workspace/packages/my-server",
  cwd: "/workspace",
  output: { dts: true },
};

const mockParsedConfig = {
  options: { target: 99 },
  fileNames: [],
  errors: [],
} as any;

function createSuccessTscResult(): TscPackageBuildResult {
  return {
    success: true,
    diagnostics: [],
    errorCount: 0,
    warningCount: 0,
    program: { getSourceFiles: () => [] } as any,
    affectedFiles: new Set(["/workspace/packages/my-server/src/main.ts"]),
    builderProgram: {} as any,
  };
}

describe("createTscPlugin — Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParseTsconfig.mockReturnValue(mockParsedConfig);
    mockRunTscPackageBuild.mockReturnValue(createSuccessTscResult());
  });

  describe("plugin 구조", () => {
    it("setup 함수가 onStart와 onEnd를 등록한다", () => {
      const result = createTscPlugin(baseOptions);
      const onStartSpy = vi.fn();
      const onEndSpy = vi.fn();

      const mockBuild = {
        onStart: onStartSpy,
        onEnd: onEndSpy,
      } as unknown as esbuild.PluginBuild;

      void result.plugin.setup(mockBuild);

      expect(onStartSpy).toHaveBeenCalledOnce();
      expect(onEndSpy).toHaveBeenCalledOnce();
    });
  });

  describe("onStart — runTscPackageBuild 옵션 전달", () => {
    it("pkgDir, cwd, output.dts를 올바르게 전달한다", async () => {
      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(mockRunTscPackageBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          pkgDir: "/workspace/packages/my-server",
          cwd: "/workspace",
          output: { js: false, dts: true },
          parsedConfig: mockParsedConfig,
        }),
      );
    });

    it("output.dts가 false일 때도 정확하게 전달한다", async () => {
      const result = createTscPlugin({
        ...baseOptions,
        output: { dts: false },
      });
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(mockRunTscPackageBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          output: { js: false, dts: false },
        }),
      );
    });
  });

  describe("onEnd — 상태 저장", () => {
    it("tsc 결과의 diagnostics를 정확히 저장한다", async () => {
      const diagnostics = [
        { category: 0, code: 6031, messageText: "Watching for changes" },
        { category: 1, code: 2322, messageText: "Type error" },
      ];
      mockRunTscPackageBuild.mockReturnValue({
        ...createSuccessTscResult(),
        diagnostics,
      });

      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(result.getDiagnostics()).toEqual(diagnostics);
    });

    it("parseTsconfig 예외 시에도 에러를 저장한다", async () => {
      mockParseTsconfig.mockImplementation(() => {
        throw new Error("Invalid tsconfig.json");
      });

      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(result.getErrors()).toEqual(["Invalid tsconfig.json"]);
      expect(result.getDiagnostics()).toEqual([]);
      expect(result.getProgram()).toBeUndefined();
    });
  });

  describe("getter — 연속 빌드", () => {
    it("두 번째 빌드 결과가 첫 번째 결과를 덮어쓴다", async () => {
      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      // 첫 번째 빌드 — 에러
      const errorResult: TscPackageBuildResult = {
        success: false,
        errors: ["first error"],
        diagnostics: [{ category: 1, code: 1, messageText: "err" }],
        errorCount: 1,
        warningCount: 0,
      };
      mockRunTscPackageBuild.mockReturnValue(errorResult);
      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();
      expect(result.getErrors()).toEqual(["first error"]);

      // 두 번째 빌드 — 성공
      mockRunTscPackageBuild.mockReturnValue(createSuccessTscResult());
      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();
      expect(result.getErrors()).toBeUndefined();
      expect(result.getProgram()).toBeDefined();
    });
  });

  describe("resetBuilderProgram", () => {
    it("빌드 전 호출해도 에러가 발생하지 않는다", () => {
      const result = createTscPlugin(baseOptions);
      expect(() => result.resetBuilderProgram()).not.toThrow();
    });

    it("여러 번 호출해도 안전하다", async () => {
      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      result.resetBuilderProgram();
      result.resetBuilderProgram();

      // 리셋 후 빌드 가능
      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(mockRunTscPackageBuild).toHaveBeenLastCalledWith(
        expect.objectContaining({ oldBuilderProgram: undefined }),
      );
    });
  });
});
