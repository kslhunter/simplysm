import path from "path";
import ts from "typescript";
import { Worker, type WorkerProxy, fsRm } from "@simplysm/core-node";
import { errorMessage } from "@simplysm/core-common";
import { consola } from "consola";
import type {
  SdConfig,
  SdBuildPackageConfig,
  SdClientPackageConfig,
  SdServerPackageConfig,
} from "../sd-config.types";
import { loadSdConfig } from "../utils/sd-config";
import { getVersion } from "../utils/build-env";
import type { TypecheckEnv } from "../utils/tsconfig";
import { deserializeDiagnostic } from "../utils/typecheck-serialization";
import type { LintOptions } from "../commands/lint";
import type * as LintWorkerModule from "../workers/lint.worker";
import type * as LibraryWorkerModule from "../workers/library.worker";
import type * as ServerWorkerModule from "../workers/server.worker";
import type * as ClientWorkerModule from "../workers/client.worker";
import type * as DtsWorkerModule from "../workers/dts.worker";
import { Capacitor } from "../capacitor/capacitor";
import { Electron } from "../electron/electron";
import { copySrcFiles } from "../utils/copy-src";
import { formatBuildMessages } from "../utils/output-utils";

//#region Types

/**
 * Build Orchestrator options
 */
export interface BuildOrchestratorOptions {
  /** Package filter for build (empty array includes all packages) */
  targets: string[];
  /** Additional options to pass to sd.config.ts */
  options: string[];
}

/**
 * Build result
 */
interface BuildStepResult {
  name: string;
  target: string;
  type: "js" | "dts" | "vite" | "capacitor" | "electron";
  success: boolean;
  errors?: string[];
  warnings?: string[];
  diagnostics?: ts.Diagnostic[];
}

/**
 * Package classification result
 */
interface ClassifiedPackages {
  /** node/browser/neutral target (JS + dts) */
  buildPackages: Array<{ name: string; config: SdBuildPackageConfig }>;
  /** client target (Vite build + typecheck) */
  clientPackages: Array<{ name: string; config: SdClientPackageConfig }>;
  /** server target (JS build, no dts) */
  serverPackages: Array<{ name: string; config: SdServerPackageConfig }>;
}

//#endregion

//#region Utilities

/**
 * Classify packages by target
 * - node/browser/neutral: buildPackages (JS + dts)
 * - client: clientPackages (Vite build + typecheck)
 * - server: serverPackages (JS build, no dts)
 * - scripts: excluded
 */
function classifyPackages(
  packages: Record<
    string,
    | SdBuildPackageConfig
    | SdClientPackageConfig
    | SdServerPackageConfig
    | { target: "scripts" }
    | undefined
  >,
  targets: string[],
): ClassifiedPackages {
  const buildPackages: ClassifiedPackages["buildPackages"] = [];
  const clientPackages: ClassifiedPackages["clientPackages"] = [];
  const serverPackages: ClassifiedPackages["serverPackages"] = [];

  for (const [name, config] of Object.entries(packages)) {
    if (config == null) continue;
    if (config.target === "scripts") continue;

    // Include only specified packages if targets is specified
    if (targets.length > 0 && !targets.includes(name)) continue;

    if (config.target === "client") {
      clientPackages.push({ name, config });
    } else if (config.target === "server") {
      serverPackages.push({ name, config });
    } else {
      buildPackages.push({ name, config });
    }
  }

  return { buildPackages, clientPackages, serverPackages };
}

/**
 * Delete dist folders
 */
async function cleanDistFolders(cwd: string, packageNames: string[]): Promise<void> {
  await Promise.all(packageNames.map((name) => fsRm(path.join(cwd, "packages", name, "dist"))));
}

//#endregion

//#region BuildOrchestrator

/**
 * Orchestrator for coordinating production builds
 *
 * Classifies packages based on sd.config.ts and executes builds.
 * - Clean dist folders (clean build)
 * - Run lint + build concurrently
 * - node/browser/neutral targets: esbuild JS build + dts generation
 * - client targets: Vite production build + typecheck + Capacitor/Electron builds
 * - server targets: esbuild JS build
 */
export class BuildOrchestrator {
  private readonly _cwd: string;
  private readonly _options: BuildOrchestratorOptions;
  private readonly _logger = consola.withTag("sd:cli:build");

  private _sdConfig: SdConfig | undefined;
  private _classified: ClassifiedPackages | undefined;
  private _allPackageNames: string[] = [];
  private _baseEnv: { VER: string; DEV: string } | undefined;

  constructor(options: BuildOrchestratorOptions) {
    this._cwd = process.cwd();
    this._options = options;
  }

  /**
   * Initialize Orchestrator
   * - Load sd.config.ts
   * - Configure replaceDeps
   * - Classify packages
   * - Prepare environment variables
   */
  async initialize(): Promise<void> {
    this._logger.debug("build started", { targets: this._options.targets });

    // Load sd.config.ts
    try {
      this._sdConfig = await loadSdConfig({
        cwd: this._cwd,
        dev: false,
        opt: this._options.options,
      });
      this._logger.debug("sd.config.ts loaded");
    } catch (err) {
      this._logger.error(`sd.config.ts load failed: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
      throw err;
    }

    // Prepare VER and DEV environment variables
    const version = await getVersion(this._cwd);
    this._baseEnv = { VER: version, DEV: "false" };

    // Classify packages
    this._classified = classifyPackages(this._sdConfig.packages, this._options.targets);
    this._allPackageNames = [
      ...this._classified.buildPackages.map((p) => p.name),
      ...this._classified.clientPackages.map((p) => p.name),
      ...this._classified.serverPackages.map((p) => p.name),
    ];

    if (this._allPackageNames.length === 0) {
      process.stdout.write("✔ No packages to build.\n");
      return;
    }

    this._logger.debug("package classification complete", {
      buildPackages: this._classified.buildPackages.map((p) => p.name),
      clientPackages: this._classified.clientPackages.map((p) => p.name),
      serverPackages: this._classified.serverPackages.map((p) => p.name),
    });
  }

  /**
   * Execute build
   * - Clean
   * - Lint + Build (concurrent)
   * - Output results
   *
   * @returns whether errors occurred (true: errors present)
   */
  async start(): Promise<boolean> {
    if (this._allPackageNames.length === 0) {
      return false;
    }

    const classified = this._classified!;
    const baseEnv = this._baseEnv!;

    // Collect results
    const results: BuildStepResult[] = [];
    // Track errors (wrapped in object to allow mutation tracking in callbacks)
    const state = { hasError: false };

    // Worker paths
    const libraryWorkerPath = import.meta.resolve("../workers/library.worker");
    const serverWorkerPath = import.meta.resolve("../workers/server.worker");
    const clientWorkerPath = import.meta.resolve("../workers/client.worker");
    const dtsWorkerPath = import.meta.resolve("../workers/dts.worker");
    const lintWorkerPath = import.meta.resolve("../workers/lint.worker");

    // File cache (for diagnostics output)
    const fileCache = new Map<string, string>();

    // formatHost (for diagnostics output)
    const formatHost: ts.FormatDiagnosticsHost = {
      getCanonicalFileName: (f) => f,
      getCurrentDirectory: () => this._cwd,
      getNewLine: () => ts.sys.newLine,
    };

    // Lint options (target all packages)
    const lintOptions: LintOptions = {
      targets: this._allPackageNames.map((name) => `packages/${name}`),
      fix: false,
      timing: false,
    };

    // Phase 1: Clean (must complete before build writes to dist)
    this._logger.start("Clean");
    await cleanDistFolders(this._cwd, this._allPackageNames);
    this._logger.success("Clean");

    // Phase 2: Lint + Build (concurrent)
    this._logger.start("Lint + Build");

    // Create list of build tasks
    const buildTasks: Array<() => Promise<void>> = [];

    // buildPackages: JS build + dts generation
    for (const { name, config } of classified.buildPackages) {
      const pkgDir = path.join(this._cwd, "packages", name);
      const env: TypecheckEnv = config.target === "node" ? "node" : "browser";

      buildTasks.push(async () => {
        this._logger.debug(`${name} (${config.target}) started`);
        // Run JS build and DTS generation in parallel
        const libraryWorker: WorkerProxy<typeof LibraryWorkerModule> =
          Worker.create<typeof LibraryWorkerModule>(libraryWorkerPath);
        const dtsWorker: WorkerProxy<typeof DtsWorkerModule> =
          Worker.create<typeof DtsWorkerModule>(dtsWorkerPath);

        try {
          const [buildResult, dtsResult] = await Promise.all([
            // JS build
            libraryWorker.build({ name, config, cwd: this._cwd, pkgDir }),
            // DTS generation
            dtsWorker.build({ name, cwd: this._cwd, pkgDir, env, emit: true }),
          ]);

          // Handle JS build results
          results.push({
            name,
            target: config.target,
            type: "js",
            success: buildResult.success,
            errors: buildResult.errors,
            warnings: buildResult.warnings,
          });
          if (!buildResult.success) state.hasError = true;

          // Handle DTS results
          const diagnostics = dtsResult.diagnostics.map((d) => deserializeDiagnostic(d, fileCache));
          results.push({
            name,
            target: config.target,
            type: "dts",
            success: dtsResult.success,
            errors: dtsResult.errors,
            diagnostics,
          });
          if (!dtsResult.success) state.hasError = true;
        } finally {
          await Promise.all([libraryWorker.terminate(), dtsWorker.terminate()]);
        }

        // Copy copySrc files
        if (config.copySrc != null && config.copySrc.length > 0) {
          await copySrcFiles(pkgDir, config.copySrc);
        }
        this._logger.debug(`${name} (${config.target}) completed`);
      });
    }

    // clientPackages: Vite build + typecheck + Capacitor build
    for (const { name, config } of classified.clientPackages) {
      const pkgDir = path.join(this._cwd, "packages", name);

      buildTasks.push(async () => {
        this._logger.debug(`${name} (client) started`);
        // Run Vite build and typecheck in parallel
        const clientWorker: WorkerProxy<typeof ClientWorkerModule> =
          Worker.create<typeof ClientWorkerModule>(clientWorkerPath);
        const dtsWorker: WorkerProxy<typeof DtsWorkerModule> =
          Worker.create<typeof DtsWorkerModule>(dtsWorkerPath);

        try {
          const clientConfig: SdClientPackageConfig = {
            ...config,
            env: { ...baseEnv, ...config.env },
          };
          const [clientResult, dtsResult] = await Promise.all([
            // Vite production build
            clientWorker.build({ name, config: clientConfig, cwd: this._cwd, pkgDir }),
            // typecheck (without dts)
            dtsWorker.build({
              name,
              cwd: this._cwd,
              pkgDir,
              env: "browser",
              emit: false,
            }),
          ]);

          // Handle Vite build results
          results.push({
            name,
            target: "client",
            type: "vite",
            success: clientResult.success,
            errors: clientResult.errors,
          });
          if (!clientResult.success) state.hasError = true;

          // Handle typecheck results
          const diagnostics = dtsResult.diagnostics.map((d) => deserializeDiagnostic(d, fileCache));
          results.push({
            name,
            target: "client",
            type: "dts",
            success: dtsResult.success,
            errors: dtsResult.errors,
            diagnostics,
          });
          if (!dtsResult.success) state.hasError = true;
        } finally {
          await Promise.all([clientWorker.terminate(), dtsWorker.terminate()]);
        }

        // Capacitor build (only if configured)
        if (config.capacitor != null) {
          const outPath = path.join(pkgDir, "dist");
          try {
            const cap = await Capacitor.create(pkgDir, config.capacitor);
            await cap.initialize();
            await cap.build(outPath);
            results.push({
              name,
              target: "client",
              type: "capacitor",
              success: true,
            });
          } catch (err) {
            results.push({
              name,
              target: "client",
              type: "capacitor",
              success: false,
              errors: [errorMessage(err)],
            });
            state.hasError = true;
          }
        }

        // Electron build (only if configured)
        if (config.electron != null) {
          const outPath = path.join(pkgDir, "dist");
          try {
            const electron = await Electron.create(pkgDir, config.electron);
            await electron.initialize();
            await electron.build(outPath);
            results.push({
              name,
              target: "client",
              type: "electron",
              success: true,
            });
          } catch (err) {
            results.push({
              name,
              target: "client",
              type: "electron",
              success: false,
              errors: [errorMessage(err)],
            });
            state.hasError = true;
          }
        }
        this._logger.debug(`${name} (client) completed`);
      });
    }

    // serverPackages: JS build only (dts generation excluded)
    for (const { name, config } of classified.serverPackages) {
      const pkgDir = path.join(this._cwd, "packages", name);

      buildTasks.push(async () => {
        this._logger.debug(`${name} (server) started`);
        const serverWorker: WorkerProxy<typeof ServerWorkerModule> =
          Worker.create<typeof ServerWorkerModule>(serverWorkerPath);

        try {
          const buildResult = await serverWorker.build({
            name,
            cwd: this._cwd,
            pkgDir,
            env: { ...baseEnv, ...config.env },
            configs: config.configs,
            externals: config.externals,
            pm2: config.pm2,
            packageManager: config.packageManager,
          });

          results.push({
            name,
            target: "server",
            type: "js",
            success: buildResult.success,
            errors: buildResult.errors,
            warnings: buildResult.warnings,
          });
          if (!buildResult.success) state.hasError = true;
        } finally {
          await serverWorker.terminate();
        }
        this._logger.debug(`${name} (server) completed`);
      });
    }

    // Run Lint + all builds in parallel
    const lintWorker = Worker.create<typeof LintWorkerModule>(lintWorkerPath);
    const lintTask = async (): Promise<void> => {
      try {
        const result = await lintWorker.lint(lintOptions);
        if (!result.success) state.hasError = true;
      } finally {
        await lintWorker.terminate();
      }
    };
    await Promise.allSettled([lintTask(), ...buildTasks.map((task) => task())]);
    this._logger.success("Lint + Build");

    // Output results
    const allDiagnostics: ts.Diagnostic[] = [];
    for (const result of results) {
      const typeLabel = result.type === "dts" ? "dts" : result.target;

      // Output warnings
      if (result.warnings != null) {
        this._logger.warn(formatBuildMessages(result.name, typeLabel, result.warnings));
      }

      // Output errors
      if (!result.success) {
        if (result.errors != null) {
          this._logger.error(formatBuildMessages(result.name, typeLabel, result.errors));
        } else {
          this._logger.error(`${result.name} (${typeLabel})`);
        }
      }
      if (result.diagnostics != null) {
        allDiagnostics.push(...result.diagnostics);
      }
    }

    // Output diagnostics (deduplicated)
    if (allDiagnostics.length > 0) {
      const uniqueDiagnostics = ts.sortAndDeduplicateDiagnostics(allDiagnostics);
      const message = ts.formatDiagnosticsWithColorAndContext(uniqueDiagnostics, formatHost);
      process.stdout.write(message);
    }

    // Output result log
    if (state.hasError) {
      this._logger.error("Build failed");
    } else {
      this._logger.info("Build completed");
    }

    return state.hasError;
  }

  /**
   * Shutdown Orchestrator (no resources to clean up currently)
   */
  async shutdown(): Promise<void> {
    // Production builds are one-time operations, so there are no resources to clean up at shutdown
    // Workers are cleaned up with terminate() within each build task
    await Promise.resolve();
  }
}

//#endregion
