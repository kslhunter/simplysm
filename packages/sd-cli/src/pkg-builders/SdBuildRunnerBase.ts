import { FsUtils, SdLogger, TNormPath } from "@simplysm/sd-core-node";
import path from "path";
import { TSdPackageConfig } from "../types/config/ISdProjectConfig";
import { ISdBuildResult } from "../types/build/ISdBuildResult";
import { ISdTsCompilerOptions } from "../types/build/ISdTsCompilerOptions";

export abstract class SdBuildRunnerBase<T extends "server" | "library" | "client"> {
  protected abstract _logger: SdLogger;

  protected _pkgName: string;

  constructor(
    protected _opt: ISdTsCompilerOptions,
    protected _pkgConf: TSdPackageConfig<T>,
  ) {
    this._pkgName = path.basename(_opt.pkgPath);
  }

  async rebuildAsync(modifiedFileSet?: Set<TNormPath>): Promise<ISdBuildResult> {
    if (!modifiedFileSet && !this._opt.watch?.noEmit) {
      const distPath = path.resolve(this._opt.pkgPath, "dist");
      if (FsUtils.exists(distPath)) {
        this._debug("dist 초기화...");
        await FsUtils.removeAsync(distPath);
      }
    }

    return await this._runAsync(modifiedFileSet);
  }

  protected abstract _runAsync(modifiedFileSet?: Set<TNormPath>): Promise<ISdBuildResult>;

  protected _debug(msg: string): void {
    this._logger.debug(`[${path.basename(this._opt.pkgPath)}] ${msg}`);
  }
}
