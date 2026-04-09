import type { InlineConfig, PluginOption } from "vite";
import path from "path";
import tsconfigPaths from "vite-tsconfig-paths";
import browserslistToEsbuild from "browserslist-to-esbuild";
import { sdAngularPlugin } from "../angular/vite-angular-plugin.js";
import solidPlugin from "vite-plugin-solid";
import {
  sdScopeWatchPlugin,
  type ScopeWatchReplaceDep,
} from "./vite-scope-watch-plugin.js";
import { sdPostCssInlinePlugin } from "../angular/vite-postcss-inline-plugin.js";
import type { SdPwaConfig } from "../sd-config.types.js";
import { VitePWA } from "vite-plugin-pwa";
import { generatePwaIcons } from "./generate-pwa-icons.js";
import { loadSdConfig } from "./sd-config.js";

/** createClientViteConfig 옵션 */
export interface CreateClientViteConfigOptions {
  /** 클라이언트 프레임워크 선택. 미지정 시 "angular" */
  framework?: "angular" | "solid";
  /** 패키지 디렉토리 경로 */
  pkgDir: string;
  /** 패키지명 (예: "@scope/my-client") */
  pkgName: string;
  /** 모드 */
  mode: "dev" | "build";
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
  }) => void;
  /** replaceDeps 목록 (dev 모드에서 sdScopeWatchPlugin에 전달) */
  replaceDeps?: ScopeWatchReplaceDep[];
  /** replaceDeps 변경 감지 콜백 */
  onScopeRebuild?: () => void;
  /** polyfills 경로 배열 (transformIndexHtml로 주입) */
  polyfills?: string[];
  /** PWA 설정. false로 비활성화. 미설정 시 기본값으로 활성화 */
  pwa?: false | SdPwaConfig;
  /** Vite optimizeDeps.exclude에 전달할 패키지 목록 */
  exclude?: string[];
  /** watch 모드 (build.watch 활성화, emptyOutDir: false) */
  watch?: boolean;
  /** 빌드 출력 경로 (미설정 시 pkgDir/dist) */
  outDir?: string;
  /** Vite base 경로 (미설정 시 /{pkgName}/) */
  base?: string;
}

/**
 * Client Vite 설정을 생성한다. dev/build 모드에서 공용으로 사용한다.
 *
 * Angular AOT 플러그인, tsconfigPaths, env define, server/build 기본 설정,
 * browserslist, PostCSS, polyfills, legacyModule (inlineDynamicImports) 등을 통합 구성한다.
 */
export async function createClientViteConfig(
  options: CreateClientViteConfigOptions,
): Promise<InlineConfig> {
  const name = options.pkgName.replace(/^@[^/]+\//, "");

  // sd.config.ts 로딩 + browserSupport 추출
  const sdConfig = await loadSdConfig({ cwd: process.cwd(), dev: options.mode === "dev", opt: [] });
  const pkgConfig = sdConfig.packages[name];
  if (pkgConfig == null) {
    throw new Error(`sd.config.ts에 패키지 "${name}"가 정의되어 있지 않습니다.`);
  }
  const browserSupport = pkgConfig.target === "client" ? pkgConfig.browserSupport : undefined;
  const browserslist = browserSupport?.browserslist;
  const postCssPlugins = browserSupport?.postCss?.plugins;
  const legacyModule = browserSupport?.legacyModule === true;

  // browserslist → esbuild target
  let esbuildTarget: string | string[] = "es2022";
  if (browserslist != null) {
    const queries = Array.isArray(browserslist)
      ? browserslist
      : [browserslist];
    esbuildTarget = browserslistToEsbuild(queries);
  }

  // define: 환경변수 주입 (import.meta.env.KEY → Vite가 bare import.meta.env 객체를 자동 구성)
  const define: Record<string, string> = {};
  if (options.env != null) {
    for (const [key, value] of Object.entries(options.env)) {
      define[`import.meta.env.${key}`] = JSON.stringify(value);
    }
  }

  // plugins
  const plugins: PluginOption[] = [
    tsconfigPaths(),
  ];

  if (options.framework === "solid") {
    plugins.push(solidPlugin());
  } else {
    plugins.push(
      sdAngularPlugin({
        pkg: name,
        onBuildStart: options.onBuildStart,
        onBuild: options.onBuild,
      }),
    );

    // PostCSS inline plugin (Angular @Component inline styles 전용)
    if (postCssPlugins != null && postCssPlugins.length > 0) {
      plugins.push(
        sdPostCssInlinePlugin({ postCssPlugins: postCssPlugins }),
      );
    }
  }

  // replaceDeps HMR (dev 모드 또는 watch 모드)
  if (
    (options.mode === "dev" || options.watch === true) &&
    options.replaceDeps != null &&
    options.replaceDeps.length > 0
  ) {
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
          host: options.serverPort === 0 ? "127.0.0.1" : "0.0.0.0",
          port: options.serverPort === 0 ? undefined : options.serverPort,
          strictPort: options.serverPort !== 0,
        }
      : undefined;

  // css.postcss 설정 (외부 .css/.scss 파일용)
  const cssConfig =
    postCssPlugins != null && postCssPlugins.length > 0
      ? { postcss: { plugins: postCssPlugins as import("postcss").AcceptedPlugin[] } }
      : undefined;

  // optimizeDeps.exclude (사용자 지정 exclude + replaceDeps 패키지)
  const excludeList = [
    ...(options.exclude ?? []),
    ...(options.replaceDeps?.map((dep) => dep.packageName) ?? []),
  ];
  const optimizeDepsConfig =
    excludeList.length > 0 ? { exclude: excludeList } : undefined;

  const config: InlineConfig = {
    root: options.pkgDir,
    base: options.base ?? `/${name}/`,
    define: Object.keys(define).length > 0 ? define : undefined,
    plugins,
    server: serverConfig,
    css: cssConfig,
    esbuild: {
      target: esbuildTarget,
    },
    build: {
      target: esbuildTarget,
    },
    optimizeDeps: {
      ...optimizeDepsConfig,
      esbuildOptions: {
        target: esbuildTarget,
      },
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

  // polyfills plugin
  if (options.polyfills != null && options.polyfills.length > 0) {
    const polyfillImports = options.polyfills;
    if (legacyModule === true) {
      // legacyModule: 메인 엔트리의 transform에서 polyfill import를 상단에 주입한다.
      // transformIndexHtml의 인라인 <script type="module">은 Vite 빌드에서 번들링되지 않으므로,
      // Rollup이 처리할 수 있도록 소스 코드 레벨에서 주입한다.
      const mainEntryPath = path.resolve(options.pkgDir, "src/main.ts");
      (config.plugins as PluginOption[]).push({
        name: "sd-polyfills",
        transform(code, id) {
          if (path.normalize(id) !== path.normalize(mainEntryPath)) return null;
          // polyfillImports는 pkgDir 기준 상대경로 (예: "./src/polyfills.ts")
          // main.ts는 src/ 안에 있으므로, main.ts 기준 상대경로로 변환한다
          const mainDir = path.dirname(mainEntryPath);
          const polyfillCode = polyfillImports
            .map((p) => {
              const abs = path.resolve(options.pkgDir, p);
              this.addWatchFile(abs);
              const rel = path.relative(mainDir, abs);
              const posixRel = rel.replace(/\\/g, "/");
              return "import \"./" + posixRel + "\";";
            })
            .join("\n");
          return { code: polyfillCode + "\n" + code, map: null };
        },
      });
    } else {
      // dev 모드: transformIndexHtml로 인라인 스크립트 주입 (Vite dev server가 처리)
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
  }

  // legacyModule: true → 코드 스플리팅 비활성화 + esbuild import.meta 변환 + 잔여 import() 제거
  if (legacyModule === true) {
    config.esbuild = {
      ...config.esbuild,
      supported: {
        "import-meta": false,
      },
    };
    config.build = {
      ...config.build,
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    };

    // Rollup이 인라인하지 못한 잔여 dynamic import()를 제거한다.
    // inlineDynamicImports가 정적 경로를 모두 인라인한 후에도,
    // @vite-ignore나 런타임 계산 경로의 import()가 남을 수 있다.
    // Chrome 61은 import() 구문을 파싱하지 못하므로 no-op 함수로 치환한다.
    (config.plugins as PluginOption[]).push({
      name: "sd-legacy-strip-dynamic-import",
      enforce: "post",
      renderChunk(code) {
        if (!code.includes("import(")) return null;
        return {
          code: code.replace(
            /\bimport\s*\(/g,
            "(function(){return Promise.reject(new Error(\"Dynamic import not supported\"))})(",
          ),
          map: null,
        };
      },
    });
  }

  // build 모드 설정 (프로덕션 빌드 또는 legacyModule dev)
  if (options.mode === "build" || legacyModule === true) {
    config.build = {
      ...config.build,
      outDir: options.outDir ?? path.join(options.pkgDir, "dist"),
    };
    if (options.watch === true) {
      config.build.watch = {};
      config.build.emptyOutDir = false;
      config.build.minify = false;
      config.build.sourcemap = true;
    } else {
      config.logLevel = "silent";
      config.build.emptyOutDir = true;
    }
  }

  return config;
}
