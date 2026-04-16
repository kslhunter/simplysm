import type { Plugin } from "vite";
import path from "path";
import ts from "typescript";
import { consola } from "consola";
import { pathx } from "@simplysm/core-node";
import { SdTsCompiler } from "../ts-compiler/SdTsCompiler.js";
import { AngularSourceFileCache } from "./angular-compiler.js";
import type { SerializedDiagnostic } from "../typecheck/typecheck-serialization.js";

const logger = consola.withTag("sd:cli:angular");

/** sdAngularPlugin 옵션 */
export interface SdAngularPluginOptions {
  /** sd.config.ts packages 키 (패키지 디렉토리명) */
  pkg: string;
}

/**
 * Angular AOT 컴파일을 수행하는 Vite 플러그인 (Vitest 전용).
 *
 * SdTsCompiler로 패키지의 .ts 파일을 AOT 컴파일하고,
 * transform 훅에서 컴파일된 JS를 반환한다.
 */
export function sdAngularPlugin(options: SdAngularPluginOptions): Plugin {
  let sdTsCompiler: SdTsCompiler | undefined;
  let sourceFileCache: AngularSourceFileCache | undefined;

  /** emit된 파일 맵 (posix 소스 경로 → 컴파일된 JS 내용) */
  const emittedFilesBySource = new Map<string, string>();

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

      // AngularSourceFileCache 생성 (또는 재사용)
      sourceFileCache ??= new AngularSourceFileCache();

      // Vitest watch 재빌드: 변경된 파일 수집
      let modifiedFiles: ReadonlySet<string> | undefined;
      if (pendingWatchChanges.size > 0) {
        logger.debug(`watch 변경 파일 ${pendingWatchChanges.size}개`);
        modifiedFiles = new Set(pendingWatchChanges);
        pendingWatchChanges.clear();
      }

      // SdTsCompiler 생성 (최초 또는 buildEnd 후 재시작)
      if (sdTsCompiler == null) {
        emittedFilesBySource.clear();
        sdTsCompiler = new SdTsCompiler({
          pkgDir: resolvedPkgDir,
          cwd: process.cwd(),
          output: { js: true, dts: false },
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
        });
      }

      // 이미 초기화됐고 변경 파일이 없으면 건너뜀
      if (emittedFilesBySource.size > 0 && modifiedFiles == null) {
        logger.debug("이미 초기화됨, 변경 없음 — buildStart 건너뜀");
        return;
      }

      // compileAsync
      const result = await sdTsCompiler.compileAsync(modifiedFiles);

      // emitResults → emittedFilesBySource 매핑
      for (const { sourceFileName, contents } of result.emitResults ?? []) {
        emittedFilesBySource.set(pathx.posix(sourceFileName), contents);
      }

      // 진단 보고
      reportDiagnostics(result.diagnostics, result.program);

      // SCSS 에러 보고
      for (const err of result.scssErrors) {
        logger.error(err);
      }
    },

    transform(_code, id) {
      // query param 제거
      const cleanId = id.split("?")[0];

      // emit된 .ts 파일만 처리
      if (!cleanId.endsWith(".ts")) return;

      const normalizedId = pathx.posix(cleanId);
      const emittedContent = emittedFilesBySource.get(normalizedId);
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
      sdTsCompiler = undefined;
    },
  };
}

function reportDiagnostics(
  diagnostics: readonly SerializedDiagnostic[],
  program: ts.Program,
): void {
  for (const d of diagnostics) {
    let loc = "";
    if (d.file != null) {
      loc = d.file.fileName;
      if (d.start != null) {
        const sf = program.getSourceFile(d.file.fileName);
        if (sf != null) {
          const pos = sf.getLineAndCharacterOfPosition(d.start);
          loc += `:${pos.line + 1}`;
        }
      }
    }

    const prefix = loc !== "" ? `(${loc}) ` : "";
    if (d.category === ts.DiagnosticCategory.Error) {
      logger.error(`${prefix}${d.messageText}`);
    } else if (d.category === ts.DiagnosticCategory.Warning) {
      logger.warn(`${prefix}${d.messageText}`);
    }
  }
}
