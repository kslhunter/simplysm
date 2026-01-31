import ts from "typescript";
import path from "path";
import { createWorker } from "@simplysm/core-node";
import { getTypesFromPackageJson, getCompilerOptionsForPackage, type TypecheckEnv } from "../utils/tsconfig";
import { serializeDiagnostic, type SerializedDiagnostic } from "../utils/typecheck-serialization";

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

// SerializedDiagnostic은 typecheck-serialization.ts에서 re-export
export type { SerializedDiagnostic };

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
      options = {
        ...baseOptions,
        typeRoots: [
          path.join(taskInfo.packageDir, "node_modules", "@types"),
          path.join(process.cwd(), "node_modules", "@types"),
        ],
        types: [...new Set([...testTypes, "node"])],
      };
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

export default createWorker({
  typecheck: executeTypecheck,
});

//#endregion
