import type * as NgtscBuildWorkerModule from "../workers/ngtsc-build.worker";
import type { ResultCollector } from "../infra/ResultCollector";
import type { RebuildManager } from "../utils/rebuild-manager";
import type { BuildOutput, BuildPackageInfo, EngineResult } from "./types";
import { BaseEngine, type CommonBuildWorkerModule } from "./BaseEngine";

/**
 * NgtscEngine options
 */
export interface NgtscEngineOptions {
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
 * NgtscProgram-based build engine for Angular Library packages
 *
 * Wraps a single ngtsc-build.worker that uses NgtscProgram for AOT compilation.
 * Angular packages are detected by the presence of angularCompilerOptions in tsconfig.json.
 */
export class NgtscEngine extends BaseEngine<
  BuildPackageInfo,
  typeof NgtscBuildWorkerModule & CommonBuildWorkerModule
> {
  constructor(options: NgtscEngineOptions) {
    super(options);
  }

  protected _getWorkerPath(): string {
    return import.meta.resolve("../workers/ngtsc-build.worker");
  }

  protected _getTarget(): string {
    return this._pkg.config.target;
  }

  protected async _callBuild(output: BuildOutput): Promise<EngineResult> {
    const result = await this._worker!.build({
      name: this._pkg.name,
      cwd: this._cwd,
      pkgDir: this._pkg.dir,
      output,
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
      replaceDeps: this._replaceDeps,
    });
  }
}
