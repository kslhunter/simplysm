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

function createErrorCompileResult(): ISdTsCompilerResult {
  return {
    ...createSuccessCompileResult(),
    errors: ["TS2322: Type 'string' is not assignable to type 'number'"],
    diagnostics: [{ category: 1, code: 2322, messageText: "Type mismatch" }],
    errorCount: 1,
  };
}

describe("createTscPlugin — Acceptance Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCompileAsync.mockResolvedValue(createSuccessCompileResult());
  });

  // Rule: createTscPlugin은 esbuild.Plugin과 getter 객체를 반환한다
  describe("Scenario: 필수 옵션으로 플러그인 생성", () => {
    it('plugin.name이 "sd-tsc"이고 getter 함수들을 반환한다', () => {
      const result = createTscPlugin(baseOptions);

      expect(result.plugin.name).toBe("sd-tsc");
      expect(typeof result.plugin.setup).toBe("function");
      expect(typeof result.getProgram).toBe("function");
      expect(typeof result.getAffectedFiles).toBe("function");
      expect(typeof result.getDiagnostics).toBe("function");
      expect(typeof result.getErrors).toBe("function");
      expect(typeof result.getLintResult).toBe("function");
      expect(typeof result.resetBuilderProgram).toBe("function");
    });
  });

  describe("Scenario: 선택 옵션 포함 플러그인 생성", () => {
    it("env, includeTests 옵션이 SdTsCompiler에 전달된다", async () => {
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

  // Rule: onStart에서 tsc를 microtask로 스케줄링하고 await하지 않는다
  describe("Scenario: tsc microtask 스케줄링", () => {
    it("onStart는 compileAsync 완료를 기다리지 않고 즉시 반환한다", async () => {
      const result = createTscPlugin(baseOptions);

      let onStartCb!: () => void;
      const mockBuild = {
        onStart(cb: () => void) { onStartCb = cb; },
        onEnd() { /* noop */ },
      } as unknown as esbuild.PluginBuild;
      void result.plugin.setup(mockBuild);

      // onStart 동기 호출 — 반환값이 undefined (await하지 않음)
      const onStartResult = onStartCb();
      expect(onStartResult).toBeUndefined();

      // onStart 반환 직후, microtask 전이므로 SdTsCompiler 미생성
      expect(MockSdTsCompiler).not.toHaveBeenCalled();

      // microtask flush 후 SdTsCompiler 생성됨
      await Promise.resolve();
      expect(MockSdTsCompiler).toHaveBeenCalledOnce();
    });
  });

  describe("Scenario: SdTsCompiler 인스턴스 재사용", () => {
    it("매 onStart마다 같은 SdTsCompiler 인스턴스를 재사용하여 증분 빌드를 지원한다", async () => {
      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      // 첫 번째 빌드
      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      // 두 번째 빌드
      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      // SdTsCompiler 생성은 1회 (재사용)
      expect(MockSdTsCompiler).toHaveBeenCalledTimes(1);
      // compileAsync는 2회 호출
      expect(mockCompileAsync).toHaveBeenCalledTimes(2);
    });
  });

  // Rule: onEnd에서 tsc Promise를 await하여 결과를 내부 상태에 저장한다
  describe("Scenario: tsc 정상 완료", () => {
    it("program, affectedFiles, diagnostics를 저장하고 errors는 undefined", async () => {
      const compileResult = createSuccessCompileResult();
      mockCompileAsync.mockResolvedValue(compileResult);

      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(result.getProgram()).toBe(compileResult.program);
      expect(result.getAffectedFiles()).toBe(compileResult.affectedFiles);
      expect(result.getDiagnostics()).toEqual([]);
      expect(result.getErrors()).toBeUndefined();
    });
  });

  describe("Scenario: tsc 타입 에러 발생", () => {
    it("errors를 string[]로, diagnostics를 SerializedDiagnostic[]로 저장한다", async () => {
      const compileResult = createErrorCompileResult();
      mockCompileAsync.mockResolvedValue(compileResult);

      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(result.getErrors()).toEqual(["TS2322: Type 'string' is not assignable to type 'number'"]);
      expect(result.getDiagnostics()).toEqual([{ category: 1, code: 2322, messageText: "Type mismatch" }]);
      expect(result.getProgram()).toBe(compileResult.program);
      expect(result.getAffectedFiles()).toBe(compileResult.affectedFiles);
    });
  });

  describe("Scenario: tsc 예외 발생", () => {
    it("try-catch로 포착하여 errors에 메시지 저장, program/affectedFiles는 undefined", async () => {
      mockCompileAsync.mockRejectedValue(new Error("tsconfig parse failed"));

      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(result.getErrors()).toEqual(["tsconfig parse failed"]);
      expect(result.getDiagnostics()).toEqual([]);
      expect(result.getProgram()).toBeUndefined();
      expect(result.getAffectedFiles()).toBeUndefined();
    });
  });

  // Rule: result.errors에 push하지 않는다
  describe("Scenario: tsc 에러가 있어도 result.errors는 변경하지 않음", () => {
    it("onEnd의 result.errors에 tsc 에러를 push하지 않는다", async () => {
      mockCompileAsync.mockResolvedValue(createErrorCompileResult());

      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();

      const buildResult = {
        errors: [] as esbuild.Message[],
        warnings: [] as esbuild.Message[],
      };
      await lifecycle.invokeOnEnd(buildResult);

      expect(buildResult.errors).toEqual([]);
      expect(result.getErrors()).toBeDefined();
    });
  });

  // Rule: getter는 마지막 빌드 결과를 반환한다
  describe("Scenario: 빌드 전 getter 호출", () => {
    it("빌드 실행 전 기본값을 반환한다", () => {
      const result = createTscPlugin(baseOptions);

      expect(result.getProgram()).toBeUndefined();
      expect(result.getAffectedFiles()).toBeUndefined();
      expect(result.getDiagnostics()).toEqual([]);
      expect(result.getErrors()).toBeUndefined();
      expect(result.getLintResult()).toBeUndefined();
    });
  });

  describe("Scenario: 빌드 후 getter 호출", () => {
    it("compileAsync 성공 후 program과 affectedFiles를 반환한다", async () => {
      const compileResult = createSuccessCompileResult();
      mockCompileAsync.mockResolvedValue(compileResult);

      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(result.getProgram()).toBe(compileResult.program);
      expect(result.getAffectedFiles()).toEqual(new Set(["/workspace/packages/my-server/src/main.ts"]));
      expect(result.getDiagnostics()).toEqual([]);
    });
  });

  // Rule: SdTsCompiler 인스턴스를 유지하여 증분 빌드를 지원하고 resetBuilderProgram 시 재생성한다
  describe("Scenario: builderProgram 리셋", () => {
    it("resetBuilderProgram 호출 후 다음 빌드는 새 SdTsCompiler 인스턴스로 실행된다", async () => {
      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      // 첫 번째 빌드
      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();
      expect(MockSdTsCompiler).toHaveBeenCalledTimes(1);

      // 리셋
      result.resetBuilderProgram();

      // 다음 빌드 — 새 SdTsCompiler 인스턴스 생성
      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();
      expect(MockSdTsCompiler).toHaveBeenCalledTimes(2);
    });
  });
});
