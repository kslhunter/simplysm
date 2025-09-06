import { FsUtils, SdLogger, TNormPath } from "@simplysm/sd-core-node";
import path from "path";
import { ISdProjectConfig, TSdPackageConfig } from "../../types/config/ISdProjectConfig";
import { ScopePathSet } from "./ScopePathSet";
import { ISdBuildResult } from "../../types/build/ISdBuildResult";

export abstract class SdBuildRunnerBase<T extends "server" | "library" | "client"> {
  protected abstract _logger: SdLogger;

  protected _pkgName: string;
  protected _pkgConf: TSdPackageConfig<T>;

  protected _scopePathSet: ScopePathSet;

  constructor(
    protected _pkgPath: TNormPath,
    protected _projConf: ISdProjectConfig,
    scopePathSet: Set<TNormPath>,
    protected _watch: boolean,
    protected _dev: boolean,
    protected _emitOnly?: boolean,
    protected _noEmit?: boolean,
  ) {
    this._pkgName = path.basename(_pkgPath);
    this._pkgConf = _projConf.packages[this._pkgName] as TSdPackageConfig<T>;

    this._scopePathSet = new ScopePathSet(scopePathSet);
  }

  async rebuildAsync(modifiedFileSet?: Set<TNormPath>): Promise<ISdBuildResult> {
    if (!modifiedFileSet && !this._noEmit) {
      const distPath = path.resolve(this._pkgPath, "dist");
      if (FsUtils.exists(distPath)) {
        this._debug("dist 초기화...");
        FsUtils.remove(distPath);
      }
    }

    return await this._runAsync(modifiedFileSet);
  }

  protected abstract _runAsync(modifiedFileSet?: Set<TNormPath>): Promise<ISdBuildResult>;

  protected _debug(msg: string): void {
    this._logger.debug(`[${path.basename(this._pkgPath)}] ${msg}`);
  }
}
