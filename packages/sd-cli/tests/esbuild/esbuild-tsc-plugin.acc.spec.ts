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

function createErrorTscResult(): TscPackageBuildResult {
  return {
    success: false,
    errors: ["TS2322: Type 'string' is not assignable to type 'number'"],
    diagnostics: [{ category: 1, code: 2322, messageText: "Type mismatch" }],
    errorCount: 1,
    warningCount: 0,
    program: { getSourceFiles: () => [] } as any,
    affectedFiles: new Set(["/workspace/packages/my-server/src/main.ts"]),
    builderProgram: {} as any,
  };
}

describe("createTscPlugin — Acceptance Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockParseTsconfig.mockReturnValue(mockParsedConfig);
    mockRunTscPackageBuild.mockReturnValue(createSuccessTscResult());
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
      expect(typeof result.resetBuilderProgram).toBe("function");
    });
  });

  describe("Scenario: 선택 옵션 포함 플러그인 생성", () => {
    it("env, includeTests 옵션이 runTscPackageBuild에 전달된다", async () => {
      const result = createTscPlugin({
        ...baseOptions,
        env: "node",
        includeTests: true,
      });
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(mockRunTscPackageBuild).toHaveBeenCalledWith(
        expect.objectContaining({
          env: "node",
          includeTests: true,
        }),
      );
    });
  });

  // Rule: onStart에서 tsc를 microtask로 스케줄링하고 await하지 않는다
  describe("Scenario: tsc microtask 스케줄링", () => {
    it("onStart는 tsc 완료를 기다리지 않고 즉시 반환한다", async () => {
      const result = createTscPlugin(baseOptions);

      // onStart 콜백을 직접 캡처하여 동기적으로 호출
      let onStartCb!: () => void;
      const mockBuild = {
        onStart(cb: () => void) { onStartCb = cb; },
        onEnd() { /* noop */ },
      } as unknown as esbuild.PluginBuild;
      void result.plugin.setup(mockBuild);

      // onStart 동기 호출 — 반환값이 undefined (await하지 않음)
      const onStartResult = onStartCb();
      expect(onStartResult).toBeUndefined();

      // onStart 반환 직후, microtask 전이므로 tsc 미호출
      expect(mockRunTscPackageBuild).not.toHaveBeenCalled();

      // microtask flush 후 tsc 호출됨
      await Promise.resolve();
      expect(mockRunTscPackageBuild).toHaveBeenCalledOnce();
    });
  });

  describe("Scenario: parsedConfig 갱신", () => {
    it("매 onStart마다 parseTsconfig를 호출하여 최신 tsconfig를 반영한다", async () => {
      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      // 첫 번째 빌드
      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      // 두 번째 빌드
      const updatedConfig = { ...mockParsedConfig, fileNames: ["/new-file.ts"] };
      mockParseTsconfig.mockReturnValue(updatedConfig);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(mockParseTsconfig).toHaveBeenCalledTimes(2);
      expect(mockParseTsconfig).toHaveBeenCalledWith(baseOptions.pkgDir);
      expect(mockRunTscPackageBuild).toHaveBeenLastCalledWith(
        expect.objectContaining({ parsedConfig: updatedConfig }),
      );
    });
  });

  // Rule: onEnd에서 tsc Promise를 await하여 결과를 내부 상태에 저장한다
  describe("Scenario: tsc 정상 완료", () => {
    it("program, affectedFiles, diagnostics를 저장하고 errors는 undefined", async () => {
      const tscResult = createSuccessTscResult();
      mockRunTscPackageBuild.mockReturnValue(tscResult);

      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(result.getProgram()).toBe(tscResult.program);
      expect(result.getAffectedFiles()).toBe(tscResult.affectedFiles);
      expect(result.getDiagnostics()).toEqual([]);
      expect(result.getErrors()).toBeUndefined();
    });
  });

  describe("Scenario: tsc 타입 에러 발생", () => {
    it("errors를 string[]로, diagnostics를 SerializedDiagnostic[]로 저장한다", async () => {
      const tscResult = createErrorTscResult();
      mockRunTscPackageBuild.mockReturnValue(tscResult);

      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(result.getErrors()).toEqual(["TS2322: Type 'string' is not assignable to type 'number'"]);
      expect(result.getDiagnostics()).toEqual([{ category: 1, code: 2322, messageText: "Type mismatch" }]);
      expect(result.getProgram()).toBe(tscResult.program);
      expect(result.getAffectedFiles()).toBe(tscResult.affectedFiles);
    });
  });

  describe("Scenario: tsc 예외 발생", () => {
    it("try-catch로 포착하여 errors에 메시지 저장, program/affectedFiles는 undefined", async () => {
      mockRunTscPackageBuild.mockImplementation(() => {
        throw new Error("tsconfig parse failed");
      });

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
      mockRunTscPackageBuild.mockReturnValue(createErrorTscResult());

      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();

      const buildResult = {
        errors: [] as esbuild.Message[],
        warnings: [] as esbuild.Message[],
      };
      await lifecycle.invokeOnEnd(buildResult);

      // result.errors는 비어있어야 함 (tsc 에러가 push되지 않음)
      expect(buildResult.errors).toEqual([]);
      // tsc 에러는 getErrors()로만 조회 가능
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
    });
  });

  describe("Scenario: 빌드 후 getter 호출", () => {
    it("tsc 빌드 성공 후 program과 affectedFiles를 반환한다", async () => {
      const tscResult = createSuccessTscResult();
      mockRunTscPackageBuild.mockReturnValue(tscResult);

      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(result.getProgram()).toBe(tscResult.program);
      expect(result.getAffectedFiles()).toEqual(new Set(["/workspace/packages/my-server/src/main.ts"]));
      expect(result.getDiagnostics()).toEqual([]);
    });
  });

  // Rule: lastBuilderProgram을 캐싱하여 watch 모드 증분 빌드를 지원한다
  describe("Scenario: 증분 빌드 — builderProgram 재사용", () => {
    it("첫 번째 빌드 후 캐싱된 builderProgram을 두 번째 빌드에 oldBuilderProgram으로 전달한다", async () => {
      const firstBuilderProgram = { kind: "first" } as any;
      mockRunTscPackageBuild.mockReturnValue({
        ...createSuccessTscResult(),
        builderProgram: firstBuilderProgram,
      });

      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      // 첫 번째 빌드
      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      // 두 번째 빌드
      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      // 두 번째 호출에서 oldBuilderProgram이 첫 번째 결과의 builderProgram
      expect(mockRunTscPackageBuild).toHaveBeenCalledTimes(2);
      expect(mockRunTscPackageBuild).toHaveBeenLastCalledWith(
        expect.objectContaining({ oldBuilderProgram: firstBuilderProgram }),
      );
    });
  });

  describe("Scenario: builderProgram 리셋", () => {
    it("resetBuilderProgram 호출 후 다음 빌드는 fresh build로 실행된다", async () => {
      const cachedBuilderProgram = { kind: "cached" } as any;
      mockRunTscPackageBuild.mockReturnValue({
        ...createSuccessTscResult(),
        builderProgram: cachedBuilderProgram,
      });

      const result = createTscPlugin(baseOptions);
      const lifecycle = setupPlugin(result.plugin);

      // 첫 번째 빌드 — builderProgram 캐싱
      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      // 리셋
      result.resetBuilderProgram();

      // 다음 빌드 — oldBuilderProgram이 undefined (fresh build)
      await lifecycle.invokeOnStart();
      await lifecycle.invokeOnEnd();

      expect(mockRunTscPackageBuild).toHaveBeenLastCalledWith(
        expect.objectContaining({ oldBuilderProgram: undefined }),
      );
    });
  });
});
