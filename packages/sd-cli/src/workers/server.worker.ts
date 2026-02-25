import path from "path";
import fs from "fs";
import { execaSync } from "execa";
import esbuild from "esbuild";
import { createWorker, FsWatcher, pathNorm } from "@simplysm/core-node";
import { errorMessage } from "@simplysm/core-common";
import { consola } from "consola";
import {
  parseRootTsconfig,
  getPackageSourceFiles,
  getCompilerOptionsForPackage,
} from "../utils/tsconfig";
import {
  createServerEsbuildOptions,
  collectUninstalledOptionalPeerDeps,
  collectNativeModuleExternals,
  writeChangedOutputFiles,
} from "../utils/esbuild-config";
import { registerCleanupHandlers, createOnceGuard } from "../utils/worker-utils";
import { collectDeps } from "../utils/package-utils";
import { copyPublicFiles, watchPublicFiles } from "../utils/copy-public";

//#region Types

/**
 * Server build information (for one-time build)
 */
export interface ServerBuildInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  /** Environment variables to substitute during build */
  env?: Record<string, string>;
  /** Runtime configuration (recorded in dist/.config.json) */
  configs?: Record<string, unknown>;
  /** External modules manually specified in sd.config.ts */
  externals?: string[];
  /** PM2 configuration (generates dist/pm2.config.cjs when specified) */
  pm2?: {
    name?: string;
    ignoreWatchPaths?: string[];
  };
  /** Package manager to use (affects mise.toml or volta settings generation) */
  packageManager?: "volta" | "mise";
}

/**
 * Server build result
 */
export interface ServerBuildResult {
  success: boolean;
  mainJsPath: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * Server watch information
 */
export interface ServerWatchInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  /** Environment variables to substitute during build */
  env?: Record<string, string>;
  /** Runtime configuration (recorded in dist/.config.json) */
  configs?: Record<string, unknown>;
  /** External modules manually specified in sd.config.ts */
  externals?: string[];
  /** replaceDeps configuration from sd.config.ts */
  replaceDeps?: Record<string, string>;
}

/**
 * Build event
 */
export interface ServerBuildEvent {
  success: boolean;
  mainJsPath: string;
  errors?: string[];
  warnings?: string[];
}

/**
 * Error event
 */
export interface ServerErrorEvent {
  message: string;
}

/**
 * Worker event types
 */
export interface ServerWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: ServerBuildEvent;
  error: ServerErrorEvent;
}

//#endregion

//#region Resource Management

const logger = consola.withTag("sd:cli:server:worker");

/** esbuild build context (to be cleaned up) */
let esbuildContext: esbuild.BuildContext | undefined;

/** Last build metafile (for filtering changed files on rebuild) */
let lastMetafile: esbuild.Metafile | undefined;

/** Public files watcher (to be cleaned up) */
let publicWatcher: FsWatcher | undefined;

/** Source + scope packages watcher (to be cleaned up) */
let srcWatcher: FsWatcher | undefined;

/**
 * Clean up resources
 */
async function cleanup(): Promise<void> {
  // Capture global variables to temporary variables and initialize
  // (other calls can modify global variables while Promise.all is waiting)
  const contextToDispose = esbuildContext;
  esbuildContext = undefined;
  lastMetafile = undefined;

  const watcherToClose = publicWatcher;
  publicWatcher = undefined;

  const srcWatcherToClose = srcWatcher;
  srcWatcher = undefined;

  if (contextToDispose != null) {
    await contextToDispose.dispose();
  }

  if (watcherToClose != null) {
    await watcherToClose.close();
  }

  if (srcWatcherToClose != null) {
    await srcWatcherToClose.close();
  }
}

/**
 * Collect external modules from three sources and merge them.
 * 1. Uninstalled optional peer dependencies
 * 2. Native modules from binding.gyp
 * 3. Manually specified in sd.config.ts
 */
function collectAllExternals(pkgDir: string, manualExternals?: string[]): string[] {
  const optionalPeerDeps = collectUninstalledOptionalPeerDeps(pkgDir);
  const nativeModules = collectNativeModuleExternals(pkgDir);
  const manual = manualExternals ?? [];

  const merged = [...new Set([...optionalPeerDeps, ...nativeModules, ...manual])];

  if (optionalPeerDeps.length > 0) {
    logger.debug("Uninstalled optional peer deps (external):", optionalPeerDeps);
  }
  if (nativeModules.length > 0) {
    logger.debug("Native modules (external):", nativeModules);
  }
  if (manual.length > 0) {
    logger.debug("Manually specified (external):", manual);
  }

  return merged;
}

/**
 * Generate files for production deployment (called only in one-time build)
 *
 * - dist/package.json: include external modules as dependencies (add volta field if volta is used)
 * - dist/mise.toml: specify Node version (only when packageManager === "mise")
 * - dist/openssl.cnf: 레거시 OpenSSL 프로바이더 활성화
 * - dist/pm2.config.cjs: PM2 프로세스 설정 (pm2 옵션이 있을 때만)
 */
function generateProductionFiles(info: ServerBuildInfo, externals: string[]): void {
  const distDir = path.join(info.pkgDir, "dist");
  const pkgJson = JSON.parse(fs.readFileSync(path.join(info.pkgDir, "package.json"), "utf-8"));

  // dist/package.json
  logger.debug("GEN package.json...");
  const distPkgJson: Record<string, unknown> = {
    name: pkgJson.name,
    version: pkgJson.version,
    type: pkgJson.type,
  };
  if (externals.length > 0) {
    const deps: Record<string, string> = {};
    for (const ext of externals) {
      deps[ext] = "*";
    }
    distPkgJson["dependencies"] = deps;
  }
  if (info.packageManager === "volta") {
    const nodeVersion = execaSync("node", ["-v"]).stdout.trim();
    distPkgJson["volta"] = { node: nodeVersion };
  }
  fs.writeFileSync(path.join(distDir, "package.json"), JSON.stringify(distPkgJson, undefined, 2));

  // dist/mise.toml (packageManager === "mise"일 때만)
  if (info.packageManager === "mise") {
    logger.debug("GEN mise.toml...");
    const rootMiseTomlPath = path.join(info.cwd, "mise.toml");
    let nodeVersion = "20";
    if (fs.existsSync(rootMiseTomlPath)) {
      const miseContent = fs.readFileSync(rootMiseTomlPath, "utf-8");
      const match = /node\s*=\s*"([^"]+)"/.exec(miseContent);
      if (match != null) {
        nodeVersion = match[1];
      }
    }
    fs.writeFileSync(path.join(distDir, "mise.toml"), `[tools]\nnode = "${nodeVersion}"\n`);
  }

  // dist/openssl.cnf
  logger.debug("GEN openssl.cnf...");
  fs.writeFileSync(
    path.join(distDir, "openssl.cnf"),
    [
      "nodejs_conf = openssl_init",
      "",
      "[openssl_init]",
      "providers = provider_sect",
      "ssl_conf = ssl_sect",
      "",
      "[provider_sect]",
      "default = default_sect",
      "legacy = legacy_sect",
      "",
      "[default_sect]",
      "activate = 1",
      "",
      "[legacy_sect]",
      "activate = 1",
      "",
      "[ssl_sect]",
      "system_default = system_default_sect",
      "",
      "[system_default_sect]",
      "Options = UnsafeLegacyRenegotiation",
    ].join("\n"),
  );

  // dist/pm2.config.cjs (only when pm2 option is present)
  if (info.pm2 != null) {
    logger.debug("GEN pm2.config.cjs...");

    const pm2Name = info.pm2.name ?? pkgJson.name.replace(/@/g, "").replace(/[/\\]/g, "-");
    const ignoreWatch = JSON.stringify([
      "node_modules",
      "www",
      ...(info.pm2.ignoreWatchPaths ?? []),
    ]);
    const envObj: Record<string, string> = {
      NODE_ENV: "production",
      TZ: "Asia/Seoul",
      ...(info.env ?? {}),
    };
    const envStr = JSON.stringify(envObj, undefined, 4);

    const interpreterLine =
      info.packageManager === "volta"
        ? ""
        : `  interpreter: cp.execSync("mise which node").toString().trim(),\n`;

    const pm2Config = [
      ...(info.packageManager !== "volta" ? [`const cp = require("child_process");`, ``] : []),
      `module.exports = {`,
      `  name: ${JSON.stringify(pm2Name)},`,
      `  script: "main.js",`,
      `  watch: true,`,
      `  watch_delay: 2000,`,
      `  ignore_watch: ${ignoreWatch},`,
      interpreterLine.trimEnd(),
      `  interpreter_args: "--openssl-config=openssl.cnf",`,
      `  env: ${envStr.replace(/\n/g, "\n  ")},`,
      `  arrayProcess: "concat",`,
      `  useDelTargetNull: true,`,
      `};`,
    ]
      .filter((line) => line !== "")
      .join("\n");

    fs.writeFileSync(path.join(distDir, "pm2.config.cjs"), pm2Config);
  }
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
async function build(info: ServerBuildInfo): Promise<ServerBuildResult> {
  const mainJsPath = path.join(info.pkgDir, "dist", "main.js");

  try {
    // Parse tsconfig
    const parsedConfig = parseRootTsconfig(info.cwd);
    const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);

    // Server target is node environment
    const compilerOptions = await getCompilerOptionsForPackage(
      parsedConfig.options,
      "node",
      info.pkgDir,
    );

    // Collect all externals (optional peer deps + native modules + manual)
    const external = collectAllExternals(info.pkgDir, info.externals);

    // One-time esbuild
    const esbuildOptions = createServerEsbuildOptions({
      pkgDir: info.pkgDir,
      entryPoints,
      compilerOptions,
      env: info.env,
      external,
    });

    const result = await esbuild.build(esbuildOptions);

    // Generate .config.json
    const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
    fs.writeFileSync(confDistPath, JSON.stringify(info.configs ?? {}, undefined, 2));

    // Copy public/ to dist/ (production build: no public-dev)
    await copyPublicFiles(info.pkgDir, false);

    // Generate production files (package.json, mise.toml, openssl.cnf, pm2.config.cjs)
    generateProductionFiles(info, external);

    const errors = result.errors.map((e) => e.text);
    const warnings = result.warnings.map((w) => w.text);
    return {
      success: result.errors.length === 0,
      mainJsPath,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch (err) {
    return {
      success: false,
      mainJsPath,
      errors: [errorMessage(err)],
    };
  }
}

const guardStartWatch = createOnceGuard("startWatch");

/**
 * Create esbuild context and perform initial build
 */
async function createAndBuildContext(
  info: ServerWatchInfo,
  isFirstBuild: boolean,
  resolveFirstBuild?: () => void,
): Promise<esbuild.BuildContext> {
  const parsedConfig = parseRootTsconfig(info.cwd);
  const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);
  const compilerOptions = await getCompilerOptionsForPackage(
    parsedConfig.options,
    "node",
    info.pkgDir,
  );

  const mainJsPath = path.join(info.pkgDir, "dist", "main.js");
  const external = collectAllExternals(info.pkgDir, info.externals);
  const baseOptions = createServerEsbuildOptions({
    pkgDir: info.pkgDir,
    entryPoints,
    compilerOptions,
    env: info.env,
    external,
  });

  let isBuildFirstTime = isFirstBuild;

  const context = await esbuild.context({
    ...baseOptions,
    metafile: true,
    write: false,
    plugins: [
      {
        name: "watch-notify",
        setup(pluginBuild) {
          pluginBuild.onStart(() => {
            sender.send("buildStart", {});
          });

          pluginBuild.onEnd(async (result) => {
            // Save metafile
            if (result.metafile != null) {
              lastMetafile = result.metafile;
            }

            const errors = result.errors.map((e) => e.text);
            const warnings = result.warnings.map((w) => w.text);
            const success = result.errors.length === 0;

            // Write output files and check for changes
            let hasOutputChange = false;
            if (success && result.outputFiles != null) {
              hasOutputChange = await writeChangedOutputFiles(result.outputFiles);
            }

            if (isBuildFirstTime && success) {
              const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
              fs.writeFileSync(confDistPath, JSON.stringify(info.configs ?? {}, undefined, 2));
            }

            // Only emit build event on first build, output change, or error
            if (isBuildFirstTime || hasOutputChange || !success) {
              sender.send("build", {
                success,
                mainJsPath,
                errors: errors.length > 0 ? errors : undefined,
                warnings: warnings.length > 0 ? warnings : undefined,
              });
            } else {
              logger.debug("No output changes, skipping server restart");
            }

            if (isBuildFirstTime) {
              isBuildFirstTime = false;
              resolveFirstBuild?.();
            }
          });
        },
      },
    ],
  });

  await context.rebuild();

  return context;
}

/**
 * Start watch
 * @remarks This function should be called only once per Worker.
 * @throws If watch has already been started
 */
async function startWatch(info: ServerWatchInfo): Promise<void> {
  guardStartWatch();

  try {
    // Promise to wait for first build completion
    let resolveFirstBuild!: () => void;
    const firstBuildPromise = new Promise<void>((resolve) => {
      resolveFirstBuild = resolve;
    });

    // Create initial esbuild context and build
    esbuildContext = await createAndBuildContext(info, true, resolveFirstBuild);

    // Wait for first build completion
    await firstBuildPromise;

    // Watch public/ and public-dev/ (dev mode includes public-dev)
    publicWatcher = await watchPublicFiles(info.pkgDir, true);

    // Collect watch paths based on dependencies
    const { workspaceDeps, replaceDeps } = collectDeps(info.pkgDir, info.cwd, info.replaceDeps);

    const watchPaths: string[] = [];

    // 1) Server package itself + workspace dependency packages source
    const watchDirs = [
      info.pkgDir,
      ...workspaceDeps.map((d) => path.join(info.cwd, "packages", d)),
    ];
    for (const dir of watchDirs) {
      watchPaths.push(path.join(dir, "src", "**", "*"));
      watchPaths.push(path.join(dir, "*.{ts,js,css}"));
    }

    // 2) ReplaceDeps dependency packages dist (root + package node_modules)
    for (const pkg of replaceDeps) {
      watchPaths.push(path.join(info.cwd, "node_modules", ...pkg.split("/"), "dist", "**", "*.js"));
      watchPaths.push(
        path.join(info.pkgDir, "node_modules", ...pkg.split("/"), "dist", "**", "*.js"),
      );
    }

    // Start FsWatcher
    srcWatcher = await FsWatcher.watch(watchPaths);

    // Handle file changes
    srcWatcher.onChange({ delay: 300 }, async (changes) => {
      try {
        // If files are added/removed, recreate context (import graph may change)
        const hasFileAddOrRemove = changes.some((c) => c.event === "add" || c.event === "unlink");

        if (hasFileAddOrRemove) {
          logger.debug("File add/remove detected, recreating context");

          const oldContext = esbuildContext;
          esbuildContext = await createAndBuildContext(info, false);

          if (oldContext != null) {
            await oldContext.dispose();
          }
          return;
        }

        // Only file changes: filter by metafile
        if (esbuildContext == null) return;

        // If no metafile (before first build), always rebuild
        if (lastMetafile == null) {
          await esbuildContext.rebuild();
          return;
        }

        // Convert metafile.inputs keys to absolute paths (NormPath) for comparison
        const metafileAbsPaths = new Set(
          Object.keys(lastMetafile.inputs).map((key) => pathNorm(info.cwd, key)),
        );

        const hasRelevantChange = changes.some((c) => metafileAbsPaths.has(c.path));

        if (hasRelevantChange) {
          await esbuildContext.rebuild();
        } else {
          logger.debug("Changed files not included in build, skipping rebuild");
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
  ServerWorkerEvents
>({
  build,
  startWatch,
  stopWatch,
});

export default sender;

//#endregion
