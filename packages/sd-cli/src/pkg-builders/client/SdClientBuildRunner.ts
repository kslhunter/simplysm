import { EventEmitter } from "events";
import { FsUtil, Logger, PathUtil, SdFsWatcher, type TNormPath } from "@simplysm/sd-core-node";
import path from "path";
import { SdNgBundler } from "./SdNgBundler";
import { SdCliNgRoutesFileGenerator } from "./SdCliNgRoutesFileGenerator";
import { SdCliCordova } from "../../entry/SdCliCordova";
import { SdCliElectron } from "../../entry/SdCliElectron";
import { type ISdClientPackageConfig, type ISdProjectConfig } from "../../types/sd-configs.type";
import { type INpmConfig } from "../../types/common-configs.type";
import { type ISdBuildMessage, type ISdBuildRunnerResult } from "../../types/build.type";

export class SdClientBuildRunner extends EventEmitter {
  private _logger = Logger.get(["simplysm", "sd-cli", "SdClientBuildRunner"]);
  private _pkgConf: ISdClientPackageConfig;
  private _npmConf: INpmConfig;
  private _ngBundlers?: SdNgBundler[];
  private _cordova?: SdCliCordova;
  private _watchScopePathSet: Set<TNormPath>;

  public constructor(
    private _projConf: ISdProjectConfig,
    private _pkgPath: TNormPath,
  ) {
    super();
    this._pkgConf = this._projConf.packages[path.basename(_pkgPath)] as ISdClientPackageConfig;
    this._npmConf = FsUtil.readJson(path.resolve(_pkgPath, "package.json")) as INpmConfig;

    const localUpdatePaths = Object.keys(this._projConf.localUpdates ?? {}).mapMany((key) =>
      FsUtil.glob(path.resolve(this._pkgPath, "../../node_modules", key)),
    );
    this._watchScopePathSet = new Set(
      [
        path.resolve(this._pkgPath, "../"),
        ...localUpdatePaths
      ].map((item) => PathUtil.norm(item)),
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
    FsUtil.remove(path.resolve(this._pkgPath, "dist"));

    this._debug("GEN .config...");
    const confDistPath = path.resolve(this._pkgPath, "dist/.config.json");
    FsUtil.writeFile(confDistPath, JSON.stringify(this._pkgConf.configs ?? {}, undefined, 2));

    if (this._npmConf.dependencies && Object.keys(this._npmConf.dependencies).includes("@angular/router")) {
      this._debug(`GEN routes.ts...`);
      SdCliNgRoutesFileGenerator.run(this._pkgPath, undefined, this._pkgConf.noLazyRoute);
    }

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
    let lastWatchFileSet = result.watchFileSet;
    SdFsWatcher.watch(Array.from(this._watchScopePathSet)).onChange({ delay: 100 }, async (changeInfos) => {
      const currentChangeInfos = changeInfos.filter((item) => lastWatchFileSet.has(item.path));
      if (currentChangeInfos.length < 1) return;

      this.emit("change");

      for (const ngBundler of this._ngBundlers!) {
        ngBundler.markForChanges(currentChangeInfos.map((item) => item.path));
      }

      const watchResult = await this._runAsync({ dev: !this._pkgConf.forceProductionMode });
      const watchRes: ISdBuildRunnerResult = {
        affectedFilePathSet: watchResult.affectedFileSet,
        buildMessages: watchResult.buildMessages,
        emitFileSet: watchResult.emitFileSet,
      };
      this.emit("complete", watchRes);

      lastWatchFileSet = watchResult.watchFileSet;
    });
  }

  private async _runAsync(opt: { dev: boolean }): Promise<{
    watchFileSet: Set<TNormPath>;
    affectedFileSet: Set<TNormPath>;
    buildMessages: ISdBuildMessage[];
    emitFileSet: Set<TNormPath>;
  }> {
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
            external:
              ngBundlerBuilderType === "electron" ? (this._pkgConf.builder?.electron?.reinstallDependencies ?? []) : [],
            cordovaConfig: ngBundlerBuilderType === "cordova" ? this._pkgConf.builder!.cordova : undefined,
            watchScopePaths: Array.from(this._watchScopePathSet),
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
    /*const currWatchFileSet = new Set(
      Array.from(watchFileSet).filter((item) =>
        Array.from(this._watchScopePathSet).some((scope) => PathUtil.isChildPath(item, scope)),
      ),
    );*/
    return {
      watchFileSet,
      affectedFileSet,
      buildMessages: results, //.filter((item) => item.filePath !== path.resolve(this._pkgPath, "src/routes.ts")),
      emitFileSet,
    };
  }

  private _debug(msg: string): void {
    this._logger.debug(`[${path.basename(this._pkgPath)}] ${msg}`);
  }
}
