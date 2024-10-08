import { EventEmitter } from "events";
import { FsUtil, Logger, PathUtil, SdFsWatcher, TNormPath } from "@simplysm/sd-core-node";
import path from "path";
import { SdNgBundler } from "./SdNgBundler";
import { SdCliNgRoutesFileGenerator } from "./SdCliNgRoutesFileGenerator";
import { SdCliCordova } from "../../entry/SdCliCordova";
import { SdCliElectron } from "../../entry/SdCliElectron";
import { ISdClientPackageConfig, ISdProjectConfig } from "../../types/sd-configs.type";
import { INpmConfig } from "../../types/common-configs.type";
import { ISdBuildMessage, ISdBuildRunnerResult } from "../../types/build.type";

export class SdClientBuildRunner extends EventEmitter {
  private readonly _logger = Logger.get(["simplysm", "sd-cli", "SdClientBuildRunner"]);
  private readonly _pkgConf: ISdClientPackageConfig;
  private readonly _npmConf: INpmConfig;
  private _ngBundlers?: SdNgBundler[];
  private _cordova?: SdCliCordova;

  public constructor(
    private readonly _projConf: ISdProjectConfig,
    private readonly _pkgPath: TNormPath,
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
    FsUtil.remove(path.resolve(this._pkgPath, "dist"));

    if (this._npmConf.dependencies && Object.keys(this._npmConf.dependencies).includes("@angular/router")) {
      this._debug(`GEN routes.ts...`);
      SdCliNgRoutesFileGenerator.run(this._pkgPath, undefined, this._pkgConf.noLazyRoute);
    }

    this._debug("GEN .config...");
    const confDistPath = path.resolve(this._pkgPath, "dist/.config.json");
    FsUtil.writeFile(confDistPath, JSON.stringify(this._pkgConf.configs ?? {}, undefined, 2));

    const result = await this._runAsync({ dev: false });
    return {
      affectedFilePathSet: result.affectedFileSet,
      buildMessages: result.buildMessages,
      emitFileSet: result.emitFileSet,
    };
  }

  public async watchAsync() {
    this.emit("change");

    this._debug("dist 초기화...");
    FsUtil.remove(path.resolve(this._pkgPath, "dist"));

    if (this._npmConf.dependencies && Object.keys(this._npmConf.dependencies).includes("@angular/router")) {
      this._debug(`WATCH GEN routes.ts...`);
      SdCliNgRoutesFileGenerator.watch(this._pkgPath, this._pkgConf.noLazyRoute);
    }

    this._debug("GEN .config...");
    const confDistPath = path.resolve(this._pkgPath, "dist/.config.json");
    FsUtil.writeFile(confDistPath, JSON.stringify(this._pkgConf.configs ?? {}, undefined, 2));

    const result = await this._runAsync({ dev: !this._pkgConf.forceProductionMode });
    const res: ISdBuildRunnerResult = {
      affectedFilePathSet: result.affectedFileSet,
      buildMessages: result.buildMessages,
      emitFileSet: result.emitFileSet,
    };
    this.emit("complete", res);

    this._debug("WATCH...");
    const watcher = SdFsWatcher.watch(Array.from(result.watchFileSet)).onChange({ delay: 100 }, async (changeInfos) => {
      this.emit("change");

      for (const ngBundler of this._ngBundlers!) {
        ngBundler.markForChanges(changeInfos.map((item) => item.path));
      }

      const watchResult = await this._runAsync({ dev: !this._pkgConf.forceProductionMode });
      const watchRes: ISdBuildRunnerResult = {
        affectedFilePathSet: watchResult.affectedFileSet,
        buildMessages: watchResult.buildMessages,
        emitFileSet: watchResult.emitFileSet,
      };
      this.emit("complete", watchRes);

      watcher.replaceWatchPaths(watchResult.watchFileSet);
    });
  }

  private async _runAsync(opt: { dev: boolean }): Promise<{
    watchFileSet: Set<TNormPath>;
    affectedFileSet: Set<TNormPath>;
    buildMessages: ISdBuildMessage[];
    emitFileSet: Set<TNormPath>;
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
                ? PathUtil.norm(this._pkgPath, "dist")
                : ngBundlerBuilderType === "electron" && !opt.dev
                  ? PathUtil.norm(this._pkgPath, ".electron/src")
                  : ngBundlerBuilderType === "cordova" && !opt.dev
                    ? PathUtil.norm(this._pkgPath, ".cordova/www")
                    : PathUtil.norm(this._pkgPath, "dist", ngBundlerBuilderType),
            env: {
              ...this._pkgConf.env,
              ...this._pkgConf.builder?.[ngBundlerBuilderType]?.env,
            },
            cordovaConfig: ngBundlerBuilderType === "cordova" ? this._pkgConf.builder!.cordova : undefined,
            watchScopePaths: [path.resolve(this._pkgPath, "../"), ...localUpdatePaths].map((item) =>
              PathUtil.norm(item),
            ),
          }),
      );
    }

    this._debug(`BUILD...`);
    const buildResults = await Promise.all(this._ngBundlers.map((builder) => builder.bundleAsync()));
    const watchFileSet = new Set(buildResults.mapMany((item) => Array.from(item.watchFileSet)));
    const affectedFileSet = new Set(buildResults.mapMany((item) => Array.from(item.affectedFileSet)));
    const emitFileSet = new Set(buildResults.mapMany((item) => Array.from(item.emitFileSet)));
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
      emitFileSet,
    };
  }

  private _debug(msg: string): void {
    this._logger.debug(`[${path.basename(this._pkgPath)}] ${msg}`);
  }
}
