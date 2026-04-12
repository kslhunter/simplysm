import type { Plugin } from "vite";
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

const logger = consola.withTag("sd:cli:angular");

/** sdAngularPlugin 옵션 */
export interface SdAngularPluginOptions {
  /** sd.config.ts packages 키 (패키지 디렉토리명) */
  pkg: string;
}

/**
 * Angular AOT 컴파일을 수행하는 Vite 플러그인 (Vitest 전용).
 *
 * AngularBuildPipeline으로 패키지의 .ts 파일을 AOT 컴파일하고,
 * transform 훅에서 컴파일된 JS를 반환한다.
 */
export function sdAngularPlugin(options: SdAngularPluginOptions): Plugin {
  let pipeline: AngularBuildPipeline | undefined;
  let sourceFileCache: AngularSourceFileCache | undefined;

  /** Vitest watch 모드에서 변경된 파일 경로를 수집한다. buildStart 재호출 시 캐시 무효화에 사용. */
  const pendingWatchChanges = new Set<string>();

  let resolvedPkgDir: string | undefined;

  return {
    name: "sd-angular",
    enforce: "pre",

    watchChange(id: string) {
      pendingWatchChanges.add(pathx.posix(id));
    },

    config() {
      resolvedPkgDir = path.resolve(process.cwd(), "packages", options.pkg);
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
          removeComments: false,
          sourceMap: false,
          inlineSourceMap: true,
          rootDir: process.cwd(),
        }),
        scssCacheDir: path.join(resolvedPkgDir, ".cache", "scss"),
      });

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

    transform(_code, id) {
      // query param 제거
      const cleanId = id.split("?")[0];

      // Pipeline이 emit한 .ts 파일만 처리
      if (!cleanId.endsWith(".ts")) return;

      const normalizedId = pathx.posix(cleanId);
      const emittedContent = pipeline?.getEmittedFile(normalizedId);
      if (emittedContent == null) return;

      // 인라인 소스맵 분리 (Vite 호환)
      const inlineMapMatch = emittedContent.match(
        /\/\/# sourceMappingURL=data:application\/json;(?:charset=utf-8;)?base64,(.+)$/m,
      );
      if (inlineMapMatch != null) {
        const mapJson = atob(inlineMapMatch[1]);
        return {
          code: emittedContent.slice(0, inlineMapMatch.index),
          map: JSON.parse(mapJson),
        };
      }
      return { code: emittedContent, map: null };
    },

    buildEnd() {
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
