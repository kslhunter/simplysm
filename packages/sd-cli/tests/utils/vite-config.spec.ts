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

  // Acceptance: Scenario "legacyModule을 활성화한다"
  it("enables inlineDynamicImports and import.meta plugin when legacyModule is true", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      legacyModule: true,
    });

    // inlineDynamicImports가 활성화된다
    expect((config.build as any)?.rollupOptions?.output?.inlineDynamicImports).toBe(true);
    // import.meta 치환 플러그인이 활성화된다
    const plugins = config.plugins as Array<{ name: string }>;
    const legacyPlugin = plugins.find((p) => p.name === "sd-legacy-import-meta");
    expect(legacyPlugin).toBeDefined();
  });

  // Acceptance: Scenario "legacyModule을 설정하지 않는다"
  it("does not set inlineDynamicImports or import.meta plugin when legacyModule is not set", async () => {
    const config = await createClientViteConfig(createDefaultOptions());

    // 코드 분할이 기본 동작한다
    expect(config.build?.rollupOptions).toBeUndefined();
    // import.meta가 그대로 유지된다
    const plugins = config.plugins as Array<{ name: string }>;
    const legacyPlugin = plugins.find((p) => p.name === "sd-legacy-import-meta");
    expect(legacyPlugin).toBeUndefined();
  });

  // Acceptance: Scenario "기존 splitting 옵션을 legacyModule로 마이그레이션한다"
  it("legacyModule: true provides inlineDynamicImports plus import.meta plugin (splitting replacement)", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      legacyModule: true,
    });

    // 기존 splitting: false와 동일한 inlineDynamicImports 동작
    expect((config.build as any)?.rollupOptions?.output?.inlineDynamicImports).toBe(true);
    // 추가로 import.meta 치환이 활성화된다
    const plugins = config.plugins as Array<{ name: string }>;
    const legacyPlugin = plugins.find((p) => p.name === "sd-legacy-import-meta");
    expect(legacyPlugin).toBeDefined();
  });

  // Unit: enforce: "post" 설정 확인 (D4)
  it("sd-legacy-import-meta plugin has enforce: post", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      legacyModule: true,
    });

    const plugins = config.plugins as Array<{ name: string; enforce?: string }>;
    const legacyPlugin = plugins.find((p) => p.name === "sd-legacy-import-meta");
    expect(legacyPlugin?.enforce).toBe("post");
  });

  // Acceptance: Scenario "사용자 코드의 import.meta.url을 치환한다"
  it("sd-legacy-import-meta plugin replaces import.meta.url with module URL", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      legacyModule: true,
    });

    const plugins = config.plugins as Array<{ name: string; enforce?: string; transform?: Function }>;
    const legacyPlugin = plugins.find((p) => p.name === "sd-legacy-import-meta");
    expect(legacyPlugin).toBeDefined();

    const code = 'const url = import.meta.url;';
    const id = "/packages/my-client/src/app.ts";
    const result = legacyPlugin!.transform!(code, id);

    expect(result).toBeDefined();
    expect(result.code).toContain(JSON.stringify(id));
    expect(result.code).not.toContain("import.meta");
  });

  // Acceptance: Scenario "Vite가 주입한 import.meta.hot을 치환한다"
  it("sd-legacy-import-meta plugin replaces import.meta.hot injected by Vite", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      legacyModule: true,
    });

    const plugins = config.plugins as Array<{ name: string; transform?: Function }>;
    const legacyPlugin = plugins.find((p) => p.name === "sd-legacy-import-meta");

    const code = 'import.meta.hot = createHotContext("/src/app.ts");';
    const id = "/packages/my-client/src/app.ts";
    const result = legacyPlugin!.transform!(code, id);

    expect(result).toBeDefined();
    expect(result.code).not.toContain("import.meta");
  });

  // Acceptance: Scenario "/@vite/client의 import.meta를 치환한다"
  it("sd-legacy-import-meta plugin replaces import.meta in /@vite/client", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      legacyModule: true,
    });

    const plugins = config.plugins as Array<{ name: string; transform?: Function }>;
    const legacyPlugin = plugins.find((p) => p.name === "sd-legacy-import-meta");

    const code = 'const base = import.meta.url;';
    const id = "/@vite/client";
    const result = legacyPlugin!.transform!(code, id);

    expect(result).toBeDefined();
    expect(result.code).not.toContain("import.meta");
  });

  // Acceptance: Scenario "import.meta가 없는 모듈은 변환하지 않는다"
  it("sd-legacy-import-meta plugin returns undefined for modules without import.meta", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      legacyModule: true,
    });

    const plugins = config.plugins as Array<{ name: string; transform?: Function }>;
    const legacyPlugin = plugins.find((p) => p.name === "sd-legacy-import-meta");

    const code = 'const x = 1 + 2;';
    const id = "/packages/my-client/src/utils.ts";
    const result = legacyPlugin!.transform!(code, id);

    expect(result).toBeUndefined();
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
