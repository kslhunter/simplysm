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

//#region Worker

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
      incremental: true,
      tsBuildInfoFile: path.join(info.pkgDir, ".cache", "dts.tsbuildinfo"),
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
          collectedErrors.push(`${diagnostic.file.fileName}:${line + 1}:${character + 1}: TS${diagnostic.code}: ${message}`);
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

const sender = createWorker<{ startDtsWatch: typeof startDtsWatch }, DtsWorkerEvents>({
  startDtsWatch,
});

export default sender;

//#endregion
