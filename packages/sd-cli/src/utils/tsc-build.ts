import path from "path";
import ts from "typescript";
import { err as errNs } from "@simplysm/core-common";
import { consola } from "consola";

const logger = consola.withTag("sd:cli:tsc-build");
import { pathx } from "@simplysm/core-node";
import {
  parseTsconfig,
  getPackageSourceFiles,
  getPackageFiles,
  getCompilerOptionsForEnv,
  type TypecheckEnv,
} from "./tsconfig";
import { serializeDiagnostic, type SerializedDiagnostic } from "./typecheck-serialization";
import { createOutputPathRewriter, addJsExtensionToImports } from "./output-path-rewriter";
import { isWorkspaceDiagnostic, formatDiagnosticError } from "./diagnostic-utils";

/**
 * Options for package-mode tsc build
 */
export interface TscPackageBuildOptions {
  pkgDir: string;
  cwd: string;
  /** Output control flags: which files to emit */
  output: { js: boolean; dts: boolean };
  /** Pre-parsed tsconfig. If provided, skips parseTsconfig() call. */
  parsedConfig?: ts.ParsedCommandLine;
  /** Typecheck environment. When set, adjusts compilerOptions via getCompilerOptionsForEnv(). */
  env?: TypecheckEnv;
  /** Include tests/ files in typecheck-only mode. Defaults to false. */
  includeTests?: boolean;
}

/**
 * Result of package-mode tsc build
 */
export interface TscPackageBuildResult {
  success: boolean;
  errors?: string[];
  diagnostics: SerializedDiagnostic[];
  errorCount: number;
  warningCount: number;
  /** ts.Program exposed for lint-with-program integration */
  program?: ts.Program;
  /** Files affected in this build (normalized forward-slash paths).
   *  Used for incremental lint in watch mode. */
  affectedFiles?: ReadonlySet<string>;
}

/**
 * Run TypeScript incremental build for a package.
 *
 * - output.js || output.dts: emit mode (src files only, generates output files)
 * - neither: typecheck only (src files only by default, src + test files when includeTests=true)
 *
 * Uses tsBuildInfoFile for incremental compilation across runs.
 */
export function runTscPackageBuild(options: TscPackageBuildOptions): TscPackageBuildResult {
  try {
    const { pkgDir, output, env } = options;
    const needsEmit = output.js || output.dts;
    const pkgName = path.basename(pkgDir);
    logger.debug(`[${pkgName}] tsc 빌드 시작 (env: ${env ?? "none"}, js: ${output.js}, dts: ${output.dts})`);

    const parsedConfig = options.parsedConfig ?? parseTsconfig(pkgDir);
    const baseOptions =
      env != null
        ? getCompilerOptionsForEnv(parsedConfig.options, env, pkgDir)
        : parsedConfig.options;

    let rootFiles: string[];

    if (needsEmit || !options.includeTests) {
      rootFiles = getPackageSourceFiles(pkgDir, parsedConfig);
    } else {
      rootFiles = getPackageFiles(pkgDir, parsedConfig);
    }
    logger.debug(`[${pkgName}] rootFiles: ${rootFiles.length}개`);

    const envSuffix = env != null ? `-${env}` : "";
    const tsBuildInfoFile = path.join(
      pkgDir,
      ".cache",
      needsEmit
        ? `build${output.dts ? "" : "-no-dts"}${envSuffix}.tsbuildinfo`
        : `typecheck${envSuffix}.tsbuildinfo`,
    );

    const compilerOptions: ts.CompilerOptions = {
      ...baseOptions,
      sourceMap: output.js,
      incremental: true,
      tsBuildInfoFile,
    };

    if (output.js && output.dts) {
      compilerOptions.noEmit = false;
      compilerOptions.emitDeclarationOnly = false;
      compilerOptions.declaration = true;
      compilerOptions.declarationMap = true;
      compilerOptions.outDir = path.join(pkgDir, "dist");
      compilerOptions.declarationDir = path.join(pkgDir, "dist");
    } else if (output.js) {
      compilerOptions.noEmit = false;
      compilerOptions.emitDeclarationOnly = false;
      compilerOptions.declaration = false;
      compilerOptions.declarationMap = false;
      compilerOptions.outDir = path.join(pkgDir, "dist");
    } else if (output.dts) {
      compilerOptions.noEmit = false;
      compilerOptions.emitDeclarationOnly = true;
      compilerOptions.declaration = true;
      compilerOptions.declarationMap = true;
      compilerOptions.outDir = path.join(pkgDir, "dist");
      compilerOptions.declarationDir = path.join(pkgDir, "dist");
    } else {
      compilerOptions.noEmit = true;
      compilerOptions.emitDeclarationOnly = false;
      compilerOptions.declaration = false;
      compilerOptions.declarationMap = false;
    }

    const host = ts.createIncrementalCompilerHost(compilerOptions);

    if (needsEmit) {
      const rewritePath = createOutputPathRewriter(pkgDir);
      const originalWriteFile = host.writeFile;
      host.writeFile = (fileName, content, writeByteOrderMark, onError, sourceFiles, data) => {
        const result = rewritePath(fileName, content);
        if (result != null) {
          let [newPath, newContent] = result;
          if (newPath.endsWith(".js")) {
            newContent = addJsExtensionToImports(newContent);
          }
          originalWriteFile(newPath, newContent, writeByteOrderMark, onError, sourceFiles, data);
        }
      };
    }

    const builderProgram = ts.createEmitAndSemanticDiagnosticsBuilderProgram(
      rootFiles,
      compilerOptions,
      host,
    );

    // Track affected files via builder program's incremental analysis.
    // getSemanticDiagnosticsOfNextAffectedFile iterates files that changed since the last build.
    // affected can be ts.SourceFile or ts.Program (when global scope changes).
    let affectedFiles: Set<string> | undefined = new Set<string>();

    while (true) {
      const result = builderProgram.getSemanticDiagnosticsOfNextAffectedFile();
      if (result == null) break;
      if ("fileName" in result.affected) {
        affectedFiles?.add(pathx.posix(result.affected.fileName));
      } else {
        // ts.Program returned — global change, treat as full rebuild
        affectedFiles = undefined;
      }
    }
    logger.debug(`[${pkgName}] affected files: ${affectedFiles != null ? `${affectedFiles.size}개` : "전체 (global change)"}`);

    const emitResult = builderProgram.emit();

    const allDiagnostics = [
      ...builderProgram.getConfigFileParsingDiagnostics(),
      ...builderProgram.getSyntacticDiagnostics(),
      ...builderProgram.getOptionsDiagnostics(),
      ...builderProgram.getGlobalDiagnostics(),
      ...builderProgram.getSemanticDiagnostics(),
      ...(!output.dts ? builderProgram.getProgram().getDeclarationDiagnostics() : []),
      ...emitResult.diagnostics,
    ];

    // Workspace scope: exclude node_modules, keep all workspace diagnostics
    const filteredDiagnostics = allDiagnostics.filter(
      (d) => isWorkspaceDiagnostic(d, options.cwd),
    );

    const serializedDiagnostics = filteredDiagnostics.map(serializeDiagnostic);
    const errorCount = filteredDiagnostics.filter(
      (d) => d.category === ts.DiagnosticCategory.Error,
    ).length;
    const warningCount = filteredDiagnostics.filter(
      (d) => d.category === ts.DiagnosticCategory.Warning,
    ).length;

    const errors = filteredDiagnostics
      .filter((d) => d.category === ts.DiagnosticCategory.Error)
      .map(formatDiagnosticError);

    logger.debug(`[${pkgName}] tsc 빌드 완료 (에러: ${errorCount}, 경고: ${warningCount})`);
    return {
      success: errorCount === 0,
      errors: errors.length > 0 ? errors : undefined,
      diagnostics: serializedDiagnostics,
      errorCount,
      warningCount,
      program: builderProgram.getProgram(),
      affectedFiles,
    };
  } catch (err) {
    const message = errNs.message(err);
    const stack = err instanceof Error ? err.stack : undefined;
    const pkgName = path.basename(options.pkgDir);
    logger.debug(`[${pkgName}] tsc 빌드 예외 발생: ${message}`);
    if (stack != null) {
      logger.debug(`[${pkgName}] 스택 트레이스:\n${stack}`);
    }
    return {
      success: false,
      errors: [message],
      diagnostics: [],
      errorCount: 1,
      warningCount: 0,
    };
  }
}
