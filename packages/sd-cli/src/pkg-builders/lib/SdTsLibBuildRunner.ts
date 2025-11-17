import { SdLogger, TNormPath } from "@simplysm/sd-core-node";
import { SdBuildRunnerBase } from "../SdBuildRunnerBase";
import { SdTsLibBuilder } from "./SdTsLibBuilder";
import { SdCliIndexFileGenerator } from "./SdCliIndexFileGenerator";
import { ISdBuildResult } from "../../types/build/ISdBuildResult";
import { SdCliDbContextFileGenerator } from "./SdCliDbContextFileGenerator";

export class SdTsLibBuildRunner extends SdBuildRunnerBase<"library"> {
  protected override _logger = SdLogger.get(["simplysm", "sd-cli", "SdTsLibBuildRunner"]);

  #builder?: SdTsLibBuilder;

  protected override async _runAsync(modifiedFileSet?: Set<TNormPath>): Promise<ISdBuildResult> {
    // 최초한번
    if (!modifiedFileSet) {
      if (!this._opt.watch?.noEmit) {
        // index
        if (this._pkgConf.index !== false) {
          this._debug("GEN index.ts...");
          await new SdCliIndexFileGenerator().watchAsync(
            this._opt.pkgPath,
            this._pkgConf.polyfills,
            this._pkgConf.index?.excludes,
          );
        }

        // db-context
        if (this._pkgConf.dbContext != null) {
          this._debug(`GEN ${this._pkgConf.dbContext}.ts...`);
          await new SdCliDbContextFileGenerator().watchAsync(
            this._opt.pkgPath,
            this._pkgConf.dbContext,
          );
        }
      }

      this._debug(`BUILD 준비...`);
      this.#builder = new SdTsLibBuilder(this._opt);
    }

    this._debug(`BUILD...`);
    const buildResult = await this.#builder!.buildAsync(modifiedFileSet);

    this._debug(`빌드 완료`);
    return buildResult;
  }
}
