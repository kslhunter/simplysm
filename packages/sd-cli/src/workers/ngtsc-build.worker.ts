import path from "path";
import ts from "typescript";
import { createWorker, FsWatcher } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import { consola } from "consola";
import { registerCleanupHandlers, createOnceGuard, applyDebugLevel } from "../utils/worker-utils";
import {
  runNgtscBuild,
  buildCompilerOptions,
  buildScssLoadPaths,
  createLibraryTransformStylesheet,
  writeEmitResults,
  compileSideEffectScss,
  compileGlobalScss,
  type NgtscBuildInfo,
  type NgtscBuildResult,
  type NgtscCombinedBuildEvent,
  type SideEffectScssEntry,
} from "../utils/ngtsc-build-core";
import { isWorkspaceDiagnostic, formatDiagnosticError } from "../utils/diagnostic-utils";
import { LintWithProgramRunner, type LintWithProgramResult } from "../utils/lint-with-program";
import {
  parseTsconfig,
  getPackageSourceFiles,
  getCompilerOptionsForEnv,
} from "../utils/tsconfig";
import { AngularCompiler, AngularSourceFileCache } from "../utils/angular-compiler";
import { collectDeps } from "../utils/package-utils";

applyDebugLevel();

//#region Types (re-export for worker interface)

export type { NgtscBuildInfo, NgtscBuildResult, NgtscCombinedBuildEvent };

export interface NgtscBuildWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: NgtscCombinedBuildEvent;
  error: { message: string };
}

//#endregion

//#region Resource Management

const logger = consola.withTag("sd:cli:ngtsc-build:worker");

let fsWatcher: FsWatcher | undefined;

async function cleanup(): Promise<void> {
  const watcherToClose = fsWatcher;
  fsWatcher = undefined;

  if (watcherToClose != null) {
    await watcherToClose.close();
  }
}

registerCleanupHandlers(cleanup, logger);

//#endregion

//#region build (one-time build)

async function build(info: NgtscBuildInfo): Promise<NgtscBuildResult> {
  logger.debug(`[${info.name}] ngtsc worker build 시작 (pkgDir: ${info.pkgDir})`);
  const { program, ...result } = await runNgtscBuild({ ...info, env: info.output.env });
  logger.debug(`[${info.name}] ngtsc worker build 완료 (dts.success: ${result.dts.success})`);

  // Run lint if enabled and program is available
  if (info.output.lint === true && program != null) {
    const lintRunner = new LintWithProgramRunner({
      cwd: info.cwd,
      pkgName: info.name,
    });
    result.lint = await lintRunner.lint({ program });
  }

  return result;
}

//#endregion

//#region startWatch (watch mode)

const guardStartWatch = createOnceGuard("startWatch");

let watchInfo: NgtscBuildInfo | undefined;
let currentScssDependencies: Map<string, Set<string>> | undefined;
let watchLintRunner: LintWithProgramRunner | undefined;
const sideEffectScssRegistry = new Map<string, SideEffectScssEntry>();

/**
 * Perform a watch build (initial or incremental) using AngularCompiler.
 * Returns NgtscCombinedBuildEvent for sending to the engine.
 *
 * @param affectedFileNames - When provided (watch rebuild), only these files are linted.
 *   When undefined (initial build), all workspace files are linted.
 */
async function performWatchBuild(
  info: NgtscBuildInfo,
  compiler: AngularCompiler,
  scssDependencies: Map<string, Set<string>>,
  scssErrors: string[],
  affectedFileNames?: ReadonlySet<string>,
  hasScssChanges = true,
): Promise<NgtscCombinedBuildEvent> {
  const pkgSrcDir = path.join(info.pkgDir, "src");
  const normalizedSrcDir = pkgSrcDir.replace(/\\/g, "/");

  // Collect diagnostics — workspace scope (no package-level filtering)
  const allDiagnostics = [...compiler.collectDiagnostics()].filter(
    (d) => isWorkspaceDiagnostic(d, info.cwd),
  );

  const errorCount = allDiagnostics.filter(
    (d) => d.category === ts.DiagnosticCategory.Error,
  ).length;
  const errors = allDiagnostics
    .filter((d) => d.category === ts.DiagnosticCategory.Error)
    .map(formatDiagnosticError);

  // Emit via AngularCompiler + output-path-rewriting
  const loadPaths = buildScssLoadPaths(info);
  const emitResults = compiler.emitAffectedFiles({
    sourceFilter: (fileName: string) =>
      fileName.replace(/\\/g, "/").startsWith(normalizedSrcDir + "/"),
  });
  writeEmitResults(emitResults, info.pkgDir, {
    loadPaths,
    scssErrors,
    scssDependencies,
    registry: sideEffectScssRegistry,
  });

  // Side-effect SCSS compilation (skip when no .scss/.css files changed)
  if (hasScssChanges) {
    compileSideEffectScss(sideEffectScssRegistry, loadPaths, scssErrors, scssDependencies);
  }

  // Global SCSS compilation
  const globalScssErrors = compileGlobalScss(info.pkgDir, loadPaths);

  const allErrors = [...errors, ...scssErrors, ...globalScssErrors];

  // Run lint if enabled
  let lint: LintWithProgramResult | undefined;
  if (info.output.lint === true) {
    if (watchLintRunner == null) {
      watchLintRunner = new LintWithProgramRunner({
        cwd: info.cwd,
        pkgName: info.name,
      });
    }
    lint = await watchLintRunner.lint({
      program: compiler.getTsProgram(),
      affectedFiles: affectedFileNames,
    });
  }

  return {
    js: { success: true },
    dts: {
      success: errorCount === 0 && scssErrors.length === 0 && globalScssErrors.length === 0,
      errors: allErrors.length > 0 ? allErrors : undefined,
    },
    lint,
  };
}

async function startWatch(info: NgtscBuildInfo): Promise<void> {
  guardStartWatch();
  watchInfo = { ...info, env: info.output.env };

  try {
    // Parse tsconfig and prepare compiler options
    const parsedConfig = parseTsconfig(watchInfo.pkgDir);
    const sourceFiles = getPackageSourceFiles(watchInfo.pkgDir, parsedConfig);
    const baseOptions =
      watchInfo.env != null
        ? getCompilerOptionsForEnv(parsedConfig.options, watchInfo.env, watchInfo.pkgDir)
        : parsedConfig.options;
    const compilerOptions = buildCompilerOptions(baseOptions, watchInfo.pkgDir, watchInfo.output);

    // Read angularCompilerOptions from root tsconfig
    const rootTsconfigPath = path.join(watchInfo.cwd, "tsconfig.json");
    const rootRawConfig = ts.readConfigFile(rootTsconfigPath, ts.sys.readFile);
    const angularOptions = rootRawConfig.config?.angularCompilerOptions ?? {};

    // SCSS closure variables
    const scssErrors: string[] = [];
    const scssDependencies = new Map<string, Set<string>>();
    const loadPaths = buildScssLoadPaths(watchInfo);
    currentScssDependencies = scssDependencies;

    // Create AngularSourceFileCache + AngularCompiler
    const sourceFileCache = new AngularSourceFileCache();
    const compiler = new AngularCompiler({
      rootNames: sourceFiles,
      compilerOptions,
      angularCompilerOptions: angularOptions,
      sourceFileCache,
      transformStylesheet: createLibraryTransformStylesheet(loadPaths, scssErrors, scssDependencies),
    });
    // Initial build
    await compiler.initialize();
    const initialResult = await performWatchBuild(watchInfo, compiler, scssDependencies, scssErrors);
    sender.send("build", initialResult);

    // Collect workspace dependency paths + replaceDeps
    const { workspaceDeps, replaceDeps } = collectDeps(
      watchInfo.pkgDir,
      watchInfo.cwd,
      watchInfo.replaceDeps,
    );

    // Start FsWatcher
    const watchPaths = [
      path.join(watchInfo.pkgDir, "src", "**", "*.{ts,scss,css}"),
      path.join(watchInfo.pkgDir, "scss", "**", "*.{scss,css}"),
      ...workspaceDeps.flatMap((d) => {
        const depDir = path.join(watchInfo!.cwd, "packages", d);
        return [
          path.join(depDir, "src", "**", "*.{ts,scss,css}"),
          path.join(depDir, "scss", "**", "*.{scss,css}"),
        ];
      }),
      ...replaceDeps.flatMap((pkg) => [
        path.join(watchInfo!.cwd, "node_modules", ...pkg.split("/"), "dist", "**", "*.{js,mjs,cjs}"),
        path.join(watchInfo!.pkgDir, "node_modules", ...pkg.split("/"), "dist", "**", "*.{js,mjs,cjs}"),
      ]),
    ];
    fsWatcher = await FsWatcher.watch(watchPaths);

    fsWatcher.onChange({ delay: 300 }, async (changedFiles) => {
      try {
        sender.send("buildStart", {});

        // Collect modified files (all changed + SCSS dependency reverse-lookup)
        const modifiedFiles = new Set<string>();
        for (const f of changedFiles) {
          modifiedFiles.add(f.path);

          // SCSS dependency reverse-lookup
          if (
            (f.path.endsWith(".scss") || f.path.endsWith(".css")) &&
            currentScssDependencies != null
          ) {
            for (const [containingFile, deps] of currentScssDependencies) {
              if (deps.has(f.path)) {
                modifiedFiles.add(containingFile);
              }
            }
          }
        }

        // Clear SCSS errors for fresh rebuild
        scssErrors.length = 0;
        scssDependencies.clear();

        // Incremental rebuild via AngularCompiler.update()
        const updateResult = await compiler.update(modifiedFiles);

        // Convert affected ts.SourceFile set to file name strings for incremental lint
        const affectedFileNames = new Set<string>();
        for (const sf of updateResult.affectedFiles) {
          affectedFileNames.add(sf.fileName.replace(/\\/g, "/"));
        }

        const hasScssChanges = changedFiles.some(
          (f) => f.path.endsWith(".scss") || f.path.endsWith(".css"),
        );

        const result = await performWatchBuild(watchInfo!, compiler, scssDependencies, scssErrors, affectedFileNames, hasScssChanges);
        sender.send("build", result);
      } catch (err) {
        sender.send("error", { message: errNs.message(err) });
      }
    });
  } catch (err) {
    sender.send("error", { message: errNs.message(err) });
  }
}

async function stopWatch(): Promise<void> {
  await cleanup();
}

//#endregion

const sender = createWorker<
  { build: typeof build; startWatch: typeof startWatch; stopWatch: typeof stopWatch },
  NgtscBuildWorkerEvents
>({
  build,
  startWatch,
  stopWatch,
});

export default sender;
