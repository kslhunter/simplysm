import { EventEmitter } from "events";
import { FsUtil, Logger, PathUtil, SdFsWatcher } from "@simplysm/sd-core-node";
import { FunctionQueue } from "@simplysm/sd-core-common";
import path from "path";
import { SdNgBundler } from "./SdNgBundler";
import { SdCliNgRoutesFileGenerator } from "./SdCliNgRoutesFileGenerator";
import {
  INpmConfig,
  ISdBuildMessage,
  ISdBuildRunnerResult,
  ISdClientPackageConfig,
  ISdProjectConfig,
} from "../../commons";
import { SdCliCordova } from "../../entry/SdCliCordova";
import { SdCliElectron } from "../../entry/SdCliElectron";

export class SdClientBuildRunner extends EventEmitter {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", "SdClientBuildRunner"]);
  private readonly _pkgConf: ISdClientPackageConfig;
  private readonly _npmConf: INpmConfig;
  private _ngBundlers?: SdNgBundler[];
  private _cordova?: SdCliCordova;

  public constructor(
    private readonly _projConf: ISdProjectConfig,
    private readonly _pkgPath: string,
  ) {
    super();
    this._pkgConf = this._projConf.packages[path.basename(_pkgPath)] as ISdClientPackageConfig;
    this._npmConf = FsUtil.readJson(path.resolve(_pkgPath, "package.json")) as INpmConfig;
  }

  public override on(event: "change", listener: () => void): this;
  public override on(event: "complete", listener: (result: ISdBuildRunnerResult) => void): this;
  public override on(event: string | symbol, listener: (...args: any[]) => void): this {
    super.on(event, listener);
    return this;
  }

  public async buildAsync(): Promise<ISdBuildRunnerResult> {
    this._debug("dist 초기화...");
    await FsUtil.removeAsync(path.resolve(this._pkgPath, "dist"));

    if (this._npmConf.dependencies && Object.keys(this._npmConf.dependencies).includes("@angular/router")) {
      this._debug(`GEN routes.ts...`);
      await SdCliNgRoutesFileGenerator.runAsync(this._pkgPath, undefined, this._pkgConf.noLazyRoute);
    }

    this._debug("GEN .config...");
    const confDistPath = path.resolve(this._pkgPath, "dist/.config.json");
    await FsUtil.writeFileAsync(confDistPath, JSON.stringify(this._pkgConf.configs ?? {}, undefined, 2));

    const result = await this._runAsync({ dev: false });
    return {
      affectedFilePaths: Array.from(result.affectedFileSet),
      buildMessages: result.buildMessages,
    };
  }

  public async watchAsync() {
    this.emit("change");

    this._debug("dist 초기화...");
    await FsUtil.removeAsync(path.resolve(this._pkgPath, "dist"));

    if (this._npmConf.dependencies && Object.keys(this._npmConf.dependencies).includes("@angular/router")) {
      this._debug(`WATCH GEN routes.ts...`);
      await SdCliNgRoutesFileGenerator.watchAsync(this._pkgPath, this._pkgConf.noLazyRoute);
    }

    this._debug("GEN .config...");
    const confDistPath = path.resolve(this._pkgPath, "dist/.config.json");
    await FsUtil.writeFileAsync(confDistPath, JSON.stringify(this._pkgConf.configs ?? {}, undefined, 2));

    const result = await this._runAsync({ dev: !this._pkgConf.forceProductionMode });
    this.emit("complete", {
      affectedFilePaths: Array.from(result.affectedFileSet),
      buildMessages: result.buildMessages,
    });

    this._debug("WATCH...");
    let changeFiles: string[] = [];
    const fnQ = new FunctionQueue();
    const watcher = SdFsWatcher.watch(Array.from(result.watchFileSet)).onChange({ delay: 100 }, (changeInfos) => {
      changeFiles.push(...changeInfos.map((item) => item.path));

      fnQ.runLast(async () => {
        const currChangeFiles = [...changeFiles];
        changeFiles = [];

        this.emit("change");

        for (const ngBundler of this._ngBundlers!) {
          // builder.removeCache(currChangeFiles);
          ngBundler.markForChanges(currChangeFiles);
        }

        const watchResult = await this._runAsync({ dev: !this._pkgConf.forceProductionMode });
        this.emit("complete", {
          affectedFilePaths: Array.from(watchResult.affectedFileSet),
          buildMessages: watchResult.buildMessages,
        });

        watcher.add(watchResult.watchFileSet);
      });
    });
  }

  private async _runAsync(opt: { dev: boolean }): Promise<{
    watchFileSet: Set<string>;
    affectedFileSet: Set<string>;
    buildMessages: ISdBuildMessage[];
  }> {
    const localUpdatePaths = Object.keys(this._projConf.localUpdates ?? {}).mapMany((key) =>
      FsUtil.glob(path.resolve(this._pkgPath, "../../node_modules", key)),
    );

    const ngBundlerBuilderTypes = Object.keys(this._pkgConf.builder ?? { web: {} }) as (
      | "web"
      | "electron"
      | "cordova"
    )[];
    if (this._pkgConf.builder?.cordova && !this._cordova) {
      this._debug("CORDOVA 준비...");
      this._cordova = new SdCliCordova({
        pkgPath: this._pkgPath,
        config: this._pkgConf.builder.cordova,
      });
      await this._cordova.initializeAsync();
    }

    if (!this._ngBundlers) {
      this._debug(`BUILD 준비...`);

      this._ngBundlers = ngBundlerBuilderTypes.map(
        (ngBundlerBuilderType) =>
          new SdNgBundler({
            dev: opt.dev,
            builderType: ngBundlerBuilderType,
            pkgPath: this._pkgPath,
            outputPath:
              ngBundlerBuilderType === "web"
                ? path.resolve(this._pkgPath, "dist")
                : ngBundlerBuilderType === "electron" && !opt.dev
                  ? path.resolve(this._pkgPath, ".electron/src")
                  : ngBundlerBuilderType === "cordova" && !opt.dev
                    ? path.resolve(this._pkgPath, ".cordova/www")
                    : path.resolve(this._pkgPath, "dist", ngBundlerBuilderType),
            env: {
              ...this._pkgConf.env,
              ...this._pkgConf.builder?.[ngBundlerBuilderType]?.env,
            },
            cordovaConfig: ngBundlerBuilderType === "cordova" ? this._pkgConf.builder!.cordova : undefined,
            watchScopePaths: [path.resolve(this._pkgPath, "../"), ...localUpdatePaths],
          }),
      );
    }

    this._debug(`BUILD...`);
    const buildResults = await Promise.all(this._ngBundlers.map((builder) => builder.bundleAsync()));
    const watchFileSet = new Set(buildResults.mapMany((item) => Array.from(item.watchFileSet)));
    const affectedFileSet = new Set(buildResults.mapMany((item) => Array.from(item.affectedFileSet)));
    const results = buildResults.mapMany((item) => item.results).distinct();

    if (!opt.dev && this._cordova) {
      this._debug("CORDOVA BUILD...");
      await this._cordova.buildAsync(path.resolve(this._pkgPath, "dist"));
    }

    if (!opt.dev && this._pkgConf.builder?.electron) {
      this._debug("ELECTRON BUILD...");
      await SdCliElectron.buildAsync({
        pkgPath: this._pkgPath,
        config: this._pkgConf.builder.electron,
      });
    }

    this._debug(`빌드 완료`);
    const currWatchFileSet = new Set(
      Array.from(watchFileSet).filter(
        (item) =>
          PathUtil.isChildPath(item, path.resolve(this._pkgPath, "../")) ||
          localUpdatePaths.some((lu) => PathUtil.isChildPath(item, lu)),
      ),
    );
    return {
      watchFileSet: currWatchFileSet,
      affectedFileSet,
      buildMessages: results, //.filter((item) => item.filePath !== path.resolve(this._pkgPath, "src/routes.ts")),
    };
  }

  private _debug(msg: string): void {
    this._logger.debug(`[${path.basename(this._pkgPath)}] ${msg}`);
  }
}
