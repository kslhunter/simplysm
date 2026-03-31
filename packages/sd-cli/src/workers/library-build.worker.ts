import type ts from "typescript";
import { createWorker, FsWatcher, pathx } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import { consola } from "consola";
import type { SdBuildPackageConfig } from "../sd-config.types";
import type { BuildOutput } from "../engines/types";
import type { SerializedDiagnostic } from "../utils/typecheck-serialization";
import type { LintWithProgramResult } from "../utils/lint-with-program";
import { runTscPackageBuild } from "../utils/tsc-build";
import { LintWithProgramRunner } from "../utils/lint-with-program";
import { collectDeps } from "../utils/package-utils";
import { registerCleanupHandlers, createOnceGuard, applyDebugLevel } from "../utils/worker-utils";

applyDebugLevel();

//#region Types

export interface LibraryBuildInfo {
  name: string;
  config: SdBuildPackageConfig;
  cwd: string;
  pkgDir: string;
  output: BuildOutput;
  /** replaceDeps configuration from sd.config.ts */
  replaceDeps?: Record<string, string>;
}

export interface LibraryBuildResult {
  build: { success: boolean; errors?: string[]; warnings?: string[]; diagnostics: SerializedDiagnostic[] };
  lint?: LintWithProgramResult;
}

export interface CombinedBuildEvent {
  build: { success: boolean; errors?: string[]; warnings?: string[] };
  lint?: LintWithProgramResult;
}

export interface LibraryBuildWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: CombinedBuildEvent;
  error: { message: string };
}

//#endregion

//#region Resource Management

const logger = consola.withTag("sd:cli:library-build:worker");

let fsWatcher: FsWatcher | undefined;

async function cleanup(): Promise<void> {
  const watcherToClose = fsWatcher;
  fsWatcher = undefined;
  lastSourceFilePaths = undefined;
  await watcherToClose?.close();
}

registerCleanupHandlers(cleanup, logger);

//#endregion

//#region build (one-time build)

async function build(info: LibraryBuildInfo): Promise<LibraryBuildResult> {
  logger.debug(`[${info.name}] library worker build 시작 (pkgDir: ${info.pkgDir})`);
  const tscResult = runTscPackageBuild({
    pkgDir: info.pkgDir,
    cwd: info.cwd,
    output: info.output,
    env: info.output.env,
    includeTests: info.output.includeTests,
  });
  logger.debug(`[${info.name}] library worker build 완료 (success: ${tscResult.success})`);

  // Run lint if enabled and program is available
  let lint: LintWithProgramResult | undefined;
  if (info.output.lint === true && tscResult.program != null) {
    logger.debug(`[${info.name}] lint 시작`);
    const lintRunner = new LintWithProgramRunner({
      cwd: info.cwd,
      pkgName: info.name,
    });
    lint = await lintRunner.lint({ program: tscResult.program });
    logger.debug(`[${info.name}] lint 완료`);
  }

  return {
    build: {
      success: tscResult.success,
      errors: tscResult.errors,
      warnings: undefined,
      diagnostics: tscResult.diagnostics,
    },
    lint,
  };
}

//#endregion

//#region startWatch (watch mode)

const guardStartWatch = createOnceGuard("startWatch");

// Mutable state for watch mode
let watchInfo: LibraryBuildInfo | undefined;
let watchLintRunner: LintWithProgramRunner | undefined;
let lastSourceFilePaths: Set<string> | undefined;

function extractSourceFilePaths(program: ts.Program | undefined): Set<string> | undefined {
  if (program == null) return undefined;
  const paths = new Set<string>();
  for (const sf of program.getSourceFiles()) {
    paths.add(pathx.posix(sf.fileName));
  }
  return paths;
}

async function rebuildAll(): Promise<CombinedBuildEvent> {
  const info = watchInfo!;
  logger.debug(`[${info.name}] rebuildAll 시작`);

  const tscResult = runTscPackageBuild({
    pkgDir: info.pkgDir,
    cwd: info.cwd,
    output: info.output,
    env: info.output.env,
    includeTests: info.output.includeTests,
  });

  // Update source file paths for dependency filtering
  lastSourceFilePaths = extractSourceFilePaths(tscResult.program) ?? lastSourceFilePaths;

  // Run lint if enabled and program is available
  let lint: LintWithProgramResult | undefined;
  if (info.output.lint === true && tscResult.program != null) {
    logger.debug(`[${info.name}] lint 시작`);
    if (watchLintRunner == null) {
      watchLintRunner = new LintWithProgramRunner({
        cwd: info.cwd,
        pkgName: info.name,
      });
    }
    lint = await watchLintRunner.lint({
      program: tscResult.program,
      affectedFiles: tscResult.affectedFiles,
    });
    logger.debug(`[${info.name}] lint 완료`);
  }

  logger.debug(`[${info.name}] rebuildAll 완료`);
  return {
    build: { success: tscResult.success, errors: tscResult.errors },
    lint,
  };
}

async function startWatch(info: LibraryBuildInfo): Promise<void> {
  guardStartWatch();
  watchInfo = info;

  try {
    // Initial build
    const initialResult = await rebuildAll();
    sender.send("build", initialResult);

    // Collect workspace dependency paths + replaceDeps
    const { workspaceDeps, replaceDeps } = collectDeps(info.pkgDir, info.cwd, info.replaceDeps);

    // Start FsWatcher — own src/ + workspace deps' src/ + replaceDeps dist/
    logger.debug(`[${info.name}] FsWatcher 시작`);
    const watchPaths = [
      pathx.posixResolve(info.pkgDir, "src", "**", "*.ts"),
      ...workspaceDeps.map((d) => pathx.posixResolve(info.cwd, "packages", d, "src", "**", "*.ts")),
      ...replaceDeps.flatMap((pkg) => [
        pathx.posixResolve(info.cwd, "node_modules", ...pkg.split("/"), "dist", "**", "*.{js,mjs,cjs}"),
        pathx.posixResolve(info.pkgDir, "node_modules", ...pkg.split("/"), "dist", "**", "*.{js,mjs,cjs}"),
      ]),
    ];
    fsWatcher = await FsWatcher.watch(watchPaths);

    fsWatcher.onChange({ delay: 300 }, async (changes) => {
      try {
        const hasFileAddOrRemove = changes.some(
          (c) => c.event === "add" || c.event === "unlink",
        );

        if (!hasFileAddOrRemove && lastSourceFilePaths != null) {
          const hasRelevantChange = changes.some((c) =>
            lastSourceFilePaths!.has(c.path),
          );
          if (!hasRelevantChange) {
            logger.debug("변경된 파일이 빌드에 포함되지 않아 리빌드 건너뜀");
            return;
          }
        }

        sender.send("buildStart", {});
        const result = await rebuildAll();
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
  LibraryBuildWorkerEvents
>({
  build,
  startWatch,
  stopWatch,
});

export default sender;
