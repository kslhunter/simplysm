import type * as NgtscBuildWorkerModule from "../workers/ngtsc-build.worker";
import type { ResultCollector } from "../infra/ResultCollector";
import type { RebuildManager } from "../utils/rebuild-manager";
import type { BuildOutput, BuildPackageInfo, EngineResult } from "./types";
import { BaseEngine, type CommonBuildWorkerModule } from "./BaseEngine";
import { consola } from "consola";

const logger = consola.withTag("sd:cli:engine:ngtsc");

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
    logger.debug(`[${this._pkg.name}] worker.build 호출`);
    const result = await this._worker!.build({
      name: this._pkg.name,
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
      cwd: this._cwd,
      pkgDir: this._pkg.dir,
      output,
      replaceDeps: this._replaceDeps,
    });
  }
}
