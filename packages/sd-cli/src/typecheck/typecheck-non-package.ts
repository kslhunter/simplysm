import path from "path";
import ts from "typescript";
import { pathx } from "@simplysm/core-node";
import { createLazyLogger } from "../runtime/lazy-logger";
import { parseTsconfig } from "../utils/tsconfig";
import { serializeDiagnostic, type SerializedDiagnostic } from "./typecheck-serialization";

const logger = createLazyLogger("sd:cli:typecheck-non-pkg");

export interface NonPackageTypecheckResult {
  success: boolean;
  errorCount: number;
  warningCount: number;
  diagnostics: SerializedDiagnostic[];
}

/**
 * 비패키지 파일(루트 레벨 설정 + 패키지 루트 설정)을 타입체크한다.
 *
 * 비패키지 파일 범위:
 * - 루트 레벨 파일 (vitest.config.ts 등) — packages/ 외부
 * - 패키지 루트 설정 파일 (packages/{pkg}/vitest.config.ts) — packages/ 하위 깊이 2
 * 패키지 소스 파일(packages/{pkg}/src/...)은 제외한다.
 */
export function typecheckNonPackageFiles(cwd: string): NonPackageTypecheckResult {
  logger.debug("비패키지 파일 타입체크 시작");
  const parsedConfig = parseTsconfig(cwd);
  const packagesDir = path.join(cwd, "packages");

  const isNonPackageFile = (fileName: string): boolean => {
    const normalized = pathx.posixResolve(fileName);
    const normalizedPkgDir = pathx.posixResolve(packagesDir);

    // packages/ 디렉토리 외부 파일
    if (!normalized.startsWith(normalizedPkgDir + "/")) return true;

    // 패키지 루트에 직접 위치한 파일 (예: packages/{pkg}/file.ts — 깊이 2)
    const relative = pathx.posix(path.relative(normalizedPkgDir, normalized));
    return relative.split("/").length === 2;
  };

  const rootFiles = parsedConfig.fileNames.filter(isNonPackageFile);
  logger.debug(`비패키지 파일: ${rootFiles.length}개 (전체 ${parsedConfig.fileNames.length}개 중)`);

  const tsBuildInfoFile = path.join(cwd, ".cache", "typecheck-root.tsbuildinfo");
  const options: ts.CompilerOptions = {
    ...parsedConfig.options,
    sourceMap: false,
    incremental: true,
    tsBuildInfoFile,
    noEmit: true,
    emitDeclarationOnly: false,
    declaration: false,
    declarationMap: false,
  };

  logger.debug("incremental 프로그램 생성 시작");
  const host = ts.createIncrementalCompilerHost(options);
  const program = ts.createIncrementalProgram({
    rootNames: rootFiles,
    options,
    host,
  });
  logger.debug("incremental 프로그램 생성 완료");

  logger.debug("emit 시작");
  program.emit();
  logger.debug("emit 완료");

  const allDiagnostics = [
    ...program.getConfigFileParsingDiagnostics(),
    ...program.getSyntacticDiagnostics(),
    ...program.getOptionsDiagnostics(),
    ...program.getGlobalDiagnostics(),
    ...program.getSemanticDiagnostics(),
  ];

  const filteredDiagnostics = allDiagnostics.filter(
    (d) => d.file == null || isNonPackageFile(d.file.fileName),
  );

  const serializedDiagnostics = filteredDiagnostics.map(serializeDiagnostic);
  const errorCount = filteredDiagnostics.filter(
    (d) => d.category === ts.DiagnosticCategory.Error,
  ).length;
  const warningCount = filteredDiagnostics.filter(
    (d) => d.category === ts.DiagnosticCategory.Warning,
  ).length;

  logger.debug(`비패키지 타입체크 완료 (에러: ${errorCount}, 경고: ${warningCount})`);
  return {
    success: errorCount === 0,
    errorCount,
    warningCount,
    diagnostics: serializedDiagnostics,
  };
}
