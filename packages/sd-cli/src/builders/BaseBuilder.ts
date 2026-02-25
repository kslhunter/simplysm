import { consola } from "consola";
import { WorkerManager } from "../infra/WorkerManager";
import type { BuildResult, ResultCollector } from "../infra/ResultCollector";
import type { RebuildManager } from "../utils/rebuild-manager";
import type { BuildEventData, ErrorEventData } from "../utils/worker-events";
import { formatBuildMessages } from "../utils/output-utils";
import type { IBuilder, PackageInfo } from "./types";

const baseBuilderLogger = consola.withTag("sd:cli:build");

/**
 * Abstract base class for Builder
 *
 * Provides common logic for all Builders and
 * defines abstract methods that subclasses must implement.
 */
export abstract class BaseBuilder implements IBuilder {
  protected readonly workerManager: WorkerManager;
  protected readonly resultCollector: ResultCollector;
  protected readonly rebuildManager: RebuildManager | undefined;
  protected readonly packages: PackageInfo[];
  protected readonly cwd: string;
  protected isWatchMode = false;

  /** Initial build Promise (per package) */
  protected readonly initialBuildPromises = new Map<string, Promise<void>>();
  /** Initial build resolver (per package) */
  protected readonly buildResolvers = new Map<string, () => void>();

  constructor(options: {
    cwd: string;
    packages: PackageInfo[];
    resultCollector: ResultCollector;
    rebuildManager?: RebuildManager;
  }) {
    this.cwd = options.cwd;
    this.packages = options.packages;
    this.resultCollector = options.resultCollector;
    this.rebuildManager = options.rebuildManager;
    this.workerManager = new WorkerManager();
  }

  /**
   * Initialize Builder
   */
  initialize(): Promise<void> {
    // Create initial build Promises
    for (const pkg of this.packages) {
      const key = this.getPackageKey(pkg);
      this.initialBuildPromises.set(
        key,
        new Promise<void>((resolve) => {
          this.buildResolvers.set(key, resolve);
        }),
      );
    }

    // Create Workers
    this.createWorkers();

    // Register event handlers
    this.registerEventHandlers();

    return Promise.resolve();
  }

  /**
   * One-time build (production)
   */
  async build(): Promise<void> {
    await Promise.all(this.packages.map((pkg) => this.buildPackage(pkg)));
  }

  /**
   * Start watch mode
   */
  async startWatch(): Promise<void> {
    this.isWatchMode = true;

    // Start watching all packages (without await - run in background)
    for (const pkg of this.packages) {
      this.startWatchPackage(pkg);
    }

    // Wait until initial build is complete
    await Promise.all(this.initialBuildPromises.values());
  }

  /**
   * Shutdown Builder
   */
  async shutdown(): Promise<void> {
    await this.workerManager.terminateAll();
  }

  /**
   * Get initial build Promise map
   */
  getInitialBuildPromises(): Map<string, Promise<void>> {
    return this.initialBuildPromises;
  }

  /**
   * Generate package key (for result storage)
   */
  protected getPackageKey(pkg: PackageInfo): string {
    return `${pkg.name}:${this.getBuilderType()}`;
  }

  /**
   * Handle build completion
   */
  protected completeBuild(pkg: PackageInfo): void {
    const key = this.getPackageKey(pkg);
    const resolver = this.buildResolvers.get(key);
    if (resolver != null) {
      resolver();
      this.buildResolvers.delete(key);
    }
  }

  /**
   * Register common Worker event handlers (buildStart, build, error)
   *
   * Provides common logic so LibraryBuilder and DtsBuilder can register
   * event handlers with the same pattern without duplication.
   *
   * @param workerKey Worker identifier (e.g., "core-common:build")
   * @param resultType BuildResult type field value
   * @param listrTitle Title to display during rebuild
   */
  protected registerEventHandlersForWorker(
    pkg: PackageInfo,
    workerKey: string,
    resultType: BuildResult["type"],
    listrTitle: string,
  ): void {
    const worker = this.workerManager.get(workerKey)!;

    // Track if this is initial build
    let isInitialBuild = true;

    // Build start (during rebuild)
    worker.on("buildStart", () => {
      if (!isInitialBuild && this.rebuildManager != null) {
        const resolver = this.rebuildManager.registerBuild(workerKey, listrTitle);
        this.buildResolvers.set(workerKey, resolver);
      }
    });

    // Build complete
    worker.on("build", (data) => {
      const event = data as BuildEventData;

      // Output warnings
      if (event.warnings != null && event.warnings.length > 0) {
        baseBuilderLogger.warn(formatBuildMessages(pkg.name, pkg.config.target, event.warnings));
      }

      const result: BuildResult = {
        name: pkg.name,
        target: pkg.config.target,
        type: resultType,
        status: event.success ? "success" : "error",
        message: event.errors?.join("\n"),
      };
      this.resultCollector.add(result);

      if (isInitialBuild) {
        isInitialBuild = false;
      }
      this.completeBuild(pkg);
    });

    // Error
    worker.on("error", (data) => {
      const event = data as ErrorEventData;
      const result: BuildResult = {
        name: pkg.name,
        target: pkg.config.target,
        type: resultType,
        status: "error",
        message: event.message,
      };
      this.resultCollector.add(result);

      if (isInitialBuild) {
        isInitialBuild = false;
      }
      this.completeBuild(pkg);
    });
  }

  /**
   * Builder type (for result key generation)
   */
  protected abstract getBuilderType(): string;

  /**
   * Create Workers
   */
  protected abstract createWorkers(): void;

  /**
   * Register event handlers
   */
  protected abstract registerEventHandlers(): void;

  /**
   * Single package build (production)
   */
  protected abstract buildPackage(pkg: PackageInfo): Promise<void>;

  /**
   * Start watching single package
   */
  protected abstract startWatchPackage(pkg: PackageInfo): void;
}
