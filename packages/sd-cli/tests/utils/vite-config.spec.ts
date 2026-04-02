import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// --- Mock factories ---

vi.mock("vite-tsconfig-paths", () => ({
  default: vi.fn(() => ({ name: "vite-tsconfig-paths" })),
}));

const mockSdAngularPlugin = vi.fn(() => ({ name: "sd-angular-plugin" }));
vi.mock("../../src/angular/vite-angular-plugin.js", () => ({
  sdAngularPlugin: mockSdAngularPlugin,
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

const mockVitePWA = vi.fn(() => ({ name: "vite-plugin-pwa" }));
vi.mock("vite-plugin-pwa", () => ({
  VitePWA: mockVitePWA,
}));

const mockGeneratePwaIcons = vi.fn().mockResolvedValue([]);
vi.mock("../../src/utils/generate-pwa-icons.js", () => ({
  generatePwaIcons: mockGeneratePwaIcons,
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
  it("does not include process.env in define, only import.meta.env keys", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      env: { DEV: "true", VER: "1.0.0" },
    });

    const define = config.define as Record<string, string>;
    expect(define).not.toHaveProperty("process.env");
    expect(define["import.meta.env.DEV"]).toBe('"true"');
    expect(define["import.meta.env.VER"]).toBe('"1.0.0"');
  });

  // Acceptance: Scenario "browserslist 미설정 시 최신 브라우저 유지"
  it("uses es2022 esbuild target when no browserslist is provided", async () => {
    const config = await createClientViteConfig(createDefaultOptions());

    expect(config.esbuild).toEqual({ target: "es2022" });
  });

  // Acceptance: Scenario "postCss 미설정 시 처리 없음"
  it("does not set css.postcss when no postCssPlugins are provided", async () => {
    const config = await createClientViteConfig(createDefaultOptions());

    expect(config.css).toBeUndefined();
  });

  // Acceptance: Scenario "legacyModule 미설정 시 기본 코드 분할"
  it("does not set inlineDynamicImports when legacyModule is not specified", async () => {
    const config = await createClientViteConfig(createDefaultOptions());

    // build mode has build config, but no rollupOptions.output.inlineDynamicImports
    expect(config.build?.rollupOptions).toBeUndefined();
  });

  // Acceptance: Scenario "polyfills.ts 파일 미존재 시 주입 없음"
  it("does not add polyfills plugin when no polyfills are provided", async () => {
    const config = await createClientViteConfig(createDefaultOptions());

    const plugins = config.plugins as Array<{ name: string }>;
    const polyfillPlugin = plugins.find((p) => p.name === "sd-polyfills");
    expect(polyfillPlugin).toBeUndefined();
  });

  // Acceptance: Scenario "browserslist 문자열 설정 시 해당 타겟으로 변환"
  it("converts browserslist string to esbuild target", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      browserslist: "last 2 Chrome versions",
    });

    expect((config.esbuild as { target: string | string[] }).target).toEqual(["chrome120", "chrome119"]);
  });

  // Acceptance: Scenario "browserslist 배열 설정"
  it("converts browserslist array to esbuild target", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      browserslist: ["ie 11", "last 2 versions"],
    });

    expect((config.esbuild as { target: string | string[] }).target).toEqual(["es2015"]);
  });

  // Acceptance: Scenario "dev server에서도 browserslist 적용"
  it("applies browserslist in dev mode too", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      mode: "dev",
      browserslist: "last 2 Chrome versions",
    });

    expect((config.esbuild as { target: string | string[] }).target).toEqual(["chrome120", "chrome119"]);
  });

  // Unit: browserslist is passed to sdAngularPlugin
  it("passes browserslist to sdAngularPlugin as normalized array", async () => {
    await createClientViteConfig({
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
  it("sets css.postcss when postCssPlugins are provided", async () => {
    const fakePlugin = { postcssPlugin: "autoprefixer" };
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      postCssPlugins: [fakePlugin],
    });

    expect(config.css?.postcss).toEqual({ plugins: [fakePlugin] });
  });

  // Unit: postCssPlugins is passed to sdAngularPlugin
  it("passes postCssPlugins to sdAngularPlugin", async () => {
    const fakePlugin = { postcssPlugin: "autoprefixer" };
    await createClientViteConfig({
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
  it("adds sdPostCssInlinePlugin when postCssPlugins are provided", async () => {
    const fakePlugin = { postcssPlugin: "autoprefixer" };
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      postCssPlugins: [fakePlugin],
    });

    const plugins = config.plugins as Array<{ name: string }>;
    const inlinePlugin = plugins.find((p) => p.name === "sd-postcss-inline");
    expect(inlinePlugin).toBeDefined();
  });

  // Unit: no sdPostCssInlinePlugin when empty postCssPlugins
  it("does not add sdPostCssInlinePlugin when postCssPlugins is empty", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      postCssPlugins: [],
    });

    const plugins = config.plugins as Array<{ name: string }>;
    const inlinePlugin = plugins.find((p) => p.name === "sd-postcss-inline");
    expect(inlinePlugin).toBeUndefined();
  });

  // Acceptance: Scenario "polyfills.ts 파일 존재 시 자동 주입"
  it("adds sd-polyfills plugin when polyfills are provided", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      polyfills: ["./src/polyfills.ts"],
    });

    const plugins = config.plugins as Array<{ name: string }>;
    const polyfillPlugin = plugins.find((p) => p.name === "sd-polyfills");
    expect(polyfillPlugin).toBeDefined();
  });

  // --- legacyModule (Feature 1.1) ---

  // Acceptance: Scenario "legacyModule 활성화 시 inlineDynamicImports만 설정한다"
  it("enables inlineDynamicImports without import.meta plugin when legacyModule is true", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      legacyModule: true,
    });

    // inlineDynamicImports가 활성화된다
    expect((config.build as any)?.rollupOptions?.output?.inlineDynamicImports).toBe(true);
    // import.meta 치환 플러그인이 없다 (esbuild target이 자동 치환)
    const plugins = config.plugins as Array<{ name: string }>;
    const legacyPlugin = plugins.find((p) => p.name === "sd-legacy-import-meta");
    expect(legacyPlugin).toBeUndefined();
  });

  // Acceptance: Scenario "legacyModule 미설정 시 코드 분할이 기본 동작한다"
  it("does not set inlineDynamicImports when legacyModule is not set", async () => {
    const config = await createClientViteConfig(createDefaultOptions());

    // 코드 분할이 기본 동작한다
    expect(config.build?.rollupOptions).toBeUndefined();
  });

  // Acceptance: Scenario "legacyModule: true는 inlineDynamicImports를 활성화한다"
  it("legacyModule: true provides inlineDynamicImports (splitting replacement)", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      legacyModule: true,
    });

    // 기존 splitting: false와 동일한 inlineDynamicImports 동작
    expect((config.build as any)?.rollupOptions?.output?.inlineDynamicImports).toBe(true);
  });

  // --- legacyModule esbuild.supported override (Feature 1.4) ---

  // Acceptance: Scenario "legacyModule: true일 때 esbuild.supported에 import-meta/dynamic-import false 설정"
  it("sets esbuild.supported to disable import-meta and dynamic-import when legacyModule is true", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      legacyModule: true,
    });

    const esbuildOpts = config.esbuild as Record<string, unknown> | undefined;
    expect(esbuildOpts?.["supported"]).toEqual(
      expect.objectContaining({
        "import-meta": false,
        "dynamic-import": false,
      }),
    );
  });

  // Acceptance: Scenario "legacyModule 미설정 시 esbuild.supported 변경 없음"
  it("does not set esbuild.supported when legacyModule is not specified", async () => {
    const config = await createClientViteConfig(createDefaultOptions());

    const esbuildOpts = config.esbuild as Record<string, unknown> | undefined;
    expect(esbuildOpts?.["supported"]).toBeUndefined();
  });

  // --- PWA (Feature 5.2) ---

  // Acceptance: Scenario "기본 PWA 활성화"
  it("adds VitePWA plugin in build mode when pwa is not specified (default enabled)", async () => {
    const config = await createClientViteConfig(createDefaultOptions());

    const plugins = config.plugins as Array<{ name: string }>;
    const pwaPlugin = plugins.find((p) => p.name === "vite-plugin-pwa");
    expect(pwaPlugin).toBeDefined();
  });

  // Acceptance: Scenario "PWA 명시적 비활성화"
  it("does not add VitePWA plugin when pwa is false", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      pwa: false,
    });

    const plugins = config.plugins as Array<{ name: string }>;
    const pwaPlugin = plugins.find((p) => p.name === "vite-plugin-pwa");
    expect(pwaPlugin).toBeUndefined();
  });

  // Acceptance: Scenario "dev 모드에서 service worker 미등록"
  it("does not add VitePWA plugin in dev mode", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      mode: "dev",
    });

    const plugins = config.plugins as Array<{ name: string }>;
    const pwaPlugin = plugins.find((p) => p.name === "vite-plugin-pwa");
    expect(pwaPlugin).toBeUndefined();
  });

  // Acceptance: Scenario "manifest 필드 커스텀"
  it("passes custom manifest fields to VitePWA plugin", async () => {
    await createClientViteConfig({
      ...createDefaultOptions(),
      pwa: {
        manifest: { name: "My App", theme_color: "#000000" },
      },
    });

    expect(mockVitePWA).toHaveBeenCalledWith(
      expect.objectContaining({
        manifest: expect.objectContaining({
          name: "My App",
          theme_color: "#000000",
          // defaults for unspecified fields
          short_name: "my-client",
          display: "standalone",
          background_color: "#ffffff",
        }),
      }),
    );
  });

  // Acceptance: Scenario "기본 Workbox 캐싱"
  it("uses default workbox globPatterns when pwa.workbox is not specified", async () => {
    await createClientViteConfig(createDefaultOptions());

    expect(mockVitePWA).toHaveBeenCalledWith(
      expect.objectContaining({
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        },
      }),
    );
  });

  // Acceptance: Scenario "Workbox globPatterns 커스텀"
  it("uses custom workbox globPatterns when specified", async () => {
    await createClientViteConfig({
      ...createDefaultOptions(),
      pwa: {
        workbox: { globPatterns: ["**/*.{js,css,html,json}"] },
      },
    });

    expect(mockVitePWA).toHaveBeenCalledWith(
      expect.objectContaining({
        workbox: {
          globPatterns: ["**/*.{js,css,html,json}"],
        },
      }),
    );
  });

  // Unit: pwa empty object uses all defaults
  it("uses all defaults when pwa is empty object", async () => {
    await createClientViteConfig({
      ...createDefaultOptions(),
      pwa: {},
    });

    expect(mockVitePWA).toHaveBeenCalledWith(
      expect.objectContaining({
        manifest: expect.objectContaining({
          name: "my-client",
          display: "standalone",
        }),
      }),
    );
  });

  // Unit: pwa manifest custom icons overrides default
  it("includes custom icons in manifest and skips auto-generation", async () => {
    const icons = [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }];
    await createClientViteConfig({
      ...createDefaultOptions(),
      pwa: { manifest: { icons } },
    });

    expect(mockVitePWA).toHaveBeenCalledWith(
      expect.objectContaining({
        manifest: expect.objectContaining({ icons }),
      }),
    );
    expect(mockGeneratePwaIcons).not.toHaveBeenCalled();
  });

  // Acceptance: Scenario "기본 아이콘 자동 생성"
  it("calls generatePwaIcons and includes result in manifest", async () => {
    mockGeneratePwaIcons.mockResolvedValue([
      { src: "icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { src: "icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ]);

    await createClientViteConfig(createDefaultOptions());

    expect(mockGeneratePwaIcons).toHaveBeenCalledWith("/packages/my-client");
    expect(mockVitePWA).toHaveBeenCalledWith(
      expect.objectContaining({
        manifest: expect.objectContaining({
          icons: [
            { src: "icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
            { src: "icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
          ],
        }),
      }),
    );
  });

  // Acceptance: Scenario "원본 아이콘 파일이 없을 때"
  it("does not include icons in manifest when no source icon exists", async () => {
    mockGeneratePwaIcons.mockResolvedValue([]);

    await createClientViteConfig(createDefaultOptions());

    expect(mockVitePWA).toHaveBeenCalledWith(
      expect.objectContaining({
        manifest: expect.not.objectContaining({ icons: expect.anything() }),
      }),
    );
  });

  // --- watch option (Feature 1.2: legacy dev mode) ---

  // Acceptance: Scenario "watch: true 시 build.watch 설정 및 emptyOutDir: false"
  it("sets build.watch and emptyOutDir: false when watch is true in build mode", async () => {
    const config = await createClientViteConfig({
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

    const config = await createClientViteConfig({
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
  it("sets emptyOutDir: true and logLevel: silent when watch is not set in build mode", async () => {
    const config = await createClientViteConfig(createDefaultOptions());

    expect(config.build?.emptyOutDir).toBe(true);
    expect(config.logLevel).toBe("silent");
    expect(config.build?.watch).toBeUndefined();
  });

  // Unit: watch: true without replaceDeps does not add sdScopeWatchPlugin
  it("does not add sdScopeWatchPlugin in watch mode without replaceDeps", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      mode: "build",
      watch: true,
    });

    const plugins = config.plugins as Array<{ name: string }>;
    const scopePlugin = plugins.find((p) => p.name === "sd-scope-watch-plugin");
    expect(scopePlugin).toBeUndefined();
  });

  // Unit: watch: true still sets outDir
  it("sets outDir in watch mode", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      mode: "build",
      watch: true,
    });

    expect(config.build?.outDir).toContain("my-client");
    expect(config.build?.outDir).toMatch(/dist$/);
  });

  // --- exclude (Feature 1.1: vite-exclude-passthrough) ---

  // Acceptance: Scenario "exclude에 패키지를 지정하면 pre-bundling에서 제외된다"
  it("sets optimizeDeps.exclude when exclude is provided", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      mode: "dev",
      exclude: ["jeep-sqlite"],
    });

    expect(config.optimizeDeps?.exclude).toEqual(["jeep-sqlite"]);
  });

  // Acceptance: Scenario "exclude 미설정 시 기존 동작과 동일하다"
  it("does not set optimizeDeps.exclude when exclude is not provided", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      mode: "dev",
    });

    expect(config.optimizeDeps?.exclude).toBeUndefined();
  });

  // Acceptance: Scenario "exclude와 replaceDeps가 모두 있으면 둘 다 제외된다"
  it("sets optimizeDeps.exclude from exclude while sdScopeWatchPlugin handles replaceDeps", async () => {
    const { sdScopeWatchPlugin } = await import("../../src/utils/vite-scope-watch-plugin");

    const config = await createClientViteConfig({
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
  it("sets optimizeDeps.exclude from exclude when no replaceDeps", async () => {
    const config = await createClientViteConfig({
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

  // Acceptance: Scenario "pwa 필드 미설정 시 기본값"
  it("uses default manifest values from pkgName when pwa is undefined", async () => {
    await createClientViteConfig(createDefaultOptions());

    expect(mockVitePWA).toHaveBeenCalledWith(
      expect.objectContaining({
        registerType: "prompt",
        injectRegister: "script",
        manifest: expect.objectContaining({
          name: "my-client",
          short_name: "my-client",
          display: "standalone",
          theme_color: "#ffffff",
          background_color: "#ffffff",
        }),
      }),
    );
  });
});
