import { describe, it, expect } from "vitest";
import path from "path";
import type esbuild from "esbuild";
import ts from "typescript";

// 자동 테스트 가능한 순수 함수들을 테스트한다.
// Angular 프로젝트 의존 항목은 LLM 검증(.verify.md)으로 분리.

const {
  createAngularCompilerPlugin,
  createCompilerOptionsTransformer,
  convertDiagnostic,
  convertSerializedDiagnosticToEsbuild,
  requiresAngularCompiler,
  createMissingFileDiagnostic,
} = await import("../../src/esbuild/esbuild-angular-compiler-plugin.js");

//#region esbuild Plugin 시뮬레이션 헬퍼

function setupPlugin(plugin: esbuild.Plugin) {
  let onStartCb: (() => esbuild.OnStartResult | null | void | Promise<esbuild.OnStartResult | null | void>) | undefined;
  let onEndCb: ((result: esbuild.BuildResult) => void | Promise<void>) | undefined;
  let onDisposeCb: (() => void) | undefined;

  const initialOptions: esbuild.BuildOptions = {
    define: {},
    absWorkingDir: "/workspace",
  };

  const mockBuild = {
    initialOptions,
    onStart(cb: typeof onStartCb) { onStartCb = cb; },
    onEnd(cb: typeof onEndCb) { onEndCb = cb; },
    onLoad() { /* noop — Feature 1.2 onLoad 훅 등록을 수용 */ },
    onDispose(cb: typeof onDisposeCb) { onDisposeCb = cb; },
  } as unknown as esbuild.PluginBuild;

  void plugin.setup(mockBuild);

  return {
    initialOptions,
    async invokeOnStart() { return (await onStartCb?.()) ?? null; },
    async invokeOnEnd(result: Partial<esbuild.BuildResult>) {
      await onEndCb?.({
        errors: [],
        warnings: [],
        mangleCache: {},
        outputFiles: [],
        metafile: { inputs: {}, outputs: {} },
        ...result,
      });
    },
    invokeOnDispose() { onDisposeCb?.(); },
    get onStartCb() { return onStartCb; },
    get onEndCb() { return onEndCb; },
    get onDisposeCb() { return onDisposeCb; },
  };
}

//#endregion

describe("createAngularCompilerPlugin — Plugin 구조", () => {
  it("esbuild Plugin 프로토콜을 따르는 객체를 반환한다", () => {
    const plugin = createAngularCompilerPlugin({
      tsconfig: "/workspace/tsconfig.json",
      sourcemap: false,
      advancedOptimizations: false,
      thirdPartySourcemaps: false,
      incremental: false,
    });

    expect(plugin.name).toBe("sd-angular-compiler");
    expect(typeof plugin.setup).toBe("function");
  });

  it("setup에서 onStart/onEnd/onDispose 훅이 등록된다", () => {
    const plugin = createAngularCompilerPlugin({
      tsconfig: "/workspace/tsconfig.json",
      sourcemap: false,
      advancedOptimizations: false,
      thirdPartySourcemaps: false,
      incremental: false,
    });

    const ctx = setupPlugin(plugin);
    expect(ctx.onStartCb).toBeDefined();
    expect(ctx.onEndCb).toBeDefined();
    expect(ctx.onDisposeCb).toBeDefined();
  });

  it("setup에서 ngI18nClosureMode define이 주입된다", () => {
    const plugin = createAngularCompilerPlugin({
      tsconfig: "/workspace/tsconfig.json",
      sourcemap: false,
      advancedOptimizations: false,
      thirdPartySourcemaps: false,
      incremental: false,
    });

    const ctx = setupPlugin(plugin);
    expect(ctx.initialOptions.define!["ngI18nClosureMode"]).toBe("false");
  });
});

describe("createCompilerOptionsTransformer", () => {
  const baseCompilerOptions: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2015,
    module: ts.ModuleKind.CommonJS,
    strict: true,
  };

  it("target을 ES2022로, module을 ES2022로 설정한다", () => {
    const transform = createCompilerOptionsTransformer(
      { tsconfig: "", sourcemap: false, advancedOptimizations: false, thirdPartySourcemaps: false, incremental: false },
      undefined,
    );

    const result = transform(baseCompilerOptions);
    expect(result.target).toBe(ts.ScriptTarget.ES2022);
    expect(result.module).toBe(ts.ModuleKind.ES2022);
  });

  it("noEmitOnError: false, composite: false를 설정한다", () => {
    const transform = createCompilerOptionsTransformer(
      { tsconfig: "", sourcemap: false, advancedOptimizations: false, thirdPartySourcemaps: false, incremental: false },
      undefined,
    );

    const result = transform(baseCompilerOptions);
    expect(result.noEmitOnError).toBe(false);
    expect(result.composite).toBe(false);
  });

  it("sourcemap: true일 때 inlineSources/inlineSourceMap을 설정한다", () => {
    const transform = createCompilerOptionsTransformer(
      { tsconfig: "", sourcemap: true, advancedOptimizations: false, thirdPartySourcemaps: false, incremental: false },
      undefined,
    );

    const result = transform(baseCompilerOptions);
    expect(result.inlineSources).toBe(true);
    expect(result.inlineSourceMap).toBe(true);
    expect(result.sourceMap).toBeUndefined();
  });

  it("templateUpdates 제공 시 _enableHmr: true를 설정한다", () => {
    const transform = createCompilerOptionsTransformer(
      { tsconfig: "", sourcemap: false, advancedOptimizations: false, thirdPartySourcemaps: false, incremental: false, templateUpdates: new Map() },
      undefined,
    );

    const result = transform(baseCompilerOptions);
    expect((result as Record<string, unknown>)["_enableHmr"]).toBe(true);
  });

  it("includeTestMetadata: true일 때 supportTestBed/supportJitMode: true를 설정한다", () => {
    const transform = createCompilerOptionsTransformer(
      { tsconfig: "", sourcemap: false, advancedOptimizations: false, thirdPartySourcemaps: false, incremental: false, includeTestMetadata: true },
      undefined,
    );

    const result = transform(baseCompilerOptions);
    expect((result as Record<string, unknown>)["supportTestBed"]).toBe(true);
    expect((result as Record<string, unknown>)["supportJitMode"]).toBe(true);
  });

  it("useDefineForClassFields가 미설정이면 false로 기본 설정한다", () => {
    const transform = createCompilerOptionsTransformer(
      { tsconfig: "", sourcemap: false, advancedOptimizations: false, thirdPartySourcemaps: false, incremental: false },
      undefined,
    );

    const result = transform(baseCompilerOptions);
    expect(result.useDefineForClassFields).toBe(false);
  });

  it("persistentCachePath 제공 시 incremental: true, tsBuildInfoFile 설정한다", () => {
    const transform = createCompilerOptionsTransformer(
      { tsconfig: "", sourcemap: false, advancedOptimizations: false, thirdPartySourcemaps: false, incremental: false, persistentCachePath: "/cache" },
      undefined,
    );

    const result = transform(baseCompilerOptions);
    expect(result.incremental).toBe(true);
    expect(result.tsBuildInfoFile).toContain(".tsbuildinfo");
  });
});

describe("stylesheetErrors / stylesheetDependencies 브릿징", () => {
  it("onStart 시작 시 stylesheetErrors를 리셋한다", async () => {
    const stylesheetErrors = ["SCSS error in style.scss: undefined variable", "SCSS error in other.scss: missing import"];

    const plugin = createAngularCompilerPlugin({
      tsconfig: "/nonexistent/tsconfig.json",
      sourcemap: false,
      advancedOptimizations: false,
      thirdPartySourcemaps: false,
      incremental: false,
      stylesheetErrors,
    });

    const ctx = setupPlugin(plugin);

    // onStart는 tsconfig 파싱 실패로 에러를 반환하지만, 그 전에 stylesheetErrors가 리셋되어야 한다
    await ctx.invokeOnStart();

    expect(stylesheetErrors).toHaveLength(0);
  });

  it("stylesheetErrors 미제공 시 onStart가 에러 없이 진행된다", async () => {
    const plugin = createAngularCompilerPlugin({
      tsconfig: "/nonexistent/tsconfig.json",
      sourcemap: false,
      advancedOptimizations: false,
      thirdPartySourcemaps: false,
      incremental: false,
      // stylesheetErrors 미제공
    });

    const ctx = setupPlugin(plugin);

    // TypeError 없이 정상 진행 (컴파일 에러는 발생하지만 stylesheetErrors 관련 에러는 없음)
    const result = await ctx.invokeOnStart();
    // 컴파일 실패 에러만 포함되어야 함
    expect(result?.errors?.every((e) => !(e.text ?? "").includes("SCSS"))).toBe(true);
  });
});

describe("convertDiagnostic", () => {
  it("에러 진단을 esbuild PartialMessage로 변환한다", () => {
    const sourceFile = ts.createSourceFile("app.ts", "const x: number = 'str';", ts.ScriptTarget.ES2022, true);
    const diagnostic: ts.Diagnostic = {
      file: sourceFile,
      start: 0,
      length: 5,
      messageText: "Type 'string' is not assignable to type 'number'.",
      category: ts.DiagnosticCategory.Error,
      code: 2322,
    };

    const result = convertDiagnostic(diagnostic, "/workspace");

    expect(result.text).toContain("Type 'string' is not assignable");
    expect(result.location).not.toBeNull();
    expect(result.location?.line).toBe(1);
  });

  it("파일 정보 없는 진단은 location: null을 반환한다", () => {
    const diagnostic: ts.Diagnostic = {
      file: undefined,
      start: undefined,
      length: undefined,
      messageText: "Option error",
      category: ts.DiagnosticCategory.Error,
      code: 5000,
    };

    const result = convertDiagnostic(diagnostic, "/workspace");

    expect(result.text).toBe("Option error");
    expect(result.location).toBeNull();
  });
});

describe("convertSerializedDiagnosticToEsbuild", () => {
  it("파일 위치가 있는 진단을 line/column 포함 PartialMessage로 변환한다", () => {
    const sourceFile = ts.createSourceFile(
      "/workspace/src/app.ts",
      "const x: number = 'str';",
      ts.ScriptTarget.ES2022,
      true,
    );
    // 간이 Program 생성 (getSourceFile 조회용)
    const program = {
      getSourceFile: (fileName: string) =>
        fileName === "/workspace/src/app.ts" ? sourceFile : undefined,
    } as unknown as ts.Program;

    const serialized = {
      category: ts.DiagnosticCategory.Error,
      code: 2322,
      messageText: "Type 'string' is not assignable to type 'number'.",
      file: { fileName: "/workspace/src/app.ts" },
      start: 0,
      length: 5,
    };

    const result = convertSerializedDiagnosticToEsbuild(serialized, program, "/workspace");

    expect(result.text).toContain("Type 'string' is not assignable");
    expect(result.location).not.toBeNull();
    expect(result.location?.file).toBe(path.relative("/workspace", "/workspace/src/app.ts"));
    expect(result.location?.line).toBe(1);
    expect(result.location?.column).toBe(0);
  });

  it("파일 정보 없는 진단은 location: null을 반환한다", () => {
    const program = {
      getSourceFile: () => undefined,
    } as unknown as ts.Program;

    const serialized = {
      category: ts.DiagnosticCategory.Error,
      code: 5000,
      messageText: "Option error",
    };

    const result = convertSerializedDiagnosticToEsbuild(serialized, program, "/workspace");

    expect(result.text).toBe("Option error");
    expect(result.location).toBeNull();
  });

  it("program에서 소스 파일을 찾을 수 없으면 location: null을 반환한다", () => {
    const program = {
      getSourceFile: () => undefined,
    } as unknown as ts.Program;

    const serialized = {
      category: ts.DiagnosticCategory.Warning,
      code: 1234,
      messageText: "Some warning",
      file: { fileName: "/workspace/src/missing.ts" },
      start: 10,
    };

    const result = convertSerializedDiagnosticToEsbuild(serialized, program, "/workspace");

    expect(result.text).toBe("Some warning");
    expect(result.location).toBeNull();
  });
});

describe("requiresAngularCompiler", () => {
  it("@Component 포함 시 true를 반환한다", () => {
    expect(requiresAngularCompiler("import { Component } from '@angular/core'; @Component({})")).toBe(true);
  });

  it("@Directive 포함 시 true를 반환한다", () => {
    expect(requiresAngularCompiler("@Directive({})")).toBe(true);
  });

  it("@Injectable 포함 시 true를 반환한다", () => {
    expect(requiresAngularCompiler("@Injectable()")).toBe(true);
  });

  it("@Pipe 포함 시 true를 반환한다", () => {
    expect(requiresAngularCompiler("@Pipe({ name: 'x' })")).toBe(true);
  });

  it("@NgModule 포함 시 true를 반환한다", () => {
    expect(requiresAngularCompiler("@NgModule({})")).toBe(true);
  });

  it("@angular/core import만 있어도 true를 반환한다", () => {
    expect(requiresAngularCompiler("import { inject } from '@angular/core';")).toBe(true);
  });

  it("Angular 관련 코드가 없으면 false를 반환한다", () => {
    expect(requiresAngularCompiler("export function helper() { return 42; }")).toBe(false);
  });

  it("빈 문자열에 대해 false를 반환한다", () => {
    expect(requiresAngularCompiler("")).toBe(false);
  });
});

describe("createMissingFileDiagnostic", () => {
  it("Angular 파일이면 TypeScript compilation 에러 메시지를 생성한다", () => {
    const result = createMissingFileDiagnostic("/workspace/comp.ts", "/workspace/comp.ts", "/workspace", true);

    expect(result.text).toContain("comp.ts");
    expect(result.text).toContain("not found in TypeScript compilation");
    expect(result.notes?.[0]?.text).toContain("Angular metadata");
  });

  it("Angular 파일이 아니면 번들링 경고 메시지를 생성한다", () => {
    const result = createMissingFileDiagnostic("/workspace/helper.ts", "/workspace/helper.ts", "/workspace", false);

    expect(result.text).toContain("helper.ts");
    expect(result.notes?.[0]?.text).toContain("bundled and included in the output");
  });

  it("request와 original이 다르면 file replacement 노트를 추가한다", () => {
    const result = createMissingFileDiagnostic("/workspace/replaced.ts", "/workspace/original.ts", "/workspace", false);

    expect(result.notes?.length).toBe(2);
    expect(result.notes?.[1]?.text).toContain("file replacement");
    expect(result.notes?.[1]?.text).toContain("original.ts");
  });

  it("request와 original이 같으면 file replacement 노트가 없다", () => {
    const result = createMissingFileDiagnostic("/workspace/same.ts", "/workspace/same.ts", "/workspace", true);

    expect(result.notes?.length).toBe(1);
  });
});
