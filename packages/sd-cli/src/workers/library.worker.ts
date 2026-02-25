import path from "path";
import esbuild from "esbuild";
import { createWorker, FsWatcher } from "@simplysm/core-node";
import { errorMessage } from "@simplysm/core-common";
import { consola } from "consola";
import type { SdBuildPackageConfig } from "../sd-config.types";
import {
  parseRootTsconfig,
  getPackageSourceFiles,
  getCompilerOptionsForPackage,
} from "../utils/tsconfig";
import {
  createLibraryEsbuildOptions,
  getTypecheckEnvFromTarget,
  writeChangedOutputFiles,
} from "../utils/esbuild-config";
import { registerCleanupHandlers, createOnceGuard } from "../utils/worker-utils";

//#region Types

/**
 * Library build info (for one-time build)
 */
export interface LibraryBuildInfo {
  name: string;
  config: SdBuildPackageConfig;
  cwd: string;
  pkgDir: string;
}

/**
 * Library build result
 */
export interface LibraryBuildResult {
  success: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Library watch info
 */
export interface LibraryWatchInfo {
  name: string;
  config: SdBuildPackageConfig;
  cwd: string;
  pkgDir: string;
}

/**
 * Build event
 */
export interface LibraryBuildEvent {
  success: boolean;
  errors?: string[];
  warnings?: string[];
}

/**
 * Error event
 */
export interface LibraryErrorEvent {
  message: string;
}

/**
 * Worker event types
 */
export interface LibraryWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: LibraryBuildEvent;
  error: LibraryErrorEvent;
}

//#endregion

//#region Resource Management

const logger = consola.withTag("sd:cli:library:worker");

/** esbuild build context (to be cleaned up) */
let esbuildContext: esbuild.BuildContext | undefined;

/** FsWatcher (to be cleaned up) */
let fsWatcher: FsWatcher | undefined;

/**
 * Clean up resources
 */
async function cleanup(): Promise<void> {
  // Capture global variables to temporary variables and initialize
  // (other calls can modify global variables while Promise.all is waiting)
  const contextToDispose = esbuildContext;
  esbuildContext = undefined;

  const watcherToClose = fsWatcher;
  fsWatcher = undefined;

  await Promise.all([contextToDispose?.dispose(), watcherToClose?.close()]);
}

// Clean up resources before process termination (SIGTERM/SIGINT)
// Note: worker.terminate() does not call these handlers and terminates immediately.
// However, normal shutdown in watch mode is handled via SIGINT/SIGTERM from the main process, so this is fine.
registerCleanupHandlers(cleanup, logger);

//#endregion

//#region Worker

/**
 * One-time build
 */
async function build(info: LibraryBuildInfo): Promise<LibraryBuildResult> {
  try {
    // Parse tsconfig
    const parsedConfig = parseRootTsconfig(info.cwd);
    const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);

    // Create compilerOptions per target
    const env = getTypecheckEnvFromTarget(info.config.target);
    const compilerOptions = await getCompilerOptionsForPackage(
      parsedConfig.options,
      env,
      info.pkgDir,
    );

    // One-time esbuild
    const esbuildOptions = createLibraryEsbuildOptions({
      pkgDir: info.pkgDir,
      entryPoints,
      target: info.config.target,
      compilerOptions,
    });

    const result = await esbuild.build(esbuildOptions);
    if (result.outputFiles) {
      await writeChangedOutputFiles(result.outputFiles);
    }
    const errors = result.errors.map((e) => e.text);
    const warnings = result.warnings.map((w) => w.text);
    return {
      success: result.errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err) {
    return {
      success: false,
      errors: [errorMessage(err)],
    };
  }
}

const guardStartWatch = createOnceGuard("startWatch");

/**
 * Create esbuild context and perform initial build
 */
async function createAndBuildContext(
  pkgDir: string,
  cwd: string,
  config: SdBuildPackageConfig,
  isFirstBuild: boolean,
  resolveFirstBuild?: () => void,
): Promise<esbuild.BuildContext> {
  // Parse tsconfig
  const parsedConfig = parseRootTsconfig(cwd);
  const entryPoints = getPackageSourceFiles(pkgDir, parsedConfig);

  // Create compilerOptions per target
  const env = getTypecheckEnvFromTarget(config.target);
  const compilerOptions = await getCompilerOptionsForPackage(parsedConfig.options, env, pkgDir);

  // Create esbuild options
  const baseOptions = createLibraryEsbuildOptions({
    pkgDir,
    entryPoints,
    target: config.target,
    compilerOptions,
  });

  let isBuildFirstTime = isFirstBuild;

  // Create context + add watch-notify plugin
  const context = await esbuild.context({
    ...baseOptions,
    plugins: [
      ...(baseOptions.plugins ?? []),
      {
        name: "watch-notify",
        setup(pluginBuild) {
          pluginBuild.onStart(() => {
            sender.send("buildStart", {});
          });

          pluginBuild.onEnd(async (result) => {
            // Write only changed files to disk
            if (result.outputFiles) {
              await writeChangedOutputFiles(result.outputFiles);
            }

            const errors = result.errors.map((e) => e.text);
            const warnings = result.warnings.map((w) => w.text);
            const success = result.errors.length === 0;

            sender.send("build", {
              success,
              errors: errors.length > 0 ? errors : undefined,
              warnings: warnings.length > 0 ? warnings : undefined,
            });

            if (isBuildFirstTime) {
              isBuildFirstTime = false;
              resolveFirstBuild?.();
            }
          });
        },
      },
    ],
  });

  // Initial build
  await context.rebuild();

  return context;
}

/**
 * Start watch
 * @remarks This function should be called only once per Worker.
 * @throws If watch has already been started
 */
async function startWatch(info: LibraryWatchInfo): Promise<void> {
  guardStartWatch();

  try {
    // Promise to wait for first build completion
    let resolveFirstBuild!: () => void;
    const firstBuildPromise = new Promise<void>((resolve) => {
      resolveFirstBuild = resolve;
    });

    // Create initial esbuild context and build
    esbuildContext = await createAndBuildContext(
      info.pkgDir,
      info.cwd,
      info.config,
      true,
      resolveFirstBuild,
    );

    // Wait for first build completion
    await firstBuildPromise;

    // Start FsWatcher (watch src/**/*.{ts,tsx})
    const srcPattern = path.join(info.pkgDir, "src", "**", "*.{ts,tsx}");
    fsWatcher = await FsWatcher.watch([srcPattern]);

    // Handle file changes
    fsWatcher.onChange({ delay: 300 }, async (changes) => {
      try {
        // Check if there are add or unlink events
        const hasAddOrUnlink = changes.some((c) => c.event === "add" || c.event === "unlink");

        if (hasAddOrUnlink) {
          // Entry points have changed, recreate context
          logger.debug("File add/remove detected, recreating context");

          const oldContext = esbuildContext;
          esbuildContext = await createAndBuildContext(info.pkgDir, info.cwd, info.config, false);

          if (oldContext != null) {
            await oldContext.dispose();
          }
        } else {
          // Only file content changed (change event)
          if (esbuildContext != null) {
            await esbuildContext.rebuild();
          }
        }
      } catch (err) {
        sender.send("error", {
          message: errorMessage(err),
        });
      }
    });
  } catch (err) {
    sender.send("error", {
      message: errorMessage(err),
    });
  }
}

/**
 * Stop watch
 * @remarks Cleans up esbuild context.
 */
async function stopWatch(): Promise<void> {
  await cleanup();
}

const sender = createWorker<
  { build: typeof build; startWatch: typeof startWatch; stopWatch: typeof stopWatch },
  LibraryWorkerEvents
>({
  build,
  startWatch,
  stopWatch,
});

export default sender;

//#endregion
