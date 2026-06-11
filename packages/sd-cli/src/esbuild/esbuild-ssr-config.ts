import path from "path";
import esbuild from "esbuild";
import { AngularSourceFileCache } from "../angular/angular-compiler.js";
import { createClientTransformStylesheet } from "../angular/client-transform-stylesheet.js";
import {
  createAngularCompilerPlugin,
  type AngularCompilerPluginOptions,
} from "./esbuild-angular-compiler-plugin.js";
import { MemoryLoadResultCache } from "./load-result-cache.js";
import { createScssPlugin } from "./esbuild-scss-plugin";
import { createPostcssPlugin, loadPostcssPlugins } from "./esbuild-postcss-plugin";

export interface BuildSsrBundleOptions {
  /** 패키지 디렉토리 경로 */
  pkgDir: string;
  /** 모노레포 루트 (workspaceRoot) */
  cwd: string;
  /** tsconfig 경로 (기본: pkgDir/tsconfig.json) */
  tsconfig?: string;
  /** 빌드 시 치환할 환경변수 */
  env?: Record<string, string>;
  /** PostCSS 플러그인 ([name, options] 튜플 배열) */
  postcssPlugins?: [string, (object | string)?][];
  /** 번들 출력 디렉토리 (기본: pkgDir/.angular/ssg) */
  outdir?: string;
}

export interface SsrBundleResult {
  /** 생성된 server 번들 파일 경로 */
  bundlePath: string;
}

class SsrSourceFileCache extends AngularSourceFileCache {
  readonly typeScriptFileCache = new Map<string, string | Uint8Array>();
  readonly loadResultCache = new MemoryLoadResultCache();
}

/**
 * SSG 프리렌더용 server 번들을 빌드한다.
 *
 * - 진입점: 가상 래퍼 — src/main.server.ts(부트스트랩 default export)를
 *   @angular/platform-server의 renderApplication으로 감싸 render(url, document)를 export
 * - platform: node, format: esm (server 패키지 빌드 패턴과 동일)
 */
export async function buildSsrBundle(options: BuildSsrBundleOptions): Promise<SsrBundleResult> {
  const outdir = options.outdir ?? path.join(options.pkgDir, ".angular", "ssg");
  const bundlePath = path.join(outdir, "sd-ssg-entry.mjs");

  // SourceFileCache 생성 (일회성 빌드 — 증분 캐시 불필요)
  const sourceFileCache = new SsrSourceFileCache();

  // SCSS 스타일시트 변환용 공유 상태
  const stylesheetDependencies = new Map<string, Set<string>>();
  const stylesheetErrors: string[] = [];

  // PostCSS 플러그인 로딩 (튜플 → 인스턴스)
  const loadedPostcssPlugins = loadPostcssPlugins(options.pkgDir, options.postcssPlugins);

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

  const pluginOptions: AngularCompilerPluginOptions = {
    tsconfig: options.tsconfig ?? path.join(options.pkgDir, "tsconfig.json"),
    sourcemap: false,
    advancedOptimizations: true,
    thirdPartySourcemaps: false,
    incremental: false,
    sourceFileCache,
    typeScriptFileCache: sourceFileCache.typeScriptFileCache,
    loadResultCache: sourceFileCache.loadResultCache,
    includeTestMetadata: false,
    persistentCachePath: cachePath,
    transformStylesheet,
    stylesheetDependencies,
    stylesheetErrors,
  };

  const angularPlugin = createAngularCompilerPlugin(pluginOptions);

  const scssPlugin = createScssPlugin({
    loadPaths: [
      path.join(options.pkgDir, "node_modules"),
      path.join(options.cwd, "node_modules"),
    ],
  });

  // define 주입 (client 빌드 패턴 + 서버 렌더 플래그)
  const define: Record<string, string> = {
    ngDevMode: "false",
    ngJitMode: "false",
    ngHmrMode: "false",
    ngServerMode: "true",
  };
  if (options.env != null) {
    define["import.meta.env"] = JSON.stringify(options.env);
  }

  // CJS 패키지 require() 지원 banner (server 패키지 빌드 패턴과 동일)
  const bannerJs =
    "import { createRequire } from 'module'; const require = createRequire(import.meta.url);";

  await esbuild.build({
    stdin: {
      contents: [
        'import bootstrap from "./src/main.server";',
        'import { renderApplication } from "@angular/platform-server";',
        "export function render(url: string, document: string): Promise<string> {",
        "  return renderApplication(bootstrap, { document, url });",
        "}",
      ].join("\n"),
      resolveDir: options.pkgDir,
      sourcefile: "sd-ssg-entry.ts",
      loader: "ts",
    },
    target: "node20",
    bundle: true,
    splitting: false,
    format: "esm",
    platform: "node",
    outdir,
    // stdin 진입점의 출력 이름은 "stdin"으로 고정되므로 entryNames로 결정론적 지정
    entryNames: "sd-ssg-entry",
    outExtension: { ".js": ".mjs" },
    write: true,
    sourcemap: false,
    logLevel: "silent",
    tsconfig: options.tsconfig ?? path.join(options.pkgDir, "tsconfig.json"),
    define,
    banner: { js: bannerJs },
    plugins: [
      angularPlugin,
      scssPlugin,
      ...(loadedPostcssPlugins != null
        ? [createPostcssPlugin({ plugins: loadedPostcssPlugins })]
        : []),
    ],
  });

  return { bundlePath };
}
