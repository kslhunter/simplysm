import path from "path";
import ts from "typescript";
import { createWorker, pathIsChildPath, pathNorm } from "@simplysm/core-node";
import { consola } from "consola";
import {
  getCompilerOptionsForPackage,
  getPackageFiles,
  getPackageSourceFiles,
  parseRootTsconfig,
  type TypecheckEnv,
} from "../utils/tsconfig";
import { serializeDiagnostic, type SerializedDiagnostic } from "../utils/typecheck-serialization";

//#region Types

/**
 * DTS watch 시작 정보
 */
export interface DtsWatchInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  env: TypecheckEnv;
}

/**
 * DTS 일회성 빌드 정보
 */
export interface DtsBuildInfo {
  name: string;
  cwd: string;
  /** 패키지 디렉토리. 미지정 시 non-package 모드 (packages/ 제외 전체 타입체크) */
  pkgDir?: string;
  /** 타입체크 환경. pkgDir과 함께 사용 */
  env?: TypecheckEnv;
  /** true면 .d.ts 생성 + 타입체크, false면 타입체크만 (기본값: true) */
  emit?: boolean;
}

/**
 * DTS 일회성 빌드 결과
 */
export interface DtsBuildResult {
  success: boolean;
  errors?: string[];
  diagnostics: SerializedDiagnostic[];
  errorCount: number;
  warningCount: number;
}

/**
 * 빌드 이벤트
 */
export interface DtsBuildEvent {
  success: boolean;
  errors?: string[];
}

/**
 * 에러 이벤트
 */
export interface DtsErrorEvent {
  message: string;
}

/**
 * Worker 이벤트 타입
 */
export interface DtsWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: DtsBuildEvent;
  error: DtsErrorEvent;
}

//#endregion

//#region 리소스 관리

const logger = consola.withTag("sd:cli:dts:worker");

/** tsc watch program (정리 대상) */
let tscWatchProgram:
  | ts.WatchOfFilesAndCompilerOptions<ts.EmitAndSemanticDiagnosticsBuilderProgram>
  | undefined;

/**
 * 리소스 정리
 */
function cleanup(): void {
  if (tscWatchProgram != null) {
    tscWatchProgram.close();
    tscWatchProgram = undefined;
  }
}

process.on("SIGTERM", () => {
  try {
    cleanup();
  } catch (err) {
    logger.error("cleanup 실패", err);
  }
  process.exit(0);
});

process.on("SIGINT", () => {
  try {
    cleanup();
  } catch (err) {
    logger.error("cleanup 실패", err);
  }
  process.exit(0);
});

//#endregion

//#region DTS 출력 경로 재작성

/**
 * .d.ts.map 파일의 sources 경로를 새 위치 기준으로 조정
 */
function adjustDtsMapSources(content: string, originalDir: string, newDir: string): string {
  if (originalDir === newDir) return content;
  try {
    const map = JSON.parse(content) as { sources?: string[] };
    if (Array.isArray(map.sources)) {
      map.sources = map.sources.map((source) => {
        const absoluteSource = path.resolve(originalDir, source);
        return path.relative(newDir, absoluteSource);
      });
    }
    return JSON.stringify(map);
  } catch {
    return content;
  }
}

/**
 * DTS writeFile용 경로 재작성 함수 생성
 *
 * TypeScript는 path alias(@simplysm/*)로 참조된 다른 패키지 소스까지 rootDir 계산에
 * 포함하므로, 출력이 dist/{pkgName}/src/... 형태의 중첩 구조로 생성된다.
 * 반환된 함수는 현재 패키지의 .d.ts만 flat 구조(dist/...)로 재작성하고,
 * 다른 패키지의 .d.ts는 무시한다.
 *
 * @returns (fileName, content) => [newPath, newContent] | null (null이면 쓰기 무시)
 */
function createDtsPathRewriter(
  pkgDir: string,
): (fileName: string, content: string) => [string, string] | null {
  const pkgName = path.basename(pkgDir);
  const distDir = pathNorm(path.join(pkgDir, "dist"));
  const distPrefix = distDir + path.sep;
  // 중첩 구조에서 현재 패키지의 접두사: dist/{pkgName}/src/
  const ownNestedPrefix = pathNorm(path.join(distDir, pkgName, "src")) + path.sep;

  return (fileName, content) => {
    fileName = pathNorm(fileName);

    if (!fileName.startsWith(distPrefix)) return null;

    if (fileName.startsWith(ownNestedPrefix)) {
      // 중첩 경로를 flat으로 재작성: dist/{pkgName}/src/... → dist/...
      const flatPath = path.join(distDir, fileName.slice(ownNestedPrefix.length));
      if (fileName.endsWith(".d.ts.map")) {
        content = adjustDtsMapSources(content, path.dirname(fileName), path.dirname(flatPath));
      }
      return [flatPath, content];
    }

    // 다른 패키지의 중첩 출력 (dist/{otherPkg}/src/...) → 무시
    const relFromDist = fileName.slice(distPrefix.length);
    const segments = relFromDist.split(path.sep);
    if (segments.length >= 3 && segments[1] === "src") {
      return null;
    }

    // 이미 flat 구조 (의존성 없는 패키지) → 그대로 출력
    return [fileName, content];
  };
}

//#endregion

//#region buildDts (일회성 빌드)

/**
 * DTS 일회성 빌드 (타입체크 + dts 생성)
 */
async function buildDts(info: DtsBuildInfo): Promise<DtsBuildResult> {
  try {
    const parsedConfig = parseRootTsconfig(info.cwd);

    let rootFiles: string[];
    let baseOptions: ts.CompilerOptions;
    let diagnosticFilter: (d: ts.Diagnostic) => boolean;
    let tsBuildInfoFile: string;

    if (info.pkgDir != null && info.env != null) {
      // 패키지 모드
      baseOptions = await getCompilerOptionsForPackage(parsedConfig.options, info.env, info.pkgDir);

      const shouldEmit = info.emit !== false;
      if (shouldEmit) {
        // emit 모드: src만 대상 (d.ts 생성)
        rootFiles = getPackageSourceFiles(info.pkgDir, parsedConfig);
        const pkgSrcDir = path.join(info.pkgDir, "src");
        diagnosticFilter = (d) => d.file == null || pathIsChildPath(d.file.fileName, pkgSrcDir);
      } else {
        // 타입체크 모드: 패키지 전체 파일 대상 (src + tests)
        rootFiles = getPackageFiles(info.pkgDir, parsedConfig);
        const pkgDir = info.pkgDir;
        diagnosticFilter = (d) => d.file == null || pathIsChildPath(d.file.fileName, pkgDir);
      }

      tsBuildInfoFile = path.join(
        info.pkgDir,
        ".cache",
        shouldEmit ? "dts.tsbuildinfo" : `typecheck-${info.env}.tsbuildinfo`,
      );
    } else {
      // non-package 모드: 프로젝트 루트 파일 + 패키지 루트 설정 파일 타입체크
      const packagesDir = path.join(info.cwd, "packages");
      const isNonPackageFile = (fileName: string): boolean => {
        if (!pathIsChildPath(fileName, packagesDir)) return true;
        // 패키지 루트 직속 파일(설정 파일) 포함: packages/{pkg}/file.ts
        const relative = path.relative(packagesDir, fileName);
        return relative.split(path.sep).length === 2;
      };
      rootFiles = parsedConfig.fileNames.filter(isNonPackageFile);
      baseOptions = parsedConfig.options;
      diagnosticFilter = (d) => d.file == null || isNonPackageFile(d.file.fileName);
      tsBuildInfoFile = path.join(info.cwd, ".cache", "typecheck-root.tsbuildinfo");
    }

    // emit 여부 결정 (기본값: true)
    const shouldEmit = info.emit !== false;

    const options: ts.CompilerOptions = {
      ...baseOptions,
      sourceMap: false,
      incremental: true,
      tsBuildInfoFile,
    };

    // emit 여부에 따라 관련 옵션 설정
    if (shouldEmit && info.pkgDir != null) {
      // dts 생성 + 타입체크 (패키지 모드에서만)
      options.noEmit = false;
      options.emitDeclarationOnly = true;
      options.declaration = true;
      options.declarationMap = true;
      options.outDir = path.join(info.pkgDir, "dist");
      options.declarationDir = path.join(info.pkgDir, "dist");
    } else {
      // 타입체크만 수행 (dts 생성 안 함)
      options.noEmit = true;
      options.emitDeclarationOnly = false;
      options.declaration = false;
      options.declarationMap = false;
      // emit 안 할 때 outDir/declarationDir 불필요
    }

    // incremental program 생성
    const host = ts.createIncrementalCompilerHost(options);

    // 현재 패키지의 .d.ts만 flat 경로로 출력 (다른 패키지 .d.ts 생성 방지 + 중첩 경로 재작성)
    if (shouldEmit && info.pkgDir != null) {
      const rewritePath = createDtsPathRewriter(info.pkgDir);
      const originalWriteFile = host.writeFile;
      host.writeFile = (fileName, content, writeByteOrderMark, onError, sourceFiles, data) => {
        const result = rewritePath(fileName, content);
        if (result != null) {
          originalWriteFile(result[0], result[1], writeByteOrderMark, onError, sourceFiles, data);
        }
      };
    }

    const program = ts.createIncrementalProgram({
      rootNames: rootFiles,
      options,
      host,
    });

    // emit (noEmit일 경우에도 호출해야 diagnostics가 수집됨)
    const emitResult = program.emit();

    // diagnostics 수집
    const allDiagnostics = [
      ...program.getConfigFileParsingDiagnostics(),
      ...program.getSyntacticDiagnostics(),
      ...program.getOptionsDiagnostics(),
      ...program.getGlobalDiagnostics(),
      ...program.getSemanticDiagnostics(),
      ...emitResult.diagnostics,
    ];

    // 해당 패키지 src 폴더 내 파일만 에러 수집 (다른 패키지 에러 무시)
    const filteredDiagnostics = allDiagnostics.filter(diagnosticFilter);

    const serializedDiagnostics = filteredDiagnostics.map(serializeDiagnostic);
    const errorCount = filteredDiagnostics.filter(
      (d) => d.category === ts.DiagnosticCategory.Error,
    ).length;
    const warningCount = filteredDiagnostics.filter(
      (d) => d.category === ts.DiagnosticCategory.Warning,
    ).length;

    // 에러 메시지 문자열 배열 (하위 호환용)
    const errors = filteredDiagnostics
      .filter((d) => d.category === ts.DiagnosticCategory.Error)
      .map((d) => {
        const message = ts.flattenDiagnosticMessageText(d.messageText, "\n");
        if (d.file != null && d.start != null) {
          const { line, character } = d.file.getLineAndCharacterOfPosition(d.start);
          return `${d.file.fileName}:${line + 1}:${character + 1}: TS${d.code}: ${message}`;
        }
        return `TS${d.code}: ${message}`;
      });

    return {
      success: errorCount === 0,
      errors: errors.length > 0 ? errors : undefined,
      diagnostics: serializedDiagnostics,
      errorCount,
      warningCount,
    };
  } catch (err) {
    return {
      success: false,
      errors: [err instanceof Error ? err.message : String(err)],
      diagnostics: [],
      errorCount: 1,
      warningCount: 0,
    };
  }
}

//#endregion

//#region startDtsWatch (watch 모드)

/** startDtsWatch 호출 여부 플래그 */
let isWatchStarted = false;

/**
 * DTS watch 시작
 * @remarks 이 함수는 Worker당 한 번만 호출되어야 합니다.
 * @throws 이미 watch가 시작된 경우
 */
async function startDtsWatch(info: DtsWatchInfo): Promise<void> {
  if (isWatchStarted) {
    throw new Error("startDtsWatch는 Worker당 한 번만 호출할 수 있습니다.");
  }
  isWatchStarted = true;

  try {
    const parsedConfig = parseRootTsconfig(info.cwd);
    const rootFiles = getPackageSourceFiles(info.pkgDir, parsedConfig);
    const baseOptions = await getCompilerOptionsForPackage(
      parsedConfig.options,
      info.env,
      info.pkgDir,
    );

    // 해당 패키지 경로 (필터링용)
    const pkgSrcDir = path.join(info.pkgDir, "src");

    const options: ts.CompilerOptions = {
      ...baseOptions,
      emitDeclarationOnly: true,
      declaration: true,
      declarationMap: true,
      outDir: path.join(info.pkgDir, "dist"),
      declarationDir: path.join(info.pkgDir, "dist"),
      sourceMap: false,
      noEmit: false,
      incremental: true,
      tsBuildInfoFile: path.join(info.pkgDir, ".cache", "dts.tsbuildinfo"),
    };

    let isFirstBuild = true;
    const collectedErrors: string[] = [];

    const reportDiagnostic: ts.DiagnosticReporter = (diagnostic) => {
      if (diagnostic.category === ts.DiagnosticCategory.Error) {
        // 해당 패키지 src 폴더 내 파일만 에러 수집 (다른 패키지 에러 무시)
        if (diagnostic.file != null && !pathIsChildPath(diagnostic.file.fileName, pkgSrcDir)) {
          return;
        }

        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");

        // 파일 위치 정보가 있으면 포함 (절대경로:라인:컬럼 형식 - IDE 링크 지원)
        if (diagnostic.file != null && diagnostic.start != null) {
          const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(
            diagnostic.start,
          );
          collectedErrors.push(
            `${diagnostic.file.fileName}:${line + 1}:${character + 1}: TS${diagnostic.code}: ${message}`,
          );
        } else {
          collectedErrors.push(`TS${diagnostic.code}: ${message}`);
        }
      }
    };

    // 현재 패키지의 .d.ts만 flat 경로로 출력 (다른 패키지 .d.ts 생성 방지 + 중첩 경로 재작성)
    // TypeScript watch 모드는 import된 모든 모듈의 .d.ts를 생성하려고 시도함.
    // 모노레포에서 다른 패키지의 .d.ts까지 덮어쓰는 것을 방지하고,
    // 중첩 경로(dist/{pkgName}/src/...)를 flat 경로(dist/...)로 재작성한다.
    const rewritePath = createDtsPathRewriter(info.pkgDir);
    const originalWriteFile = ts.sys.writeFile;
    const customSys: ts.System = {
      ...ts.sys,
      writeFile: (filePath, content, writeByteOrderMark) => {
        const result = rewritePath(filePath, content);
        if (result != null) {
          originalWriteFile(result[0], result[1], writeByteOrderMark);
        }
      },
    };

    const host = ts.createWatchCompilerHost(
      rootFiles,
      options,
      customSys,
      ts.createEmitAndSemanticDiagnosticsBuilderProgram,
      reportDiagnostic,
      () => {}, // watchStatusReporter - 사용하지 않음
    );

    const originalAfterProgramCreate = host.afterProgramCreate;
    host.afterProgramCreate = (program) => {
      originalAfterProgramCreate?.(program);

      if (!isFirstBuild) {
        sender.send("buildStart", {});
      }

      program.emit();

      sender.send("build", {
        success: collectedErrors.length === 0,
        errors: collectedErrors.length > 0 ? [...collectedErrors] : undefined,
      });

      collectedErrors.length = 0;
      isFirstBuild = false;
    };

    tscWatchProgram = ts.createWatchProgram(host);
  } catch (err) {
    sender.send("error", {
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

const sender = createWorker<
  { startDtsWatch: typeof startDtsWatch; buildDts: typeof buildDts },
  DtsWorkerEvents
>({
  startDtsWatch,
  buildDts,
});

export default sender;

//#endregion
