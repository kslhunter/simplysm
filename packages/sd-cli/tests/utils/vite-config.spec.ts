import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SdConfig, SdConfigParams } from "../../src/sd-config.types";

// --- Mock factories ---

const mockTsconfigPaths = vi.fn((_opts?: { projects: string[] }) => ({ name: "vite-tsconfig-paths" }));
vi.mock("vite-tsconfig-paths", () => ({
  default: mockTsconfigPaths,
}));

const mockSdAngularPlugin = vi.fn((opts: any) => ({ name: "sd-angular-plugin", _opts: opts }));
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

const mockBrowserslistToEsbuild = vi.fn();
vi.mock("browserslist-to-esbuild", () => ({
  default: mockBrowserslistToEsbuild,
}));

const mockVitePWA = vi.fn(() => ({ name: "vite-plugin-pwa" }));
vi.mock("vite-plugin-pwa", () => ({
  VitePWA: mockVitePWA,
}));

const mockGeneratePwaIcons = vi.fn().mockResolvedValue([]);
vi.mock("../../src/utils/generate-pwa-icons.js", () => ({
  generatePwaIcons: mockGeneratePwaIcons,
}));

// loadSdConfig mock
const mockLoadSdConfig = vi.fn<(params: SdConfigParams) => Promise<SdConfig>>();
vi.mock("../../src/utils/sd-config.js", () => ({
  loadSdConfig: (params: SdConfigParams) => mockLoadSdConfig(params),
}));

// --- Dynamic import ---

const { createClientViteConfig } = await import("../../src/utils/vite-config");

// --- Helpers ---

/** sd.config.ts 모킹용 기본 SdClientPackageConfig를 생성한다 */
function createSdConfig(overrides?: {
  browserSupport?: { browserslist?: string | string[]; postCss?: { plugins: unknown[] }; legacyModule?: boolean };
  framework?: "angular" | "solid";
}): SdConfig {
  return {
    packages: {
      "my-client": {
        target: "client" as const,
        server: 0,
        framework: overrides?.framework,
        browserSupport: overrides?.browserSupport,
      },
    },
  };
}

function createDefaultOptions() {
  return {
    pkgDir: "/packages/my-client",
    pkgName: "@scope/my-client",
    mode: "build" as const,
    serverPort: 0,
  };
}

// --- Tests ---

beforeEach(() => {
  vi.clearAllMocks();
  // 기본: browserSupport 미설정
  mockLoadSdConfig.mockResolvedValue(createSdConfig());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("createClientViteConfig", () => {
  describe("browserSupport", () => {
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

  // Acceptance: Scenario "polyfills.ts 파일 미존재 시 주입 없음"
  it("does not add polyfills plugin when no polyfills are provided", async () => {
    const config = await createClientViteConfig(createDefaultOptions());

    const plugins = config.plugins as Array<{ name: string }>;
    const polyfillPlugin = plugins.find((p) => p.name === "sd-polyfills");
    expect(polyfillPlugin).toBeUndefined();
  });

  // Acceptance: Scenario "browserslist를 sd.config.ts에서 읽어 esbuild target 설정"
  it("converts browserslist from sd.config.ts to esbuild target", async () => {
    mockLoadSdConfig.mockResolvedValue(createSdConfig({
      browserSupport: { browserslist: "last 2 Chrome versions" },
    }));
    mockBrowserslistToEsbuild.mockReturnValue(["chrome120", "chrome119"]);

    const config = await createClientViteConfig(createDefaultOptions());

    expect((config.esbuild as { target: string | string[] }).target).toEqual(["chrome120", "chrome119"]);
  });

  // Acceptance: Scenario "browserslist 배열 설정"
  it("converts browserslist array from sd.config.ts to esbuild target", async () => {
    mockLoadSdConfig.mockResolvedValue(createSdConfig({
      browserSupport: { browserslist: ["ie 11", "last 2 versions"] },
    }));
    mockBrowserslistToEsbuild.mockReturnValue(["es2015"]);

    const config = await createClientViteConfig(createDefaultOptions());

    expect((config.esbuild as { target: string | string[] }).target).toEqual(["es2015"]);
  });

  // Acceptance: Scenario "dev server에서도 browserslist 적용"
  it("applies browserslist from sd.config.ts in dev mode too", async () => {
    mockLoadSdConfig.mockResolvedValue(createSdConfig({
      browserSupport: { browserslist: "last 2 Chrome versions" },
    }));
    mockBrowserslistToEsbuild.mockReturnValue(["chrome120", "chrome119"]);

    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      mode: "dev",
    });

    expect((config.esbuild as { target: string | string[] }).target).toEqual(["chrome120", "chrome119"]);
  });

  // Unit: sdAngularPlugin receives pkg (browserslist no longer passed — plugin reads sd.config.ts)
  it("passes pkg to sdAngularPlugin instead of browserslist", async () => {
    mockLoadSdConfig.mockResolvedValue(createSdConfig({
      browserSupport: { browserslist: "last 2 Chrome versions" },
    }));
    mockBrowserslistToEsbuild.mockReturnValue(["chrome120", "chrome119"]);

    const config = await createClientViteConfig(createDefaultOptions());

    const angularPlugin = (config.plugins as any[]).find((p) => p.name === "sd-angular-plugin");
    expect(angularPlugin._opts.pkg).toBe("my-client");
  });
  });

  describe("postCSS", () => {
  // Acceptance: Scenario "postCssPlugins를 sd.config.ts에서 읽어 css.postcss 설정"
  it("sets css.postcss from sd.config.ts postCssPlugins", async () => {
    const fakePlugin = { postcssPlugin: "autoprefixer" };
    mockLoadSdConfig.mockResolvedValue(createSdConfig({
      browserSupport: { postCss: { plugins: [fakePlugin] } },
    }));

    const config = await createClientViteConfig(createDefaultOptions());

    expect(config.css?.postcss).toEqual({ plugins: [fakePlugin] });
  });

  // Unit: postCssPlugins is no longer passed to sdAngularPlugin (plugin reads sd.config.ts)
  it("does not pass postCssPlugins to sdAngularPlugin", async () => {
    const fakePlugin = { postcssPlugin: "autoprefixer" };
    mockLoadSdConfig.mockResolvedValue(createSdConfig({
      browserSupport: { postCss: { plugins: [fakePlugin] } },
    }));

    const config = await createClientViteConfig(createDefaultOptions());

    const angularPlugin = (config.plugins as any[]).find((p) => p.name === "sd-angular-plugin");
    expect(angularPlugin._opts).not.toHaveProperty("postCssPlugins");
  });

  // Acceptance: Scenario "sdPostCssInlinePlugin이 Angular 프레임워크일 때 플러그인 목록에 포함"
  it("adds sdPostCssInlinePlugin when sd.config.ts has postCssPlugins", async () => {
    const fakePlugin = { postcssPlugin: "autoprefixer" };
    mockLoadSdConfig.mockResolvedValue(createSdConfig({
      browserSupport: { postCss: { plugins: [fakePlugin] } },
    }));

    const config = await createClientViteConfig(createDefaultOptions());

    const plugins = config.plugins as Array<{ name: string }>;
    const inlinePlugin = plugins.find((p) => p.name === "sd-postcss-inline");
    expect(inlinePlugin).toBeDefined();
  });

  // Unit: no sdPostCssInlinePlugin when postCss.plugins is empty in sd.config.ts
  it("does not add sdPostCssInlinePlugin when sd.config.ts postCss.plugins is empty", async () => {
    mockLoadSdConfig.mockResolvedValue(createSdConfig({
      browserSupport: { postCss: { plugins: [] } },
    }));

    const config = await createClientViteConfig(createDefaultOptions());

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
  });

  describe("legacyModule", () => {
  // --- legacyModule (Feature 1.1) ---

  // Acceptance: Scenario "legacyModule을 sd.config.ts에서 읽어 빌드 설정 적용"
  it("enables inlineDynamicImports when sd.config.ts has legacyModule: true", async () => {
    mockLoadSdConfig.mockResolvedValue(createSdConfig({
      browserSupport: { legacyModule: true },
    }));

    const config = await createClientViteConfig(createDefaultOptions());

    // inlineDynamicImports가 활성화된다
    expect((config.build as any)?.rollupOptions?.output?.inlineDynamicImports).toBe(true);
    // esbuild.supported에 import-meta: false가 설정된다
    const esbuildOpts = config.esbuild as Record<string, unknown> | undefined;
    expect(esbuildOpts?.["supported"]).toEqual(
      expect.objectContaining({ "import-meta": false }),
    );
  });

  // Acceptance: Scenario "legacyModule 미설정 시 코드 분할이 기본 동작한다"
  it("does not set inlineDynamicImports when legacyModule is not set in sd.config.ts", async () => {
    const config = await createClientViteConfig(createDefaultOptions());

    // 코드 분할이 기본 동작한다
    expect(config.build?.rollupOptions).toBeUndefined();
  });

  // Acceptance: Scenario "legacyModule 미설정 시 esbuild.supported 변경 없음"
  it("does not set esbuild.supported when legacyModule is not specified in sd.config.ts", async () => {
    const config = await createClientViteConfig(createDefaultOptions());

    const esbuildOpts = config.esbuild as Record<string, unknown> | undefined;
    expect(esbuildOpts?.["supported"]).toBeUndefined();
  });
  });

  describe("pwa", () => {
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

  describe("watch", () => {
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
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      mode: "build",
      watch: true,
      replaceDeps: [{ packageName: "@scope/core", sourcePath: "/packages/core" }],
    });

    const plugins = config.plugins as Array<{ name: string }>;
    const scopePlugin = plugins.find((p) => p.name === "sd-scope-watch-plugin");
    expect(scopePlugin).toBeDefined();
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
  });

  // --- outDir override ---

  // Acceptance: Scenario "outDir 설정 시 해당 경로로 빌드 출력"
  it("uses custom outDir when provided", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      outDir: "/packages/my-client/.capacitor/www",
    });

    expect(config.build?.outDir).toBe("/packages/my-client/.capacitor/www");
  });

  // Acceptance: Scenario "outDir 미설정 시 pkgDir/dist 사용"
  it("defaults outDir to pkgDir/dist when not provided", async () => {
    const config = await createClientViteConfig(createDefaultOptions());

    expect(config.build?.outDir).toMatch(/my-client[\\/]dist$/);
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
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      mode: "dev",
      exclude: ["jeep-sqlite"],
      replaceDeps: [{ packageName: "@scope/core", sourcePath: "/packages/core" }],
    });

    // Base config에 사용자 exclude + replaceDeps 패키지 모두 포함
    expect(config.optimizeDeps?.exclude).toEqual(["jeep-sqlite", "@scope/core"]);
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

  describe("framework", () => {

  // Acceptance: Scenario "Solid 프레임워크 선택"
  it("uses solidPlugin when framework is 'solid'", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      framework: "solid",
    });

    const plugins = config.plugins as Array<{ name: string }>;
    expect(plugins.find((p) => p.name === "vite-plugin-solid")).toBeDefined();
    expect(plugins.find((p) => p.name === "sd-angular-plugin")).toBeUndefined();
  });

  // Acceptance: Scenario "framework 미지정 시 기본값"
  it("uses sdAngularPlugin when framework is not specified", async () => {
    const config = await createClientViteConfig(createDefaultOptions());

    const plugins = config.plugins as Array<{ name: string }>;
    expect(plugins.find((p) => p.name === "sd-angular-plugin")).toBeDefined();
    expect(plugins.find((p) => p.name === "vite-plugin-solid")).toBeUndefined();
  });

  // Acceptance: Scenario "Angular 프레임워크 명시 선택"
  it("uses sdAngularPlugin when framework is 'angular'", async () => {
    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      framework: "angular",
    });

    const plugins = config.plugins as Array<{ name: string }>;
    expect(plugins.find((p) => p.name === "sd-angular-plugin")).toBeDefined();
    expect(plugins.find((p) => p.name === "vite-plugin-solid")).toBeUndefined();
  });

  // Acceptance: Scenario "Solid 빌드에서 PostCSS inline 플러그인 미적용"
  it("does not add sdPostCssInlinePlugin when framework is 'solid' even with postCssPlugins in sd.config.ts", async () => {
    const fakePlugin = { postcssPlugin: "autoprefixer" };
    mockLoadSdConfig.mockResolvedValue(createSdConfig({
      framework: "solid",
      browserSupport: { postCss: { plugins: [fakePlugin] } },
    }));

    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      framework: "solid",
    });

    const plugins = config.plugins as Array<{ name: string }>;
    expect(plugins.find((p) => p.name === "sd-postcss-inline")).toBeUndefined();
    // 하지만 css.postcss는 여전히 설정된다 (외부 CSS 파일용)
    expect(config.css?.postcss).toEqual({ plugins: [fakePlugin] });
  });
  });

  // --- legacyModule dev mode (Feature: fix-legacy-ngdevmode) ---

  // Acceptance: Scenario "legacyModule: true + dev 명령 실행 시 sdAngularPlugin에 pkg 전달"
  it("passes pkg to sdAngularPlugin when mode is dev with legacyModule from sd.config.ts", async () => {
    mockLoadSdConfig.mockResolvedValue(createSdConfig({
      browserSupport: { legacyModule: true },
    }));

    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      mode: "dev",
      watch: true,
    });

    const angularPlugin = (config.plugins as any[]).find((p) => p.name === "sd-angular-plugin");
    expect(angularPlugin._opts.pkg).toBe("my-client");
  });

  // Acceptance: Scenario "legacyModule dev에서 build output 설정이 적용된다"
  it("applies build output settings when mode is dev with legacyModule from sd.config.ts", async () => {
    mockLoadSdConfig.mockResolvedValue(createSdConfig({
      browserSupport: { legacyModule: true },
    }));

    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      mode: "dev",
      watch: true,
    });

    expect(config.build?.outDir).toMatch(/my-client[\\/]dist$/);
    expect(config.build?.watch).toEqual({});
    expect(config.build?.emptyOutDir).toBe(false);
    expect(config.build?.minify).toBe(false);
  });

  // Unit: legacyModule dev에서 PWA가 추가되지 않는다
  it("does not add VitePWA plugin when mode is dev with legacyModule from sd.config.ts", async () => {
    mockLoadSdConfig.mockResolvedValue(createSdConfig({
      browserSupport: { legacyModule: true },
    }));

    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      mode: "dev",
      watch: true,
    });

    const plugins = config.plugins as Array<{ name: string }>;
    const pwaPlugin = plugins.find((p) => p.name === "vite-plugin-pwa");
    expect(pwaPlugin).toBeUndefined();
  });

  // --- Feature 3.1: sd.config.ts 로딩 + 옵션 제거 ---

  // Unit: loadSdConfig is called with correct params
  it("calls loadSdConfig with cwd and mode derived from options", async () => {
    await createClientViteConfig({ ...createDefaultOptions(), mode: "dev" });

    expect(mockLoadSdConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        cwd: expect.any(String),
        dev: true,
        opt: [],
      }),
    );
  });

  // Unit: loadSdConfig called with dev: false for build mode
  it("calls loadSdConfig with dev: false for build mode", async () => {
    await createClientViteConfig(createDefaultOptions());

    expect(mockLoadSdConfig).toHaveBeenCalledWith(
      expect.objectContaining({ dev: false }),
    );
  });

  // Acceptance: Scenario "sd.config.ts에 패키지가 없으면 에러"
  it("throws error when package is not defined in sd.config.ts", async () => {
    mockLoadSdConfig.mockResolvedValue({ packages: {} });

    await expect(
      createClientViteConfig(createDefaultOptions()),
    ).rejects.toThrow("my-client");
  });

  // Acceptance: Scenario "tsconfigPath 자동 계산"
  it("includes tsconfigPaths plugin in config", async () => {
    const config = await createClientViteConfig(createDefaultOptions());

    const plugins = config.plugins as Array<{ name: string }>;
    expect(plugins.find((p) => p.name === "vite-tsconfig-paths")).toBeDefined();
  });

  // Acceptance: Scenario "Solid 프레임워크에서도 browserSupport 적용"
  it("applies browserslist from sd.config.ts even when framework is solid", async () => {
    mockLoadSdConfig.mockResolvedValue(createSdConfig({
      framework: "solid",
      browserSupport: { browserslist: "last 2 Chrome versions" },
    }));
    mockBrowserslistToEsbuild.mockReturnValue(["chrome120", "chrome119"]);

    const config = await createClientViteConfig({
      ...createDefaultOptions(),
      framework: "solid",
    });

    expect((config.esbuild as { target: string | string[] }).target).toEqual(["chrome120", "chrome119"]);
  });

  // Acceptance: Scenario "browserSupport 미설정 시 기본값 적용" (esbuild + css + legacyModule 종합)
  it("uses default values when browserSupport is not set in sd.config.ts", async () => {
    const config = await createClientViteConfig(createDefaultOptions());

    // esbuild target은 "es2022"
    expect(config.esbuild).toEqual({ target: "es2022" });
    // css.postcss는 undefined
    expect(config.css).toBeUndefined();
    // legacyModule 관련 설정은 적용되지 않는다
    expect(config.build?.rollupOptions).toBeUndefined();
    const esbuildOpts = config.esbuild as Record<string, unknown> | undefined;
    expect(esbuildOpts?.["supported"]).toBeUndefined();
  });
});
