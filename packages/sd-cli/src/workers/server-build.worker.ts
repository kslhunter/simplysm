import path from "path";
import fs from "fs";
import esbuild from "esbuild";
import { cpx, createWorker, FsWatcher, pathx } from "@simplysm/core-node";
import { err as errNs } from "@simplysm/core-common";
import { consola } from "consola";
import type { BuildOutput } from "../engines/types";
import type { SerializedDiagnostic } from "../utils/typecheck-serialization";
import type { LintWithProgramResult } from "../utils/lint-with-program";
import {
  parseTsconfig,
  getPackageSourceFiles,
} from "../utils/tsconfig";
import {
  createServerEsbuildOptions,
  collectAllDependencyExternals,
  writeChangedOutputFiles,
} from "../utils/esbuild-config";
import { runTscPackageBuild } from "../utils/tsc-build";
import { LintWithProgramRunner } from "../utils/lint-with-program";
import { registerCleanupHandlers, createOnceGuard, applyDebugLevel } from "../utils/worker-utils";
import { collectDeps } from "../utils/package-utils";
import { copyPublicFiles, watchPublicFiles } from "../utils/copy-public";

//#region Types

/**
 * Server build information (one-time build)
 */
export interface ServerBuildInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  output: BuildOutput;
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
 * Server watch information
 */
export interface ServerWatchInfo {
  name: string;
  cwd: string;
  pkgDir: string;
  output: BuildOutput;
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
 * Server build result (aligned with LibraryBuildResult + mainJsPath)
 */
export interface ServerBuildResult {
  js: { success: boolean; errors?: string[]; warnings?: string[] };
  dts: { success: boolean; errors?: string[]; diagnostics: SerializedDiagnostic[] };
  lint?: LintWithProgramResult;
  mainJsPath: string;
}

/**
 * Combined build event for watch mode
 */
export interface ServerCombinedBuildEvent {
  js: { success: boolean; errors?: string[]; warnings?: string[] };
  dts: { success: boolean; errors?: string[] };
  lint?: LintWithProgramResult;
  mainJsPath: string;
}

/**
 * Worker event types
 */
export interface ServerBuildWorkerEvents extends Record<string, unknown> {
  buildStart: Record<string, never>;
  build: ServerCombinedBuildEvent;
  error: { message: string };
}

//#endregion

//#region Resource Management

applyDebugLevel();

const logger = consola.withTag("sd:cli:server-build:worker");

/** esbuild build context (to be cleaned up) */
let esbuildContext: esbuild.BuildContext | undefined;

/** Last build metafile (for filtering changed files on rebuild) */
let lastMetafile: esbuild.Metafile | undefined;

/** Public files watcher (to be cleaned up) */
let publicWatcher: FsWatcher | undefined;

/** Source + scope packages watcher (to be cleaned up) */
let srcWatcher: FsWatcher | undefined;

async function cleanup(): Promise<void> {
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
 * Uses single-pass dependency tree traversal via collectAllDependencyExternals.
 */
function collectAllExternals(pkgDir: string, manualExternals?: string[]): string[] {
  logger.debug("의존성 트리 스캔 중...");
  const { optionalPeerDeps, nativeModules } = collectAllDependencyExternals(pkgDir);

  const manual = manualExternals ?? [];
  return [...new Set([...optionalPeerDeps, ...nativeModules, ...manual])];
}

/**
 * Parse pnpm-lock.yaml packages section to build a name→version map.
 * Lockfile v9 format: `packages:` section with `'name@version':` keys.
 * Uses simple line-based parsing to avoid YAML parser dependency.
 */
function parseLockfileVersions(cwd: string): Map<string, string> {
  const lockfilePath = path.join(cwd, "pnpm-lock.yaml");
  if (!fs.existsSync(lockfilePath)) {
    throw new Error(`pnpm-lock.yaml not found in ${cwd}. Run "pnpm install" first.`);
  }

  const content = fs.readFileSync(lockfilePath, "utf-8");
  const map = new Map<string, string>();

  // Find "packages:" section and parse entries like "'@scope/name@1.2.3':" or "'name@1.2.3':"
  const lines = content.split("\n");
  let inPackages = false;
  for (const line of lines) {
    if (line === "packages:") {
      inPackages = true;
      continue;
    }
    if (inPackages && line.length > 0 && !line.startsWith(" ") && !line.startsWith("'")) {
      break; // Next top-level section
    }
    if (!inPackages) continue;

    // Match "'@scope/name@version':" or "'name@version':"
    const match = /^\s{2}'(.+)@(\d[^']*)':\s*$/.exec(line);
    if (match != null) {
      const name = match[1];
      const version = match[2];
      // Keep first occurrence (lockfile lists each version once)
      if (!map.has(name)) {
        map.set(name, version);
      }
    }
  }

  return map;
}

/**
 * Resolve locked versions of all given packages from pnpm-lock.yaml.
 * Throws if any package is not found in the lockfile.
 */
function resolveLockedVersions(cwd: string, pkgNames: string[]): Record<string, string> {
  const versionMap = parseLockfileVersions(cwd);
  const result: Record<string, string> = {};
  for (const name of pkgNames) {
    const version = versionMap.get(name);
    if (version == null) {
      throw new Error(
        `External dependency "${name}" not found in pnpm-lock.yaml. ` +
          `Run "pnpm install" and try again.`,
      );
    }
    result[name] = version;
  }
  return result;
}

/**
 * Generate files for production deployment
 */
function generateProductionFiles(
  info: ServerBuildInfo,
  externals: string[],
): void {
  const distDir = path.join(info.pkgDir, "dist");
  const pkgJson = JSON.parse(fs.readFileSync(path.join(info.pkgDir, "package.json"), "utf-8"));

  // dist/package.json
  const distPkgJson: Record<string, unknown> = {
    name: pkgJson.name,
    version: pkgJson.version,
    type: pkgJson.type,
  };
  if (externals.length > 0) {
    distPkgJson["dependencies"] = resolveLockedVersions(info.cwd, externals);
  }
  if (info.packageManager === "volta") {
    const nodeVersion = cpx.execSync("node", ["-v"]).stdout.trim();
    distPkgJson["volta"] = { node: nodeVersion };
  }
  fs.writeFileSync(path.join(distDir, "package.json"), JSON.stringify(distPkgJson, undefined, 2));

  // dist/mise.toml
  if (info.packageManager === "mise") {
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

  // dist/pm2.config.cjs
  if (info.pm2 != null) {
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

    const useInterpreter = info.packageManager !== "volta";

    const pm2Config = [
      ...(useInterpreter ? [`const cp = require("child_process");`, ``] : []),
      `module.exports = {`,
      `  name: ${JSON.stringify(pm2Name)},`,
      `  script: "main.js",`,
      `  watch: true,`,
      `  watch_delay: 2000,`,
      `  ignore_watch: ${ignoreWatch},`,
      ...(useInterpreter ? [`  interpreter: cp.execSync("mise which node").toString().trim(),`] : []),
      `  interpreter_args: "--openssl-config=openssl.cnf",`,
      `  env: ${envStr.replace(/\n/g, "\n  ")},`,
      `  arrayProcess: "concat",`,
      `  useDelTargetNull: true,`,
      `};`,
    ].join("\n");

    fs.writeFileSync(path.join(distDir, "pm2.config.cjs"), pm2Config);
  }
}

registerCleanupHandlers(cleanup, logger);

//#endregion

//#region Worker

/**
 * One-time build (production)
 */
async function build(info: ServerBuildInfo): Promise<ServerBuildResult> {
  const mainJsPath = path.join(info.pkgDir, "dist", "main.js");
  logger.debug(`[${info.name}] server worker build 시작 (js: ${info.output.js}, dts: ${info.output.dts})`);

  try {
    // Parse tsconfig
    const parsedConfig = parseTsconfig(info.pkgDir);
    const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);

    // Collect externals
    const external = collectAllExternals(info.pkgDir, info.externals);

    // esbuild (async) ‖ tsc (sync) in parallel
    const esbuildOptions = createServerEsbuildOptions({
      pkgDir: info.pkgDir,
      entryPoints,
      env: info.env,
      external,
    });

    const esbuildPromise = info.output.js
      ? esbuild.build(esbuildOptions).then(async (result) => {
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
        }).catch((err) => ({
          success: false,
          errors: [errNs.message(err)],
          warnings: undefined,
        }))
      : null;

    // tsc typecheck (always runs, emit controlled by output.dts)
    const tscResult = runTscPackageBuild({
      pkgDir: info.pkgDir,
      cwd: info.cwd,
      output: { js: false, dts: info.output.dts },
      parsedConfig,
      env: info.output.env,
    });

    const jsResult = esbuildPromise
      ? await esbuildPromise
      : { success: true, errors: undefined, warnings: undefined };

    // Run lint if enabled and program is available
    let lint: LintWithProgramResult | undefined;
    if (info.output.lint === true && tscResult.program != null) {
      const lintRunner = new LintWithProgramRunner({
        cwd: info.cwd,
        pkgName: info.name,
      });
      lint = await lintRunner.lint({ program: tscResult.program });
    }

    // Generate production artifacts only when JS output is requested
    if (info.output.js) {
      const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
      fs.writeFileSync(confDistPath, JSON.stringify(info.configs ?? {}, undefined, 2));

      await copyPublicFiles(info.pkgDir, false);

      generateProductionFiles(info, external);
    }

    logger.debug(`[${info.name}] server worker build 완료 (js: ${jsResult.success}, dts: ${tscResult.success})`);
    return {
      js: {
        success: jsResult.success,
        errors: jsResult.errors,
        warnings: jsResult.warnings,
      },
      dts: {
        success: tscResult.success,
        errors: tscResult.errors,
        diagnostics: tscResult.diagnostics,
      },
      lint,
      mainJsPath,
    };
  } catch (err) {
    const message = errNs.message(err);
    const stack = err instanceof Error ? err.stack : undefined;
    logger.debug(`[${info.name}] server worker build 예외: ${message}`);
    if (stack != null) {
      logger.debug(`[${info.name}] 스택 트레이스:\n${stack}`);
    }
    return {
      js: { success: false, errors: [message] },
      dts: { success: false, errors: [message], diagnostics: [] },
      mainJsPath,
    };
  }
}

const guardStartWatch = createOnceGuard("startWatch");

// Mutable state for watch mode
let watchInfo: ServerWatchInfo | undefined;
let watchLintRunner: LintWithProgramRunner | undefined;

/**
 * Rebuild esbuild + tsc in parallel (watch mode)
 */
async function rebuildAll(): Promise<ServerCombinedBuildEvent> {
  const info = watchInfo!;
  const mainJsPath = path.join(info.pkgDir, "dist", "main.js");
  const parsedConfig = parseTsconfig(info.pkgDir);

  // esbuild rebuild (async)
  let esbuildPromise: Promise<{ success: boolean; errors?: string[]; warnings?: string[] }> | null = null;
  if (info.output.js && esbuildContext != null) {
    esbuildPromise = esbuildContext.rebuild().then(async (result) => {
      // Save metafile
      if (result.metafile != null) {
        lastMetafile = result.metafile;
      }

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
    });
  }

  // tsc rebuild (sync, incremental)
  const tscResult = runTscPackageBuild({
    pkgDir: info.pkgDir,
    cwd: info.cwd,
    output: { js: false, dts: info.output.dts },
    parsedConfig,
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

  const jsResult = esbuildPromise
    ? await esbuildPromise
    : { success: true, errors: undefined, warnings: undefined };

  return {
    js: { success: jsResult.success, errors: jsResult.errors, warnings: jsResult.warnings },
    dts: { success: tscResult.success, errors: tscResult.errors },
    lint,
    mainJsPath,
  };
}

/**
 * Create esbuild context for watch mode
 */
async function createEsbuildWatchContext(
  info: ServerWatchInfo,
  entryPoints: string[],
  external: string[],
): Promise<esbuild.BuildContext> {
  const baseOptions = createServerEsbuildOptions({
    pkgDir: info.pkgDir,
    entryPoints,
    env: info.env,
    external,
    dev: true,
  });

  return esbuild.context({
    ...baseOptions,
    metafile: true,
    write: false,
  });
}

/**
 * Start watch mode
 */
async function startWatch(info: ServerWatchInfo): Promise<void> {
  guardStartWatch();
  watchInfo = info;
  logger.debug(`[${info.name}] server worker startWatch 시작`);

  try {
    const parsedConfig = parseTsconfig(info.pkgDir);
    const entryPoints = getPackageSourceFiles(info.pkgDir, parsedConfig);

    // Collect externals (cached for watch mode)
    let cachedExternal = collectAllExternals(info.pkgDir, info.externals);

    // Create esbuild context (if JS output needed)
    if (info.output.js) {
      esbuildContext = await createEsbuildWatchContext(info, entryPoints, cachedExternal);
    }

    // Initial build: esbuild + tsc parallel
    const initialResult = await rebuildAll();

    // Write .config.json on first build
    const confDistPath = path.join(info.pkgDir, "dist", ".config.json");
    fs.writeFileSync(confDistPath, JSON.stringify(info.configs ?? {}, undefined, 2));

    sender.send("build", initialResult);

    // Watch public/ + public-dev/
    publicWatcher = await watchPublicFiles(info.pkgDir, true);

    // Collect watch paths based on dependencies
    const { workspaceDeps, replaceDeps } = collectDeps(info.pkgDir, info.cwd, info.replaceDeps);

    const watchPaths: string[] = [];

    // Server package itself + workspace dependency packages source
    const watchDirs = [
      info.pkgDir,
      ...workspaceDeps.map((d) => path.join(info.cwd, "packages", d)),
    ];
    for (const dir of watchDirs) {
      watchPaths.push(path.join(dir, "src", "**", "*"));
    }

    // ReplaceDeps dependency packages dist
    for (const pkg of replaceDeps) {
      watchPaths.push(path.join(info.cwd, "node_modules", ...pkg.split("/"), "dist", "**", "*.{js,mjs,cjs}"));
      watchPaths.push(
        path.join(info.pkgDir, "node_modules", ...pkg.split("/"), "dist", "**", "*.{js,mjs,cjs}"),
      );
    }

    // Start FsWatcher
    srcWatcher = await FsWatcher.watch(watchPaths);

    srcWatcher.onChange({ delay: 300 }, async (changes) => {
      try {
        const hasFileAddOrRemove = changes.some((c) => c.event === "add" || c.event === "unlink");

        if (hasFileAddOrRemove) {
          sender.send("buildStart", {});

          // Recreate context on file add/remove
          const newParsedConfig = parseTsconfig(info.pkgDir);
          const newEntryPoints = getPackageSourceFiles(info.pkgDir, newParsedConfig);

          // Only re-collect externals when package.json changed
          const hasPackageJsonChange = changes.some((c) =>
            c.path.endsWith("package.json"),
          );
          if (hasPackageJsonChange) {
            cachedExternal = collectAllExternals(info.pkgDir, info.externals);
          }
          const newExternal = cachedExternal;

          const oldContext = esbuildContext;
          if (info.output.js) {
            esbuildContext = await createEsbuildWatchContext(info, newEntryPoints, newExternal);
          }
          if (oldContext != null) {
            await oldContext.dispose();
          }

          const result = await rebuildAll();
          sender.send("build", result);
          return;
        }

        // Only file changes: filter by metafile
        if (esbuildContext == null) {
          sender.send("buildStart", {});
          const result = await rebuildAll();
          sender.send("build", result);
          return;
        }

        if (lastMetafile == null) {
          sender.send("buildStart", {});
          const result = await rebuildAll();
          sender.send("build", result);
          return;
        }

        // Filter by metafile inputs
        const metafileAbsPaths = new Set(
          Object.keys(lastMetafile.inputs).map((key) => pathx.norm(info.cwd, key)),
        );

        const hasRelevantChange = changes.some((c) => metafileAbsPaths.has(c.path));

        if (hasRelevantChange) {
          sender.send("buildStart", {});
          const result = await rebuildAll();
          sender.send("build", result);
        } else {
          logger.debug("변경된 파일이 빌드에 포함되지 않아 리빌드 건너뜀");
        }
      } catch (err) {
        sender.send("error", { message: errNs.message(err) });
      }
    });
  } catch (err) {
    sender.send("error", { message: errNs.message(err) });
  }
}

/**
 * Stop watch
 */
async function stopWatch(): Promise<void> {
  await cleanup();
}

const sender = createWorker<
  { build: typeof build; startWatch: typeof startWatch; stopWatch: typeof stopWatch },
  ServerBuildWorkerEvents
>({
  build,
  startWatch,
  stopWatch,
});

export default sender;

//#endregion
