import { describe, it, expect, vi, beforeEach } from "vitest";
import type esbuild from "esbuild";
import type { ISdTsCompilerResult } from "../../src/ts-compiler/sd-ts-compiler-result";
import * as sdTsCompilerMod from "../../src/ts-compiler/SdTsCompiler";

const mockCompileAsync = vi.fn<() => Promise<ISdTsCompilerResult>>();
const MockSdTsCompiler = vi.fn().mockImplementation(function () {
  return { compileAsync: mockCompileAsync };
});

vi.spyOn(sdTsCompilerMod, "SdTsCompiler" as any).mockImplementation(MockSdTsCompiler as any);

import { createTscPlugin } from "../../src/esbuild/esbuild-tsc-plugin";

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
      })) ?? null;
    },
  };
}

const baseOptions = {
  pkgDir: "/workspace/packages/my-server",
  cwd: "/workspace",
  output: { dts: true },
};

function createSuccessCompileResult(): ISdTsCompilerResult {
  return {
    program: { getSourceFiles: () => [] } as any,
    builderProgram: {} as any,
    isForAngular: false,
    affectedFiles: new Set(["/workspace/packages/my-server/src/main.ts"]),
    diagnostics: [],
    errorCount: 0,
    warningCount: 0,
    errors: undefined,
    emitResults: undefined,
    lint: undefined,
    scssErrors: [],
    scssDependencies: new Map(),
  };
}

describe("createTscPlugin — Unit Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompileAsync.mockResolvedValue(createSuccessCompileResult());
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

  describe("onStart — SdTsCompiler 옵션 전달", () => {
    it("pkgDir, cwd, output.js=false, output.dts를 올바르게 전달한다", async () => {
      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(MockSdTsCompiler).toHaveBeenCalledWith(
        expect.objectContaining({
          pkgDir: "/workspace/packages/my-server",
          cwd: "/workspace",
          output: { js: false, dts: true },
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

      expect(MockSdTsCompiler).toHaveBeenCalledWith(
        expect.objectContaining({
          output: { js: false, dts: false },
        }),
      );
    });

    it("lint 옵션을 SdTsCompiler에 전달한다", async () => {
      const result = createTscPlugin({
        ...baseOptions,
        lint: true,
      });
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(MockSdTsCompiler).toHaveBeenCalledWith(
        expect.objectContaining({
          lint: true,
        }),
      );
    });

    it("env, includeTests 옵션을 SdTsCompiler에 전달한다", async () => {
      const result = createTscPlugin({
        ...baseOptions,
        env: "node",
        includeTests: true,
      });
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(MockSdTsCompiler).toHaveBeenCalledWith(
        expect.objectContaining({
          env: "node",
          includeTests: true,
        }),
      );
    });
  });

  describe("onEnd — 상태 저장", () => {
    it("compileAsync 결과의 diagnostics를 정확히 저장한다", async () => {
      const diagnostics = [
        { category: 0, code: 6031, messageText: "Watching for changes" },
        { category: 1, code: 2322, messageText: "Type error" },
      ];
      mockCompileAsync.mockResolvedValue({
        ...createSuccessCompileResult(),
        diagnostics: diagnostics,
      });

      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(result.getDiagnostics()).toEqual(diagnostics);
    });

    it("compileAsync 예외 시에도 에러를 저장한다", async () => {
      mockCompileAsync.mockRejectedValue(new Error("Invalid tsconfig.json"));

      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(result.getErrors()).toEqual(["Invalid tsconfig.json"]);
      expect(result.getDiagnostics()).toEqual([]);
      expect(result.getProgram()).toBeUndefined();
      expect(result.getLintResult()).toBeUndefined();
    });

    it("compileAsync 결과에서 lint 결과를 저장한다", async () => {
      const lintResult = {
        success: true,
        errorCount: 0,
        warningCount: 0,
        formattedOutput: "",
      };
      mockCompileAsync.mockResolvedValue({
        ...createSuccessCompileResult(),
        lint: lintResult,
      });

      const result = createTscPlugin({ ...baseOptions, lint: true });
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(result.getLintResult()).toEqual(lintResult);
    });
  });

  describe("getter — 연속 빌드", () => {
    it("두 번째 빌드 결과가 첫 번째 결과를 덮어쓴다", async () => {
      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      // 첫 번째 빌드 — 에러
      mockCompileAsync.mockResolvedValue({
        ...createSuccessCompileResult(),
        errors: ["first error"],
        errorCount: 1,
      });
      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();
      expect(result.getErrors()).toEqual(["first error"]);

      // 두 번째 빌드 — 성공
      mockCompileAsync.mockResolvedValue(createSuccessCompileResult());
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

    it("리셋 후 다음 빌드에서 새 SdTsCompiler 인스턴스를 생성한다", async () => {
      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      // 첫 번째 빌드
      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();
      expect(MockSdTsCompiler).toHaveBeenCalledTimes(1);

      // 두 번째 빌드 — 같은 인스턴스 재사용
      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();
      expect(MockSdTsCompiler).toHaveBeenCalledTimes(1);

      // 리셋 후 세 번째 빌드 — 새 인스턴스 생성
      result.resetBuilderProgram();
      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();
      expect(MockSdTsCompiler).toHaveBeenCalledTimes(2);
    });

    it("여러 번 호출해도 안전하다", () => {
      const result = createTscPlugin(baseOptions);
      result.resetBuilderProgram();
      result.resetBuilderProgram();
      // No throw
    });
  });

  describe("getLintResult", () => {
    it("lint 미활성 시 undefined를 반환한다", async () => {
      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(result.getLintResult()).toBeUndefined();
    });
  });
});
