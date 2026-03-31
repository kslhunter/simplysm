import path from "path";
import ts from "typescript";
import { consola } from "consola";
import { pathx } from "@simplysm/core-node";
import { parseTsconfig } from "./tsconfig";
import { serializeDiagnostic, type SerializedDiagnostic } from "./typecheck-serialization";

const logger = consola.withTag("sd:cli:typecheck-non-pkg");

export interface NonPackageTypecheckResult {
  success: boolean;
  errorCount: number;
  warningCount: number;
  diagnostics: SerializedDiagnostic[];
}

/**
 * Typecheck non-package files (root-level configs + package root configs).
 * Extracted from dts.worker.ts non-package mode.
 *
 * Non-package files include:
 * - Root-level files (vitest.config.ts, etc.) — not under packages/
 * - Package root config files (packages/{pkg}/vitest.config.ts) — depth 2 under packages/
 * Excludes package source files (packages/{pkg}/src/...)
 */
export function typecheckNonPackageFiles(cwd: string): NonPackageTypecheckResult {
  logger.debug("비패키지 파일 타입체크 시작");
  const parsedConfig = parseTsconfig(cwd);
  const packagesDir = path.join(cwd, "packages");

  const isNonPackageFile = (fileName: string): boolean => {
    const normalized = pathx.posixResolve(fileName);
    const normalizedPkgDir = pathx.posixResolve(packagesDir);

    // Files outside packages/ directory
    if (!normalized.startsWith(normalizedPkgDir + "/")) return true;

    // Files directly in package root (e.g., packages/{pkg}/file.ts — depth 2)
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
