import path from "path";
import ts from "typescript";
import { createWorker, pathIsChildPath, pathNorm } from "@simplysm/core-node";
import { errorMessage } from "@simplysm/core-common";
import { consola } from "consola";
import {
  getCompilerOptionsForPackage,
  getPackageFiles,
  getPackageSourceFiles,
  parseRootTsconfig,
  type TypecheckEnv,
} from "../utils/tsconfig";
import { serializeDiagnostic, type SerializedDiagnostic } from "../utils/typecheck-serialization";
import { createOnceGuard } from "../utils/worker-utils";

//#region Types

/**
 * DTS watch start info
 */
export interface DtsWatchInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  env: TypecheckEnv;
}

/**
 * DTS one-time build info
 */
export interface DtsBuildInfo {
  name: string;
  cwd: string;
  /** Package directory. If unspecified, non-package mode (typecheck all except packages/) */
  pkgDir?: string;
  /** Typecheck environment. Used together with pkgDir */
  env?: TypecheckEnv;
  /** true to generate .d.ts + typecheck, false to typecheck only (default: true) */
  emit?: boolean;
}

/**
 * DTS one-time build result
 */
export interface DtsBuildResult {
  success: boolean;
  errors?: string[];
  diagnostics: SerializedDiagnostic[];
  errorCount: number;
  warningCount: number;
}

/**
 * Build event
 */
export interface DtsBuildEvent {
  success: boolean;
  errors?: string[];
}

/**
 * Error event
 */
export interface DtsErrorEvent {
  message: string;
}

/**
 * Worker event types
 */
export interface DtsWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: DtsBuildEvent;
  error: DtsErrorEvent;
}

//#endregion

//#region Resource Management

const logger = consola.withTag("sd:cli:dts:worker");

/** tsc watch program (to be cleaned up) */
let tscWatchProgram:
  | ts.WatchOfFilesAndCompilerOptions<ts.EmitAndSemanticDiagnosticsBuilderProgram>
  | undefined;

/**
 * Clean up resources
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
    logger.error("Cleanup failed", err);
  }
  process.exit(0);
});

process.on("SIGINT", () => {
  try {
    cleanup();
  } catch (err) {
    logger.error("Cleanup failed", err);
  }
  process.exit(0);
});

//#endregion

//#region DTS Output Path Rewriting

/**
 * Adjust sources path in .d.ts.map file to new location
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
 * Create path rewriter function for DTS writeFile
 *
 * TypeScript includes other package sources referenced via path alias (@simplysm/*)
 * in rootDir calculation, so output is generated as nested structure dist/{pkgName}/src/...
 * The returned function rewrites only this package's .d.ts to flat structure (dist/...)
 * and ignores .d.ts from other packages.
 *
 * @returns (fileName, content) => [newPath, newContent] | null (null to skip writing)
 */
function createDtsPathRewriter(
  pkgDir: string,
): (fileName: string, content: string) => [string, string] | null {
  const pkgName = path.basename(pkgDir);
  const distDir = pathNorm(path.join(pkgDir, "dist"));
  const distPrefix = distDir + path.sep;
  // Nested structure prefix for this package: dist/{pkgName}/src/
  const ownNestedPrefix = pathNorm(path.join(distDir, pkgName, "src")) + path.sep;

  return (fileName, content) => {
    fileName = pathNorm(fileName);

    if (!fileName.startsWith(distPrefix)) return null;

    if (fileName.startsWith(ownNestedPrefix)) {
      // Rewrite nested path to flat: dist/{pkgName}/src/... → dist/...
      const flatPath = path.join(distDir, fileName.slice(ownNestedPrefix.length));
      if (fileName.endsWith(".d.ts.map")) {
        content = adjustDtsMapSources(content, path.dirname(fileName), path.dirname(flatPath));
      }
      return [flatPath, content];
    }

    // Nested output from other packages (dist/{otherPkg}/src/...) → ignore
    const relFromDist = fileName.slice(distPrefix.length);
    const segments = relFromDist.split(path.sep);
    if (segments.length >= 3 && segments[1] === "src") {
      return null;
    }

    // Already flat structure (package with no dependencies) → output as is
    return [fileName, content];
  };
}

//#endregion

//#region build (one-time build)

/**
 * DTS one-time build (typecheck + dts generation)
 */
async function build(info: DtsBuildInfo): Promise<DtsBuildResult> {
  try {
    const parsedConfig = parseRootTsconfig(info.cwd);

    let rootFiles: string[];
    let baseOptions: ts.CompilerOptions;
    let diagnosticFilter: (d: ts.Diagnostic) => boolean;
    let tsBuildInfoFile: string;

    if (info.pkgDir != null && info.env != null) {
      // Package mode
      baseOptions = await getCompilerOptionsForPackage(parsedConfig.options, info.env, info.pkgDir);

      const shouldEmit = info.emit !== false;
      if (shouldEmit) {
        // Emit mode: only src (generate d.ts)
        rootFiles = getPackageSourceFiles(info.pkgDir, parsedConfig);
        const pkgSrcDir = path.join(info.pkgDir, "src");
        diagnosticFilter = (d) => d.file == null || pathIsChildPath(d.file.fileName, pkgSrcDir);
      } else {
        // Typecheck mode: all package files (src + tests)
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
      // Non-package mode: root project files + package root config files typecheck
      const packagesDir = path.join(info.cwd, "packages");
      const isNonPackageFile = (fileName: string): boolean => {
        if (!pathIsChildPath(fileName, packagesDir)) return true;
        // Include files directly in package root (config files): packages/{pkg}/file.ts
        const relative = path.relative(packagesDir, fileName);
        return relative.split(path.sep).length === 2;
      };
      rootFiles = parsedConfig.fileNames.filter(isNonPackageFile);
      baseOptions = parsedConfig.options;
      diagnosticFilter = (d) => d.file == null || isNonPackageFile(d.file.fileName);
      tsBuildInfoFile = path.join(info.cwd, ".cache", "typecheck-root.tsbuildinfo");
    }

    // Determine emit (default: true)
    const shouldEmit = info.emit !== false;

    const options: ts.CompilerOptions = {
      ...baseOptions,
      sourceMap: false,
      incremental: true,
      tsBuildInfoFile,
    };

    // Set related options based on emit
    if (shouldEmit && info.pkgDir != null) {
      // Generate dts + typecheck (package mode only)
      options.noEmit = false;
      options.emitDeclarationOnly = true;
      options.declaration = true;
      options.declarationMap = true;
      options.outDir = path.join(info.pkgDir, "dist");
      options.declarationDir = path.join(info.pkgDir, "dist");
    } else {
      // Typecheck only (no dts generation)
      options.noEmit = true;
      options.emitDeclarationOnly = false;
      options.declaration = false;
      options.declarationMap = false;
      // outDir/declarationDir not needed when not emitting
    }

    // Create incremental program
    const host = ts.createIncrementalCompilerHost(options);

    // Output only this package's .d.ts in flat path (prevent other packages' .d.ts generation + rewrite nested paths)
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

    // Emit (must call even with noEmit to collect diagnostics)
    const emitResult = program.emit();

    // Collect diagnostics
    const allDiagnostics = [
      ...program.getConfigFileParsingDiagnostics(),
      ...program.getSyntacticDiagnostics(),
      ...program.getOptionsDiagnostics(),
      ...program.getGlobalDiagnostics(),
      ...program.getSemanticDiagnostics(),
      ...emitResult.diagnostics,
    ];

    // Collect errors only from this package's src folder (ignore other packages' errors)
    const filteredDiagnostics = allDiagnostics.filter(diagnosticFilter);

    const serializedDiagnostics = filteredDiagnostics.map(serializeDiagnostic);
    const errorCount = filteredDiagnostics.filter(
      (d) => d.category === ts.DiagnosticCategory.Error,
    ).length;
    const warningCount = filteredDiagnostics.filter(
      (d) => d.category === ts.DiagnosticCategory.Warning,
    ).length;

    // Error message string array (for backward compatibility)
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
      errors: [errorMessage(err)],
      diagnostics: [],
      errorCount: 1,
      warningCount: 0,
    };
  }
}

//#endregion

//#region startWatch (watch mode)

const guardStartWatch = createOnceGuard("startWatch");

/**
 * Start DTS watch
 * @remarks This function should be called only once per Worker.
 * @throws If watch has already been started
 */
async function startWatch(info: DtsWatchInfo): Promise<void> {
  guardStartWatch();

  try {
    const parsedConfig = parseRootTsconfig(info.cwd);
    const rootFiles = getPackageSourceFiles(info.pkgDir, parsedConfig);
    const baseOptions = await getCompilerOptionsForPackage(
      parsedConfig.options,
      info.env,
      info.pkgDir,
    );

    // This package path (for filtering)
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
        // Collect errors only from this package's src folder (ignore other packages' errors)
        if (diagnostic.file != null && !pathIsChildPath(diagnostic.file.fileName, pkgSrcDir)) {
          return;
        }

        const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");

        // Include file location info if available (absolute path:line:column format - supports IDE links)
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

    // Output only this package's .d.ts in flat path (prevent other packages' .d.ts generation + rewrite nested paths)
    // TypeScript watch mode attempts to generate .d.ts for all imported modules.
    // In a monorepo, we prevent overwriting .d.ts from other packages and
    // rewrite nested paths (dist/{pkgName}/src/...) to flat paths (dist/...).
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
      () => {}, // watchStatusReporter - not used
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
      message: errorMessage(err),
    });
  }
}

const sender = createWorker<
  { startWatch: typeof startWatch; build: typeof build },
  DtsWorkerEvents
>({
  startWatch,
  build,
});

export default sender;

//#endregion
