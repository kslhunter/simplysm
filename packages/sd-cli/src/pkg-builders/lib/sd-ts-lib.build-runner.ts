import { PathUtils, SdLogger, TNormPath } from "@simplysm/sd-core-node";
import { SdTsLibBuilder } from "./sd-ts-lib.builder";
import { BuildRunnerBase, IBuildRunnerRunResult } from "../commons/build-runner.base";
import { SdCliIndexFileGenerator } from "./sd-cli-index.file-generator";
import { SdCliDbContextFileGenerator } from "./sd-cli-db-context.file-generator";

export class SdTsLibBuildRunner extends BuildRunnerBase<"library"> {
  protected override _logger = SdLogger.get(["simplysm", "sd-cli", "SdCliTsLibBuilder"]);

  #builder?: SdTsLibBuilder;

  protected override async _runAsync(
    dev: boolean,
    modifiedFileSet?: Set<TNormPath>,
  ): Promise<IBuildRunnerRunResult> {
    if (!modifiedFileSet) {
      if (!dev) {
        if (!this._pkgConf.noGenIndex) {
          this._debug("GEN index.ts...");
          SdCliIndexFileGenerator.run(this._pkgPath, this._pkgConf.polyfills);
        }

        if (this._pkgConf.dbContext != null) {
          this._debug(`GEN ${this._pkgConf.dbContext}.ts...`);
          SdCliDbContextFileGenerator.run(this._pkgPath, this._pkgConf.dbContext);
        }
      }
      else {
        if (!this._pkgConf.noGenIndex) {
          this._debug("Watch for GEN index.ts...");
          SdCliIndexFileGenerator.watch(this._pkgPath, this._pkgConf.polyfills);
        }

        if (this._pkgConf.dbContext != null) {
          this._debug(`Watch for GEN ${this._pkgConf.dbContext}.ts...`);
          SdCliDbContextFileGenerator.watch(this._pkgPath, this._pkgConf.dbContext);
        }
      }
    }

    this._debug(`BUILD...`);
    this.#builder ??= new SdTsLibBuilder(
      PathUtils.norm(this._pkgPath),
      dev,
      this._watchScopePathSet,
    );
    const buildResult = await this.#builder.buildAsync(modifiedFileSet ?? new Set());

    this._debug(`빌드 완료`);
    const watchFileSet = new Set(
      Array.from(buildResult.watchFileSet).filter((item) => this._watchScopePathSet.inScope(item)),
    );

    return {
      watchFileSet,
      affectedFileSet: buildResult.affectedFileSet,
      buildMessages: buildResult.results,
      emitFileSet: buildResult.emitFileSet,
    };
  }
}
