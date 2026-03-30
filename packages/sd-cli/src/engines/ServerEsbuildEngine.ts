import type * as ServerBuildWorkerModule from "../workers/server-build.worker";
import type { ResultCollector } from "../infra/ResultCollector";
import type { RebuildManager } from "../utils/rebuild-manager";
import type { BuildOutput, EngineResult, ServerPackageInfo } from "./types";
import { BaseEngine, type CommonBuildWorkerModule } from "./BaseEngine";

/**
 * ServerEsbuildEngine options
 */
export interface ServerEsbuildEngineOptions {
  cwd: string;
  pkg: ServerPackageInfo;
  /** replaceDeps configuration from sd.config.ts */
  replaceDeps?: Record<string, string>;
  /** ResultCollector for watch mode rebuild reporting */
  resultCollector?: ResultCollector;
  /** RebuildManager for watch mode batch coordination */
  rebuildManager?: RebuildManager;
}

/**
 * Esbuild-based build engine for Server packages
 *
 * Wraps a single server-build.worker that combines esbuild (JS bundle)
 * + tsc (typecheck) in one Worker thread.
 */
export class ServerEsbuildEngine extends BaseEngine<
  ServerPackageInfo,
  typeof ServerBuildWorkerModule & CommonBuildWorkerModule
> {
  constructor(options: ServerEsbuildEngineOptions) {
    super(options);
  }

  protected _getWorkerPath(): string {
    return import.meta.resolve("../workers/server-build.worker");
  }

  protected _getTarget(): string {
    return "server";
  }

  protected async _callBuild(output: BuildOutput): Promise<EngineResult> {
    const result = await this._worker!.build({
      name: this._pkg.name,
      cwd: this._cwd,
      pkgDir: this._pkg.dir,
      output,
      env: this._pkg.config.env,
      configs: this._pkg.config.configs,
      externals: this._pkg.config.externals,
      pm2: this._pkg.config.pm2,
      packageManager: this._pkg.config.packageManager,
    });

    return {
      success: result.js.success && result.dts.success,
      js: {
        success: result.js.success,
        errors: result.js.errors ?? [],
        warnings: result.js.warnings ?? [],
      },
      dts: {
        success: result.dts.success,
        errors: result.dts.errors ?? [],
        warnings: [],
        diagnostics: result.dts.diagnostics,
      },
      lint: result.lint,
    };
  }

  protected async _callStartWatch(output: BuildOutput): Promise<void> {
    await this._worker!.startWatch({
      name: this._pkg.name,
      cwd: this._cwd,
      pkgDir: this._pkg.dir,
      output,
      env: this._pkg.config.env,
      configs: this._pkg.config.configs,
      externals: this._pkg.config.externals,
      replaceDeps: this._replaceDeps,
    });
  }
}
