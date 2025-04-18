import { FsUtils, PathUtils, SdFsWatcher, SdLogger, TNormPath } from "@simplysm/sd-core-node";
import path from "path";
import { EventEmitter } from "events";
import { SdCliIndexFileGenerator } from "./sd-cli-index.file-generator";
import { SdTsLibBuilder } from "./sd-ts-lib.builder";
import { ISdLibPackageConfig, ISdProjectConfig } from "../../types/config.types";
import { ISdBuildMessage, ISdBuildRunnerResult } from "../../types/build.types";
import { SdCliDbContextFileGenerator } from "./sd-cli-db-context.file-generator";

export class SdTsLibBuildRunner extends EventEmitter {
  private _logger = SdLogger.get(["simplysm", "sd-cli", "SdCliTsLibBuilder"]);

  private _projConf: ISdProjectConfig;
  private _pkgPath: string;
  private _pkgConf: ISdLibPackageConfig;
  private _watchScopePathSet: Set<TNormPath>;

  private _builder?: SdTsLibBuilder;

  public constructor(projConf: ISdProjectConfig, pkgPath: string) {
    super();
    this._projConf = projConf;
    this._pkgPath = pkgPath;

    this._pkgConf = projConf.packages[path.basename(pkgPath)] as ISdLibPackageConfig;

    const localUpdatePaths = Object.keys(this._projConf.localUpdates ?? {}).mapMany((key) =>
      FsUtils.glob(path.resolve(this._pkgPath, "../../node_modules", key)),
    );
    this._watchScopePathSet = new Set(
      [path.resolve(this._pkgPath, "../"), ...localUpdatePaths].map((item) => PathUtils.norm(item)),
    );
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (result: ISdBuildRunnerResult) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  public async buildAsync(): Promise<ISdBuildRunnerResult> {
    this._debug("dist 초기화...");
    FsUtils.remove(path.resolve(this._pkgPath, "dist"));

    if (!this._pkgConf.noGenIndex) {
      this._debug("GEN index.ts...");
      SdCliIndexFileGenerator.run(this._pkgPath, this._pkgConf.polyfills);
    }

    if (this._pkgConf.dbContext != null) {
      this._debug("WATCH GEN index.ts...");
      SdCliDbContextFileGenerator.run(this._pkgPath, this._pkgConf.dbContext);
    }

    const result = await this._runAsync(false, new Set<TNormPath>());
    return {
      affectedFilePathSet: result.affectedFileSet,
      buildMessages: result.buildMessages,
      emitFileSet: result.emitFileSet,
    };
  }

  public async watchAsync(): Promise<void> {
    this.emit("change");

    this._debug("dist 초기화...");
    FsUtils.remove(path.resolve(this._pkgPath, "dist"));

    if (!this._pkgConf.noGenIndex) {
      this._debug("WATCH GEN index.ts...");
      SdCliIndexFileGenerator.watch(this._pkgPath, this._pkgConf.polyfills);
    }

    if (this._pkgConf.dbContext != null) {
      this._debug("WATCH GEN index.ts...");
      SdCliDbContextFileGenerator.watch(this._pkgPath, this._pkgConf.dbContext);
    }

    const result = await this._runAsync(true, new Set<TNormPath>());
    const res: ISdBuildRunnerResult = {
      affectedFilePathSet: result.affectedFileSet,
      buildMessages: result.buildMessages,
      emitFileSet: result.emitFileSet,
    };
    this.emit("complete", res);

    this._debug("WATCH...");
    let lastWatchFileSet = result.watchFileSet;
    SdFsWatcher.watch(Array.from(this._watchScopePathSet))
      .onChange({ delay: 100 }, async (changeInfos) => {
        const currentChangeInfos = changeInfos.filter((item) => lastWatchFileSet.has(item.path));
        if (currentChangeInfos.length < 1) return;

        this.emit("change");

        const changeFileSet = new Set(currentChangeInfos.map((item) => PathUtils.norm(item.path)));

        const watchResult = await this._runAsync(true, changeFileSet);
        const watchRes: ISdBuildRunnerResult = {
          affectedFilePathSet: watchResult.affectedFileSet,
          buildMessages: watchResult.buildMessages,
          emitFileSet: watchResult.emitFileSet,
        };

        this.emit("complete", watchRes);

        lastWatchFileSet = watchResult.watchFileSet;
      });
  }

  private async _runAsync(
    dev: boolean,
    modifiedFileSet: Set<TNormPath>,
  ): Promise<{
    watchFileSet: Set<TNormPath>;
    affectedFileSet: Set<TNormPath>;
    buildMessages: ISdBuildMessage[];
    emitFileSet: Set<TNormPath>;
  }> {
    const localUpdatePaths = Object.keys(this._projConf.localUpdates ?? {})
      .mapMany((key) => FsUtils.glob(path.resolve(this._pkgPath, "../../node_modules", key)))
      .map((item) => PathUtils.norm(item));

    this._debug(`BUILD...`);
    this._builder ??= new SdTsLibBuilder(
      PathUtils.norm(this._pkgPath),
      dev,
      [
        PathUtils.norm(this._pkgPath, "../"),
        ...localUpdatePaths,
      ].map((item) => PathUtils.norm(item)),
    );
    const buildResult = await this._builder.buildAsync(modifiedFileSet);

    this._debug(`빌드 완료`);
    const watchFileSet = new Set(
      Array.from(buildResult.watchFileSet).filter(
        (item) =>
          PathUtils.isChildPath(item, path.resolve(this._pkgPath, "../")) ||
          localUpdatePaths.some((lu) => PathUtils.isChildPath(item, lu)),
      ),
    );

    return {
      watchFileSet,
      affectedFileSet: buildResult.affectedFileSet,
      buildMessages: buildResult.results,
      emitFileSet: buildResult.emitFileSet,
    };
  }

  private _debug(msg: string): void {
    this._logger.debug(`[${path.basename(this._pkgPath)}] ${msg}`);
  }
}
