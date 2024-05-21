import {FsUtil, Logger, PathUtil, SdFsWatcher} from "@simplysm/sd-core-node";
import path from "path";
import {ISdCliBuilderResult, ISdCliConfig, ISdCliLibPackageConfig, ISdCliPackageBuildResult} from "../commons";
import {EventEmitter} from "events";
import {SdTsLibBundler} from "../build-tools/SdTsLibBundler";
import {SdLinter} from "../build-tools/SdLinter";
import {FunctionQueue} from "@simplysm/sd-core-common";
import {SdCliIndexFileGenerator} from "../build-tools/SdCliIndexFileGenerator";

export class SdCliTsLibBuilder extends EventEmitter {
  readonly #logger = Logger.get(["simplysm", "sd-cli", "SdCliTsLibBuilder"]);

  readonly #projConf: ISdCliConfig;
  readonly #pkgPath: string;
  readonly #pkgConf: ISdCliLibPackageConfig;

  #bundler?: SdTsLibBundler;

  public constructor(projConf: ISdCliConfig,
                     pkgPath: string) {
    super();
    this.#projConf = projConf;
    this.#pkgPath = pkgPath;

    this.#pkgConf = projConf.packages[path.basename(pkgPath)] as ISdCliLibPackageConfig;
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (result: ISdCliBuilderResult) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  public async buildAsync(): Promise<ISdCliBuilderResult> {
    this._debug("dist 초기화...");
    await FsUtil.removeAsync(path.resolve(this.#pkgPath, "dist"));

    if (!this.#pkgConf.noGenIndex) {
      this._debug("GEN index.ts...");
      await SdCliIndexFileGenerator.runAsync(this.#pkgPath, this.#pkgConf.polyfills);
    }

    const result = await this._runAsync(false);
    return {
      affectedFilePaths: Array.from(result.affectedFileSet),
      buildResults: result.buildResults
    };
  }

  public async watchAsync(): Promise<void> {
    this.emit("change");

    this._debug("dist 초기화...");
    await FsUtil.removeAsync(path.resolve(this.#pkgPath, "dist"));

    if (!this.#pkgConf.noGenIndex) {
      this._debug("WATCH GEN index.ts...");
      await SdCliIndexFileGenerator.watchAsync(this.#pkgPath, this.#pkgConf.polyfills);
    }

    const result = await this._runAsync(true);
    this.emit("complete", {
      affectedFilePaths: Array.from(result.affectedFileSet),
      buildResults: result.buildResults
    });

    this._debug("WATCH...");
    const fnQ = new FunctionQueue();
    const watcher = SdFsWatcher
      .watch(Array.from(result.watchFileSet))
      .onChange({delay: 100,}, (changeInfos) => {
        this.#bundler!.markChanges(new Set(changeInfos.map((item) => item.path)));

        fnQ.runLast(async () => {
          this.emit("change");

          const watchResult = await this._runAsync(true);
          this.emit("complete", {
            affectedFilePaths: Array.from(watchResult.affectedFileSet),
            buildResults: watchResult.buildResults
          });

          watcher.add(watchResult.watchFileSet);
        });
      });
  }

  private async _runAsync(dev: boolean): Promise<{
    watchFileSet: Set<string>;
    affectedFileSet: Set<string>;
    buildResults: ISdCliPackageBuildResult[];
  }> {
    this._debug(`BUILD...`);
    this.#bundler = this.#bundler ?? new SdTsLibBundler(this.#pkgPath, dev);
    const buildResult = await this.#bundler.buildAsync();

    this._debug("LINT...");
    const lintFilePaths = Array.from(buildResult.affectedFileSet).filter(item => PathUtil.isChildPath(item, this.#pkgPath));
    const lintResults = await SdLinter.lintAsync(lintFilePaths, buildResult.program);

    this._debug(`빌드 완료`);
    const localUpdatePaths = Object.keys(this.#projConf.localUpdates ?? {})
      .mapMany((key) => FsUtil.glob(path.resolve(this.#pkgPath, "../../node_modules", key)));
    const watchFileSet = new Set(Array.from(buildResult.watchFileSet).filter(item =>
      PathUtil.isChildPath(item, path.resolve(this.#pkgPath, "../")) ||
      localUpdatePaths.some((lu) => PathUtil.isChildPath(item, lu))
    ));

    return {
      watchFileSet,
      affectedFileSet: buildResult.affectedFileSet,
      buildResults: [...buildResult.results, ...lintResults]
    };
  }

  private _debug(msg: string): void {
    this.#logger.debug(`[${path.basename(this.#pkgPath)}] ${msg}`);
  }
}
