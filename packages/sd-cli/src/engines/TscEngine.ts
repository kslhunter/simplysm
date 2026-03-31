import type * as LibraryBuildWorkerModule from "../workers/library-build.worker";
import type { ResultCollector } from "../infra/ResultCollector";
import type { RebuildManager } from "../utils/rebuild-manager";
import type { BuildOutput, BuildPackageInfo, EngineResult } from "./types";
import { BaseEngine, type CommonBuildWorkerModule } from "./BaseEngine";
import { consola } from "consola";

const logger = consola.withTag("sd:cli:engine:tsc");

/**
 * TscEngine options
 */
export interface TscEngineOptions {
  cwd: string;
  pkg: BuildPackageInfo;
  /** replaceDeps configuration from sd.config.ts */
  replaceDeps?: Record<string, string>;
  /** ResultCollector for watch mode rebuild reporting */
  resultCollector?: ResultCollector;
  /** RebuildManager for watch mode batch coordination */
  rebuildManager?: RebuildManager;
}

/**
 * tsc-based build engine for Library packages (node/browser/neutral)
 *
 * Wraps a single library-build.worker that uses tsc for JS + DTS emit
 * in one Worker thread.
 */
export class TscEngine extends BaseEngine<
  BuildPackageInfo,
  typeof LibraryBuildWorkerModule & CommonBuildWorkerModule
> {
  constructor(options: TscEngineOptions) {
    super(options);
  }

  protected _getWorkerPath(): string {
    return import.meta.resolve("../workers/library-build.worker");
  }

  protected _getTarget(): string {
    return this._pkg.config.target;
  }

  protected async _callBuild(output: BuildOutput): Promise<EngineResult> {
    logger.debug(`[${this._pkg.name}] worker.build 호출`);
    const result = await this._worker!.build({
      name: this._pkg.name,
      config: this._pkg.config,
      cwd: this._cwd,
      pkgDir: this._pkg.dir,
      output,
    });

    return {
      success: result.build.success,
      build: {
        success: result.build.success,
        errors: result.build.errors ?? [],
        warnings: result.build.warnings ?? [],
        diagnostics: result.build.diagnostics,
      },
      lint: result.lint,
    };
  }

  protected async _callStartWatch(output: BuildOutput): Promise<void> {
    logger.debug(`[${this._pkg.name}] worker.startWatch 호출`);
    await this._worker!.startWatch({
      name: this._pkg.name,
      config: this._pkg.config,
      cwd: this._cwd,
      pkgDir: this._pkg.dir,
      output,
      replaceDeps: this._replaceDeps,
    });
  }
}
