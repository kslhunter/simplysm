import type { Plugin } from "vite";
import { JavaScriptTransformer } from "@angular/build/private";
import os from "os";
import path from "path";
import ts from "typescript";
import { consola } from "consola";
import { pathx } from "@simplysm/core-node";
import { AngularSourceFileCache } from "./angular-compiler.js";
import { getPackageSourceFiles } from "../utils/tsconfig.js";
import {
  AngularBuildPipeline,
  type PipelineDiagnosticResult,
} from "./angular-build-pipeline.js";
import { loadSdConfig } from "../utils/sd-config.js";
import type { SdPackageConfig } from "../sd-config.types.js";

const logger = consola.withTag("sd:cli:angular");

/** sdAngularPlugin 옵션 */
export interface SdAngularPluginOptions {
  /** sd.config.ts packages 키 (패키지 디렉토리명) */
  pkg: string;
}

/**
 * Angular AOT 컴파일을 수행하는 Vite 플러그인 (Vitest 전용).
 *
 * AngularBuildPipeline + JavaScriptTransformer를 관리한다.
 * - watchChange: 변경 파일 수집 (Vitest watch 모드용)
 * - buildStart: Pipeline 초기화 + 컴파일 + emit
 * - transform: .ts 파일에 대해 컴파일된 JS 반환 + JavaScriptTransformer 적용
 * - buildEnd: 리소스 정리
 */
export function sdAngularPlugin(options: SdAngularPluginOptions): Plugin {
  let pipeline: AngularBuildPipeline | undefined;
  let sourceFileCache: AngularSourceFileCache | undefined;
  let jsTransformer: JavaScriptTransformer | undefined;

  /** Vitest watch 모드에서 변경된 파일 경로를 수집한다. buildStart 재호출 시 캐시 무효화에 사용. */
  const pendingWatchChanges = new Set<string>();

  // config() 훅에서 초기화
  let isDev = false;
  let enableSourcemap = true;
  let pkgConfig: SdPackageConfig | undefined;
  let resolvedPkgDir: string | undefined;

  function createJsTransformer(): JavaScriptTransformer {
    const maxThreads = Math.max(1, Math.floor((os.cpus().length * 2) / 3));
    return new JavaScriptTransformer(
      {
        sourcemap: enableSourcemap,
        thirdPartySourcemaps: enableSourcemap,
        advancedOptimizations: !isDev,
        jit: false,
      },
      maxThreads,
    );
  }

  return {
    name: "sd-angular",
    enforce: "pre",

    watchChange(id: string) {
      pendingWatchChanges.add(pathx.posix(id));
    },

    async config(_config: unknown, env: { mode: string }) {
      const cwd = process.cwd();
      isDev = env.mode === "development";

      // sd.config.ts 로딩
      const sdConfig = await loadSdConfig({ cwd, dev: isDev, opt: [] });
      const rawPkgConfig = sdConfig.packages[options.pkg];
      if (rawPkgConfig == null) {
        throw new Error(`sd.config.ts에 패키지 "${options.pkg}"가 정의되어 있지 않습니다.`);
      }
      pkgConfig = rawPkgConfig;

      // 패키지 디렉토리 resolve
      resolvedPkgDir = path.resolve(cwd, "packages", options.pkg);
    },

    configResolved(resolved: { build: { sourcemap: unknown } }) {
      enableSourcemap = resolved.build.sourcemap !== false || isDev;
    },

    async buildStart() {
      if (resolvedPkgDir == null) {
        throw new Error("config() 훅이 먼저 호출되어야 합니다.");
      }
      logger.debug("sdAngularPlugin buildStart 시작");

      // tsconfig 로드
      const tsconfigPath = path.join(resolvedPkgDir, "tsconfig.json");
      const configFile = ts.readConfigFile(tsconfigPath, ts.sys.readFile);
      const parsed = ts.parseJsonConfigFileContent(configFile.config, ts.sys, resolvedPkgDir);
      logger.debug(`tsconfig 파싱 완료: ${parsed.fileNames.length}개 파일`);

      // AngularSourceFileCache 생성 (또는 재사용)
      sourceFileCache ??= new AngularSourceFileCache();

      // Vitest watch 재빌드: 변경된 파일의 캐시 무효화
      let hadPendingChanges = false;
      if (pendingWatchChanges.size > 0) {
        hadPendingChanges = true;
        logger.debug(`watch 변경 파일 ${pendingWatchChanges.size}개 캐시 무효화`);
        sourceFileCache.invalidate(pendingWatchChanges);
        pendingWatchChanges.clear();
      }

      // postCssPlugins from sd.config.ts (client 패키지에만 존재)
      const browserSupport = pkgConfig?.target === "client"
        ? (pkgConfig).browserSupport
        : undefined;
      const postCssPlugins = browserSupport?.postCss?.plugins;

      // Pipeline 생성 (최초) 또는 재사용
      pipeline ??= new AngularBuildPipeline({
        mode: "client",
        pkgDir: resolvedPkgDir,
        cwd: process.cwd(),
        rootNames: getPackageSourceFiles(resolvedPkgDir, parsed),
        compilerOptions: parsed.options,
        angularCompilerOptions: parsed.raw?.angularCompilerOptions as
          | Record<string, unknown>
          | undefined,
        sourceFileCache,
        compilerOptionsTransformer: (opts) => ({
          ...opts,
          noEmit: false,
          declaration: false,
          declarationMap: false,
          rootDir: process.cwd(),
          ...(isDev ? { removeComments: false } : {}),
        }),
        postCssPlugins,
        scssCacheDir: path.join(resolvedPkgDir, ".cache", "scss"),
      });

      // JavaScriptTransformer 생성
      jsTransformer ??= createJsTransformer();

      // Pipeline 초기화 — 이미 초기화됐고 변경 파일이 없으면 건너뜀
      if (pipeline.getEmittedFiles().size > 0 && !hadPendingChanges) {
        logger.debug("Pipeline 이미 초기화됨, 변경 없음 — buildStart 건너뜀");
        return;
      }
      const pipelineResult = await pipeline.initialize();

      // 진단 보고
      reportDiagnostics(pipelineResult.diagnostics);

      // SCSS 에러 보고
      for (const err of pipelineResult.scssErrors) {
        logger.error(err);
      }
    },

    async transform(_code, id) {
      if (jsTransformer == null) return;

      // query param 제거
      const cleanId = id.split("?")[0];
      let code = _code;

      // Phase 1: TS 컴파일 — .ts 파일은 Pipeline이 emit한 JS로 교체
      if (cleanId.endsWith(".ts")) {
        const normalizedId = pathx.posix(cleanId);
        const emittedContent = pipeline?.getEmittedFile(normalizedId);
        if (emittedContent == null) return;
        code = emittedContent;
      } else if (!cleanId.endsWith(".mjs") && !cleanId.endsWith(".js")) {
        return;
      }

      // Phase 2: JS 변환 — Angular Linker로 partial → full AOT 링킹 + 최적화
      const transformed = await jsTransformer.transformData(pathx.posix(cleanId), code, false);
      const transformedCode = new TextDecoder().decode(transformed);

      // 인라인 소스맵 분리 (Rollup 경고 방지)
      const inlineMapMatch = transformedCode.match(
        /\/\/# sourceMappingURL=data:application\/json;(?:charset=utf-8;)?base64,(.+)$/m,
      );
      if (inlineMapMatch != null) {
        const mapJson = atob(inlineMapMatch[1]);
        return {
          code: transformedCode.slice(0, inlineMapMatch.index),
          map: JSON.parse(mapJson),
        };
      }
      return { code: transformedCode, map: null };
    },

    async buildEnd() {
      if (jsTransformer != null) {
        await jsTransformer.close();
        jsTransformer = undefined;
      }
      pipeline = undefined;
    },
  };
}

function reportDiagnostics(diagnostics: PipelineDiagnosticResult): void {
  for (const error of diagnostics.errors) {
    const loc =
      error.file != null
        ? `${error.file}${error.line != null ? `:${String(error.line)}` : ""}`
        : "";
    logger.error(`${loc !== "" ? `(${loc}) ` : ""}${error.message}`);
  }
  for (const warning of diagnostics.warnings) {
    const loc =
      warning.file != null
        ? `${warning.file}${warning.line != null ? `:${String(warning.line)}` : ""}`
        : "";
    logger.warn(`${loc !== "" ? `(${loc}) ` : ""}${warning.message}`);
  }
}
