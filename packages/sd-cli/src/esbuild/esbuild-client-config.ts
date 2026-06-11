import path from "path";
import fs from "fs";
import esbuild from "esbuild";
import browserslistToEsbuild from "browserslist-to-esbuild";
import { AngularSourceFileCache } from "../angular/angular-compiler.js";
import { createClientTransformStylesheet } from "../angular/client-transform-stylesheet.js";
import {
  createAngularCompilerPlugin,
  type AngularCompilerPluginOptions,
} from "./esbuild-angular-compiler-plugin.js";
import { MemoryLoadResultCache } from "./load-result-cache.js";
import { createScssPlugin } from "./esbuild-scss-plugin";
import { createPostcssPlugin, loadPostcssPlugins } from "./esbuild-postcss-plugin";

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

export class ClientSourceFileCache extends AngularSourceFileCache {
  readonly typeScriptFileCache = new Map<string, string | Uint8Array>();
  readonly loadResultCache = new MemoryLoadResultCache();

  override invalidate(files: Iterable<string>): void {
    for (const file of files) {
      this.loadResultCache.invalidate(file);
    }
    super.invalidate(files);
  }
}

export interface ClientEsbuildResult {
  context: esbuild.BuildContext;
  sourceFileCache: ClientSourceFileCache;
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

  // ClientSourceFileCache 생성
  const sourceFileCache = new ClientSourceFileCache();

  // SCSS 스타일시트 변환용 공유 상태
  const stylesheetDependencies = new Map<string, Set<string>>();
  const stylesheetErrors: string[] = [];

  // PostCSS 플러그인 로딩 (튜플 → 인스턴스) — transformStylesheet와 createPostcssPlugin 양쪽에 사용
  const loadedPostcssPlugins = loadPostcssPlugins(options.pkgDir, options.postcssPlugins);

  // transformStylesheet 콜백 생성
  const cachePath = path.join(options.pkgDir, ".angular", "cache");
  const transformStylesheet = createClientTransformStylesheet({
    loadPaths: [
      path.join(options.pkgDir, "node_modules"),
      path.join(options.cwd, "node_modules"),
    ],
    postcssPlugins: loadedPostcssPlugins,
    scssErrors: stylesheetErrors,
    scssDependencies: stylesheetDependencies,
    cacheDir: path.join(cachePath, "scss"),
  });

  // AngularCompilerPluginOptions
  const pluginOptions: AngularCompilerPluginOptions = {
    tsconfig: options.tsconfig ?? path.join(options.pkgDir, "tsconfig.json"),
    sourcemap: isDev,
    advancedOptimizations: !isDev,
    thirdPartySourcemaps: isDev,
    incremental: isDev,
    sourceFileCache,
    typeScriptFileCache: sourceFileCache.typeScriptFileCache,
    loadResultCache: sourceFileCache.loadResultCache,
    templateUpdates: options.templateUpdates,
    includeTestMetadata: isDev,
    persistentCachePath: cachePath,
    transformStylesheet,
    stylesheetDependencies,
    stylesheetErrors,
  };

  const angularPlugin = createAngularCompilerPlugin(pluginOptions);

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

  // import.meta.hot 폴리필 (Angular HMR 런타임용)
  // Angular의 compileHmrInitializer가 import.meta.hot.on('angular:component-update', ...)을 사용.
  // ES Module에서 import.meta는 모듈별로 고유하므로, banner가 아닌 globalThis에 hot 객체를 저장하고
  // esbuild define으로 import.meta.hot을 globalThis.__hmr_hot으로 치환한다.
  const useHmrPolyfill =
    options.templateUpdates != null && options.legacyModule !== true;
  if (useHmrPolyfill) {
    define["import.meta.hot"] = "globalThis.__hmr_hot";
  }
  const hmrBanner = useHmrPolyfill
    ? [
        "if(!globalThis.__hmr_hot){(function(){",
        "var _l={};",
        "globalThis.__hmr_hot={on:function(e,c){if(!_l[e])_l[e]=[];_l[e].push(c);},off:function(e,c){var a=_l[e];if(a){var i=a.indexOf(c);if(i!==-1)a.splice(i,1);}}};",
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
    logLevel: "silent",
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
