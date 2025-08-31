import { PathUtils, SdLogger, TNormPath } from "@simplysm/sd-core-node";
import { SdTsLibBuilder } from "./sd-ts-lib.builder";
import { BuildRunnerBase, IBuildRunnerRunResult } from "../commons/build-runner.base";
import { SdCliIndexFileGenerator } from "./sd-cli-index.file-generator";
import { SdCliDbContextFileGenerator } from "./sd-cli-db-context.file-generator";

export class SdTsLibBuildRunner extends BuildRunnerBase<"library"> {
  protected override _logger = SdLogger.get(["simplysm", "sd-cli", "SdTsLibBuildRunner"]);

  #indexFileGenerator = new SdCliIndexFileGenerator();
  #dbContextGenerator = new SdCliDbContextFileGenerator();
  #builder?: SdTsLibBuilder;

  #hasGenIndexError = false;
  #hasGenDbContextError = false;

  protected override async _runAsync(
    dev: boolean,
    emitOnly: boolean,
    noEmit: boolean,
    modifiedFileSet?: Set<TNormPath>,
  ): Promise<IBuildRunnerRunResult> {
    let indexFileNPath: TNormPath | undefined;
    let dbContentFileNPath: TNormPath | undefined;
    if (!noEmit) {
      if (!this._pkgConf.noGenIndex) {
        this._debug("GEN index.ts...");
        const genIndexResult = this.#indexFileGenerator.run(this._pkgPath, this._pkgConf.polyfills);
        if (modifiedFileSet && (genIndexResult.changed || this.#hasGenIndexError)) {
          modifiedFileSet.add(PathUtils.norm(genIndexResult.filePath));
        }
        indexFileNPath = PathUtils.norm(genIndexResult.filePath);
      }

      if (this._pkgConf.dbContext != null) {
        this._debug(`GEN ${this._pkgConf.dbContext}.ts...`);
        const genDbContextResult = this.#dbContextGenerator.run(
          this._pkgPath,
          this._pkgConf.dbContext,
        );
        if (modifiedFileSet && (genDbContextResult.changed || this.#hasGenDbContextError)) {
          modifiedFileSet.add(PathUtils.norm(genDbContextResult.filePath));
        }
        dbContentFileNPath = PathUtils.norm(genDbContextResult.filePath);
      }
    }

    this._debug(`BUILD...`);
    this.#builder ??= new SdTsLibBuilder(
      PathUtils.norm(this._pkgPath),
      dev,
      emitOnly,
      noEmit,
      this._watchScopePathSet,
    );
    const buildResult = await this.#builder.buildAsync(modifiedFileSet ?? new Set());

    this.#hasGenIndexError =
      indexFileNPath != null &&
      buildResult.results.map((item) => item.filePath).includes(indexFileNPath);
    this.#hasGenDbContextError =
      dbContentFileNPath != null &&
      buildResult.results.map((item) => item.filePath).includes(dbContentFileNPath);

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
