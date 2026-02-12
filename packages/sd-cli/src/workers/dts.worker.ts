import path from "path";
import ts from "typescript";
import { createWorker } from "@simplysm/core-node";
import { consola } from "consola";
import {
  getCompilerOptionsForPackage,
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
  pkgDir: string;
  env: TypecheckEnv;
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
let tscWatchProgram: ts.WatchOfFilesAndCompilerOptions<ts.EmitAndSemanticDiagnosticsBuilderProgram> | undefined;

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

//#region buildDts (일회성 빌드)

/**
 * DTS 일회성 빌드 (타입체크 + dts 생성)
 */
async function buildDts(info: DtsBuildInfo): Promise<DtsBuildResult> {
  try {
    const parsedConfig = parseRootTsconfig(info.cwd);
    const rootFiles = getPackageSourceFiles(info.pkgDir, parsedConfig);
    const baseOptions = await getCompilerOptionsForPackage(parsedConfig.options, info.env, info.pkgDir);

    // 해당 패키지 경로 (필터링용)
    const pkgSrcPrefix = path.join(info.pkgDir, "src") + path.sep;

    // emit 여부 결정 (기본값: true)
    const shouldEmit = info.emit !== false;

    const options: ts.CompilerOptions = {
      ...baseOptions,
      sourceMap: false,
    };

    // emit 여부에 따라 관련 옵션 설정
    if (shouldEmit) {
      // dts 생성 + 타입체크
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

    // program 생성
    const host = ts.createCompilerHost(options);

    // 해당 패키지 dist 폴더로 가는 파일만 실제로 쓰기 (다른 패키지 .d.ts 생성 방지)
    if (shouldEmit) {
      const pkgDistPrefix = path.join(info.pkgDir, "dist") + path.sep;
      const originalWriteFile = host.writeFile;
      host.writeFile = (fileName, content, writeByteOrderMark, onError, sourceFiles, data) => {
        if (fileName.startsWith(pkgDistPrefix)) {
          originalWriteFile(fileName, content, writeByteOrderMark, onError, sourceFiles, data);
        }
      };
    }

    const program = ts.createProgram({
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
    const filteredDiagnostics = allDiagnostics.filter(
      (d) => d.file == null || d.file.fileName.startsWith(pkgSrcPrefix),
    );

    const serializedDiagnostics = filteredDiagnostics.map(serializeDiagnostic);
    const errorCount = filteredDiagnostics.filter((d) => d.category === ts.DiagnosticCategory.Error).length;
    const warningCount = filteredDiagnostics.filter((d) => d.category === ts.DiagnosticCategory.Warning).length;

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
    const baseOptions = await getCompilerOptionsForPackage(parsedConfig.options, info.env, info.pkgDir);

    // 해당 패키지 경로 (필터링용)
    const pkgSrcPrefix = path.join(info.pkgDir, "src") + path.sep;
    const pkgDistPrefix = path.join(info.pkgDir, "dist") + path.sep;

    const options: ts.CompilerOptions = {
      ...baseOptions,
      emitDeclarationOnly: true,
      declaration: true,
      declarationMap: true,
      outDir: path.join(info.pkgDir, "dist"),
      declarationDir: path.join(info.pkgDir, "dist"),
      sourceMap: false,
      noEmit: false,
    };

    let isFirstBuild = true;
    const collectedErrors: string[] = [];

    const reportDiagnostic: ts.DiagnosticReporter = (diagnostic) => {
      if (diagnostic.category === ts.DiagnosticCategory.Error) {
        // 해당 패키지 src 폴더 내 파일만 에러 수집 (다른 패키지 에러 무시)
        if (diagnostic.file != null && !diagnostic.file.fileName.startsWith(pkgSrcPrefix)) {
          return;
        }

        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");

        // 파일 위치 정보가 있으면 포함 (절대경로:라인:컬럼 형식 - IDE 링크 지원)
        if (diagnostic.file != null && diagnostic.start != null) {
          const { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);
          collectedErrors.push(
            `${diagnostic.file.fileName}:${line + 1}:${character + 1}: TS${diagnostic.code}: ${message}`,
          );
        } else {
          collectedErrors.push(`TS${diagnostic.code}: ${message}`);
        }
      }
    };

    // 해당 패키지 dist 폴더로 가는 파일만 실제로 쓰기 (다른 패키지 .d.ts 생성 방지)
    // TypeScript watch 모드는 import된 모든 모듈의 .d.ts를 생성하려고 시도함.
    // 모노레포에서 다른 패키지의 .d.ts까지 덮어쓰는 것을 방지하기 위해 필터링 필요.
    const originalWriteFile = ts.sys.writeFile;
    const customSys: ts.System = {
      ...ts.sys,
      writeFile: (filePath, content, writeByteOrderMark) => {
        if (filePath.startsWith(pkgDistPrefix)) {
          originalWriteFile(filePath, content, writeByteOrderMark);
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

const sender = createWorker<{ startDtsWatch: typeof startDtsWatch; buildDts: typeof buildDts }, DtsWorkerEvents>({
  startDtsWatch,
  buildDts,
});

export default sender;

//#endregion
