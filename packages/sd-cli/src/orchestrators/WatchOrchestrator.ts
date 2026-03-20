import path from "path";
import { spawn } from "child_process";
import { consola } from "consola";
import type { BuildTarget, SdBuildPackageConfig, SdConfig, SdScriptsPackageConfig } from "../sd-config.types";
import { loadSdConfig } from "../utils/sd-config";
import { filterPackagesByTargets } from "../utils/package-utils";
import { watchReplaceDeps, type WatchReplaceDepResult } from "../utils/replace-deps";
import { printErrors } from "../utils/output-utils";
import { RebuildManager } from "../utils/rebuild-manager";
import { ResultCollector } from "../infra/ResultCollector";
import { SignalHandler } from "../infra/SignalHandler";
import { LibraryBuilder } from "../builders/LibraryBuilder";
import { DtsBuilder } from "../builders/DtsBuilder";
import type { BuildPackageInfo } from "../builders/types";
import { watchCopySrcFiles } from "../utils/copy-src";
import { FsWatcher } from "@simplysm/core-node";

/**
 * Watch command options
 */
export interface WatchOrchestratorOptions {
  targets: string[];
  options: string[];
}

/**
 * Orchestrator that coordinates watch mode execution
 *
 * Manages watch mode execution for Library packages (node/browser/neutral).
 * - LibraryBuilder: esbuild watch
 * - DtsBuilder: .d.ts generation
 */
export class WatchOrchestrator {
  private readonly _cwd: string;
  private readonly _options: WatchOrchestratorOptions;
  private readonly _logger = consola.withTag("sd:cli:watch");

  private _resultCollector!: ResultCollector;
  private _signalHandler!: SignalHandler;
  private _rebuildManager!: RebuildManager;
  private _libraryBuilder!: LibraryBuilder;
  private _dtsBuilder!: DtsBuilder;
  private _packages: BuildPackageInfo[] = [];
  private _copySrcWatchers: FsWatcher[] = [];
  private _replaceDepWatcher: WatchReplaceDepResult | undefined;
  private readonly _watchHookPackages: Array<{ name: string; dir: string; config: SdScriptsPackageConfig }> = [];
  private readonly _watchHookWatchers: FsWatcher[] = [];

  constructor(options: WatchOrchestratorOptions) {
    this._cwd = process.cwd();
    this._options = options;
  }

  /**
   * Initialize Orchestrator
   * - Load sd.config.ts
   * - Classify packages
   * - Create and initialize builders
   */
  async initialize(): Promise<void> {
    this._logger.debug("watch start", { targets: this._options.targets });

    // Load sd.config.ts
    let sdConfig: SdConfig;
    try {
      sdConfig = await loadSdConfig({
        cwd: this._cwd,
        dev: true,
        options: this._options.options,
      });
      this._logger.debug("sd.config.ts loaded");
    } catch (err) {
      this._logger.error(`Failed to load sd.config.ts: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
      throw err;
    }

    // Start watch if replaceDeps config exists (initial replacement handled in sd-cli.ts)
    if (sdConfig.replaceDeps != null) {
      this._replaceDepWatcher = await watchReplaceDeps(this._cwd, sdConfig.replaceDeps);
    }

    // Filter by targets
    const allPackages = filterPackagesByTargets(sdConfig.packages, this._options.targets);

    // Classify packages: library (node/browser/neutral) vs scripts+watch
    const isLibraryTarget = (target: string): target is BuildTarget =>
      target === "node" || target === "browser" || target === "neutral";

    const libraryConfigs: Record<string, SdBuildPackageConfig> = {};
    for (const [name, config] of Object.entries(allPackages)) {
      if (isLibraryTarget(config.target)) {
        libraryConfigs[name] = config as SdBuildPackageConfig;
      } else if (config.target === "scripts" && config.watch != null) {
        this._watchHookPackages.push({
          name,
          dir: path.join(this._cwd, "packages", name),
          config: config,
        });
      }
    }

    if (Object.keys(libraryConfigs).length === 0 && this._watchHookPackages.length === 0) {
      process.stdout.write("⚠ No packages to watch.\n");
      return;
    }

    // Create PackageInfo array for library packages
    this._packages = Object.entries(libraryConfigs).map(([name, config]) => ({
      name,
      dir: path.join(this._cwd, "packages", name),
      config,
    }));

    // Initialize infrastructure
    this._signalHandler = new SignalHandler();

    // Initialize library builders only if there are library packages
    if (this._packages.length > 0) {
      this._resultCollector = new ResultCollector();
      this._rebuildManager = new RebuildManager(this._logger);

      // Print errors on batch completion
      this._rebuildManager.on("batchComplete", () => {
        printErrors(this._resultCollector.toMap());
      });

      // Create builders
      const builderOptions = {
        cwd: this._cwd,
        packages: this._packages,
        resultCollector: this._resultCollector,
        rebuildManager: this._rebuildManager,
      };

      this._libraryBuilder = new LibraryBuilder(builderOptions);
      this._dtsBuilder = new DtsBuilder(builderOptions);

      // Initialize builders
      await Promise.all([this._libraryBuilder.initialize(), this._dtsBuilder.initialize()]);
    }
  }

  /**
   * Start watch mode
   * - Run initial build
   * - Start watch hook watchers
   * - Output results
   */
  async start(): Promise<void> {
    if (this._packages.length === 0 && this._watchHookPackages.length === 0) {
      return;
    }

    // Start library build if there are library packages
    if (this._packages.length > 0) {
      // Set up initial build promises
      const buildPromises = this._libraryBuilder.getInitialBuildPromises();
      const dtsPromises = this._dtsBuilder.getInitialBuildPromises();

      // Start copySrc watch
      for (const pkg of this._packages) {
        if (pkg.config.copySrc != null && pkg.config.copySrc.length > 0) {
          const watcher = await watchCopySrcFiles(pkg.dir, pkg.config.copySrc);
          this._copySrcWatchers.push(watcher);
        }
      }

      // Start watch (run in background)
      void this._libraryBuilder.startWatch();
      void this._dtsBuilder.startWatch();

      // Start initial build
      this._logger.start("Running initial build...");

      // Set up complete promise array for library build and DTS build
      const allBuildTasks: Array<{ name: string; promise: Promise<void> }> = [];

      // Library build tasks
      for (const pkg of this._packages) {
        const promise = buildPromises.get(`${pkg.name}:build`) ?? Promise.resolve();
        allBuildTasks.push({
          name: `${pkg.name}:build`,
          promise,
        });
      }

      // DTS tasks
      for (const pkg of this._packages) {
        const promise = dtsPromises.get(`${pkg.name}:dts`) ?? Promise.resolve();
        allBuildTasks.push({
          name: `${pkg.name}:dts`,
          promise,
        });
      }

      // Run all build tasks concurrently (wait until initial build completes)
      await Promise.allSettled(allBuildTasks.map((task) => task.promise));

      this._logger.success("Initial build completed");

      // Output initial build results
      printErrors(this._resultCollector.toMap());
    }

    // Start watch hook watchers for scripts+watch packages
    for (const pkg of this._watchHookPackages) {
      const watchConfig = pkg.config.watch!;
      const watchTargets = watchConfig.target.map((t) => path.resolve(pkg.dir, t));

      // Run initial hook
      this._runWatchHookCmd(pkg.name, pkg.dir, watchConfig.cmd, watchConfig.args);

      // Start watching
      const watcher = await FsWatcher.watch(watchTargets);
      watcher.onChange({ delay: 300 }, () => {
        this._runWatchHookCmd(pkg.name, pkg.dir, watchConfig.cmd, watchConfig.args);
      });
      this._watchHookWatchers.push(watcher);

      this._logger.success(`Watch hook started: ${pkg.name}`);
    }
  }

  /**
   * Run watch hook command
   */
  private _runWatchHookCmd(pkgName: string, cwd: string, cmd: string, args?: string[]): void {
    const child = spawn(cmd, args ?? [], { cwd, stdio: "inherit", shell: true });
    child.on("error", (err) => {
      this._logger.error(`Watch hook error (${pkgName}): ${err.message}`);
    });
    child.on("close", (code) => {
      if (code !== 0 && code !== null) {
        this._logger.warn(`Watch hook (${pkgName}) exited with code ${String(code)}`);
      }
    });
  }

  /**
   * Wait for termination signal
   */
  async awaitTermination(): Promise<void> {
    if (this._packages.length === 0 && this._watchHookPackages.length === 0) {
      return;
    }
    await this._signalHandler.waitForTermination();
  }

  /**
   * Shutdown Orchestrator
   */
  async shutdown(): Promise<void> {
    if (this._packages.length === 0 && this._watchHookPackages.length === 0) {
      return;
    }

    process.stdout.write("⏳ Shutting down...\n");

    const shutdownTasks: Array<Promise<void>> = [];

    if (this._packages.length > 0) {
      shutdownTasks.push(this._libraryBuilder.shutdown());
      shutdownTasks.push(this._dtsBuilder.shutdown());
      shutdownTasks.push(...this._copySrcWatchers.map((w) => w.close()));
    }

    shutdownTasks.push(...this._watchHookWatchers.map((w) => w.close()));

    await Promise.all(shutdownTasks);
    this._copySrcWatchers = [];
    this._watchHookWatchers.length = 0;
    this._replaceDepWatcher?.dispose();

    process.stdout.write("✔ Done\n");
  }
}
