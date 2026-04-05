import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- Mock factories ---

const mockSdAngularPlugin = vi.fn(() => ({ name: "sd-angular-plugin" }));
vi.mock("../../src/angular/vite-angular-plugin.js", () => ({
  sdAngularPlugin: mockSdAngularPlugin,
}));

const mockSolidPlugin = vi.fn(() => ({ name: "vite-plugin-solid" }));
vi.mock("vite-plugin-solid", () => ({
  default: mockSolidPlugin,
}));

vi.mock("../../src/utils/vite-scope-watch-plugin.js", () => ({
  sdScopeWatchPlugin: vi.fn(() => ({ name: "sd-scope-watch-plugin" })),
}));

vi.mock("../../src/angular/vite-postcss-inline-plugin.js", () => ({
  sdPostCssInlinePlugin: vi.fn((opts: any) => ({
    name: "sd-postcss-inline",
    postCssPlugins: opts.postCssPlugins,
  })),
}));

vi.mock("browserslist-to-esbuild", () => ({
  default: vi.fn((queries: string[]) => {
    if (queries.includes("last 2 Chrome versions")) return ["chrome120", "chrome119"];
    if (queries.includes("ie 11")) return ["es2015"];
    return ["es2022"];
  }),
}));

const mockSdPwaPlugin = vi.fn(() => ({ name: "sd-pwa" }));
vi.mock("../../src/utils/vite-pwa-plugin.js", () => ({
  sdPwaPlugin: mockSdPwaPlugin,
}));

// --- Dynamic import ---

const { createClientViteConfig } = await import("../../src/utils/vite-config");

// --- Helpers ---

function createDefaultOptions() {
  return {
    pkgDir: "/packages/my-client",
    pkgName: "@scope/my-client",
    mode: "build" as const,
    tsconfigPath: "/packages/my-client/tsconfig.json",
    serverPort: 0,
  };
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createClientViteConfig", () => {
  // Acceptance: Scenario "define['process.env'] 제거"
  it("does not include process.env in define, only import.meta.env keys", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      env: { DEV: "true", VER: "1.0.0" },
    });

    const define = config.define as Record<string, string>;
    expect(define).not.toHaveProperty("process.env");
    expect(define["import.meta.env.DEV"]).toBe('"true"');
    expect(define["import.meta.env.VER"]).toBe('"1.0.0"');
  });

  // Acceptance: Scenario "기본 target 설정"
  it("uses es2022 build target when no browserslist is provided", () => {
    const config = createClientViteConfig(createDefaultOptions());

    expect(config.build?.target).toBe("es2022");
    expect(config.esbuild).toBeUndefined();
  });

  // Acceptance: Scenario "postCss 미설정 시 처리 없음"
  it("does not set css.postcss when no postCssPlugins are provided", () => {
    const config = createClientViteConfig(createDefaultOptions());

    expect(config.css).toBeUndefined();
  });

  // Acceptance: Scenario "polyfills.ts 파일 미존재 시 주입 없음"
  it("does not add polyfills plugin when no polyfills are provided", () => {
    const config = createClientViteConfig(createDefaultOptions());

    const plugins = config.plugins as Array<{ name: string }>;
    const polyfillPlugin = plugins.find((p) => p.name === "sd-polyfills");
    expect(polyfillPlugin).toBeUndefined();
  });

  // Acceptance: Scenario "browserslist target 설정"
  it("converts browserslist string to build target", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      browserslist: "last 2 Chrome versions",
    });

    expect(config.build?.target).toEqual(["chrome120", "chrome119"]);
  });

  // Acceptance: Scenario "browserslist 배열 설정"
  it("converts browserslist array to build target", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      browserslist: ["ie 11", "last 2 versions"],
    });

    expect(config.build?.target).toEqual(["es2015"]);
  });

  // Acceptance: Scenario "dev 모드에서도 target 적용"
  it("applies browserslist build target in dev mode too", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      mode: "dev",
      browserslist: "last 2 Chrome versions",
    });

    expect(config.build?.target).toEqual(["chrome120", "chrome119"]);
  });

  // Unit: browserslist is passed to sdAngularPlugin
  it("passes browserslist to sdAngularPlugin as normalized array", () => {
    createClientViteConfig({
      ...createDefaultOptions(),
      browserslist: "last 2 Chrome versions",
    });

    expect(mockSdAngularPlugin).toHaveBeenCalledWith(
      expect.objectContaining({
        browserslist: ["last 2 Chrome versions"],
      }),
    );
  });

  // Acceptance: Scenario ".scss 파일에 PostCSS 적용"
  it("sets css.postcss when postCssPlugins are provided", () => {
    const fakePlugin = { postcssPlugin: "autoprefixer" };
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      postCssPlugins: [fakePlugin],
    });

    expect(config.css?.postcss).toEqual({ plugins: [fakePlugin] });
  });

  // Unit: postCssPlugins is passed to sdAngularPlugin
  it("passes postCssPlugins to sdAngularPlugin", () => {
    const fakePlugin = { postcssPlugin: "autoprefixer" };
    createClientViteConfig({
      ...createDefaultOptions(),
      postCssPlugins: [fakePlugin],
    });

    expect(mockSdAngularPlugin).toHaveBeenCalledWith(
      expect.objectContaining({
        postCssPlugins: [fakePlugin],
      }),
    );
  });

  // Acceptance: Scenario "Angular 라이브러리 번들 JS 내 인라인 CSS에 PostCSS 적용"
  it("adds sdPostCssInlinePlugin when postCssPlugins are provided", () => {
    const fakePlugin = { postcssPlugin: "autoprefixer" };
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      postCssPlugins: [fakePlugin],
    });

    const plugins = config.plugins as Array<{ name: string }>;
    const inlinePlugin = plugins.find((p) => p.name === "sd-postcss-inline");
    expect(inlinePlugin).toBeDefined();
  });

  // Unit: no sdPostCssInlinePlugin when empty postCssPlugins
  it("does not add sdPostCssInlinePlugin when postCssPlugins is empty", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      postCssPlugins: [],
    });

    const plugins = config.plugins as Array<{ name: string }>;
    const inlinePlugin = plugins.find((p) => p.name === "sd-postcss-inline");
    expect(inlinePlugin).toBeUndefined();
  });

  // Acceptance: Scenario "polyfills.ts 파일 존재 시 자동 주입"
  it("adds sd-polyfills plugin when polyfills are provided", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      polyfills: ["./src/polyfills.ts"],
    });

    const plugins = config.plugins as Array<{ name: string }>;
    const polyfillPlugin = plugins.find((p) => p.name === "sd-polyfills");
    expect(polyfillPlugin).toBeDefined();
  });

  // --- legacyModule (Feature 1.1) ---

  // Acceptance: Scenario "legacyModule에서 inlineDynamicImports"
  it("enables inlineDynamicImports and import.meta strip plugin when legacyModule is true", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      legacyModule: true,
    });

    // inlineDynamicImports가 활성화된다 (rolldownOptions)
    expect((config.build as any)?.rolldownOptions?.output?.inlineDynamicImports).toBe(true);
    // import.meta 치환 플러그인이 존재한다
    const plugins = config.plugins as Array<{ name: string }>;
    const legacyPlugin = plugins.find((p) => p.name === "sd-legacy-strip-import-meta");
    expect(legacyPlugin).toBeDefined();
  });

  // Acceptance: Scenario "legacyModule 미사용 시 rolldownOptions 없음"
  it("does not set inlineDynamicImports when legacyModule is not set", () => {
    const config = createClientViteConfig(createDefaultOptions());

    // 코드 분할이 기본 동작한다
    expect(config.build?.rolldownOptions).toBeUndefined();
  });

  // --- legacyModule import.meta strip (Vite 8 migration) ---

  // Acceptance: Scenario "legacyModule import.meta 치환 플러그인 존재"
  it("adds sd-legacy-strip-import-meta plugin when legacyModule is true", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      legacyModule: true,
    });

    const plugins = config.plugins as Array<{ name: string }>;
    expect(plugins.find((p) => p.name === "sd-legacy-strip-import-meta")).toBeDefined();
  });

  // Acceptance: Scenario "legacyModule 미사용 시 치환 플러그인 없음"
  it("does not add sd-legacy-strip-import-meta plugin when legacyModule is not specified", () => {
    const config = createClientViteConfig(createDefaultOptions());

    const plugins = config.plugins as Array<{ name: string }>;
    expect(plugins.find((p) => p.name === "sd-legacy-strip-import-meta")).toBeUndefined();
  });

  // --- PWA (Feature 5.2) ---

  // Acceptance: Scenario "build 모드에서 기본 활성화"
  it("adds sdPwaPlugin in build mode when pwa is not specified", () => {
    const config = createClientViteConfig(createDefaultOptions());

    const plugins = config.plugins as Array<{ name: string }>;
    const pwaPlugin = plugins.find((p) => p.name === "sd-pwa");
    expect(pwaPlugin).toBeDefined();
  });

  // Acceptance: Scenario "pwa false로 비활성화"
  it("does not add sdPwaPlugin when pwa is false", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      pwa: false,
    });

    const plugins = config.plugins as Array<{ name: string }>;
    const pwaPlugin = plugins.find((p) => p.name === "sd-pwa");
    expect(pwaPlugin).toBeUndefined();
  });

  // Acceptance: Scenario "dev 모드에서 비활성화"
  it("does not add sdPwaPlugin in dev mode", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      mode: "dev",
    });

    const plugins = config.plugins as Array<{ name: string }>;
    const pwaPlugin = plugins.find((p) => p.name === "sd-pwa");
    expect(pwaPlugin).toBeUndefined();
  });

  // Acceptance: Scenario "pwa 객체 전달"
  it("passes pwa config object to sdPwaPlugin", () => {
    createClientViteConfig({
      ...createDefaultOptions(),
      pwa: {
        manifest: { name: "My App", theme_color: "#000000" },
      },
    });

    expect(mockSdPwaPlugin).toHaveBeenCalledWith({
      pkgDir: "/packages/my-client",
      pkgName: "my-client",
      pwa: { manifest: { name: "My App", theme_color: "#000000" } },
    });
  });

  // Unit: pwa undefined passes undefined to sdPwaPlugin
  it("passes undefined pwa to sdPwaPlugin when pwa is not specified", () => {
    createClientViteConfig(createDefaultOptions());

    expect(mockSdPwaPlugin).toHaveBeenCalledWith({
      pkgDir: "/packages/my-client",
      pkgName: "my-client",
      pwa: undefined,
    });
  });

  // Unit: pwa empty object passes empty object to sdPwaPlugin
  it("passes empty pwa object to sdPwaPlugin when pwa is empty", () => {
    createClientViteConfig({
      ...createDefaultOptions(),
      pwa: {},
    });

    expect(mockSdPwaPlugin).toHaveBeenCalledWith({
      pkgDir: "/packages/my-client",
      pkgName: "my-client",
      pwa: {},
    });
  });

  // --- watch option (Feature 1.2: legacy dev mode) ---

  // Acceptance: Scenario "watch: true 시 build.watch 설정 및 emptyOutDir: false"
  it("sets build.watch and emptyOutDir: false when watch is true in build mode", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      mode: "build",
      watch: true,
    });

    expect(config.build?.watch).toEqual({});
    expect(config.build?.emptyOutDir).toBe(false);
    expect(config.logLevel).toBeUndefined();
  });

  // Acceptance: Scenario "watch: true + replaceDeps 시 sdScopeWatchPlugin 포함"
  it("includes sdScopeWatchPlugin when watch is true with replaceDeps in build mode", async () => {
    const { sdScopeWatchPlugin } = await import("../../src/utils/vite-scope-watch-plugin");

    const config = createClientViteConfig({
      ...createDefaultOptions(),
      mode: "build",
      watch: true,
      replaceDeps: [{ packageName: "@scope/core", sourcePath: "/packages/core" }],
    });

    const plugins = config.plugins as Array<{ name: string }>;
    const scopePlugin = plugins.find((p) => p.name === "sd-scope-watch-plugin");
    expect(scopePlugin).toBeDefined();
    expect(sdScopeWatchPlugin).toHaveBeenCalled();
  });

  // Acceptance: Scenario "watch 미설정 시 기존 build 동작 유지"
  it("sets emptyOutDir: true and logLevel: silent when watch is not set in build mode", () => {
    const config = createClientViteConfig(createDefaultOptions());

    expect(config.build?.emptyOutDir).toBe(true);
    expect(config.logLevel).toBe("silent");
    expect(config.build?.watch).toBeUndefined();
  });

  // Unit: watch: true without replaceDeps does not add sdScopeWatchPlugin
  it("does not add sdScopeWatchPlugin in watch mode without replaceDeps", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      mode: "build",
      watch: true,
    });

    const plugins = config.plugins as Array<{ name: string }>;
    const scopePlugin = plugins.find((p) => p.name === "sd-scope-watch-plugin");
    expect(scopePlugin).toBeUndefined();
  });

  // Unit: watch: true still sets outDir
  it("sets outDir in watch mode", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      mode: "build",
      watch: true,
    });

    expect(config.build?.outDir).toContain("my-client");
    expect(config.build?.outDir).toMatch(/dist$/);
  });

  // --- outDir override ---

  // Acceptance: Scenario "outDir 설정 시 해당 경로로 빌드 출력"
  it("uses custom outDir when provided", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      outDir: "/packages/my-client/.capacitor/www",
    });

    expect(config.build?.outDir).toBe("/packages/my-client/.capacitor/www");
  });

  // Acceptance: Scenario "outDir 미설정 시 pkgDir/dist 사용"
  it("defaults outDir to pkgDir/dist when not provided", () => {
    const config = createClientViteConfig(createDefaultOptions());

    expect(config.build?.outDir).toMatch(/my-client[\\/]dist$/);
  });

  // --- exclude (Feature 1.1: vite-exclude-passthrough) ---

  // Acceptance: Scenario "exclude에 패키지를 지정하면 pre-bundling에서 제외된다"
  it("sets optimizeDeps.exclude when exclude is provided", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      mode: "dev",
      exclude: ["jeep-sqlite"],
    });

    expect(config.optimizeDeps?.exclude).toEqual(["jeep-sqlite"]);
  });

  // Acceptance: Scenario "exclude 미설정 시 기존 동작과 동일하다"
  it("does not set optimizeDeps.exclude when exclude is not provided", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      mode: "dev",
    });

    expect(config.optimizeDeps?.exclude).toBeUndefined();
  });

  // Acceptance: Scenario "exclude와 replaceDeps가 모두 있으면 둘 다 제외된다"
  it("sets optimizeDeps.exclude from exclude while sdScopeWatchPlugin handles replaceDeps", async () => {
    const { sdScopeWatchPlugin } = await import("../../src/utils/vite-scope-watch-plugin");

    const config = createClientViteConfig({
      ...createDefaultOptions(),
      mode: "dev",
      exclude: ["jeep-sqlite"],
      replaceDeps: [{ packageName: "@scope/core", sourcePath: "/packages/core" }],
    });

    // Base config에 exclude 설정
    expect(config.optimizeDeps?.exclude).toEqual(["jeep-sqlite"]);
    // sdScopeWatchPlugin도 호출됨 (replaceDeps용 exclude는 plugin이 처리)
    expect(sdScopeWatchPlugin).toHaveBeenCalled();
  });

  // Acceptance: Scenario "exclude만 있고 replaceDeps가 없으면 exclude만 제외된다"
  it("sets optimizeDeps.exclude from exclude when no replaceDeps", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      mode: "dev",
      exclude: ["jeep-sqlite"],
    });

    expect(config.optimizeDeps?.exclude).toEqual(["jeep-sqlite"]);
    // sdScopeWatchPlugin은 호출되지 않음
    const plugins = config.plugins as Array<{ name: string }>;
    const scopePlugin = plugins.find((p) => p.name === "sd-scope-watch-plugin");
    expect(scopePlugin).toBeUndefined();
  });

  // --- framework selection (Feature 1.1: client-framework-selection) ---

  // Acceptance: Scenario "Solid 프레임워크 선택"
  it("uses solidPlugin when framework is 'solid'", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      framework: "solid",
    });

    const plugins = config.plugins as Array<{ name: string }>;
    expect(plugins.find((p) => p.name === "vite-plugin-solid")).toBeDefined();
    expect(mockSolidPlugin).toHaveBeenCalled();
    expect(mockSdAngularPlugin).not.toHaveBeenCalled();
  });

  // Acceptance: Scenario "framework 미지정 시 기본값"
  it("uses sdAngularPlugin when framework is not specified", () => {
    createClientViteConfig(createDefaultOptions());

    expect(mockSdAngularPlugin).toHaveBeenCalled();
    expect(mockSolidPlugin).not.toHaveBeenCalled();
  });

  // Acceptance: Scenario "Angular 프레임워크 명시 선택"
  it("uses sdAngularPlugin when framework is 'angular'", () => {
    createClientViteConfig({
      ...createDefaultOptions(),
      framework: "angular",
    });

    expect(mockSdAngularPlugin).toHaveBeenCalled();
    expect(mockSolidPlugin).not.toHaveBeenCalled();
  });

  // Acceptance: Scenario "Solid 빌드에서 PostCSS inline 플러그인 미적용"
  it("does not add sdPostCssInlinePlugin when framework is 'solid' even with postCssPlugins", () => {
    const fakePlugin = { postcssPlugin: "autoprefixer" };
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      framework: "solid",
      postCssPlugins: [fakePlugin],
    });

    const plugins = config.plugins as Array<{ name: string }>;
    expect(plugins.find((p) => p.name === "sd-postcss-inline")).toBeUndefined();
    // 하지만 css.postcss는 여전히 설정된다 (외부 CSS 파일용)
    expect(config.css?.postcss).toEqual({ plugins: [fakePlugin] });
  });

  // --- legacyModule dev mode (Feature: fix-legacy-ngdevmode) ---

  // Acceptance: Scenario "legacyModule: true + dev 명령 실행 시 sdAngularPlugin에 dev: true 전달"
  it("passes dev: true to sdAngularPlugin when mode is dev with legacyModule", () => {
    createClientViteConfig({
      ...createDefaultOptions(),
      mode: "dev",
      legacyModule: true,
      watch: true,
    });

    expect(mockSdAngularPlugin).toHaveBeenCalledWith(
      expect.objectContaining({ dev: true }),
    );
  });

  // Acceptance: Scenario "legacyModule dev에서 build output 설정이 적용된다"
  it("applies build output settings when mode is dev with legacyModule", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      mode: "dev",
      legacyModule: true,
      watch: true,
    });

    expect(config.build?.outDir).toMatch(/my-client[\\/]dist$/);
    expect(config.build?.watch).toEqual({});
    expect(config.build?.emptyOutDir).toBe(false);
    expect(config.build?.minify).toBe(false);
  });

  // Acceptance: Scenario "dev + legacyModule에서 비활성화"
  it("does not add sdPwaPlugin when mode is dev with legacyModule", () => {
    const config = createClientViteConfig({
      ...createDefaultOptions(),
      mode: "dev",
      legacyModule: true,
      watch: true,
    });

    const plugins = config.plugins as Array<{ name: string }>;
    const pwaPlugin = plugins.find((p) => p.name === "sd-pwa");
    expect(pwaPlugin).toBeUndefined();
  });
});
