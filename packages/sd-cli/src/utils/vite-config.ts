import type { InlineConfig, PluginOption } from "vite";
import path from "path";
import tsconfigPaths from "vite-tsconfig-paths";
import browserslistToEsbuild from "browserslist-to-esbuild";
import { sdAngularPlugin } from "../angular/vite-angular-plugin.js";
import {
  sdScopeWatchPlugin,
  type ScopeWatchReplaceDep,
} from "./vite-scope-watch-plugin.js";
import { sdPostCssInlinePlugin } from "../angular/vite-postcss-inline-plugin.js";
import type { SdPwaConfig } from "../sd-config.types.js";
import { VitePWA } from "vite-plugin-pwa";
import { generatePwaIcons } from "./generate-pwa-icons.js";

/** createClientViteConfig 옵션 */
export interface CreateClientViteConfigOptions {
  /** 패키지 디렉토리 경로 */
  pkgDir: string;
  /** 패키지명 (예: "@scope/my-client") */
  pkgName: string;
  /** 모드 */
  mode: "dev" | "build";
  /** tsconfig.json 경로 */
  tsconfigPath: string;
  /** Vite dev server 포트 (0: 자동 할당, >0: 지정) */
  serverPort: number;
  /** 빌드 시 치환할 환경변수 */
  env?: Record<string, string>;
  /** rebuild 시작 콜백 (CLI 상태 보고용) */
  onBuildStart?: () => void;
  /** rebuild 완료 콜백 (CLI 상태 보고용) */
  onBuild?: (result: {
    success: boolean;
    errors?: string[];
    warnings?: string[];
    lint?: { success: boolean; errorCount: number; warningCount: number; formattedOutput: string };
  }) => void;
  /** Enable lint using ts.Program from compilation */
  enableLint?: boolean;
  /** replaceDeps 목록 (dev 모드에서 sdScopeWatchPlugin에 전달) */
  replaceDeps?: ScopeWatchReplaceDep[];
  /** replaceDeps 변경 감지 콜백 */
  onScopeRebuild?: () => void;
  /** browserslist 쿼리 (browserslist-to-esbuild로 변환) */
  browserslist?: string | string[];
  /** PostCSS 플러그인 배열 */
  postCssPlugins?: unknown[];
  /** polyfills 경로 배열 (transformIndexHtml로 주입) */
  polyfills?: string[];
  /** legacy module support (disables code splitting + replaces import.meta) */
  legacyModule?: boolean;
  /** PWA 설정. false로 비활성화. 미설정 시 기본값으로 활성화 */
  pwa?: false | SdPwaConfig;
}

/**
 * Client Vite 설정을 생성한다. dev/build 모드에서 공용으로 사용한다.
 *
 * Feature 3.1 범위: sdAngularPlugin, tsconfigPaths, env define, server/build 기본 설정
 * Feature 5.1: browserslist, PostCSS, polyfills
 * Feature 1.1: legacyModule (import.meta 치환 + inlineDynamicImports)
 */
export async function createClientViteConfig(
  options: CreateClientViteConfigOptions,
): Promise<InlineConfig> {
  const name = options.pkgName.replace(/^@[^/]+\//, "");

  // browserslist → esbuild target
  let esbuildTarget: string | string[] = "es2022";
  if (options.browserslist != null) {
    const queries = Array.isArray(options.browserslist)
      ? options.browserslist
      : [options.browserslist];
    esbuildTarget = browserslistToEsbuild(queries);
  }

  // browserslist 정규화 (Angular 플러그인용)
  const normalizedBrowserslist =
    options.browserslist != null
      ? Array.isArray(options.browserslist)
        ? options.browserslist
        : [options.browserslist]
      : undefined;

  // define: 환경변수 주입
  const define: Record<string, string> = {};
  if (options.env != null) {
    define["process.env"] = JSON.stringify(options.env);
    for (const [key, value] of Object.entries(options.env)) {
      define[`import.meta.env.${key}`] = JSON.stringify(value);
    }
  }

  // plugins
  const plugins: PluginOption[] = [
    tsconfigPaths({ projects: [options.tsconfigPath] }),
    sdAngularPlugin({
      tsconfig: options.tsconfigPath,
      dev: options.mode === "dev",
      onBuildStart: options.onBuildStart,
      onBuild: options.onBuild,
      enableLint: options.enableLint,
      browserslist: normalizedBrowserslist,
      postCssPlugins: options.postCssPlugins,
    }),
  ];

  // PostCSS inline plugin (라이브러리 JS 내 Angular @Component styles)
  if (options.postCssPlugins != null && options.postCssPlugins.length > 0) {
    plugins.push(
      sdPostCssInlinePlugin({ postCssPlugins: options.postCssPlugins }),
    );
  }

  // replaceDeps HMR (dev 모드만)
  if (options.mode === "dev" && options.replaceDeps != null && options.replaceDeps.length > 0) {
    plugins.push(
      sdScopeWatchPlugin({
        pkgDir: options.pkgDir,
        replaceDeps: options.replaceDeps,
        onScopeRebuild: options.onScopeRebuild,
      }),
    );
  }

  // server 설정 (dev 모드만)
  const serverConfig =
    options.mode === "dev"
      ? {
          host: options.serverPort === 0 ? "127.0.0.1" : undefined,
          port: options.serverPort === 0 ? undefined : options.serverPort,
          strictPort: options.serverPort !== 0,
        }
      : undefined;

  // css.postcss 설정 (외부 .css/.scss 파일용)
  const cssConfig =
    options.postCssPlugins != null && options.postCssPlugins.length > 0
      ? { postcss: { plugins: options.postCssPlugins as import("postcss").AcceptedPlugin[] } }
      : undefined;

  const config: InlineConfig = {
    root: options.pkgDir,
    base: `/${name}/`,
    define: Object.keys(define).length > 0 ? define : undefined,
    plugins,
    server: serverConfig,
    css: cssConfig,
    esbuild: {
      target: esbuildTarget,
    },
  };

  // PWA (build 모드 + pwa !== false)
  if (options.mode === "build" && options.pwa !== false) {
    const pwaConfig = typeof options.pwa === "object" ? options.pwa : {};

    // 아이콘 자동 생성 (커스텀 icons 미설정 시)
    let iconsConfig: Record<string, unknown> = {};
    if (pwaConfig.manifest?.icons != null) {
      iconsConfig = { icons: pwaConfig.manifest.icons };
    } else {
      const generatedIcons = await generatePwaIcons(options.pkgDir);
      if (generatedIcons.length > 0) {
        iconsConfig = { icons: generatedIcons };
      }
    }

    const pwaManifest = {
      name: pwaConfig.manifest?.name ?? name,
      short_name: pwaConfig.manifest?.short_name ?? name,
      display: pwaConfig.manifest?.display ?? "standalone",
      theme_color: pwaConfig.manifest?.theme_color ?? "#ffffff",
      background_color: pwaConfig.manifest?.background_color ?? "#ffffff",
      ...iconsConfig,
    };
    const pwaWorkbox = {
      globPatterns: pwaConfig.workbox?.globPatterns ?? [
        "**/*.{js,css,html,ico,png,svg,woff2}",
      ],
    };
    (config.plugins as PluginOption[]).push(
      VitePWA({
        registerType: "prompt",
        injectRegister: "script",
        manifest: pwaManifest,
        workbox: pwaWorkbox,
      }),
    );
  }

  // polyfills plugin (transformIndexHtml)
  if (options.polyfills != null && options.polyfills.length > 0) {
    const polyfillImports = options.polyfills;
    (config.plugins as PluginOption[]).push({
      name: "sd-polyfills",
      transformIndexHtml() {
        return [
          {
            tag: "script",
            attrs: { type: "module" },
            children: polyfillImports.map((p) => `import "${p}";`).join("\n"),
            injectTo: "head-prepend" as const,
          },
        ];
      },
    });
  }

  // legacyModule: true → 단일 번들 + import.meta 치환
  if (options.legacyModule === true) {
    config.build = {
      ...config.build,
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    };

    const pkgDir = options.pkgDir;
    const base = `/${name}/`;

    (config.plugins as PluginOption[]).push({
      name: "sd-legacy-import-meta",
      enforce: "post",
      transform(code: string, id: string) {
        if (!code.includes("import.meta")) return;

        // id(파일 경로)를 Vite 서빙 URL로 변환
        const relative = path.relative(pkgDir, id).replace(/\\/g, "/");
        const moduleUrl = id.startsWith("/") || id.startsWith("\0")
          ? id // 가상 모듈(/@vite/client 등)은 그대로 사용
          : base + relative;

        const varName = "__sd_import_meta__";
        const injected = `const ${varName} = { url: new URL(${JSON.stringify(moduleUrl)}, document.baseURI).href };\n`;
        const replaced = code.replaceAll("import.meta", varName);

        return { code: injected + replaced, map: null };
      },
    });
  }

  // build 모드 설정
  if (options.mode === "build") {
    config.logLevel = "silent";
    config.build = {
      ...config.build,
      outDir: path.join(options.pkgDir, "dist"),
      emptyOutDir: true,
    };
  }

  return config;
}
