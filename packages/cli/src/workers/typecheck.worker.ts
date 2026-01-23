import ts from "typescript";
import { createSdWorker } from "@simplysm/core-node";
import { getTypesFromPackageJson, getCompilerOptionsForPackage, type TypecheckEnv } from "../utils/tsconfig";

//#region Types

/**
 * 타입체크 작업 정보
 */
export interface TypecheckTaskInfo {
  /** 작업 표시 이름 (예: "패키지: core-common [node]") */
  name: string;
  /** 작업 카테고리 */
  category: "package" | "packageTest" | "test" | "root";
  /** 타입체크할 파일 경로 목록 */
  files: string[];
  /** 타입체크 환경 */
  env: TypecheckEnv;
  /** 패키지 디렉토리 경로 */
  packageDir: string;
  /** incremental 빌드 정보 파일 경로 */
  buildInfoPath: string;
}

/**
 * 타입체크 결과
 */
export interface TypecheckResult {
  taskName: string;
  diagnostics: SerializedDiagnostic[];
  hasErrors: boolean;
  errorCount: number;
  warningCount: number;
}

/**
 * Worker로 전달 가능한 직렬화된 Diagnostic
 */
export interface SerializedDiagnostic {
  category: number;
  code: number;
  messageText: string;
  file?: {
    fileName: string;
  };
  start?: number;
  length?: number;
}

//#endregion

//#region Utilities

/**
 * Diagnostic을 직렬화 가능한 형태로 변환
 * (Worker thread 간 structured clone 통신을 위해 순환 참조/함수 제거)
 */
function serializeDiagnostic(diagnostic: ts.Diagnostic): SerializedDiagnostic {
  // DiagnosticMessageChain인 경우 전체 체인을 평탄화하여 모든 컨텍스트 정보 보존
  const messageText = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");

  return {
    category: diagnostic.category,
    code: diagnostic.code,
    messageText,
    file: diagnostic.file
      ? {
          fileName: diagnostic.file.fileName,
        }
      : undefined,
    start: diagnostic.start,
    length: diagnostic.length,
  };
}

//#endregion

//#region Worker

/**
 * 타입체크 실행
 *
 * @param taskInfo 타입체크 작업 정보
 * @param baseOptions 루트 tsconfig의 컴파일러 옵션 (SdWorker가 자동으로 직렬화하여 전달)
 * @returns 타입체크 결과 (진단 메시지, 에러/경고 카운트 포함)
 */
async function executeTypecheck(
  taskInfo: TypecheckTaskInfo,
  baseOptions: ts.CompilerOptions,
): Promise<TypecheckResult> {
  // 카테고리별 옵션 생성
  let options: ts.CompilerOptions;
  switch (taskInfo.category) {
    case "package":
    case "packageTest":
      options = await getCompilerOptionsForPackage(baseOptions, taskInfo.env, taskInfo.packageDir);
      break;
    case "test": {
      const testTypes = await getTypesFromPackageJson(taskInfo.packageDir);
      options = { ...baseOptions, types: [...new Set([...testTypes, "node"])] };
      break;
    }
    case "root":
      options = { ...baseOptions };
      break;
  }
  options.noEmit = true;

  // 타입체크 실행
  const program = ts.createIncrementalProgram({
    rootNames: taskInfo.files,
    options: { ...options, incremental: true, tsBuildInfoFile: taskInfo.buildInfoPath },
  });

  const diagnostics = [...ts.getPreEmitDiagnostics(program.getProgram())];
  program.emit();

  // 에러/경고 카운트 집계
  let errorCount = 0;
  let warningCount = 0;
  for (const d of diagnostics) {
    if (d.category === ts.DiagnosticCategory.Error) errorCount++;
    else if (d.category === ts.DiagnosticCategory.Warning) warningCount++;
  }

  return {
    taskName: taskInfo.name,
    diagnostics: diagnostics.map(serializeDiagnostic),
    hasErrors: errorCount > 0,
    errorCount,
    warningCount,
  };
}

export default createSdWorker({
  typecheck: executeTypecheck,
});

//#endregion
