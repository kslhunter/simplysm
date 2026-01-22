import ts from "typescript";
import path from "path";
import { createSdWorker, FsUtils } from "@simplysm/core-node";
import type { Target } from "../sd-config.types";

//#region Types

/**
 * 타입체크 작업 정보
 */
export interface TypecheckTaskInfo {
  name: string;
  category: "package" | "packageTest" | "test" | "root";
  files: string[];
  target: Target;
  packageDir: string;
  buildInfoPath: string;
}

/**
 * 타입체크 결과
 */
export interface TypecheckResult {
  taskName: string;
  diagnostics: SerializedDiagnostic[];
  hasErrors: boolean;
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
 * DOM 관련 lib 패턴 - 브라우저 API를 포함하는 lib들
 */
const DOM_LIB_PATTERNS = ["dom", "webworker"] as const;

/**
 * 패키지의 package.json에서 @types/* devDependencies를 읽어 types 목록을 반환합니다.
 */
async function getTypesFromPackageJson(packageDir: string): Promise<string[]> {
  const packageJsonPath = path.join(packageDir, "package.json");
  if (!FsUtils.exists(packageJsonPath)) {
    return [];
  }

  const packageJson = await FsUtils.readJsonAsync<{ devDependencies?: Record<string, string> }>(
    packageJsonPath,
  );
  const devDeps = packageJson.devDependencies ?? {};

  return Object.keys(devDeps)
    .filter((dep) => dep.startsWith("@types/"))
    .map((dep) => dep.replace("@types/", ""));
}

/**
 * 패키지용 컴파일러 옵션 생성
 */
async function getCompilerOptionsForPackage(
  baseOptions: ts.CompilerOptions,
  target: "node" | "browser" | "neutral",
  packageDir: string,
): Promise<ts.CompilerOptions> {
  const options = { ...baseOptions, noEmit: true };
  const packageTypes = await getTypesFromPackageJson(packageDir);

  switch (target) {
    case "node":
      options.lib = options.lib?.filter(
        (lib) => !DOM_LIB_PATTERNS.some((pattern) => lib.toLowerCase().includes(pattern)),
      );
      options.types = [...new Set([...packageTypes, "node"])];
      break;
    case "browser":
      options.types = packageTypes.filter((t) => t !== "node");
      break;
    case "neutral":
      options.lib = options.lib?.filter(
        (lib) => !DOM_LIB_PATTERNS.some((pattern) => lib.toLowerCase().includes(pattern)),
      );
      options.types = packageTypes.filter((t) => t !== "node");
      break;
  }

  return options;
}

/**
 * 패키지 테스트용 컴파일러 옵션 생성
 */
async function getCompilerOptionsForPackageTests(
  baseOptions: ts.CompilerOptions,
  target: "node" | "browser" | "neutral",
  packageDir: string,
): Promise<ts.CompilerOptions> {
  const options = { ...baseOptions, noEmit: true };
  const packageTypes = await getTypesFromPackageJson(packageDir);

  switch (target) {
    case "node":
      options.lib = options.lib?.filter(
        (lib) => !DOM_LIB_PATTERNS.some((pattern) => lib.toLowerCase().includes(pattern)),
      );
      options.types = [...new Set([...packageTypes, "node"])];
      break;
    case "browser":
      options.types = packageTypes.filter((t) => t !== "node");
      break;
    case "neutral":
      options.types = [...new Set([...packageTypes, "node"])];
      break;
  }

  return options;
}

/**
 * Diagnostic을 직렬화 가능한 형태로 변환
 */
function serializeDiagnostic(diagnostic: ts.Diagnostic): SerializedDiagnostic {
  const messageText =
    typeof diagnostic.messageText === "string"
      ? diagnostic.messageText
      : diagnostic.messageText.messageText;

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
 */
async function executeTypecheck(
  taskInfo: TypecheckTaskInfo,
  baseOptions: Record<string, unknown>,
): Promise<TypecheckResult> {
  // baseOptions를 ts.CompilerOptions로 변환
  const parsedOptions = baseOptions as ts.CompilerOptions;

  // 카테고리별 옵션 생성
  let options: ts.CompilerOptions;
  switch (taskInfo.category) {
    case "package":
      options = await getCompilerOptionsForPackage(parsedOptions, taskInfo.target, taskInfo.packageDir);
      break;
    case "packageTest":
      options = await getCompilerOptionsForPackageTests(parsedOptions, taskInfo.target, taskInfo.packageDir);
      break;
    case "test": {
      const testTypes = await getTypesFromPackageJson(taskInfo.packageDir);
      options = { ...parsedOptions, noEmit: true, types: [...new Set([...testTypes, "node"])] };
      break;
    }
    case "root":
      options = { ...parsedOptions, noEmit: true };
      break;
  }

  // 타입체크 실행
  const program = ts.createIncrementalProgram({
    rootNames: taskInfo.files,
    options: { ...options, incremental: true, tsBuildInfoFile: taskInfo.buildInfoPath },
  });

  const diagnostics = [...ts.getPreEmitDiagnostics(program.getProgram())];
  program.emit();

  const hasErrors = diagnostics.some((d) => d.category === ts.DiagnosticCategory.Error);

  return {
    taskName: taskInfo.name,
    diagnostics: diagnostics.map(serializeDiagnostic),
    hasErrors,
  };
}

export default createSdWorker({
  typecheck: executeTypecheck,
});

//#endregion
