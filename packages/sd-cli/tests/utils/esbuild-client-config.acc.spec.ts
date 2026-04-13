import { describe, it, expect, vi, beforeEach } from "vitest";
import path from "path";

// --- Mocks ---

const mockContext = {
  rebuild: vi.fn(),
  watch: vi.fn(),
  dispose: vi.fn(),
};

vi.mock("esbuild", () => ({
  default: {
    context: vi.fn(() => Promise.resolve(mockContext)),
  },
}));

const mockSourceFileCache = {
  loadResultCache: { name: "mockLoadResultCache" },
  invalidate: vi.fn(),
  modifiedFiles: new Set<string>(),
};

const mockAngularPlugin = { name: "angular-compiler" };

vi.mock("@angular/build/private", () => {
  function MockSourceFileCache() {
    return mockSourceFileCache;
  }
  return {
    createCompilerPlugin: vi.fn(() => mockAngularPlugin),
    SourceFileCache: vi.fn(MockSourceFileCache),
  };
});

vi.mock("browserslist-to-esbuild", () => ({
  default: vi.fn(() => ["chrome61"]),
}));

vi.mock("module", async (importOriginal) => {
  const actual = await importOriginal<typeof import("module")>();
  return {
    ...actual,
    createRequire: vi.fn(() => (name: string) => {
      if (name === "nonexistent-plugin") {
        throw new Error(`Cannot find module '${name}'`);
      }
      return (..._args: any[]) => ({ postcssPlugin: name });
    }),
  };
});

// --- Imports (after mocks) ---

const { createClientEsbuildContext } = await import(
  "../../src/esbuild/esbuild-client-config"
);
const esbuild = (await import("esbuild")).default;
const { createCompilerPlugin, SourceFileCache } = await import("@angular/build/private");
const browserslistToEsbuild = (await import("browserslist-to-esbuild")).default;

describe("createClientEsbuildContext — Acceptance", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Scenario: Angular main.ts를 ESM 번들로 빌드
  // + CompilerPluginOptions와 BundleStylesheetOptions로 플러그인 생성
  // + SourceFileCache로 LMDB 기반 증분 캐시
  // + dev 모드 Angular 플래그 + 소스맵
  it("dev 모드: ESM 번들 설정, Angular 플래그, 소스맵, SourceFileCache로 esbuild context 생성", async () => {
    const result = await createClientEsbuildContext({
      pkgDir: "/workspace/packages/my-app",
      cwd: "/workspace",
      mode: "dev",
    });

    // esbuild.context가 호출됨
    expect(esbuild.context).toHaveBeenCalledOnce();
    const esbuildOptions = vi.mocked(esbuild.context).mock.calls[0][0];

    // ESM 번들 설정
    expect(esbuildOptions.entryPoints).toEqual([
      path.join("/workspace/packages/my-app", "src", "main.ts"),
    ]);
    expect(esbuildOptions.bundle).toBe(true);
    expect(esbuildOptions.splitting).toBe(true);
    expect(esbuildOptions.format).toBe("esm");
    expect(esbuildOptions.platform).toBe("browser");
    expect(esbuildOptions.outdir).toBe(
      path.join("/workspace/packages/my-app", "dist"),
    );
    expect(esbuildOptions.metafile).toBe(true);
    expect(esbuildOptions.write).toBe(true);

    // dev 소스맵: linked
    expect(esbuildOptions.sourcemap).toBe("linked");

    // Angular 플래그 (dev)
    expect(esbuildOptions.define).toBeDefined();
    expect(esbuildOptions.define!["ngJitMode"]).toBe("false");
    expect(esbuildOptions.define!["ngDevMode"]).toBeUndefined();
    expect(esbuildOptions.define!["ngHmrMode"]).toBeUndefined();

    // SourceFileCache 생성
    expect(SourceFileCache).toHaveBeenCalledWith(
      path.join("/workspace/packages/my-app", ".angular", "cache"),
    );

    // createCompilerPlugin 호출 검증
    expect(createCompilerPlugin).toHaveBeenCalledOnce();
    const [pluginOpts, styleOpts] = vi.mocked(createCompilerPlugin).mock.calls[0];

    // CompilerPluginOptions
    expect(pluginOpts.tsconfig).toBe(
      path.join("/workspace/packages/my-app", "tsconfig.json"),
    );
    expect(pluginOpts.sourcemap).toBe(true);
    expect(pluginOpts.advancedOptimizations).toBe(false);
    expect(pluginOpts.thirdPartySourcemaps).toBe(true);
    expect(pluginOpts.incremental).toBe(true);
    expect(pluginOpts.sourceFileCache).toBe(mockSourceFileCache);
    expect(pluginOpts.loadResultCache).toBe(mockSourceFileCache.loadResultCache);
    expect(pluginOpts.includeTestMetadata).toBe(true);

    // BundleStylesheetOptions
    expect(styleOpts.workspaceRoot).toBe("/workspace");
    expect(styleOpts.optimization).toBe(false);
    expect(styleOpts.sourcemap).toBe("linked");
    expect(styleOpts.inlineStyleLanguage).toBe("scss");
    expect(styleOpts.cacheOptions.enabled).toBe(true);

    // 반환값
    expect(result.context).toBe(mockContext);
    expect(result.sourceFileCache).toBe(mockSourceFileCache);

    // angularPlugin이 plugins에 포함됨
    expect(esbuildOptions.plugins).toContainEqual(mockAngularPlugin);
  });

  // Scenario: dev 모드 + templateUpdates + non-legacy → ngHmrMode가 "true"
  it("dev 모드 + templateUpdates + non-legacy: ngHmrMode가 true로 정의된다", async () => {
    await createClientEsbuildContext({
      pkgDir: "/workspace/packages/my-app",
      cwd: "/workspace",
      mode: "dev",
      templateUpdates: new Map<string, string>(),
    });

    const esbuildOptions = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(esbuildOptions.define!["ngHmrMode"]).toBe("true");
  });

  // Scenario: build 모드 Angular 플래그 + 소스맵
  it("build 모드: Angular 플래그 모두 false, 소스맵 비활성화, advancedOptimizations", async () => {
    await createClientEsbuildContext({
      pkgDir: "/workspace/packages/my-app",
      cwd: "/workspace",
      mode: "build",
    });

    const esbuildOptions = vi.mocked(esbuild.context).mock.calls[0][0];

    // build 소스맵: false
    expect(esbuildOptions.sourcemap).toBe(false);

    // Angular 플래그 (build)
    expect(esbuildOptions.define!["ngDevMode"]).toBe("false");
    expect(esbuildOptions.define!["ngJitMode"]).toBe("false");
    expect(esbuildOptions.define!["ngHmrMode"]).toBe("false");

    // CompilerPluginOptions
    const [pluginOpts, styleOpts] = vi.mocked(createCompilerPlugin).mock.calls[0];
    expect(pluginOpts.sourcemap).toBe(false);
    expect(pluginOpts.advancedOptimizations).toBe(true);
    expect(pluginOpts.thirdPartySourcemaps).toBe(false);
    expect(pluginOpts.incremental).toBe(false);
    expect(pluginOpts.includeTestMetadata).toBe(false);
    expect((pluginOpts as unknown as Record<string, unknown>)["browserOnlyBuild"]).toBeUndefined();

    // BundleStylesheetOptions
    expect(styleOpts.optimization).toBe(true);
    expect(styleOpts.sourcemap).toBe(false);
  });

  // Scenario: 커스텀 env 주입
  it("env 설정 시 import.meta.env 객체로 define에 주입", async () => {
    await createClientEsbuildContext({
      pkgDir: "/workspace/packages/my-app",
      cwd: "/workspace",
      mode: "build",
      env: { API_URL: "https://api.example.com", DEBUG: "true" },
    });

    const esbuildOptions = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(esbuildOptions.define!["import.meta.env"]).toBe(
      JSON.stringify({ API_URL: "https://api.example.com", DEBUG: "true" }),
    );
  });

  // Scenario: PostCSS 설정 — postcssConfiguration 비활성화 + sd-postcss 등록
  it("postcssPlugins 전달 시 postcssConfiguration은 undefined이고 sd-postcss 플러그인이 등록된다", async () => {
    await createClientEsbuildContext({
      pkgDir: "/workspace/packages/my-app",
      cwd: "/workspace",
      mode: "build",
      postcssPlugins: [["autoprefixer", {}]],
    });

    const [, styleOpts] = vi.mocked(createCompilerPlugin).mock.calls[0];
    expect(styleOpts.postcssConfiguration).toBeUndefined();

    const esbuildOptions = vi.mocked(esbuild.context).mock.calls[0][0];
    const pluginNames = esbuildOptions.plugins!.map((p: any) => p.name);
    expect(pluginNames).toContain("sd-postcss");
  });

  // Scenario: 프로덕션 일회성 빌드
  it("context.rebuild() 호출 후 결과 반환, context.dispose()로 정리", async () => {
    const mockBuildResult = {
      metafile: { outputs: { "dist/main.js": {} } },
      errors: [],
      warnings: [],
    };
    mockContext.rebuild.mockResolvedValueOnce(mockBuildResult);

    const { context } = await createClientEsbuildContext({
      pkgDir: "/workspace/packages/my-app",
      cwd: "/workspace",
      mode: "build",
    });

    const buildResult = await context.rebuild();
    expect(buildResult.metafile).toBeDefined();

    await context.dispose();
    expect(mockContext.dispose).toHaveBeenCalledOnce();
  });

  // Scenario: watch 모드 증분 빌드 — onEnd 콜백으로 빌드 결과 수신
  it("onEnd 콜백이 sd-on-end 플러그인으로 등록되고, context.watch()로 watch 시작 가능", async () => {
    const onEndSpy = vi.fn();

    const { context } = await createClientEsbuildContext({
      pkgDir: "/workspace/packages/my-app",
      cwd: "/workspace",
      mode: "dev",
      onEnd: onEndSpy,
    });

    // sd-on-end 플러그인이 등록됨
    const esbuildOptions = vi.mocked(esbuild.context).mock.calls[0][0];
    const onEndPlugin = esbuildOptions.plugins!.find(
      (p: any) => p.name === "sd-on-end",
    );
    expect(onEndPlugin).toBeDefined();

    // watch 시작 가능
    await context.watch();
    expect(mockContext.watch).toHaveBeenCalledOnce();
  });

  // Scenario: async onEnd 콜백의 Promise가 sd-on-end 플러그인을 통해 esbuild에 전달된다
  it("async onEnd 콜백의 Promise가 sd-on-end 플러그인을 통해 esbuild에 전달된다", async () => {
    const asyncOnEnd = vi.fn().mockResolvedValue(undefined);
    await createClientEsbuildContext({
      pkgDir: "/workspace/packages/my-app",
      cwd: "/workspace",
      mode: "dev",
      onEnd: asyncOnEnd,
    });

    const esbuildOptions = vi.mocked(esbuild.context).mock.calls[0][0];
    const sdOnEndPlugin = esbuildOptions.plugins!.find(
      (p: any) => p.name === "sd-on-end",
    )!;

    let capturedCallback!: (result: any) => any;
    (sdOnEndPlugin as any).setup({
      onEnd(cb: (result: any) => any) {
        capturedCallback = cb;
      },
    });

    const fakeResult = { errors: [], warnings: [] };
    const returnValue = capturedCallback(fakeResult);

    expect(returnValue).toBeInstanceOf(Promise);
    await returnValue;
    expect(asyncOnEnd).toHaveBeenCalledWith(fakeResult);
  });

  // onEnd가 없으면 sd-on-end 플러그인 미등록
  it("onEnd 미전달 시 sd-on-end 플러그인이 없음", async () => {
    await createClientEsbuildContext({
      pkgDir: "/workspace/packages/my-app",
      cwd: "/workspace",
      mode: "dev",
    });

    const esbuildOptions = vi.mocked(esbuild.context).mock.calls[0][0];
    const onEndPlugin = esbuildOptions.plugins!.find(
      (p: any) => p.name === "sd-on-end",
    );
    expect(onEndPlugin).toBeUndefined();
  });

  // Scenario: browserslist 미설정 시 기본 target "es2022"
  it("browserslist 미설정 시 esbuild target과 BundleStylesheetOptions.target이 [es2022]", async () => {
    await createClientEsbuildContext({
      pkgDir: "/workspace/packages/my-app",
      cwd: "/workspace",
      mode: "build",
    });

    const esbuildOptions = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(esbuildOptions.target).toEqual(["es2022"]);

    const [, styleOpts] = vi.mocked(createCompilerPlugin).mock.calls[0];
    expect(styleOpts.target).toEqual(["es2022"]);
  });

  // Scenario: browserslist 문자열 설정 시 변환
  it("browserslist 문자열 설정 시 browserslistToEsbuild 결과가 target에 적용", async () => {
    vi.mocked(browserslistToEsbuild).mockReturnValueOnce(["chrome61"]);

    await createClientEsbuildContext({
      pkgDir: "/workspace/packages/my-app",
      cwd: "/workspace",
      mode: "build",
      browserslist: "Chrome 61",
    });

    expect(browserslistToEsbuild).toHaveBeenCalledWith(["Chrome 61"]);

    const esbuildOptions = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(esbuildOptions.target).toEqual(["chrome61"]);

    const [, styleOpts] = vi.mocked(createCompilerPlugin).mock.calls[0];
    expect(styleOpts.target).toEqual(["chrome61"]);
  });

  // Scenario: polyfills 경로 전달 시 entryPoints에 추가
  it("polyfills 전달 시 entryPoints에 main.ts와 함께 절대경로로 추가", async () => {
    await createClientEsbuildContext({
      pkgDir: "/workspace/packages/my-app",
      cwd: "/workspace",
      mode: "build",
      polyfills: ["src/polyfills.ts"],
    });

    const esbuildOptions = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(esbuildOptions.entryPoints).toEqual([
      path.join("/workspace/packages/my-app", "src", "main.ts"),
      path.join("/workspace/packages/my-app", "src/polyfills.ts"),
    ]);
  });

  // Scenario: polyfills 미전달 시 entryPoints 변경 없음
  it("polyfills 미전달 시 entryPoints는 main.ts만 포함", async () => {
    await createClientEsbuildContext({
      pkgDir: "/workspace/packages/my-app",
      cwd: "/workspace",
      mode: "build",
    });

    const esbuildOptions = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(esbuildOptions.entryPoints).toEqual([
      path.join("/workspace/packages/my-app", "src", "main.ts"),
    ]);
  });

  // Scenario: dev 모드 출력 네이밍 (entry/asset은 해시 없음, chunk은 해시 포함)
  it("dev 모드: entryNames, assetNames는 [name], chunkNames는 [name]-[hash]", async () => {
    await createClientEsbuildContext({
      pkgDir: "/workspace/packages/my-app",
      cwd: "/workspace",
      mode: "dev",
    });

    const esbuildOptions = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(esbuildOptions.entryNames).toBe("[name]");
    expect(esbuildOptions.chunkNames).toBe("[name]-[hash]");
    expect(esbuildOptions.assetNames).toBe("[name]");
  });

  // Scenario: build 모드 출력 네이밍 (해시 포함)
  it("build 모드: entryNames, chunkNames, assetNames 모두 [name]-[hash]", async () => {
    await createClientEsbuildContext({
      pkgDir: "/workspace/packages/my-app",
      cwd: "/workspace",
      mode: "build",
    });

    const esbuildOptions = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(esbuildOptions.entryNames).toBe("[name]-[hash]");
    expect(esbuildOptions.chunkNames).toBe("[name]-[hash]");
    expect(esbuildOptions.assetNames).toBe("[name]-[hash]");
  });

  // Scenario: browserslist 배열 설정 시 변환
  it("browserslist 배열 설정 시 browserslistToEsbuild 결과가 target에 적용", async () => {
    vi.mocked(browserslistToEsbuild).mockReturnValueOnce(["chrome61", "firefox60"]);

    await createClientEsbuildContext({
      pkgDir: "/workspace/packages/my-app",
      cwd: "/workspace",
      mode: "build",
      browserslist: ["Chrome 61", "Firefox 60"],
    });

    expect(browserslistToEsbuild).toHaveBeenCalledWith(["Chrome 61", "Firefox 60"]);

    const esbuildOptions = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(esbuildOptions.target).toEqual(["chrome61", "firefox60"]);

    const [, styleOpts] = vi.mocked(createCompilerPlugin).mock.calls[0];
    expect(styleOpts.target).toEqual(["chrome61", "firefox60"]);
  });

  // Scenario: esbuild context에 tsconfig 옵션이 전달된다
  it("esbuild context에 tsconfig 옵션이 기본값으로 pkgDir/tsconfig.json 전달된다", async () => {
    await createClientEsbuildContext({
      pkgDir: "/workspace/packages/my-app",
      cwd: "/workspace",
      mode: "dev",
    });

    const esbuildOptions = vi.mocked(esbuild.context).mock.calls[0][0];
    expect(esbuildOptions.tsconfig).toBe(
      path.join("/workspace/packages/my-app", "tsconfig.json"),
    );
  });

  // Scenario: SCSS 플러그인이 angularPlugin 다음, customPlugins 앞에 배치된다
  it("plugins 배열이 [angularPlugin, scssPlugin, customPlugins, onEndPlugin] 순서로 구성된다", async () => {
    const customPlugin = { name: "custom", setup: vi.fn() };
    await createClientEsbuildContext({
      pkgDir: "/workspace/packages/my-app",
      cwd: "/workspace",
      mode: "dev",
      plugins: [customPlugin as any],
      onEnd: vi.fn(),
    });

    const esbuildOptions = vi.mocked(esbuild.context).mock.calls[0][0];
    const pluginNames = esbuildOptions.plugins!.map((p: any) => p.name);

    expect(pluginNames[0]).toBe("angular-compiler");
    expect(pluginNames[1]).toBe("sd-scss");
    expect(pluginNames).toContain("custom");
    expect(pluginNames[pluginNames.length - 1]).toBe("sd-on-end");

    const scssIdx = pluginNames.indexOf("sd-scss");
    const customIdx = pluginNames.indexOf("custom");
    expect(scssIdx).toBeLessThan(customIdx);
  });
});
