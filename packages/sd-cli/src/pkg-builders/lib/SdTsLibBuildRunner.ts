import { FsUtil, Logger, PathUtil, SdFsWatcher, TNormPath } from "@simplysm/sd-core-node";
import path from "path";
import { EventEmitter } from "events";
import { SdCliIndexFileGenerator } from "./SdCliIndexFileGenerator";
import { SdTsLibBuilder } from "./SdTsLibBuilder";
import { ISdLibPackageConfig, ISdProjectConfig } from "../../types/sd-configs.type";
import { ISdBuildMessage, ISdBuildRunnerResult } from "../../types/build.type";

export class SdTsLibBuildRunner extends EventEmitter {
  readonly #logger = Logger.get(["simplysm", "sd-cli", "SdCliTsLibBuilder"]);

  readonly #projConf: ISdProjectConfig;
  readonly #pkgPath: string;
  readonly #pkgConf: ISdLibPackageConfig;

  #builder?: SdTsLibBuilder;

  public constructor(projConf: ISdProjectConfig, pkgPath: string) {
    super();
    this.#projConf = projConf;
    this.#pkgPath = pkgPath;

    this.#pkgConf = projConf.packages[path.basename(pkgPath)] as ISdLibPackageConfig;
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (result: ISdBuildRunnerResult) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  public async buildAsync(): Promise<ISdBuildRunnerResult> {
    this._debug("dist 초기화...");
    FsUtil.remove(path.resolve(this.#pkgPath, "dist"));

    if (!this.#pkgConf.noGenIndex) {
      this._debug("GEN index.ts...");
      SdCliIndexFileGenerator.run(this.#pkgPath, this.#pkgConf.polyfills);
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
    FsUtil.remove(path.resolve(this.#pkgPath, "dist"));

    if (!this.#pkgConf.noGenIndex) {
      this._debug("WATCH GEN index.ts...");
      SdCliIndexFileGenerator.watch(this.#pkgPath, this.#pkgConf.polyfills);
    }

    const result = await this._runAsync(true, new Set<TNormPath>());
    const res: ISdBuildRunnerResult = {
      affectedFilePathSet: result.affectedFileSet,
      buildMessages: result.buildMessages,
      emitFileSet: result.emitFileSet,
    };
    this.emit("complete", res);

    this._debug("WATCH...");
    const watcher = SdFsWatcher.watch(Array.from(result.watchFileSet)).onChange({ delay: 100 }, async (changeInfos) => {
      this.emit("change");

      const changeFileSet = new Set(changeInfos.map((item) => PathUtil.norm(item.path)));

      const watchResult = await this._runAsync(true, changeFileSet);
      const watchRes: ISdBuildRunnerResult = {
        affectedFilePathSet: watchResult.affectedFileSet,
        buildMessages: watchResult.buildMessages,
        emitFileSet: watchResult.emitFileSet,
      };

      this.emit("complete", watchRes);

      watcher.replaceWatchPaths(watchResult.watchFileSet);
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
    const localUpdatePaths = Object.keys(this.#projConf.localUpdates ?? {})
      .mapMany((key) => FsUtil.glob(path.resolve(this.#pkgPath, "../../node_modules", key)))
      .map((item) => PathUtil.norm(item));

    this._debug(`BUILD...`);
    this.#builder ??= await SdTsLibBuilder.new(PathUtil.norm(this.#pkgPath), dev, [
      PathUtil.norm(this.#pkgPath, "../"),
      ...localUpdatePaths,
    ]);
    const buildResult = await this.#builder.buildAsync(modifiedFileSet);

    this._debug(`빌드 완료`);
    const watchFileSet = new Set(
      Array.from(buildResult.watchFileSet).filter(
        (item) =>
          PathUtil.isChildPath(item, path.resolve(this.#pkgPath, "../")) ||
          localUpdatePaths.some((lu) => PathUtil.isChildPath(item, lu)),
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
    this.#logger.debug(`[${path.basename(this.#pkgPath)}] ${msg}`);
  }
}
