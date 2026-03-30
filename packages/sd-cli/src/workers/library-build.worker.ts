import path from "path";
import { createWorker, FsWatcher } from "@simplysm/core-node";
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
  js: { success: boolean; errors?: string[]; warnings?: string[] };
  dts: { success: boolean; errors?: string[]; diagnostics: SerializedDiagnostic[] };
  lint?: LintWithProgramResult;
}

export interface CombinedBuildEvent {
  js: { success: boolean; errors?: string[]; warnings?: string[] };
  dts: { success: boolean; errors?: string[] };
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
  });
  logger.debug(`[${info.name}] library worker build 완료 (success: ${tscResult.success})`);

  // Run lint if enabled and program is available
  let lint: LintWithProgramResult | undefined;
  if (info.output.lint === true && tscResult.program != null) {
    const lintRunner = new LintWithProgramRunner({
      cwd: info.cwd,
      pkgName: info.name,
    });
    lint = await lintRunner.lint({ program: tscResult.program });
  }

  return {
    js: {
      success: tscResult.success,
      errors: tscResult.errors,
      warnings: undefined,
    },
    dts: {
      success: tscResult.success,
      errors: tscResult.errors,
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

async function rebuildAll(): Promise<CombinedBuildEvent> {
  const info = watchInfo!;

  const tscResult = runTscPackageBuild({
    pkgDir: info.pkgDir,
    cwd: info.cwd,
    output: info.output,
    env: info.output.env,
  });

  // Run lint if enabled and program is available
  let lint: LintWithProgramResult | undefined;
  if (info.output.lint === true && tscResult.program != null) {
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
  }

  return {
    js: { success: tscResult.success, errors: tscResult.errors },
    dts: { success: tscResult.success, errors: tscResult.errors },
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
    const watchPaths = [
      path.join(info.pkgDir, "src", "**", "*.ts"),
      ...workspaceDeps.map((d) => path.join(info.cwd, "packages", d, "src", "**", "*.ts")),
      ...replaceDeps.flatMap((pkg) => [
        path.join(info.cwd, "node_modules", ...pkg.split("/"), "dist", "**", "*.{js,mjs,cjs}"),
        path.join(info.pkgDir, "node_modules", ...pkg.split("/"), "dist", "**", "*.{js,mjs,cjs}"),
      ]),
    ];
    fsWatcher = await FsWatcher.watch(watchPaths);

    fsWatcher.onChange({ delay: 300 }, async () => {
      try {
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
