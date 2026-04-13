import path from "path";
import fs from "fs";
import { createRequire } from "module";
import esbuild from "esbuild";
import browserslistToEsbuild from "browserslist-to-esbuild";
import type { AcceptedPlugin } from "postcss";
import {
  createCompilerPlugin,
  SourceFileCache,
  type CompilerPluginOptions,
  type BundleStylesheetOptions,
} from "@angular/build/private";
import { createScssPlugin } from "./esbuild-scss-plugin";
import { createPostcssPlugin } from "./esbuild-postcss-plugin";

export interface CreateClientEsbuildOptions {
  /** 패키지 디렉토리 경로 */
  pkgDir: string;
  /** 모노레포 루트 (workspaceRoot) */
  cwd: string;
  /** 빌드 모드 */
  mode: "dev" | "build";
  /** tsconfig 경로 (기본: pkgDir/tsconfig.json) */
  tsconfig?: string;
  /** 빌드 시 치환할 환경변수 */
  env?: Record<string, string>;
  /** 추가 esbuild 플러그인 (Feature 1.1b에서 사용) */
  plugins?: esbuild.Plugin[];
  /** HMR용 templateUpdates Map (Feature 2.2에서 사용) */
  templateUpdates?: Map<string, string>;
  /** watch 모드 빌드 완료 콜백 */
  onEnd?: (result: esbuild.BuildResult) => void | Promise<void>;
  /** PostCSS 플러그인 ([name, options] 튜플 배열) */
  postcssPlugins?: [string, (object | string)?][];
  /** 빌드 출력 경로 (기본: pkgDir/dist) */
  outdir?: string;
  /** browserslist 쿼리. 미설정 시 "es2022" 기본값 */
  browserslist?: string | string[];
  /** polyfills 경로 (pkgDir 기준 상대경로, 예: ["src/polyfills.ts"]). entryPoints에 추가됨 */
  polyfills?: string[];
  /** 레거시 모듈 지원 (코드 분할 비활성화 + import.meta 치환 + 잔여 import() 제거) */
  legacyModule?: boolean;
}

export interface ClientEsbuildResult {
  context: esbuild.BuildContext;
  sourceFileCache: InstanceType<typeof SourceFileCache>;
}

export async function createClientEsbuildContext(
  options: CreateClientEsbuildOptions,
): Promise<ClientEsbuildResult> {
  const isDev = options.mode === "dev";

  // browserslist → esbuild target 변환
  let esbuildTarget: string[] = ["es2022"];
  if (options.browserslist != null) {
    const queries = Array.isArray(options.browserslist)
      ? options.browserslist
      : [options.browserslist];
    esbuildTarget = browserslistToEsbuild(queries);
  }

  // SourceFileCache 생성 (LMDB 디스크 캐시)
  const cachePath = path.join(options.pkgDir, ".angular", "cache");
  const sourceFileCache = new SourceFileCache(cachePath);

  // CompilerPluginOptions
  const pluginOptions: CompilerPluginOptions = {
    tsconfig: options.tsconfig ?? path.join(options.pkgDir, "tsconfig.json"),
    sourcemap: isDev,
    advancedOptimizations: !isDev,
    thirdPartySourcemaps: isDev,
    incremental: isDev,
    sourceFileCache,
    loadResultCache: sourceFileCache.loadResultCache,
    templateUpdates: options.templateUpdates,
    includeTestMetadata: isDev,
  };

  // BundleStylesheetOptions
  const styleOptions: BundleStylesheetOptions & { inlineStyleLanguage: string } = {
    workspaceRoot: options.cwd,
    optimization: !isDev,
    inlineFonts: false,
    sourcemap: isDev ? "linked" : false,
    outputNames: { bundles: "[name]", media: "media/[name]" },
    includePaths: [],
    target: esbuildTarget,
    cacheOptions: {
      enabled: true,
      path: cachePath,
      basePath: cachePath,
    },
    postcssConfiguration: undefined,
    inlineStyleLanguage: "scss",
  };

  const angularPlugin = createCompilerPlugin(pluginOptions, styleOptions);

  // PostCSS 플러그인 로딩 (튜플 → 인스턴스)
  let loadedPostcssPlugins: AcceptedPlugin[] | undefined;
  if (options.postcssPlugins != null && options.postcssPlugins.length > 0) {
    const req = createRequire(path.join(options.pkgDir, "package.json"));
    loadedPostcssPlugins = options.postcssPlugins.map(([name, pluginOpts]) => {
      const pluginFn = req(name);
      const fn = pluginFn.default ?? pluginFn;
      return pluginOpts != null ? fn(pluginOpts) : fn;
    });
  }

  // SCSS side-effect import 처리 플러그인
  const scssPlugin = createScssPlugin({
    loadPaths: [
      path.join(options.pkgDir, "node_modules"),
      path.join(options.cwd, "node_modules"),
    ],
  });

  // define 주입
  const define: Record<string, string> = {};

  // Angular 플래그
  if (!isDev) {
    define["ngDevMode"] = "false";
  }
  define["ngJitMode"] = "false";
  if (isDev && options.templateUpdates != null && options.legacyModule !== true) {
    define["ngHmrMode"] = "true";
  } else if (!isDev) {
    define["ngHmrMode"] = "false";
  }

  // 커스텀 env
  // esbuild define은 정적 패턴만 치환하므로, import.meta.env 객체 자체를 주입해야
  // env() 함수의 동적 접근(import.meta.env?.[key])이 동작한다.
  if (options.env != null) {
    define["import.meta.env"] = JSON.stringify(options.env);
  }

  // import.meta.hot 폴리필 banner (Angular HMR 런타임용)
  // Angular의 compileHmrInitializer가 import.meta.hot.on('angular:component-update', ...)을 사용.
  // Vite 없이 동작하도록 import.meta.hot을 폴리필하고, globalThis.__hmr_dispatch로 외부 트리거 제공.
  const hmrBanner =
    options.templateUpdates != null && options.legacyModule !== true
      ? [
          'if(typeof ngHmrMode!=="undefined"&&ngHmrMode){(function(){',
          "var _l={};",
          "import.meta.hot={on:function(e,c){if(!_l[e])_l[e]=[];_l[e].push(c);},off:function(e,c){var a=_l[e];if(a){var i=a.indexOf(c);if(i!==-1)a.splice(i,1);}}};",
          "globalThis.__hmr_dispatch=function(e,d){var a=_l[e];if(a)for(var i=0;i<a.length;i++)a[i](d);};",
          "})()}",
        ].join("")
      : undefined;

  // esbuild context 생성
  const context = await esbuild.context({
    entryPoints: [
      path.join(options.pkgDir, "src", "main.ts"),
      ...(options.polyfills != null
        ? options.polyfills.map((p) => path.join(options.pkgDir, p))
        : []),
    ],
    target: esbuildTarget,
    entryNames: isDev ? "[name]" : "[name]-[hash]",
    chunkNames: "[name]-[hash]",
    assetNames: isDev ? "[name]" : "[name]-[hash]",
    bundle: true,
    splitting: options.legacyModule !== true,
    format: "esm",
    platform: "browser",
    outdir: options.outdir ?? path.join(options.pkgDir, "dist"),
    metafile: true,
    write: true,
    sourcemap: isDev ? "linked" : false,
    logLevel: isDev ? "warning" : "silent",
    tsconfig: options.tsconfig ?? path.join(options.pkgDir, "tsconfig.json"),
    define,
    banner: hmrBanner != null ? { js: hmrBanner } : undefined,
    ...(options.legacyModule === true ? { supported: { "import-meta": false } } : {}),
    plugins: [
      ...(options.templateUpdates != null
        ? [
            {
              name: "sd-hmr-reset",
              setup(build: esbuild.PluginBuild) {
                build.onStart(() => {
                  options.templateUpdates!.clear();
                });
              },
            },
          ]
        : []),
      ...(options.plugins ?? []),
      angularPlugin,
      scssPlugin,
      ...(loadedPostcssPlugins != null
        ? [createPostcssPlugin({ plugins: loadedPostcssPlugins })]
        : []),
      ...(options.legacyModule === true
        ? [
            {
              name: "sd-legacy-strip-dynamic-import",
              setup(build: esbuild.PluginBuild) {
                build.onEnd(async (result) => {
                  if (result.metafile == null) return;
                  const jsFiles = Object.keys(result.metafile.outputs).filter((f) =>
                    f.endsWith(".js"),
                  );
                  for (const file of jsFiles) {
                    const code = await fs.promises.readFile(file, "utf-8");
                    if (!code.includes("import(")) continue;
                    const replaced = code.replace(
                      /\bimport\s*\(/g,
                      '(function(){return Promise.reject(new Error("Dynamic import not supported"))})(',
                    );
                    await fs.promises.writeFile(file, replaced);
                  }
                });
              },
            },
          ]
        : []),
      ...(options.onEnd != null
        ? [
            {
              name: "sd-on-end",
              setup(build: esbuild.PluginBuild) {
                build.onEnd((result) => {
                  return options.onEnd!(result);
                });
              },
            },
          ]
        : []),
    ],
  });

  return { context, sourceFileCache };
}
