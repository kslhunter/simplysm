import {EventEmitter} from "events";
import {FsUtil, Logger, PathUtil, SdFsWatcher} from "@simplysm/sd-core-node";
import {ISdCliBuilderResult, ISdCliClientPackageConfig, ISdCliConfig, ISdCliPackageBuildResult} from "../commons";
import {FunctionQueue, Wait} from "@simplysm/sd-core-common";
import path from "path";
import {SdNgBundler} from "../build-tools/SdNgBundler";
import {SdLinter} from "../build-tools/SdLinter";

export class SdCliClientBuilder extends EventEmitter {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", "SdCliClientBuilder"]);
  private readonly _pkgConf: ISdCliClientPackageConfig;
  private _builders?: SdNgBundler[];

  public constructor(private readonly _projConf: ISdCliConfig,
                     private readonly _pkgPath: string) {
    super();
    this._pkgConf = this._projConf.packages[path.basename(_pkgPath)] as ISdCliClientPackageConfig;
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (result: ISdCliBuilderResult) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  public async buildAsync(): Promise<ISdCliBuilderResult> {
    this._debug("dist 초기화...");
    await FsUtil.removeAsync(path.resolve(this._pkgPath, "dist"));

    return await this._runAsync({dev: false, genConf: true});
  }

  public async watchAsync(): Promise<void> {
    this.emit("change");

    this._debug("dist 초기화...");
    await FsUtil.removeAsync(path.resolve(this._pkgPath, "dist"));

    const result = await this._runAsync({dev: true, genConf: true});
    this.emit("complete", result);

    this._debug("WATCH...");
    const fnQ = new FunctionQueue();
    const watcher = SdFsWatcher
      .watch([
        ...result.watchFilePaths,
        path.resolve(this._pkgPath, "src/**/*.*")
      ])
      .onChange({delay: 100}, (changeInfos) => {
        for (const builder of this._builders!) {
          builder.removeCache(changeInfos.map((item) => item.path));
        }

        fnQ.runLast(async () => {
          this.emit("change");

          const watchResult = await this._runAsync({dev: true, genConf: false});
          this.emit("complete", watchResult);

          watcher.add(watchResult.watchFilePaths);
        });
      });
  }

  private async _runAsync(opt: {
    dev: boolean;
    genConf: boolean;
  }): Promise<{
    watchFilePaths: string[];
    affectedFilePaths: string[];
    buildResults: ISdCliPackageBuildResult[];
  }> {
    this._debug(`BUILD 준비...`);
    const builderTypes = (Object.keys(this._pkgConf.builder ?? {web: {}}) as ("web")[]);
    this._builders = this._builders ?? builderTypes.map((builderType) => new SdNgBundler({
      dev: opt.dev,
      builderType: builderType,
      pkgPath: this._pkgPath
    }));

    this._debug(`BUILD & CHECK...`);
    const buildResults = await Promise.all(this._builders.map((builder) => builder.bundleAsync()));
    const filePaths = buildResults.mapMany(item => item.filePaths).distinct();
    const affectedFilePaths = buildResults.mapMany(item => item.affectedFilePaths).distinct();
    const results = buildResults.mapMany((item) => item.results).distinct();

    this._debug(`LINT...`);
    const lintResults = await SdLinter.lintAsync(affectedFilePaths, this._pkgPath);

    if (opt.genConf) {
      this._debug("GEN .config...");
      if (opt.dev && this._pkgConf.server !== undefined) {
        const serverDistPath = path.resolve(this._pkgPath, "../", this._pkgConf.server, "dist");
        await Wait.until(() => FsUtil.exists(serverDistPath));
        await FsUtil.writeJsonAsync(path.resolve(serverDistPath, "www", path.basename(this._pkgPath), ".config.json"), this._pkgConf.configs ?? {}, {space: 2});
      }
      else {
        await FsUtil.writeJsonAsync(path.resolve(this._pkgPath, "dist/.config.json"), this._pkgConf.configs ?? {}, {space: 2});
      }
    }

    const localUpdatePaths = Object.keys(this._projConf.localUpdates ?? {})
      .mapMany((key) => FsUtil.glob(path.resolve(this._pkgPath, "../../node_modules", key)));
    const watchFilePaths = filePaths
      .filter((item) =>
        PathUtil.isChildPath(item, path.resolve(this._pkgPath, "../")) ||
        localUpdatePaths.some((lu) => PathUtil.isChildPath(item, lu))
      );

    this._debug(`빌드 완료`);
    return {
      watchFilePaths: watchFilePaths,
      affectedFilePaths: affectedFilePaths,
      buildResults: [...results, ...lintResults]
    };
  }

  private _debug(msg: string): void {
    this._logger.debug(`[${path.basename(this._pkgPath)}] ${msg}`);
  }
}