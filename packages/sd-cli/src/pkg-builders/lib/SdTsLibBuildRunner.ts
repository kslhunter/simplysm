import { FsUtil, Logger, PathUtil, SdFsWatcher } from "@simplysm/sd-core-node";
import path from "path";
import { ISdBuildMessage, ISdBuildRunnerResult, ISdLibPackageConfig, ISdProjectConfig } from "../../commons";
import { EventEmitter } from "events";
import { FunctionQueue } from "@simplysm/sd-core-common";
import { SdCliIndexFileGenerator } from "./SdCliIndexFileGenerator";
import { SdTsLibBuilder } from "./SdTsLibBuilder";

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
    await FsUtil.removeAsync(path.resolve(this.#pkgPath, "dist"));

    if (!this.#pkgConf.noGenIndex) {
      this._debug("GEN index.ts...");
      await SdCliIndexFileGenerator.runAsync(this.#pkgPath, this.#pkgConf.polyfills);
    }

    const result = await this._runAsync(false);
    return {
      affectedFilePaths: Array.from(result.affectedFileSet),
      buildMessages: result.buildMessages,
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
      buildMessages: result.buildMessages,
    });

    this._debug("WATCH...");
    const fnQ = new FunctionQueue();
    const watcher = SdFsWatcher.watch(Array.from(result.watchFileSet)).onChange({ delay: 100 }, async (changeInfos) => {
      await this.#builder!.markChangesAsync(new Set(changeInfos.map((item) => item.path)));

      fnQ.runLast(async () => {
        this.emit("change");

        const watchResult = await this._runAsync(true);
        this.emit("complete", {
          affectedFilePaths: Array.from(watchResult.affectedFileSet),
          buildMessages: watchResult.buildMessages,
        });

        watcher.add(watchResult.watchFileSet);
      });
    });
  }

  private async _runAsync(dev: boolean): Promise<{
    watchFileSet: Set<string>;
    affectedFileSet: Set<string>;
    buildMessages: ISdBuildMessage[];
  }> {
    const localUpdatePaths = Object.keys(this.#projConf.localUpdates ?? {}).mapMany((key) =>
      FsUtil.glob(path.resolve(this.#pkgPath, "../../node_modules", key)),
    );

    this._debug(`BUILD...`);
    this.#builder ??= await SdTsLibBuilder.new(this.#pkgPath, dev, [
      path.resolve(this.#pkgPath, "../"),
      ...localUpdatePaths,
    ]);
    const buildResult = await this.#builder.buildAsync();

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
    };
  }

  private _debug(msg: string): void {
    this.#logger.debug(`[${path.basename(this.#pkgPath)}] ${msg}`);
  }
}
