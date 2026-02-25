import type * as DtsWorkerModule from "../workers/dts.worker";
import type { BuildResult } from "../infra/ResultCollector";
import { errorMessage } from "@simplysm/core-common";
import type { TypecheckEnv } from "../utils/tsconfig";
import { BaseBuilder } from "./BaseBuilder";
import type { PackageInfo } from "./types";

/**
 * Builder responsible for generating .d.ts files
 *
 * Handles TypeScript declaration file generation for library packages.
 * Supports both watch mode and production builds.
 */
export class DtsBuilder extends BaseBuilder {
  private readonly _workerPath: string;

  constructor(options: ConstructorParameters<typeof BaseBuilder>[0]) {
    super(options);
    this._workerPath = import.meta.resolve("../workers/dts.worker");
  }

  protected getBuilderType(): string {
    return "dts";
  }

  /**
   * Determine TypecheckEnv from package target
   */
  private _getEnv(pkg: PackageInfo): TypecheckEnv {
    const target = pkg.config.target;
    if (target === "node") return "node";
    return "browser"; // browser, neutral, client all use browser environment
  }

  protected createWorkers(): void {
    for (const pkg of this.packages) {
      this.workerManager.create<typeof DtsWorkerModule>(`${pkg.name}:dts`, this._workerPath);
    }
  }

  protected registerEventHandlers(): void {
    for (const pkg of this.packages) {
      const workerKey = `${pkg.name}:dts`;
      const listrTitle = `${pkg.name} (dts)`;
      this.registerEventHandlersForWorker(pkg, workerKey, "dts", listrTitle);
    }
  }

  protected async buildPackage(pkg: PackageInfo): Promise<void> {
    const worker = this.workerManager.get<typeof DtsWorkerModule>(`${pkg.name}:dts`)!;

    const buildPromise = new Promise<void>((resolve) => {
      const originalResolver = this.buildResolvers.get(`${pkg.name}:dts`);
      this.buildResolvers.set(`${pkg.name}:dts`, () => {
        originalResolver?.();
        resolve();
      });
    });

    void worker.startWatch({
      name: pkg.name,
      cwd: this.cwd,
      pkgDir: pkg.dir,
      env: this._getEnv(pkg),
    });

    await buildPromise;
  }

  protected startWatchPackage(pkg: PackageInfo): void {
    const worker = this.workerManager.get<typeof DtsWorkerModule>(`${pkg.name}:dts`)!;

    worker
      .startWatch({
        name: pkg.name,
        cwd: this.cwd,
        pkgDir: pkg.dir,
        env: this._getEnv(pkg),
      })
      .catch((err: unknown) => {
        const result: BuildResult = {
          name: pkg.name,
          target: pkg.config.target,
          type: "dts",
          status: "error",
          message: errorMessage(err),
        };
        this.resultCollector.add(result);
        this.completeBuild(pkg);
      });
  }
}
