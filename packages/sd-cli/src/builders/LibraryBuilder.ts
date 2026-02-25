import type * as LibraryWorkerModule from "../workers/library.worker";
import type { BuildResult } from "../infra/ResultCollector";
import { errorMessage } from "@simplysm/core-common";
import type { SdBuildPackageConfig } from "../sd-config.types";
import { BaseBuilder } from "./BaseBuilder";
import type { PackageInfo } from "./types";

/**
 * Builder responsible for Library package builds
 *
 * Handles esbuild compilation for node/browser/neutral target packages.
 * Supports both watch mode and production builds.
 */
export class LibraryBuilder extends BaseBuilder {
  private readonly _workerPath: string;

  constructor(options: ConstructorParameters<typeof BaseBuilder>[0]) {
    super(options);
    this._workerPath = import.meta.resolve("../workers/library.worker");
  }

  protected getBuilderType(): string {
    return "build";
  }

  protected createWorkers(): void {
    for (const pkg of this.packages) {
      this.workerManager.create<typeof LibraryWorkerModule>(`${pkg.name}:build`, this._workerPath);
    }
  }

  protected registerEventHandlers(): void {
    for (const pkg of this.packages) {
      const workerKey = `${pkg.name}:build`;
      const listrTitle = `${pkg.name} (${pkg.config.target})`;
      this.registerEventHandlersForWorker(pkg, workerKey, "build", listrTitle);
    }
  }

  protected async buildPackage(pkg: PackageInfo): Promise<void> {
    const worker = this.workerManager.get<typeof LibraryWorkerModule>(`${pkg.name}:build`)!;

    // Create build completion Promise
    const buildPromise = new Promise<void>((resolve) => {
      const originalResolver = this.buildResolvers.get(`${pkg.name}:build`);
      this.buildResolvers.set(`${pkg.name}:build`, () => {
        originalResolver?.();
        resolve();
      });
    });

    // Start build (without await - completion detected via events)
    // LibraryBuilder only receives library packages (node/browser/neutral), so casting is safe
    void worker.startWatch({
      name: pkg.name,
      config: pkg.config as SdBuildPackageConfig,
      cwd: this.cwd,
      pkgDir: pkg.dir,
    });

    await buildPromise;
  }

  protected startWatchPackage(pkg: PackageInfo): void {
    const worker = this.workerManager.get<typeof LibraryWorkerModule>(`${pkg.name}:build`)!;

    // LibraryBuilder only receives library packages (node/browser/neutral), so casting is safe
    worker
      .startWatch({
        name: pkg.name,
        config: pkg.config as SdBuildPackageConfig,
        cwd: this.cwd,
        pkgDir: pkg.dir,
      })
      .catch((err: unknown) => {
        const result: BuildResult = {
          name: pkg.name,
          target: pkg.config.target,
          type: "build",
          status: "error",
          message: errorMessage(err),
        };
        this.resultCollector.add(result);
        this.completeBuild(pkg);
      });
  }

  /**
   * Graceful shutdown (esbuild context dispose)
   */
  override async shutdown(): Promise<void> {
    const shutdownTimeout = 3000;

    // Call stopWatch method on each Worker, then terminate
    await Promise.all(
      this.workerManager.ids.map(async (id) => {
        const worker = this.workerManager.get<typeof LibraryWorkerModule>(id);
        if (worker != null) {
          try {
            await Promise.race([
              worker.stopWatch(),
              new Promise<void>((resolve) => setTimeout(resolve, shutdownTimeout)),
            ]);
          } catch {
            // Continue even if stopWatch fails
          }
        }
      }),
    );

    await super.shutdown();
  }
}
